const electron = require("electron");
var colorsys = require('colorsys')
const TPLSmartDevice = require('tplink-lightbulb')
var express = require('express');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu
const path = require('path')
const url = require('url')
const Tray = electron.Tray
const ipc = electron.ipcMain;
const dialog = require('electron').dialog;
var appex = express();

var interport = 8080; // Enter the port to run the API on.

const iconPath = path.join(__dirname, 'smart-bulb.ico')
let tray = null

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 900,
    webPreferences: {
      //preload: path.join(__dirname, 'preload.js'),
      //nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  //mainWindow.loadFile('index.html')
  mainWindow.loadURL('http://localhost:8080/')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('close', (event) => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    //console.log(event);
    event.preventDefault();
    mainWindow.hide();
    //mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

app.on('ready', function(){
  tray = new Tray(iconPath)

  let template = [
    {label: "Open", click: (item, window, event) => {
      showWindow();
    }},
    {label: "Exit", click: (item, window, event) => {
      process.exit();
    }}
  ]

  const contextMenu = Menu.buildFromTemplate(template)
  tray.setContextMenu(contextMenu)
  tray.setToolTip('TP Link Smart Bulb Control')
  tray.on('click', toggleWindow)
  // Hide on start
  mainWindow.hide();
});

const getWindowPosition = () => {
  const windowBounds = mainWindow.getBounds()
  const trayBounds = tray.getBounds()

  // Center window horizontally below the tray icon
  const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2))

  // Position window 4 pixels vertically below the tray icon
  const y = Math.round(trayBounds.y + trayBounds.height + 4)

  return {x: x, y: y}
}

const toggleWindow = () => {
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    showWindow()
  }
}

const showWindow = () => {
  //const position = getWindowPosition()
  //mainWindow.setPosition(position.x, position.y, false)
  mainWindow.show()
  mainWindow.focus()
}

appex.use(express.static(__dirname + '/public')); 
//redirect / to our index.html file
appex.get('/', function(req, res,next) {  
    res.sendFile(__dirname + '/public/index.html');
});


appex.get('/api', function(req, res){
  var cmd = req.query.cmd;
  
  console.log(''); 
  console.log("Command Given: " + cmd);
  
  if (cmd == "scan") {
  
  const scan = TPLSmartDevice.scan()
    .on('light', light => {
     console.log(light.host); 
     rresponse = light.host;
     res.end(JSON.stringify(rresponse));
    })
  
  } else if (cmd == "power") {
  
  var temp = parseInt(req.query.ct, 10);
  var hue = req.query.hue;
  var st = req.query.st;
  var bbrightness = parseInt(req.query.bri, 10);
  var trans = parseInt(req.query.trans, 10);
  var bip = req.query.ip;
  if(!bip) {
    rresponse = 'No IP Given';
    res.end(JSON.stringify(rresponse));
  } else {
    
  if (st == "off") {
    
  const bulb = new TPLSmartDevice(bip);
  console.log('');
    bulb.power(false)
        .then(status => {
          console.log(status)
        })
  rresponse = "Bulb Turned Off";  
  res.end(JSON.stringify(rresponse));
    
  } else if (st == "on") {
    
  const bulb = new TPLSmartDevice(bip);
  console.log('');
    bulb.power(true)
        .then(status => {
          console.log(status)
        })
  rresponse = "Bulb Turned On";  
  res.end(JSON.stringify(rresponse));
    
  } else {
  
  if (!temp & !hue) {
    rresponse = 'No Colour Temp or Hex Given';
    res.end(JSON.stringify(rresponse));
  } else {
    
  if(temp) {
  
  if (temp < 2500) {
  var	ctmp = 2500;
  
  } else if (temp > 6500){
  var	ctmp = 6500;
      
  } else {
  var ctmp = temp;
    
  }
  
  if (bbrightness < 0) {
  var	bbrightness = 1;
  
  } else if (bbrightness > 100){
  var	bbrightness = 100;
      
  } else if (isNaN(bbrightness)){
  var	bbrightness = 100;	
  }
  
  if (trans == null){
  var	trans = 0;
  }
  
  var brightnum = Number(bbrightness);
  
  console.log('IP Given: ' + bip);
  console.log('Brightness: ' + brightnum);
  console.log('Transition in secs: ' + trans / 1000);
  console.log('Given Temp: ' + req.query.ct);
  const bulb = new TPLSmartDevice(bip);
  console.log('Bulb Temp: ' + ctmp);
  console.log('');
  bulb.power(true, trans, {hue: 0, saturation: 0, brightness: brightnum, color_temp: ctmp})
  .then(status => {
    console.log(status)
  })
  .catch(err => console.error(err))  
  
  rresponse = "Bulb State Updated";  
  res.end(JSON.stringify(rresponse));
  
  } else if (hue) {
    
  if (bbrightness < 0) {
  var	bbrightness = 1;
  
  } else if (bbrightness > 100){
  var	bbrightness = 100;
      
  } else if (isNaN(bbrightness)){
  var	bbrightness = 100;	
  }
  
  if (trans == null){
  var	trans = 0;
  }
  
  var brightnum = Number(bbrightness);
  
  hue = "#" + hue;
  
  var color = colorsys.hexToHsl(hue)
  
  console.log('IP Given: ' + bip);
  console.log('Hex: ' + hue);
  console.log('Brightness: ' + brightnum);
  console.log('Transition in secs: ' + trans / 1000);
  console.log('');
  
  const bulb = new TPLSmartDevice(bip);
  bulb.power(true, trans,{hue: color.h, saturation: color.s, brightness: brightnum, color_temp: 0})
  .then(status => {
    console.log(status)
  })
  .catch(err => console.error(err))  
  
  rresponse = "Bulb State Updated";  
  res.end(JSON.stringify(rresponse));
  
  }
  
  }
  
  }
  
  }
  
  } else if (cmd == "info") {
  
  var bip = req.query.ip;
  if(!bip) {
    rresponse = 'No IP Given';
    res.end(JSON.stringify(rresponse));
  } else {
  
  const bulb = new TPLSmartDevice(bip);
  bulb.info()
    .then(info => {
    res.end(JSON.stringify(info));
    })
  }
  
  } else if (cmd == "cinfo") {
  
  var bip = req.query.ip;
  if(!bip) {
    rresponse = 'No IP Given';
    res.end(JSON.stringify(rresponse));
  } else {
  
  const bulb = new TPLSmartDevice(bip);
  bulb.cloud()
    .then(info => {
    res.end(JSON.stringify(info));
    })
  }
  
  } else if (cmd == "details") {
  
  var bip = req.query.ip;
  if(!bip) {
    rresponse = 'No IP Given';
    res.end(JSON.stringify(rresponse));
  } else {
  
  const bulb = new TPLSmartDevice(bip);
  bulb.details()
    .then(details => {
    res.end(JSON.stringify(details));
    })
  }
  
  } else if (cmd == "schedule") {
  
  var bip = req.query.ip;
  if(!bip) {
    rresponse = 'No IP Given';
    res.end(JSON.stringify(rresponse));
  } else {
  
  const bulb = new TPLSmartDevice(bip);
  bulb.schedule()
    .then(schedule => {
    res.end(JSON.stringify(schedule));
    })
  }
  
  } else {
  rresponse = "No CMD Given";
  res.end(JSON.stringify(rresponse));
  }
  
  });
  
  appex.listen(interport);
  console.log("Server listening on port " + interport);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (win === null) {
  }
});