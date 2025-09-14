const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const chokidar = require('chokidar');

let mainWindow;
let fileWatcher;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Mostrar ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Crear menú de aplicación
  createMenu();

  // Manejar cierre de ventana
  mainWindow.on('closed', () => {
    if (fileWatcher) {
      fileWatcher.close();
    }
    mainWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Abrir Carpeta',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            openFolder();
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Salir',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        {
          label: 'Recargar',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'Alternar DevTools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.toggleDevTools();
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5);
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5);
          }
        },
        {
          label: 'Zoom Reset',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.setZoomLevel(0);
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function openFolder() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Seleccionar carpeta con archivos Markdown'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];
    const files = await scanMarkdownFiles(folderPath);
    
    // Enviar archivos al renderer
    mainWindow.webContents.send('folder-opened', {
      folderPath,
      files
    });

    // Configurar watcher para cambios en archivos
    setupFileWatcher(folderPath);
  }
}

async function scanMarkdownFiles(dirPath) {
  const files = [];
  
  async function scanDir(currentPath, relativePath = '') {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativeFilePath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursivamente escanear subdirectorios
          await scanDir(fullPath, relativeFilePath);
        } else if (entry.isFile() && isMarkdownFile(entry.name)) {
          files.push({
            name: entry.name,
            path: fullPath,
            relativePath: relativeFilePath,
            directory: relativePath || '.'
          });
        }
      }
    } catch (error) {
      console.error('Error scanning directory:', error);
    }
  }
  
  await scanDir(dirPath);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function isMarkdownFile(filename) {
  // Solo mostrar archivos con extensión .md
  return filename.toLowerCase().endsWith('.md');
}

function setupFileWatcher(folderPath) {
  if (fileWatcher) {
    fileWatcher.close();
  }

  fileWatcher = chokidar.watch(folderPath, {
    ignored: /(^|[\/\\])\../, // ignorar archivos ocultos
    persistent: true
  });

  fileWatcher.on('change', async (filePath) => {
    if (isMarkdownFile(path.basename(filePath))) {
      mainWindow.webContents.send('file-changed', filePath);
    }
  });

  fileWatcher.on('add', async (filePath) => {
    if (isMarkdownFile(path.basename(filePath))) {
      const files = await scanMarkdownFiles(folderPath);
      mainWindow.webContents.send('files-updated', files);
    }
  });

  fileWatcher.on('unlink', async (filePath) => {
    if (isMarkdownFile(path.basename(filePath))) {
      const files = await scanMarkdownFiles(folderPath);
      mainWindow.webContents.send('files-updated', files);
    }
  });
}

// IPC handlers
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-folder-dialog', async () => {
  await openFolder();
});

// Eventos de aplicación
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});