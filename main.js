const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false
        },
        icon: path.join(__dirname, 'icon.ico')
    });

    mainWindow.loadFile('index.html');

    const menu = Menu.buildFromTemplate([
        {
            label: 'Fájl',
            submenu: [
                {
                    label: 'Kilépés',
                    accelerator: 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Nézet',
            submenu: [
                {
                    label: 'Újratöltés',
                    accelerator: 'Ctrl+R',
                    click: () => {
                        mainWindow.reload();
                    }
                },
                {
                    label: 'Teljes képernyő',
                    accelerator: 'F11',
                    click: () => {
                        mainWindow.setFullScreen(!mainWindow.isFullScreen());
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Fejlesztői eszközök',
                    accelerator: 'F12',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                }
            ]
        },
        {
            label: 'Súgó',
            submenu: [
                {
                    label: 'Használati útmutató',
                    click: () => {
                        const helpWindow = new BrowserWindow({
                            width: 1000,
                            height: 800,
                            parent: mainWindow,
                            modal: false,
                            webPreferences: {
                                nodeIntegration: false,
                                contextIsolation: true
                            }
                        });
                        helpWindow.loadFile('help.html');
                    }
                },
                {
                    label: 'Névjegy',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Névjegy',
                            message: 'Promax Spectrum Analyzer',
                            detail: 'XML Jelszint Analizátor alkalmazás\nVerzió: 1.0.0\n\nPromax mérőműszerek XML fájljainak feldolgozására',
                            buttons: ['OK']
                        });
                    }
                }
            ]
        }
    ]);

    Menu.setApplicationMenu(menu);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});