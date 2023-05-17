// ================================================================
// This app records batched sensor readings
// Stores sensor readings in multiple files for reliable transfer
// ================================================================


// ================================================================
// Import stuff common between this app and companion
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
  appIsNone, appIsIdle, appIsTiming, appIsLogging, appIsXferring, appIsDeleting,
  appStatusString, appStatusColor,
  msgAppGist, msgStartLog, msgStopLog, msgStartXfer, msgStopXfer, msgResetLog, msgResetXfer,
  generateFileName,
} from '../common/common.js';

import { listDirSync } from "fs";

// Import file system module
import * as fs from "fs";

// Import outbox from file transfer module
import { outbox } from "file-transfer";

// Import peer socket from messaging module
import { peerSocket } from "messaging";

// Import me to run the app indefinitely
import { me } from "appbit";

// Import scientific modules
import * as scientific from "scientific";

// Import sensor modules
import { Accelerometer } from "accelerometer";
import { HeartRateSensor } from "heart-rate";
import { Gyroscope } from "gyroscope";
import { BodyPresenceSensor } from "body-presence";

// Import UI related module
import * as document from "document";
// ================================================================


// ================================================================
// Sensor instances
let accel, gyro, hrm, bps;

// Accel and Gyro log files end with a number, starting with 1
// Once it hits a record limit, start logging in the next file
// let accelLogFile, gyroLogFile, hrmLogFile, bpsLogFile;

// Name of the file that stores past state
const gistFile = 'gist.cbor'

// File descriptor for the log files
let accelLogFD = null, gyroLogFD = null, hrmLogFD = null, bpsLogFD = null;

// Status of the App
let appStatus = appIsNone;

// Number of log files generated
let accelLogCount = 0, gyroLogCount = 0, hrmLogCount = 0, bpsLogCount = 0, totalCount = 0;

// Get hold of current writing log files 
let currAccelLogFile, currGyroLogFile, currHrmLogFile, currBpsLogFile;

// Number of records in the current log file
let accelCurrLogRecordCount = 0, gyroCurrLogRecordCount = 0;
let hrmCurrLogRecordCount = 0, bpsCurrLogRecordCount = 0;
let hrmPrevTimestamp = -1;

// Status of log file transfers
let accelXferedCount = 0, gyroXferedCount = 0, hrmXferedCount = 0, bpsXferedCount = 0;
let totalXferedCount = 0, totalFileSize = 0;

// Get hold of all the UI elements
const appStatusText = '', logStatusText = '', xferStatusText = '', fileSizeText = '', appBackground = '';

// Timers to remeber for canceling if needed
let timerLogStart, timerLogStop;

let experimentID, deviceName, protocolName, diskSpaceLimit;
// ================================================================


// ================================================================
// Make a gist of the app status
function getAppGist() {
  return ({
    appStatus: appStatus,

    accelLogCount: accelLogCount,
    gyroLogCount: gyroLogCount,
    hrmLogCount: hrmLogCount,
    bpsLogCount: bpsLogCount,
    totalCount: totalCount,

    // accelCurrLogRecordCount: accelCurrLogRecordCount,
    // gyroCurrLogRecordCount: gyroCurrLogRecordCount,
    // hrmCurrLogRecordCount: hrmCurrLogRecordCount,
    // bpsCurrLogRecordCount: bpsCurrLogRecordCount,

    accelXferedCount: accelXferedCount,
    gyroXferedCount: gyroXferedCount,
    hrmXferedCount: hrmXferedCount,
    bpsXferedCount: bpsXferedCount,
    totalXferedCount: totalXferedCount,

    totalFileSize: totalFileSize
  });
}

