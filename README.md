# MarkView 📖

Un visor elegante de archivos Markdown diseñado especialmente para explorar documentación de repositorios de GitHub.

![MarkView](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Electron](https://img.shields.io/badge/electron-27.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Características

- **🗂️ Explorador de carpetas**: Abre carpetas completas y navega por todos los archivos Markdown
- **🔍 Búsqueda inteligente**: Búsqueda fuzzy para encontrar archivos rápidamente
- **🎨 Renderizado GitHub**: Estilo idéntico al renderizado de GitHub con soporte para sintaxis
- **🌙 Temas claro/oscuro**: Cambia entre tema claro y oscuro según tu preferencia
- **📋 Exportación**: Copia contenido al portapapeles o exporta como HTML
- **🔗 Enlaces internos**: Navegación automática entre archivos Markdown relacionados
- **📊 Información de archivos**: Muestra tamaño, fecha de modificación y ruta
- **🔄 Actualización automática**: Detecta cambios en archivos y actualiza automáticamente
- **📱 Interfaz responsiva**: Diseño adaptable con panel lateral redimensionable

## 🚀 Instalación

### Prerrequisitos

- Node.js (versión 16 o superior)
- npm o yarn

### Instalación desde código fuente

```bash
# Clonar el repositorio
git clone https://github.com/diegogzt/markview.git
cd markview

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# O ejecutar en modo producción
npm start
```

### Construcción de ejecutables

```bash
# Construir para todas las plataformas
npm run build

# Construir solo para Windows
npm run build-win

# Construir solo para macOS
npm run build-mac

# Construir solo para Linux
npm run build-linux
```

## 📖 Uso

### Inicio rápido

1. **Abrir MarkView**: Ejecuta la aplicación
2. **Seleccionar carpeta**: Haz clic en "Abrir Carpeta" o usa `Ctrl+O` (Cmd+O en Mac)
3. **Explorar archivos**: Navega por el árbol de archivos en el panel lateral
4. **Ver contenido**: Haz clic en cualquier archivo .md para visualizarlo

### Funcionalidades avanzadas

#### Búsqueda de archivos
- Usa la barra de búsqueda en la parte superior
- La búsqueda es inteligente y encuentra coincidencias parciales
- Presiona `Escape` para limpiar la búsqueda

#### Cambio de tema
- Haz clic en el botón de luna/sol en la barra de herramientas
- El tema se guarda automáticamente para la próxima sesión

#### Exportación
- **Copiar contenido**: Botón 📋 para copiar el Markdown original
- **Exportar HTML**: Botón 💾 para descargar como archivo HTML

#### Navegación
- Los enlaces internos a otros archivos .md son clickeables
- Usa el breadcrumb para ver la ubicación actual
- El panel lateral es redimensionable arrastrando el divisor

### Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl+O` / `Cmd+O` | Abrir carpeta |
| `Ctrl+R` / `Cmd+R` | Recargar |
| `Ctrl+Shift+I` / `Alt+Cmd+I` | Abrir DevTools |
| `Ctrl++` / `Cmd++` | Zoom in |
| `Ctrl+-` / `Cmd+-` | Zoom out |
| `Ctrl+0` / `Cmd+0` | Reset zoom |
| `Escape` | Limpiar búsqueda |

## 🛠️ Tecnologías utilizadas

- **[Electron](https://electronjs.org/)**: Framework para aplicaciones de escritorio
- **[Marked](https://marked.js.org/)**: Parser de Markdown rápido y eficiente
- **[Highlight.js](https://highlightjs.org/)**: Resaltado de sintaxis para bloques de código
- **[GitHub Markdown CSS](https://github.com/sindresorhus/github-markdown-css)**: Estilos idénticos a GitHub
- **[Fuse.js](https://fusejs.io/)**: Búsqueda fuzzy potente y flexible
- **[Chokidar](https://github.com/paulmillr/chokidar)**: Vigilancia de cambios en archivos

## 📁 Estructura del proyecto

```
markview/
├── src/
│   ├── main.js          # Proceso principal de Electron
│   ├── renderer.js      # Lógica del renderizador
│   ├── index.html       # Interfaz de usuario
│   └── styles.css       # Estilos de la aplicación
├── assets/              # Recursos (iconos, imágenes)
├── dist/               # Ejecutables construidos
├── package.json        # Configuración del proyecto
└── README.md          # Este archivo
```

## 🎨 Personalización

### Temas personalizados

Puedes personalizar los colores editando las variables CSS en `src/styles.css`:

```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #24292f;
  --accent-color: #0969da;
  /* ... más variables */
}
```

### Extensiones de archivo

Para agregar soporte a más extensiones de Markdown, modifica la función `isMarkdownFile` en `src/main.js`:

```javascript
function isMarkdownFile(filename) {
  const extensions = ['.md', '.markdown', '.mdown', '.mkd', '.mkdn', '.mdx'];
  return extensions.some(ext => filename.toLowerCase().endsWith(ext));
}
```

## 🤝 Contribuir

Las contribuciones son bienvenidas. Para contribuir:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🐛 Reportar problemas

Si encuentras algún problema o tienes sugerencias, por favor abre un issue en el repositorio de GitHub.

## 📞 Soporte

Para soporte técnico o preguntas:

- Abre un issue en GitHub
- Consulta la documentación
- Revisa los issues existentes

---

**¡Disfruta explorando tu documentación Markdown con MarkView!** 🚀