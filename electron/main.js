const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

const APP_NAME = 'AutoWeeklyReportCreator'

function getDataFile() {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
  const dir = path.join(appData, APP_NAME)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'data.json')
}

function loadData() {
  try {
    const f = getDataFile()
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'))
  } catch (_) {}
  return { projects: [], weeks: {}, user_name: '서장원' }
}

function saveData(data) {
  fs.writeFileSync(getDataFile(), JSON.stringify(data, null, 2), 'utf-8')
}

let mainWindow

function createWindow() {
  Menu.setApplicationMenu(null)
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 760,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: '#181825',
    icon: path.join(__dirname, '..', 'icons', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('get-data', () => loadData())
  ipcMain.handle('save-data', (_, data) => { saveData(data); return true })
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