// Set the app status from the given gist
function setAppGist(gist) {
  appStatus = gist.appStatus;

  accelLogCount = gist.accelLogCount;
  gyroLogCount = gist.gyroLogCount;
  hrmLogCount = gist.hrmLogCount;
  bpsLogCount = gist.bpsLogCount;
  totalCount = gist.totalCount;

  // accelCurrLogRecordCount = gist.accelCurrLogRecordCount;
  // gyroCurrLogRecordCount = gist.gyroCurrLogRecordCount;
  // hrmCurrLogRecordCount = gist.hrmCurrLogRecordCount;
  // bpsCurrLogRecordCount = gist.bpsCurrLogRecordCount;

  accelXferedCount = gist.accelXferedCount;
  gyroXferedCount = gist.gyroXferedCount;
  hrmXferedCount = gist.hrmXferedCount;
  bpsXferedCount = gist.bpsXferedCount;
  totalXferedCount = gist.totalXferedCount;

  totalFileSize = gist.totalFileSize;
}

// Notify the app state to companion
// It includes 1) update clock face, and 2) send gist to companion
// 

function updateClockFace() {
  // Update the status text on the clock face
  appStatusText.text = `App: ${appStatusString[appStatus]}`;
  logStatusText.text = `Log: ${hrmLogCount} H, ${accelLogCount} A, ${gyroLogCount} G`;
  xferStatusText.text = `Xfer: ${hrmXferedCount} H, ${accelXferedCount} A, ${gyroXferedCount} G`;

  let m = totalFileSize / 1024 / 1024;
  m = m.toFixed(2);

  fileSizeText.text = `${totalCount} Files: ${m} M`;
  appBackground.style.fill = appStatusColor[appStatus];
}

function sendGist2Companion() {
  // Send the gist to companion
  if (peerSocket.readyState === peerSocket.OPEN) {
    let mesg = { type: msgAppGist, data: getAppGist() }
    peerSocket.send(mesg);
  } else {
    console.log('Socket not in open state');
  }
}

function notifyGist() {
  updateClockFace();
  sendGist2Companion();
}
// ================================================================

// Count all files upon starting of the app.
function countAllFiles() {
  const listDir = listDirSync("/private/data");

  let dirIter;
  let count = 0;

  while ((dirIter = listDir.next()) && !dirIter.done) {
    count += 1;
  }

  return count;
}

function deleteAllFiles() {
  // Delete 50 files a time
  let n = 50;

  appStatus = appIsDeleting;

  let count = deleteFiles(n);
  if (count >= n) {
    setTimeout(deleteAllFiles, 1000);
  } else {
    // Finished deleting all files
    totalFileSize = 0;

    // Reset the logging file/record status
    accelLogCount = 0;
    gyroLogCount = 0;
    hrmLogCount = 0;
    bpsLogCount = 0;
  
    accelCurrLogRecordCount = 0;
    gyroCurrLogRecordCount = 0;
    hrmCurrLogRecordCount = 0;
    bpsCurrLogRecordCount = 0;

    appStatus = appIsIdle;

  }
  totalCount = totalCount - count;

  notifyGist();
}

//Delete (at most) n files
function deleteFiles(n) {
  if (n <= 0) return 0;

  const listDir = fs.listDirSync("/private/data");

  let dirIter;
  let count = 0;

  while ((dirIter = listDir.next()) && !dirIter.done) {
    if (count >= n) break;

    let filename = dirIter.value;

    if (filename.indexOf('gist') < 0) {
      try {
        fs.unlinkSync(filename);
        count += 1;
      } catch (error) {
        console.log(`unlink file ${filename} failed.`)
      }
    }
  }
  return count;
}


// List all files on the disk and check their total size.
// This founction might take long time to check sizes of all files, if the number
// of files is more than 100. It might cause fitbit app to crash (unresponsive).
// 
function listDirFiles() {
  const listDir = listDirSync("/private/data");
  let dirIter = listDir.next();
  let accelFileCount = 0, gyroFileCount = 0, hrmFileCount = 0, bpsFileCount = 0;

  //totalFileSize = 0;
  let count = 0;

  while (!dirIter.done) {
    let filename = dirIter.value;
    console.log(filename);

    if (filename.indexOf(accelLogPrefix) != -1) {
      accelFileCount += 1;
    }
    if (filename.indexOf(gyroLogPrefix) != -1) {
      gyroFileCount += 1;
    }
    if (filename.indexOf(hrmLogPrefix) != -1) {
      hrmFileCount += 1;
    }
    if (filename.indexOf(bpsLogPrefix) != -1) {
      bpsFileCount += 1;
    }

    count += 1;
    dirIter = listDir.next();
  }
  console.log(`Accel Files: ${accelFileCount}`);
  console.log(`Gyro Files: ${gyroFileCount}`);
  console.log(`Heart Files: ${hrmFileCount}`);
  console.log(`Presence Files: ${bpsFileCount}`);
  //console.log(`totalSize: ${totalFileSize}`);
  console.log(`totalFiles: ${count}`);
}

