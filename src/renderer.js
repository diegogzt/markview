const { ipcRenderer } = require('electron');
const { marked } = require('marked');
const hljs = require('highlight.js');
const Fuse = require('fuse.js');

// Estado de la aplicación
let currentFiles = [];
let currentFile = null;
let currentTheme = 'light';
let fuse = null;
let sidebarWidth = 300;

// Configurar marked con highlight.js
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (err) {}
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true
});

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupEventListeners();
  setupResizer();
  loadTheme();
});

function initializeApp() {
  console.log('MarkView iniciado');
  updateFileCount(0);
}

function setupEventListeners() {
  // Botones de la toolbar
  document.getElementById('open-folder-btn').addEventListener('click', () => {
    ipcRenderer.invoke('open-folder-dialog');
  });

  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('refresh-btn').addEventListener('click', refreshCurrentFile);

  // Búsqueda
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', handleSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearSearch();
    }
  });

  // Botones de contenido
  document.getElementById('copy-content-btn').addEventListener('click', copyContent);
  document.getElementById('export-html-btn').addEventListener('click', exportHTML);

  // IPC listeners
  ipcRenderer.on('folder-opened', handleFolderOpened);
  ipcRenderer.on('files-updated', handleFilesUpdated);
  ipcRenderer.on('file-changed', handleFileChanged);
}

function setupResizer() {
  const resizer = document.getElementById('resizer');
  const sidebar = document.getElementById('sidebar');
  const contentPanel = document.getElementById('content-panel');
  
  let isResizing = false;

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    e.preventDefault();
  });

  function handleResize(e) {
    if (!isResizing) return;
    
    const containerRect = document.querySelector('.main-content').getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;
    
    if (newWidth >= 200 && newWidth <= 500) {
      sidebarWidth = newWidth;
      sidebar.style.width = `${newWidth}px`;
      document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
    }
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  }
}

function handleFolderOpened(event, data) {
  const { folderPath, files } = data;
  currentFiles = files;
  
  // Configurar búsqueda fuzzy
  fuse = new Fuse(files, {
    keys: ['name', 'relativePath'],
    threshold: 0.3,
    includeScore: true
  });

  renderFileTree(files);
  updateFileCount(files.length);
  updateBreadcrumb(folderPath);
  
  // Seleccionar primer archivo si existe
  if (files.length > 0) {
    selectFile(files[0]);
  }

  hideModal('loading-modal');
}

function handleFilesUpdated(event, files) {
  currentFiles = files;
  fuse = new Fuse(files, {
    keys: ['name', 'relativePath'],
    threshold: 0.3,
    includeScore: true
  });
  renderFileTree(files);
  updateFileCount(files.length);
}

function handleFileChanged(event, filePath) {
  if (currentFile && currentFile.path === filePath) {
    refreshCurrentFile();
  }
}

