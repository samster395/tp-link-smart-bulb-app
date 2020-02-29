const electron = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
var colorsys = require('colorsys')
const {Client} = require('tplink-smarthome-api');
const client = new Client();
var express = require('express');
const storage = require('electron-json-storage');
const Menu = electron.Menu
const path = require('path')
const url = require('url')
const Tray = electron.Tray
const dialog = require('electron').dialog;
var appex = express();
appex.use(express.static(__dirname + '/public'));
var interport = 8081; // Enter the port to run the API on.

const iconPath = path.join(__dirname, 'smart-bulb.ico')
let tray = null

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 420,
	autoHideMenuBar: true,
    webPreferences: {
      //preload: path.join(__dirname, 'preload.js'),
      //nodeIntegration: true,
	  webSecurity: false,
      allowDisplayingInsecureContent: true
    }
  })

  // and load the index.html of the app.
  //mainWindow.loadFile(__dirname + '/public/index.html')
  mainWindow.loadURL('http://localhost:8081/')

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
  
  const contextMenu = Menu.buildFromTemplate([
	{label: "Preset 1", click: (item, window, event) => {
      bulbCMD("preset", 0);
    }},
	{label: "Preset 2", click: (item, window, event) => {
      bulbCMD("preset", 1);
    }},
	{label: "Preset 3", click: (item, window, event) => {
      bulbCMD("preset", 2);
    }},
	{label: "Preset 4", click: (item, window, event) => {
      bulbCMD("preset", 3);
    }},
	{ type: 'separator' },
	{label: "Bulb On", click: (item, window, event) => {
      bulbCMD("on");
    }},
	{label: "Bulb Off", click: (item, window, event) => {
      bulbCMD("off");
    }},
	{ type: 'separator' },
    {label: "Open", click: (item, window, event) => {
      showMWindow();
    }},
    {label: "Exit", click: (item, window, event) => {
      process.exit();
    }}
  ])

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
    showMWindow()
  }
}

const showMWindow = () => {
  mainWindow.show()
  mainWindow.focus()
}

function bulbCMD(cmd, scmd) {
	var bipp
	storage.get('bulb', function(error, data) {
		if (error) throw error;
		console.log(data);
		bipp = data;
	if (cmd == "on"){
		console.log("cmd: on");
		client.getDevice({host: bipp}).then(device => {
			device.lighting.setLightState({
				on_off: true,
			});
		});
	} else if (cmd == "off"){
		console.log("cmd: off");
		client.getDevice({host: bipp}).then(device => {
			device.lighting.setLightState({
				on_off: false,
			});
		});
	} else if (cmd == "preset"){
		console.log("Preset: " + scmd);
		client.getDevice({ host: bipp }).then(device => {
			device.getSysInfo().then(info => {
				
				var bright = info["preferred_state"][scmd]["brightness"];
				
				if (info["preferred_state"][scmd]["color_temp"] > 0) {
					
					client.getDevice({ host: bipp }).then(device => {
						device.lighting.setLightState({
							on_off: true,
                               brightness: bright,
							hue: 0,
                               saturation: 0,
                               color_temp: info["preferred_state"][scmd]["color_temp"]
					});
					});
					
				} else if (info["preferred_state"][scmd]["hue"] > 0 || info["preferred_state"][scmd]["saturation"] > 0) {
					
					client.getDevice({ host: bipp }).then(device => {
						device.lighting.setLightState({
							on_off: true,
                               brightness: bright,
                               hue: info["preferred_state"][scmd]["hue"],
                               saturation: info["preferred_state"][scmd]["saturation"],
							color_temp: 0
					});
					});
					
				}
               })
		});
	}
	});
}

appex.get('/', function(req, res,next) { 
    res.sendFile(__dirname + '/public/index.html');
});

appex.get('/cfgs', function(req, res,next) {
	if (req.query.bulb) {
		var bulb = req.query.bulb
		storage.set('bulb', bulb, function(error) {
				if (error) throw error;
		});
	}
	res.send('Data Received')
});