// ================================================================
// Start with initializing the app
openApp();

// Initialize the app
function openApp() {
  // Set the app to run indefinitely
  me.appTimeoutEnabled = false;

  // Set up a callback for peer connection open event
  peerSocket.addEventListener("open", handlePeerOpen);

  // Set up a callback for peer connection close event
  // peerSocket.addEventListener("close", handlePeerClose);

  // Set up a callback for handling message from peer
  peerSocket.addEventListener("message", handlePeerMessage);

  // Set up a callback for handling error with peer connection
  // peerSocket.addEventListener("error", handlePeerError);

  // Set up a callback for unload event
  me.onunload = closeApp;

  // Create instances of sensors
  instantiateSensors();

  // Get hold of handles for UI elements
  appStatusText = document.getElementById('appStatusText');
  logStatusText = document.getElementById('logStatusText');
  xferStatusText = document.getElementById('xferStatusText');
  fileSizeText = document.getElementById('fileSizeText');
  appBackground = document.getElementById("appBackground");

  // Check if this app was run before
  if (fs.existsSync(gistFile)) {
    // Restore the past state
    setAppGist(fs.readFileSync(gistFile, "cbor"));
  }


  totalCount = countAllFiles();

  // Debug purpose
   listDirFiles();

  // Set status to idle
  appStatus = appIsIdle;
  notifyGist();
}

// Close the app
function closeApp() {
  console.log("close App ...");
  // Stop the current operation
  if (appStatus === appIsLogging) {
    // Logging is in progress, stop it
    stopRec();
  }

  // Set status to idle and notify companion
  appStatus = appIsIdle;
  sendGist2Companion();

  // Save the app state
  fs.writeFileSync(gistFile, getAppGist(), "cbor");
}
// ================================================================


// ================================================================
// Process a message from the companion
function handlePeerOpen() {
  // Send gist to companion
  console.log('Peer socket connection open');
  notifyGist();
}

// Process a message from the companion
function handlePeerMessage(evt) {
  // Check the type of message
  let msg = evt.data;
  console.log(`Message: type: ${msg.type}, data: ${JSON.stringify(msg.data)}`);
  switch (msg.type) {
    case msgStartLog:
      doStartLog(msg.data);
      return;
    case msgStopLog:
      doStopLog();
      return;
    case msgStartXfer:
      doStartXfer();
      return;
    case msgStopXfer:
      doStopXfer();
      return;
    case msgResetLog:
      doResetLog();
      return;
    case msgResetXfer:
      doResetXfer();
      return;
  }
}


// Process the start log message
function doStartLog(options) {
  console.log(`doStartLog: options ${JSON.stringify(options)}`);

  // This is allowed only when the app is idle
  if (appStatus != appIsIdle) {
    console.error(`doStartLog: Invalid when appStatus = ${appStatus}`);
    return;
  }

  // Set the options for logging
  setAccelConfig(options.accelFreq);
  setGyroConfig(options.gyroFreq);
  setHRMConfig(options.hrmFreq);
  setBPSConfig(options.bpsFreq);
  setLogStartTime(options.logStartTime);
  setLogStopTime(options.logStopTime);

  deviceName = options.deviceName;
  protocolName = options.protocolName;
  diskSpaceLimit = options.diskSpaceLimit;

  // Schedule the start of logging
  timerLogStart = null;
  timerLogStop = null;
  if (logStartTime === logStopTime) {
    // Logging enabled at all times
    // Start logging right now
    startRec();

    // Change status to logging
    appStatus = appIsLogging;
  } else {
    // Logging is restricted to certain intervals
    // Find the time to start of logging
    let delay = getLogStartDelay();

    console.log(`Log start delay is ${delay} ms.`)

    if (delay > 0) {
      // Start logging after some delay
      timerLogStart = setTimeout(startRec, delay);

      // Change status to timing
      appStatus = appIsTiming;
    } else {
      // Start logging right now
      startRec();

      // Change status to logging
      appStatus = appIsLogging;
    }

    // Schedule the end of logging
    delay = getLogStopDelay();
    console.log(`Log stop delay is ${delay} ms.`)
    timerLogStop = setTimeout(stopRec, delay);
  }

  // Notify companion
  notifyGist();
}