function renderFileTree(files) {
  const fileTree = document.getElementById('file-tree');
  
  if (files.length === 0) {
    fileTree.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📄</div>
        <p>No se encontraron archivos Markdown</p>
      </div>
    `;
    return;
  }

  // Agrupar archivos por directorio
  const filesByDirectory = {};
  files.forEach(file => {
    const dir = file.directory || '.';
    if (!filesByDirectory[dir]) {
      filesByDirectory[dir] = [];
    }
    filesByDirectory[dir].push(file);
  });

  // Renderizar árbol
  let html = '';
  const directories = Object.keys(filesByDirectory).sort();
  
  directories.forEach(dir => {
    if (dir !== '.' && directories.length > 1) {
      html += `<div class="directory-header">${dir}</div>`;
    }
    
    filesByDirectory[dir].forEach(file => {
      const isActive = currentFile && currentFile.path === file.path;
      html += `
        <div class="file-item ${isActive ? 'active' : ''}" data-path="${file.path}">
          <span class="file-icon">📄</span>
          <span class="file-name">${file.name}</span>
          ${dir !== '.' ? `<span class="file-path">${dir}</span>` : ''}
        </div>
      `;
    });
  });

  fileTree.innerHTML = html;

  // Agregar event listeners
  fileTree.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', () => {
      const filePath = item.dataset.path;
      const file = files.find(f => f.path === filePath);
      if (file) {
        selectFile(file);
      }
    });
  });
}

async function selectFile(file) {
  if (currentFile && currentFile.path === file.path) return;

  showModal('loading-modal');
  
  try {
    const result = await ipcRenderer.invoke('read-file', file.path);
    
    if (result.success) {
      currentFile = file;
      renderMarkdown(result.content);
      updateActiveFile();
      updateStatusBar(file);
      updateBreadcrumb(null, file);
    } else {
      showError(`Error al leer el archivo: ${result.error}`);
    }
  } catch (error) {
    showError(`Error inesperado: ${error.message}`);
  }
  
  hideModal('loading-modal');
}

function renderMarkdown(content) {
  const contentViewer = document.getElementById('content-viewer');
  
  try {
    const html = marked(content);
    contentViewer.innerHTML = `<div class="markdown-body fade-in">${html}</div>`;
    
    // Scroll al inicio
    contentViewer.scrollTop = 0;
    
    // Procesar enlaces internos
    processInternalLinks();
    
  } catch (error) {
    showError(`Error al renderizar Markdown: ${error.message}`);
  }
}

function processInternalLinks() {
  const contentViewer = document.getElementById('content-viewer');
  const links = contentViewer.querySelectorAll('a[href]');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    
    // Enlaces a archivos markdown relativos
    if (href.endsWith('.md') || href.endsWith('.markdown')) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Buscar archivo en la lista actual
        const targetFile = currentFiles.find(file => 
          file.name === href || 
          file.relativePath.endsWith(href) ||
          file.relativePath === href
        );
        
        if (targetFile) {
          selectFile(targetFile);
        } else {
          showError(`No se encontró el archivo: ${href}`);
        }
      });
    }
  });
}

function updateActiveFile() {
  document.querySelectorAll('.file-item').forEach(item => {
    item.classList.remove('active');
  });
  
  if (currentFile) {
    const activeItem = document.querySelector(`[data-path="${currentFile.path}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

function updateStatusBar(file) {
  const currentFileSpan = document.getElementById('current-file');
  const fileSizeSpan = document.getElementById('file-size');
  const lastModifiedSpan = document.getElementById('last-modified');
  
  if (file) {
    currentFileSpan.textContent = file.relativePath;
    
    // Obtener información del archivo
    const fs = require('fs');
    try {
      const stats = fs.statSync(file.path);
      fileSizeSpan.textContent = formatFileSize(stats.size);
      lastModifiedSpan.textContent = `Modificado: ${formatDate(stats.mtime)}`;
    } catch (error) {
      fileSizeSpan.textContent = '';
      lastModifiedSpan.textContent = '';
    }
  } else {
    currentFileSpan.textContent = 'Ningún archivo seleccionado';
    fileSizeSpan.textContent = '';
    lastModifiedSpan.textContent = '';
  }
}

function updateBreadcrumb(folderPath, file) {
  const breadcrumb = document.getElementById('breadcrumb');
  
  if (file) {
    const parts = file.relativePath.split('/');
    let html = '';
    
    parts.forEach((part, index) => {
      if (index > 0) {
        html += '<span class="breadcrumb-separator">></span>';
      }
      html += `<span class="breadcrumb-part">${part}</span>`;
    });
    
    breadcrumb.innerHTML = html;
  } else if (folderPath) {
    const folderName = folderPath.split('/').pop() || folderPath;
    breadcrumb.innerHTML = `<span class="breadcrumb-part">📁 ${folderName}</span>`;
  } else {
    breadcrumb.innerHTML = '';
  }
}

function updateFileCount(count) {
  const fileCount = document.getElementById('file-count');
  fileCount.textContent = `${count} archivo${count !== 1 ? 's' : ''}`;
}

function handleSearch(event) {
  const query = event.target.value.trim();
  
  if (!query) {
    renderFileTree(currentFiles);
    return;
  }

  if (!fuse) return;

  const results = fuse.search(query);
  const filteredFiles = results.map(result => result.item);
  
  renderFileTree(filteredFiles);
}

function clearSearch() {
  const searchInput = document.getElementById('search-input');
  searchInput.value = '';
  renderFileTree(currentFiles);
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle.innerHTML = `<span class="icon">${currentTheme === 'light' ? '🌙' : '☀️'}</span>`;
  
  // Cambiar CSS de GitHub Markdown
  const markdownCSS = document.querySelector('link[href*="github-markdown"]');
  if (markdownCSS) {
    const newHref = currentTheme === 'dark' 
      ? '../node_modules/github-markdown-css/github-markdown-dark.css'
      : '../node_modules/github-markdown-css/github-markdown-light.css';
    markdownCSS.href = newHref;
  }
  
  // Cambiar CSS de highlight.js
  const highlightCSS = document.querySelector('link[href*="highlight.js"]');
  if (highlightCSS) {
    const newHref = currentTheme === 'dark'
      ? '../node_modules/highlight.js/styles/github-dark.css'
      : '../node_modules/highlight.js/styles/github.css';
    highlightCSS.href = newHref;
  }
  
  localStorage.setItem('markview-theme', currentTheme);
}

function loadTheme() {
  const savedTheme = localStorage.getItem('markview-theme') || 'light';
  if (savedTheme !== currentTheme) {
    toggleTheme();
  }
}

async function refreshCurrentFile() {
  if (currentFile) {
    await selectFile(currentFile);
  }
}

async function copyContent() {
  if (!currentFile) return;
  
  try {
    const result = await ipcRenderer.invoke('read-file', currentFile.path);
    if (result.success) {
      await navigator.clipboard.writeText(result.content);
      showNotification('Contenido copiado al portapapeles');
    }
  } catch (error) {
    showError('Error al copiar contenido');
  }
}

async function exportHTML() {
  if (!currentFile) return;
  
  try {
    const result = await ipcRenderer.invoke('read-file', currentFile.path);
    if (result.success) {
      const html = marked(result.content);
      const fullHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${currentFile.name}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.4.0/github-markdown-light.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
    <style>
        body { box-sizing: border-box; min-width: 200px; max-width: 980px; margin: 0 auto; padding: 45px; }
    </style>
</head>
<body class="markdown-body">
${html}
</body>
</html>`;
      
      const blob = new Blob([fullHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentFile.name.replace(/\.md$/, '')}.html`;
      a.click();
      URL.revokeObjectURL(url);
      
      showNotification('HTML exportado correctamente');
    }
  } catch (error) {
    showError('Error al exportar HTML');
  }
}

// Utilidades
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
  }
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
  }
}

function showError(message) {
  console.error(message);
  // Aquí podrías agregar una notificación visual
  alert(message);
}

function showNotification(message) {
  console.log(message);
  // Aquí podrías agregar una notificación visual
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date) {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}