appex.get('/api', function(req, res) {
    var cmd = req.query.cmd;

    console.log('');
    console.log("Command Given: " + cmd);
		
	
    if (cmd == "scan") {

        var array = [];
		
        client.startDiscovery({ discoveryTimeout: 250 });
		
		client.on('device-online', (device) => {
            var feed = {
                name: device.alias,
                ip: device.host
            };
            array.push(feed);
        });
		
		client.on('device-new', (device) => {
            var feed = {
                name: device.alias,
                ip: device.host
            };
            array.push(feed);
        });

        function function1() {
            console.log(array);
            res.end(JSON.stringify(array));
        }

        setTimeout(function1, 250);
		
		function function2() {
			array = [];
        }

        setTimeout(function2, 500);

    } else if (cmd == "power") {

        var temp = parseInt(req.query.ct, 10);
        var hue = req.query.hue;
        var st = req.query.st;
        var bbrightness = parseInt(req.query.bri, 10);
        var trans = parseInt(req.query.trans, 10);
        var bip = req.query.ip;
        if (!bip) {
            rresponse = 'No IP Given';
            res.end(JSON.stringify(rresponse));
        } else {

            if (st == "off") {

                console.log('');
                client.getDevice({
                    host: bip
                }).then(device => {
                    device.lighting.setLightState({
                        on_off: false,
                    });
                });
                rresponse = "Bulb Turned Off";
                res.end(JSON.stringify(rresponse));

            } else if (st == "on") {

                console.log('');
                client.getDevice({host: bip}).then(device => {
                    device.lighting.setLightState({
                        on_off: true,
                    });
                });
                rresponse = "Bulb Turned On";
                res.end(JSON.stringify(rresponse));

            } else {

                if (!temp & !hue) {
                    rresponse = 'No Colour Temp or Hex Given';
                    res.end(JSON.stringify(rresponse));
                } else {

                    if (temp) {

                        if (temp < 2500) {
                            var ctmp = 2500;

                        } else if (temp > 6500) {
                            var ctmp = 6500;

                        } else {
                            var ctmp = temp;

                        }

                        if (bbrightness < 0) {
                            var bbrightness = 1;

                        } else if (bbrightness > 100) {
                            var bbrightness = 100;

                        } else if (isNaN(bbrightness)) {
                            var bbrightness = 100;
                        }

                        if (trans == null) {
                            var trans = 0;
                        }

                        var brightnum = Number(bbrightness);

                        console.log('IP Given: ' + bip);
                        console.log('Brightness: ' + brightnum);
                        console.log('Transition in secs: ' + trans / 1000);
                        console.log('Given Temp: ' + req.query.ct);
                        console.log('Bulb Temp: ' + ctmp);
                        console.log('');
						client.getDevice({ host: bip }).then(device => {
							device.lighting.setLightState({
								on_off: true,
								transition_period: trans,
                                hue: 0,
                                saturation: 0,
                                brightness: brightnum,
                                color_temp: ctmp
							});;
						});

                        rresponse = "Bulb State Updated";
                        res.end(JSON.stringify(rresponse));

                    } else if (hue) {

                        if (bbrightness < 0) {
                            var bbrightness = 1;

                        } else if (bbrightness > 100) {
                            var bbrightness = 100;

                        } else if (isNaN(bbrightness)) {
                            var bbrightness = 100;
                        }

                        if (trans == null) {
                            var trans = 0;
                        }

                        var brightnum = Number(bbrightness);

                        hue = "#" + hue;

                        var color = colorsys.hexToHsl(hue)

                        console.log('IP Given: ' + bip);
                        console.log('Hex: ' + hue);
                        console.log('Brightness: ' + brightnum);
                        console.log('Transition in secs: ' + trans / 1000);
                        console.log('');
						client.getDevice({ host: bip }).then(device => {
							device.lighting.setLightState({
								on_off: true,
								transition_period: trans,
                                hue: color.h,
                                saturation: color.s,
                                brightness: brightnum,
                                color_temp: 0
							});;
						});

                        rresponse = "Bulb State Updated";
                        res.end(JSON.stringify(rresponse));

                    }

                }

            }

        }
		console.log("Secondary Command Given: " + st);
    } else if (cmd == "info") {

        var bip = req.query.ip;
        if (!bip) {
            rresponse = 'No IP Given';
            res.end(JSON.stringify(rresponse));
        } else {
			client.getDevice({ host: bip }).then(device => {
				device.getSysInfo().then(info => {
                    res.end(JSON.stringify(info));
                })
			});
        }

    } else if (cmd == "cinfo") {

        var bip = req.query.ip;
        if (!bip) {
            rresponse = 'No IP Given';
            res.end(JSON.stringify(rresponse));
        } else {
			client.getDevice({ host: bip }).then(device => {
				device.cloud.getInfo().then(info => {
                    res.end(JSON.stringify(info));
                })
			});
        }

    } else if (cmd == "schedule") {

        var bip = req.query.ip;
        if (!bip) {
            rresponse = 'No IP Given';
            res.end(JSON.stringify(rresponse));
        } else {

			client.getDevice({ host: bip }).then(device => {
				device.schedule.getRules().then(info => {
                    res.end(JSON.stringify(info));
                })
			});

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