// Process the stop log message
function doStopLog() {
  console.log(`doStopLog`);

  // This is allowed only when the app is on or logging
  if (appStatus != appIsTiming && appStatus != appIsLogging) {
    console.error(`doStopLog: Invalid when appStatus = ${appStatus}`);
    return;
  }

  // Check if already started logging
  if (appStatus === appIsLogging) {
    // Logging is in progress, stop it
    stopRec();

    // Cancel the log stop timer
    if (timerLogStop) { clearTimeout(timerLogStop); timerLogStop = null; }
  } else {
    // Logging has not started, cancel timers
    if (timerLogStart) { clearTimeout(timerLogStart); timerLogStart = null; }
    if (timerLogStop) { clearTimeout(timerLogStop); timerLogStop = null; }
  }

  // Change status to idle and notify companion
  appStatus = appIsIdle;
  notifyGist();
}

// Process the start transfer message
function doStartXfer() {
  console.log(`doStartXfer: `);

  // This is allowed only when the app is idle
  if (appStatus != appIsIdle) {
    console.error(`doStartXfer: Invalid when appStatus = ${appStatus}`);
    return;
  }

  // Change status to idle and notify companion
  appStatus = appIsXferring;
  notifyGist();


  // Start transferring log files
  //xferNextFile();
  listAndXferFiles();
}

// Process the stop transfer message
function doStopXfer() {
  console.log(`doStopXfer: `);

  // This is allowed only when the app is transferring
  if (appStatus != appIsXferring) {
    console.error(`doStopXfer: Invalid when appStatus = ${appStatus}`);
    return;
  }

  // Change status to idle and notify companion
  appStatus = appIsIdle;
  notifyGist();
}

// Process the reset log message
function doResetLog() {
  console.log(`doResetLog: `);

  // This is allowed only when the app is idle
  if (appStatus != appIsIdle) {
    console.error(`doResetLog: Invalid when appStatus = ${appStatus}`);
    return;
  }

  appStatus = appIsDeleting;
  deleteAllFiles();
}

// Process the reset transfer message
function doResetXfer() {
  console.log(`doResetXfer: `);

  // This is allowed only when the app is idle
  if (appStatus != appIsIdle) {
    console.error(`doResetXfer: Invalid when appStatus = ${appStatus}`);
    return;
  }

  // Reset the transfer file status
  accelXferedCount = 0;
  gyroXferedCount = 0;
  hrmXferedCount = 0;
  bpsXferedCount = 0;
  totalXferedCount = 0;

  // Notify companion
  notifyGist();
}
// ================================================================


// ================================================================
// Instantiate sensors
function instantiateSensors() {
  // Instantiate accelerometer
  accel = new Accelerometer();
  accel.addEventListener("reading", logAccel);

  // Instantiate  gyroscope
  gyro = new Gyroscope();
  gyro.addEventListener("reading", logGyro);

  // Instantiate heart rate monitor
  hrm = new HeartRateSensor();
  hrm.addEventListener("reading", logHeart);

  // Instantiate body presence sensor
  bps = new BodyPresenceSensor();
  bps.addEventListener("reading", logPresence);
}

