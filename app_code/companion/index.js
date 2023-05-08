// ================================================================
// This is a companion to pull log data from fitbit
// ================================================================


// ================================================================
// Import stuff common between this companion and the app
import {
  hrmConfig, accelConfig, gyroConfig, bpsConfig,
  setHRMConfig, setAccelConfig, setGyroConfig, setBPSConfig,
  accelLogPrefix, gyroLogPrefix, hrmLogPrefix, bpsLogPrefix,
  accelRecordSize, accelRecord, accelRecordTimeView,
  accelRecordXView, accelRecordYView, accelRecordZView,
  gyroRecordSize, gyroRecord, gyroRecordTimeView,
  gyroRecordXView, gyroRecordYView, gyroRecordZView,
  hrmRecordSize, hrmRecord, hrmRecordTimeView, hrmRecordHeartView,
  bpsRecordSize, bpsRecord, bpsRecordTimeView, bpsRecordPresView,
  hrmLogRecordMax, accelLogRecordMax, gyroLogRecordMax, bpsLogRecordMax,
  accelScaler, gyroScaler, setLogStartTime, setLogStopTime,
  logStartTime, logStopTime, getLogStartDelay, getLogStopDelay,
  appIsNone, appIsIdle, appIsTiming, appIsLogging, appIsXferring, appStatusString, appStatusColor,
  msgAppGist, msgStartLog, msgStopLog, msgStartXfer, msgStopXfer, msgResetLog, msgResetXfer,
  appDiskMB
} from '../common/common.js';

// Import inbox from file transfer module
import { inbox } from "file-transfer";

// Import settings module
import { settingsStorage } from "settings";

// Import peer socket from messaging module
import { peerSocket } from "messaging";
// ================================================================


// ================================================================
// Status of the App
let appStatus = appIsNone;

// Initialize the companion
init();

// Things to do when the companion is run
function init() {
  // Set up a callback for peer connection events
  // peerSocket.addEventListener("open", handlePeerOpen);
  peerSocket.addEventListener("close", handlePeerClose);
  peerSocket.addEventListener("message", handlePeerMessage);
  // peerSocket.addEventListener("error", handlePeerError);

  // Set a callback for settings change events
  settingsStorage.addEventListener('change', handleSettingsChange);

  // Display app status
  settingsStorage.setItem('appStatusText', `App is ${appStatusString[appStatus]}`);
  settingsStorage.setItem('resetLogBtnLabel', 'Reset Logging');
  settingsStorage.setItem('resetXferBtnLabel', 'Reset Transferring');

  // Process new files as they are received
  inbox.addEventListener("newfile", processAllFiles);

  let options = getConfigOptions();
  setConfigOptions(options);

  // Process files arrived when the companion wasn’t running
  processAllFiles()
}
// ================================================================


// ================================================================
// Process the change in settings
function handleSettingsChange(evnt) {
  // Check which setting changed
  console.log(`handleSettingsChange: ${evnt.key}`);
  switch (evnt.key) {
    case 'logBtnClick':
      // Start or stop logging based on current app status
      if (appStatus === appIsTiming || appStatus === appIsLogging) {
        sendMesg({ type: msgStopLog });
        // settingsStorage.setItem('logBtnLabel', 'Start Logging')
      } else if (appStatus === appIsIdle) {
        let options = getConfigOptions();
        sendMesg({ type: msgStartLog, data: options });
        // settingsStorage.setItem('logBtnLabel', 'Stop Logging')
      };
      return;
    case 'xferBtnClick':
      // Start or stop logging based on current app status
      if (appStatus === appIsXferring) {
        sendMesg({ type: msgStopXfer });
        // settingsStorage.setItem('xferBtnLabel', 'Start Transferring')
      } else if (appStatus === appIsIdle) {
        let options = getConfigOptions();
        setConfigOptions(options);
        sendMesg({ type: msgStartXfer });
        // settingsStorage.setItem('xferBtnLabel', 'Stop Transferring')
      };
      return;
    case 'resetLogBtnClick':
      // Start or stop logging based on current app status
      if (appStatus === appIsIdle) {
        sendMesg({ type: msgResetLog });
      };
      return;
    case 'resetXferBtnClick':
      // Start or stop logging based on current app status
      if (appStatus === appIsIdle) {
        sendMesg({ type: msgResetXfer });
      };
      return;
    default:
      return;
  }
}

