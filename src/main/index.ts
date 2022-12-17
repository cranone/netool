import { app, shell, BrowserWindow, ipcMain, net } from 'electron'
import * as path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux'
      ? {
          icon: path.join(__dirname, '../../build/icon.png')
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      defaultEncoding: 'UTF-8'
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  ipcMain.on('net:request', async (event, ...args) => {
    console.info('ipcMain request' + event.sender)
    return request(mainWindow, ...args)
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
let requestBody: Electron.ClientRequest
function request(mainWindow: BrowserWindow, ...args): void {
  const [options, headers, data] = args
  if (requestBody) {
    requestBody.abort()
  }
  requestBody = net.request(options)
  for (const i in headers) {
    requestBody.setHeader(i, headers[i])
  }
  requestBody.write(data)
  const buffers: Buffer[] = []
  let responseData
  requestBody
    .on('response', (response) => {
      response
        .on('data', (chunk) => {
          buffers.push(chunk)
          //responseData = Buffer.concat(buffers).toString()
          //mainWindow.webContents.send('response', responseData)
        })
        .on('end', () => {
          responseData = Buffer.concat(buffers).toString()
          mainWindow.webContents.send('net:response', responseData)
        })
    })
    .on('error', (error) => {
      responseData = error
      console.info('error:' + error)
      mainWindow.webContents.send('net:response', responseData)
    })
    .end()
}