// Activate sensors for reading data
function activateSensors() {
  // Activate accelerometer
  if (accelConfig.frequency) {
    accel.setOptions(accelConfig);
    accel.start();
  };

  // Activate gyroscope
  if (gyroConfig.frequency) {
    gyro.setOptions(gyroConfig);
    gyro.start();
  };

  // Activate heart rate monitor
  if (hrmConfig.frequency) {
    hrm.setOptions(hrmConfig);
    hrm.start();
  };

  // Activate body presence sensor
  if (bpsConfig.frequency) {
    bps.start();
  };
}

// Deactivate sensors
function deactivateSensors() {
  accel.stop();
  gyro.stop();
  hrm.stop();
  bps.stop();
}
// ================================================================


// ================================================================
// Start recording sensor data
function startRec() {
  // Note down the start time
  console.log(`Logging Started at ${Date.now()}`);

  // Generate experiment ID
  experimentID = Date.now();

  // Start reading sensors
  activateSensors();

  // Change status to logging and notify companion
  appStatus = appIsLogging;
  notifyGist();
}

// Stop reading sensor data and close logging files and reset parameters 
function stopRec() {
  console.log("stop Rec");

  // Stop reading sensors
  deactivateSensors();

  // Close all the log files
  try {
    if (accelLogFD) {
      fs.closeSync(accelLogFD);
      let stats = fs.statSync(currAccelLogFile);
      totalFileSize += stats.size;
    }
    if (gyroLogFD) {
      fs.closeSync(gyroLogFD);
      stats = fs.statSync(currGyroLogFile);
      totalFileSize += stats.size;
    }
    if (hrmLogFD) {
      fs.closeSync(hrmLogFD);
      stats = fs.statSync(currHrmLogFile);
      totalFileSize += stats.size;
    }
    if (bpsLogFD) {
      fs.closeSync(bpsLogFD);
      stats = fs.statSync(currBpsLogFile);
      totalFileSize += stats.size;
    }
  } catch (error) {
    console.log(error);
  }

  // reset log count
  accelCurrLogRecordCount = 0;
  gyroCurrLogRecordCount = 0;
  hrmCurrLogRecordCount = 0;
  bpsCurrLogRecordCount = 0;

  // Change status to idle and notify companion
  appStatus = appIsIdle;

  // Note down the stop time
  console.log(`Logging stopped at ${Date.now()}`);
  notifyGist();
}
// ================================================================

// Log accelerometer readings
function logAccel() {
  let firstRecordTimestamp = 0;

  // Convert acceleration in float to a 16-bit integer
  let x = scientific.div(accel.readings.x, accelScaler);
  let y = scientific.div(accel.readings.y, accelScaler);
  let z = scientific.div(accel.readings.z, accelScaler);

  let dataLength = accel.readings.timestamp.length;
  for (let i = 0; i < dataLength; i++) {
    if (i == 0) {
      // 32-bit timestamp of the first record of the batch.
      firstRecordTimestamp = accel.readings.timestamp[0];
    }
    accelRecordTimeView[i] = accel.readings.timestamp[i]; // cast to a 16-bit integer
    accelRecordXView[i] = Math.round(x[i]);
    accelRecordYView[i] = Math.round(y[i]);
    accelRecordZView[i] = Math.round(z[i]);
  }

  if (dataLength > 0) {
    // Check if we need to start a new log file
    if (accelCurrLogRecordCount == 0) {
      // Start a new log file
      accelLogCount += 1;
      totalCount += 1;

      currAccelLogFile = generateFileName(deviceName, protocolName, accelLogPrefix, accelConfig.frequency, accelLogCount, experimentID, firstRecordTimestamp);
      accelLogFD = fs.openSync(currAccelLogFile, "a");
    }

    fs.writeSync(accelLogFD, accelRecord);

    // Update the number of records
    accelCurrLogRecordCount += dataLength;

    if (accelCurrLogRecordCount >= accelLogRecordMax) {
      // Record limit reached.
      // Close the current log file
      fs.closeSync(accelLogFD);

      let stats = fs.statSync(currAccelLogFile);
      totalFileSize += stats.size;

      if (totalFileSize > diskSpaceLimit * 1024 * 1024) {
        doStopLog();
      }

      // Reset the record count
      accelCurrLogRecordCount = 0;

      // Send gist to companion
      notifyGist();
    }
  }
}