// Get server URL for file transferring
function getServerURL() {
  let serverURL = JSON.parse(settingsStorage.getItem('serverURL')).name;
  return serverURL;
}

function getDiskSpaceLimit() {
  // By default, the disk space limit is set to 14.4M; However, some fitbit
  // watches might not have disk space of 14.4M available and the user has
  // to set it explicitly from the companion app.
  let diskSpaceLimit = appDiskMB;
  try {
    let diskLimit = JSON.parse(settingsStorage.getItem('diskSpace')).name;  
    if (diskLimit < diskSpaceLimit) {
      diskSpaceLimit = diskLimit
    }
  } catch (error) {
    // no diskSpace limit set from the companion app
  }
  return diskSpaceLimit;
}

// Get all configuration settings
function getConfigOptions() {
  let options = {};

  // Set device name and protocol name
  try {
    options.deviceName = JSON.parse(settingsStorage.getItem('deviceName')).name;
    options.protocolName = JSON.parse(settingsStorage.getItem('protocolName')).values[0].name;
    options.diskSpaceLimit = getDiskSpaceLimit();

    options.accelFreq = JSON.parse(settingsStorage.getItem('accelFreq')).values[0].name;
    options.gyroFreq = JSON.parse(settingsStorage.getItem('gyroFreq')).values[0].name;
    options.hrmFreq = JSON.parse(settingsStorage.getItem('hrmFreq')).values[0].name;
    // options.bpsFreq = JSON.parse(settingsStorage.getItem('bpsFreq')).values[0].name;
    options.bpsFreq = 1
    options.logStartTime = JSON.parse(settingsStorage.getItem('logStartTime')).values[0].value;
    options.logStopTime = JSON.parse(settingsStorage.getItem('logStopTime')).values[0].value;
  } catch (err) {
    console.log(err);
  }
  console.log(`Options: ${JSON.stringify(options)}`);

  return (options);
}

// Set the configuration options
function setConfigOptions(options) {
  setAccelConfig(options.accelFreq);
  setGyroConfig(options.gyroFreq);
  setHRMConfig(options.hrmFreq);
  setBPSConfig(options.bpsFreq);
}
// ================================================================


// ================================================================
// Send a message to the watch
function sendMesg(mesg) {
  if (peerSocket.readyState === peerSocket.OPEN) {
    peerSocket.send(mesg);
  } else {
    console.log("No peer socket connection");
  }
}

// Peer closed, update the status
function handlePeerClose() {
  // Set status to unknown
  appStatus = appIsNone;
  settingsStorage.setItem('appStatusText', `App is ${appStatusString[appStatus]}`);
}

// Process a message from the watch
function handlePeerMessage(evt) {
  let msg = evt.data;

  // Check the type of message
  console.log(`handlePeerMessage: type: ${msg.type} ${JSON.stringify(msg.data)}`)
  switch (msg.type) {
    case msgAppGist:
      // Update the status of the companion
      appStatus = msg.data.appStatus;

      // Toggle the button labels based on the change in status
      switch (appStatus) {
        case appIsIdle:
          settingsStorage.setItem('logBtnLabel', 'Start Logging');
          settingsStorage.setItem('xferBtnLabel', 'Start Transferring');
          break;
        case appIsTiming:
        case appIsLogging:
          settingsStorage.setItem('logBtnLabel', 'Stop Logging');
          break;
        case appIsXferring:
          settingsStorage.setItem('xferBtnLabel', 'Stop Transferring');
          break;
      }

      // if (appStatus === appIsIdle && msg.data.appStatus === appIsLogging) {
      //  settingsStorage.setItem('logBtnLabel', 'Stop Logging');
      // } else if (appStatus === appIsLogging && msg.data.appStatus === appIsIdle) {
      //  settingsStorage.setItem('logBtnLabel', 'Start Logging');
      // } else if (appStatus === appIsIdle && msg.data.appStatus === appIsXferring) {
      //  settingsStorage.setItem('xferBtnLabel', 'Start Transferring');
      // } else if (appStatus === appIsXferring && msg.data.appStatus === appIsIdle) {
      //  settingsStorage.setItem('xferBtnLabel', 'Stop Transferring');
      // }


      // Update the status text
      settingsStorage.setItem('appStatusText', `App is ${appStatusString[appStatus]}`);
      settingsStorage.setItem('logStatusText', `${msg.data.hrmLogCount} Heart, ${msg.data.accelLogCount} Accel, ${msg.data.gyroLogCount} Gyro files logged`);
      settingsStorage.setItem('xferStatusText', `${msg.data.hrmXferedCount} Heart, ${msg.data.accelXferedCount} Accel, ${msg.data.gyroXferedCount} Gyro files transferred`);
      
      let m = msg.data.totalFileSize / 1024 / 1024;
      m = m.toFixed(2);

      settingsStorage.setItem('fileSizeText', `Storage: ${m} MB`);
      return;
  }
}
// ================================================================