// Log gyroscope readings
function logGyro() {
  let firstRecordTimestamp = 0;

  // Convert gyro measurements in float to a 16-bit integer
  let x = scientific.div(gyro.readings.x, gyroScaler);
  let y = scientific.div(gyro.readings.y, gyroScaler);
  let z = scientific.div(gyro.readings.z, gyroScaler);

  let dataLength = gyro.readings.timestamp.length;
  for (let i = 0; i < dataLength; i++) {
    if (i == 0) {
      firstRecordTimestamp = gyro.readings.timestamp[0];
    }
    gyroRecordTimeView[i] = gyro.readings.timestamp[i];
    gyroRecordXView[i] = Math.round(x[i]);
    gyroRecordYView[i] = Math.round(y[i]);
    gyroRecordZView[i] = Math.round(z[i]);
  }

  if (dataLength > 0) {
    // Check if we need to start a new log file
    if (gyroCurrLogRecordCount == 0) {
      // Start a new log file
      gyroLogCount += 1;
      totalCount += 1;

      currGyroLogFile = generateFileName(deviceName, protocolName, gyroLogPrefix, gyroConfig.frequency, gyroLogCount, experimentID, firstRecordTimestamp);
      gyroLogFD = fs.openSync(currGyroLogFile, "a");
    }

    fs.writeSync(gyroLogFD, gyroRecord);

    // Update the number of records
    gyroCurrLogRecordCount += dataLength;

    // Check if we need to start a new log file
    if (gyroCurrLogRecordCount >= gyroLogRecordMax) {
      // Record limit reached.
      // Close the current log file
      fs.closeSync(gyroLogFD);

      let stats = fs.statSync(currGyroLogFile);
      totalFileSize += stats.size;

      if (totalFileSize > diskSpaceLimit * 1024 * 1024) {
        doStopLog();
      }

      // Reset the record count
      gyroCurrLogRecordCount = 0;

      // Send gist to companion
      notifyGist();
    }
  }
}


// Log heart rate readings
// The heart rate sensor might stop working if the user takes off the watch.
// First, we always set the heart rate logging 1 HZ and batch_size=1;
// Second, we have to check the timestamp gaps while logging. If the 
// current heart rate timestamp is 10 seconds more than the previous logged
// timestamp, we close the current file and start a new file.
function logHeart() {
  let firstRecordTimestamp = 0;

  // Convert heart measurements in float to a 16-bit integer
  let dataLength = hrm.readings.timestamp.length;
  for (let i = 0; i < dataLength; ++i) {
    if (i == 0) {
      firstRecordTimestamp = hrm.readings.timestamp[0];
    }
    hrmRecordTimeView[i] = hrm.readings.timestamp[i];
    hrmRecordHeartView[i] = hrm.readings.heartRate[i];
  }

  if (dataLength > 0) {
    // Check if we need to start a new log file
    if (hrmCurrLogRecordCount == 0) {
      // Start a new log file
      hrmLogCount += 1;
      totalCount += 1;

      currHrmLogFile = generateFileName(deviceName, protocolName, hrmLogPrefix, hrmConfig.frequency, hrmLogCount, experimentID, firstRecordTimestamp);
      hrmLogFD = fs.openSync(currHrmLogFile, "a");
    }

    fs.writeSync(hrmLogFD, hrmRecord);

    // Update the number of records
    hrmCurrLogRecordCount += dataLength;

    // Check if we need to start a new log file
    if (hrmCurrLogRecordCount >= hrmLogRecordMax) {
      // Record limit reached.
      // Close the current log file
      fs.closeSync(hrmLogFD);

      let stats = fs.statSync(currHrmLogFile);
      totalFileSize += stats.size;

      if (totalFileSize > diskSpaceLimit * 1024 * 1024) {
        doStopLog();
      }

      // Reset the record count
      hrmCurrLogRecordCount = 0;

      // Send gist to companion
      notifyGist();
    }
  }
}

// Log body presence status
function logPresence() {
  let currTime = Date.now()

  // Check if we need to start a new log file
  if (bpsCurrLogRecordCount == 0) {
    // Start a new log file
    bpsLogCount += 1;
    totalCount += 1;

    currBpsLogFile = generateFileName(deviceName, protocolName, bpsLogPrefix, bpsConfig.frequency, bpsLogCount, experimentID, currTime);
    bpsLogFD = fs.openSync(currBpsLogFile, "a");
  }

  bpsRecordTimeView[0] = (currTime / Math.pow(2, 32));
  bpsRecordTimeView[1] = (currTime & (Math.pow(2, 32) - 1));
  bpsRecordPresView[0] = bps.present;
  fs.writeSync(bpsLogFD, bpsRecord);

  // Update the number of records
  bpsCurrLogRecordCount += 1

  // Check if we need to start a new log file
  if (bpsCurrLogRecordCount >= bpsLogRecordMax) {
    // Record limit reached.
    // Close the current log file
    fs.closeSync(bpsLogFD);

    let stats = fs.statSync(currBpsLogFile);
    totalFileSize += stats.size;

    if (totalFileSize > diskSpaceLimit * 1024 * 1024) {
      doStopLog();
    }

    // Reset the record count
    bpsCurrLogRecordCount = 0;

    // Send gist to companion
    notifyGist();
  }
}
// ================================================================


// ================================================================
// Read the contents of accel log file
function printAccelLog(logFile) {
  // Note the size of the log file
  let logFileSize = fs.statSync(logFile).size;
  console.log(`Begin log ${logFile} size ${logFileSize}`);

  // Open the log file
  let logFD = fs.openSync(logFile, 'r');

  // Keep reading till no more records
  let readPos = 0;
  while (readPos < logFileSize) {
    fs.readSync(logFD, accelRecord, 0, accelRecordSize, readPos);
    readPos += accelRecordSize;

    // Extract individual readings
    for (let i = 0; i < accelConfig.batch; i++) {
      console.log(`A, ${accelRecordTimeView[i]}, ${accelRecordXView[i]}, ${accelRecordYView[i]}, ${accelRecordZView[i]}`);
    }
  }

  // Reached end of file
  console.log(`End log ${logFile}`);

  // Close the log file
  fs.closeSync(logFD);
}

// Read the contents of Gyro log file
function printGyroLog(logFile) {
  // Note the size of the log file
  let logFileSize = fs.statSync(logFile).size;
  console.log(`Begin log ${logFile} size ${logFileSize}`);

  // Open the log file
  let logFD = fs.openSync(logFile, 'r');

  // Keep reading till no more records
  let readPos = 0;
  while (readPos < logFileSize) {
    fs.readSync(logFD, gyroRecord, 0, gyroRecordSize, readPos);
    readPos += gyroRecordSize;

    // Extract individual readings
    for (let i = 0; i < gyroConfig.batch; i++) {
      console.log(`G, ${gyroRecordTimeView[i]}, ${gyroRecordXView[i]}, ${gyroRecordYView[i]}, ${gyroRecordZView[i]}`);
    }
  }

  // Reached end of file
  console.log(`End log ${logFile}`);

  // Close the log file
  fs.closeSync(logFD);
}

// Read the contents of HRM log file
function printHRMLog(logFile) {
  // Note the size of the log file
  let logFileSize = fs.statSync(logFile).size;
  console.log(`Begin log ${logFile} size ${logFileSize}`);

  // Open the log file
  let logFD = fs.openSync(logFile, 'r');

  // Keep reading till no more records
  let readPos = 0;
  while (readPos < logFileSize) {
    fs.readSync(logFD, hrmRecord, 0, hrmRecordSize, readPos);
    readPos += hrmRecordSize;

    // Extract individual readings
    for (let i = 0; i < hrmConfig.batch; i++) {
      console.log(`H, ${hrmRecordTimeView[i]}, ${hrmRecordHeartView[i]}`);
    }
  }

  // Reached end of file
  console.log(`End log ${logFile}`);

  // Close the log file
  fs.closeSync(logFD);
}