// ================================================================
// Read the contents of accel log file
function printAccelLog(data) {
  // Get the whole file
  let dataView = new DataView(data);
  let dataSize = data.byteLength;

  // Keep reading till no more records
  let readPos = 0
  let content = ''
  while (readPos < dataSize) {
    // Read the compressed record
    // Read a batch of time stamps (each 2 bytes)
    for (let i = 0; i < accelConfig.batch; i++) {
      accelRecordTimeView[i] = dataView.getUint16(readPos + i * 2, true)
    }
    readPos += accelConfig.batch * 2;

    // Read a batch of accelerometer x values (each 2 bytes)
    for (let i = 0; i < accelConfig.batch; i++) {
      // accelRecordXView[i] = dataView.getFloat32(readPos + i * 4, true)
      accelRecordXView[i] = dataView.getInt16(readPos + i * 2, true)
    }
    readPos += accelConfig.batch * 2;

    // Read a batch of accelerometer y values (each 2 bytes)
    for (let i = 0; i < accelConfig.batch; i++) {
      // accelRecordYView[i] = dataView.getFloat32(readPos + i * 4, true)
      accelRecordYView[i] = dataView.getInt16(readPos + i * 2, true)
    }
    readPos += accelConfig.batch * 2;

    // Read the batch of accelerometer z values (each 2 bytes)
    for (let i = 0; i < accelConfig.batch; i++) {
      // accelRecordZView[i] = dataView.getFloat32(readPos + i * 4, true)
      accelRecordZView[i] = dataView.getInt16(readPos + i * 2, true)
    }
    readPos += accelConfig.batch * 2;

    // Print each individual reading
    for (let i = 0; i < accelConfig.batch; i++) {
      // console.log(`A, ${accelRecordTimeView[i]}, ${accelRecordXView[i]}, ${accelRecordYView[i]}, ${accelRecordZView[i]}`);
      content += `A, ${accelRecordTimeView[i]}, ${accelRecordXView[i]}, ${accelRecordYView[i]}, ${accelRecordZView[i]}\n`;
    }
  }

  // return the content
  return (content);
}

// Read the contents of gyro log file
function printGyroLog(data) {
  // Get the whole file
  let dataView = new DataView(data);
  let dataSize = data.byteLength;

  // Keep reading till no more records
  let readPos = 0
  let content = ''
  while (readPos < dataSize) {
    // Read the compressed record
    // Read a batch of time stamps (each 2 bytes)
    for (let i = 0; i < gyroConfig.batch; i++) {
      gyroRecordTimeView[i] = dataView.getUint16(readPos + i * 2, true)
    }
    readPos += gyroConfig.batch * 2;

    // Read a batch of gyroscope x values (each 2 bytes)
    for (let i = 0; i < gyroConfig.batch; i++) {
      gyroRecordXView[i] = dataView.getInt16(readPos + i * 2, true)
    }
    readPos += gyroConfig.batch * 2;

    // Read a batch of gyroscope y values (each 4 bytes)
    for (let i = 0; i < gyroConfig.batch; i++) {
      gyroRecordYView[i] = dataView.getInt16(readPos + i * 2, true)
    }
    readPos += gyroConfig.batch * 2;

    // Read the batch of gyroscope z values (each 4 bytes)
    for (let i = 0; i < gyroConfig.batch; i++) {
      gyroRecordZView[i] = dataView.getInt16(readPos + i * 2, true)
    }
    readPos += gyroConfig.batch * 2;

    // Print each individual reading
    for (let i = 0; i < gyroConfig.batch; i++) {
      // console.log(`G, ${gyroRecordTimeView[i]}, ${gyroRecordXView[i]}, ${gyroRecordYView[i]}, ${gyroRecordZView[i]}`);
      content += `G, ${gyroRecordTimeView[i]}, ${gyroRecordXView[i]}, ${gyroRecordYView[i]}, ${gyroRecordZView[i]}\n`;
    }
  }

  // return the content
  return (content);
}