// Read the contents of BPS log file
function printBPSLog(logFile) {
  // Note the size of the log file
  let logFileSize = fs.statSync(logFile).size;
  console.log(`Begin log ${logFile} size ${logFileSize}`);

  // Open the log file
  let logFD = fs.openSync(logFile, 'r');

  // Keep reading till no more records
  let readPos = 0;
  while (readPos < logFileSize) {
    fs.readSync(logFD, bpsRecord, 0, bpsRecordSize, readPos);
    readPos += bpsRecordSize;

    // Extract individual readings
    for (let i = 0; i < 1; i++) {
      console.log(`P, ${bpsRecordTimeView[i]}, ${bpsRecordPresView[i]}`);
    }
  }

  // Reached end of file
  console.log(`End log ${logFile}`);

  // Close the log file
  fs.closeSync(logFD);
}

// Prints all the log files on the watch
function printLogFiles() {
  // Go through the directory and print accel and gyro logs
  const listDir = fs.listDirSync("/private/data");
  let dirIter;
  while ((dirIter = listDir.next()) && !dirIter.done) {
    // Check if it is a bps log file
    if (dirIter.value.indexOf(bpsLogPrefix) != -1) {
      printBPSLog(dirIter.value)
    }
    // Check if it is a hrm log file
    else if (dirIter.value.indexOf(hrmLogPrefix) != -1) {
      printHRMLog(dirIter.value)
    }
    // Check if it is a gyro log file
    else if (dirIter.value.indexOf(accelLogPrefix) != -1) {
      printAccelLog(dirIter.value)
    }
    // Check if it is a gyro log file
    else if (dirIter.value.indexOf(gyroLogPrefix) != -1) {
      printGyroLog(dirIter.value)
    }
  }
}
// ================================================================

function listAndXferFiles() {
  const listDir = listDirSync("/private/data");
  let dirIter = listDir.next();
  let fileArray = [];
  let i = 0;
  while (!dirIter.done) {
    let filename = dirIter.value;

    if ((filename.indexOf(accelLogPrefix) != -1) ||
      (filename.indexOf(gyroLogPrefix) != -1) ||
      (filename.indexOf(hrmLogPrefix) != -1) ||
      (filename.indexOf(bpsLogPrefix) != -1)) {
      fileArray[i] = filename;
      i += 1;
    }

    dirIter = listDir.next();
  }

  if (totalXferedCount >= fileArray.length) {
    appStatus = appIsIdle;
    notifyGist();
  } else {
    xferFilesSequentially(fileArray, totalXferedCount);
  }
}

function xferFilesSequentially(fileArray, i) {
  if (i < 0 || i >= fileArray.length) return;

  outbox
    .enqueueFile(fileArray[i])
    .then((ft) => {
      ft.onchange = () => {
        if (ft.readyState == 'transferred') {
          //console.log('Transfer of ' + ft.name + ' completed.');

          if (ft.name.indexOf(accelLogPrefix) != -1) {
            accelXferedCount += 1;
          } else if (ft.name.indexOf(gyroLogPrefix) != -1) {
            gyroXferedCount += 1;
          } else if (ft.name.indexOf(hrmLogPrefix) != -1) {
            hrmXferedCount += 1;
          } else if (ft.name.indexOf(bpsLogPrefix) != -1) {
            bpsXferedCount += 1;
          }

          totalXferedCount += 1;

          if (totalXferedCount >= fileArray.length) {
            appStatus = appIsIdle;
          }
          notifyGist();

          if (appStatus == appIsXferring) {
            xferFilesSequentially(fileArray, i + 1);
          }
        }
      }
    })
    .catch((error) => {
      console.log(`Failed to schedule transfer: ${error}`);
    });
}

function xferSingleFile(filename) {
  outbox
    .enqueueFile(filename)
    .then((ft) => {
      ft.onchange = () => {
        if (ft.readyState == 'transferred') {
          console.log('Transfer of ' + ft.name + ' completed.');
        }
      }
    })
    .catch((error) => {
      console.log(`Failed to schedule transfer: ${error}`);
    });
}
// ================================================================