// Read the contents of heart rate log file
function printHRMLog(data) {
  // Get the whole file
  let dataView = new DataView(data);
  let dataSize = data.byteLength;

  // Keep reading till no more records
  let readPos = 0
  let content = ''
  while (readPos < dataSize) {
    // Read the compressed record
    // Read a batch of time stamps (each 2 bytes)
    for (let i = 0; i < hrmConfig.batch; i++) {
      hrmRecordTimeView[i] = dataView.getUint16(readPos + i * 2, true)
    }
    readPos += hrmConfig.batch * 2;

    // Read a batch of heart rate values (each 2 bytes)
    for (let i = 0; i < hrmConfig.batch; i++) {
      hrmRecordHeartView[i] = dataView.getUint16(readPos + i * 2, true)
    }
    readPos += hrmConfig.batch * 2;

    // Extract individual readings
    for (let i = 0; i < hrmConfig.batch; i++) {
      // console.log(`H, ${hrmRecordTimeView[i]}, ${hrmRecordHeartView[i]}`);
      content += `H, ${hrmRecordTimeView[i]}, ${hrmRecordHeartView[i]}\n`;
    }
  }

  // return the content
  return (content);
}

// Read the contents of body presence log file
function printBPSLog(data) {
  // Get the whole file
  let dataView = new DataView(data);
  let dataSize = data.byteLength;

  // Keep reading till no more records
  let readPos = 0;
  let content = '';
  while (readPos < dataSize) {
    // Read a time stamp (4 bytes)
    let time1 = dataView.getUint32(readPos, true);
    readPos += 4;
    let time2 = dataView.getUint32(readPos, true);
    readPos += 4;
    let time = (time1 * Math.pow(2, 32)) + time2;

    let pres = dataView.getUint32(readPos, true)
    readPos += 4;

    // console.log(`P, ${time}, ${pres}`);
    content += `P, ${time}, ${pres}\n`;
  }

  // return the content
  return (content);
}

// Send the data to the web server
function sendToServer(name, data) {
  console.log(`sendToServer(): content = ${data}`)
  console.log(`Sending ${name} to server ...`)
  // const headers = { 'Content-type': 'application/text', 'QUERY_STRING': name, 'HTTP_COOKIE': name }
  const headers = { 'FILENAME': name }
  let fetchInit = { method: 'POST', headers: headers, body: data }
  // let fetchInit = {method: 'POST', headers: {"Content-type": "application/octet-stream"}, body: data}
  //console.log(`${serverURL} ${fetchInit}`);
  let serverURL = getServerURL();
  //console.log(serverURL);
  fetch(serverURL, fetchInit);
  console.log(`Done sending ${name} to server`);
}

// Process the inbox queue for files
async function processAllFiles() {
  let file
  while ((file = await inbox.pop())) {
    // Get data from the file
    let data = await file.arrayBuffer();

    // Dump the log file
    let text;
    console.log(`Begin log ${file.name} size ${file.length} B`);
    if (file.name.indexOf(accelLogPrefix) != -1) {
      text = printAccelLog(data)
    }
    else if (file.name.indexOf(gyroLogPrefix) != -1) {
      text = printGyroLog(data)
    }
    else if (file.name.indexOf(hrmLogPrefix) != -1) {
      text = printHRMLog(data)
    }
    else if (file.name.indexOf(bpsLogPrefix) != -1) {
      text = printBPSLog(data)
    }
    //console.log(text);
    console.log(`End log ${file.name}`);

    // Send the log to server
    let name = `${file.name.replace("bin", "csv")}`
    sendToServer(name, text)
  }
}
// ================================================================
