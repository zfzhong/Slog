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
  appIsNone, appIsIdle, appIsTiming, appIsLogging, appIsXferring, appStatusString, appStatusColor,
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
let accelLogFD, gyroLogFD, hrmLogFD, bpsLogFD;

// Status of the App
let appStatus = appIsNone;

// Number of log files generated
let accelLogCount = 0, gyroLogCount = 0, hrmLogCount = 0, bpsLogCount = 0;

// Number of records in the current log file
let accelCurrLogRecordCount = 0, gyroCurrLogRecordCount = 0;
let hrmCurrLogRecordCount = 0, bpsCurrLogRecordCount = 0;

// Status of log file transfers
let accelXferedCount = 0, gyroXferedCount = 0, hrmXferedCount = 0, bpsXferedCount = 0, totalXferedCount = 0;

// Get hold of all the UI elements
const appStatusText, logStatusText, xferStatusText, appErrorText, appBackground;

// Timers to remeber for canceling if needed
let timerLogStart, timerLogStop;

let experimentID, deviceName, protocolName;
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

    accelCurrLogRecordCount: accelCurrLogRecordCount,
    gyroCurrLogRecordCount: gyroCurrLogRecordCount,
    hrmCurrLogRecordCount: hrmCurrLogRecordCount,
    bpsCurrLogRecordCount: bpsCurrLogRecordCount,

    accelXferedCount: accelXferedCount,
    gyroXferedCount: gyroXferedCount,
    hrmXferedCount: hrmXferedCount,
    bpsXferedCount: bpsXferedCount,
    totalXferedCount: totalXferedCount
  });
}

// Set the app status from the given gist
function setAppGist(gist) {
  appStatus = gist.appStatus;

  accelLogCount = gist.accelLogCount;
  gyroLogCount = gist.gyroLogCount;
  hrmLogCount = gist.hrmLogCount;
  bpsLogCount = gist.bpsLogCount;

  accelCurrLogRecordCount = gist.accelCurrLogRecordCount;
  gyroCurrLogRecordCount = gist.gyroCurrLogRecordCount;
  hrmCurrLogRecordCount = gist.hrmCurrLogRecordCount;
  bpsCurrLogRecordCount = gist.bpsCurrLogRecordCount;

  accelXferedCount = gist.accelXferedCount;
  gyroXferedCount = gist.gyroXferedCount;
  hrmXferedCount = gist.hrmXferedCount;
  bpsXferedCount = gist.bpsXferedCount;
  totalXferedCount = gist.totalXferedCount;
}

// Notify the app state to companion
function notifyGist() {
  // Update the status text on the clock face
  appStatusText.text = `App: ${appStatusString[appStatus]}`;
  logStatusText.text = `Log: ${hrmLogCount} H, ${accelLogCount} A, ${gyroLogCount} G`;
  xferStatusText.text = `Xfer: ${hrmXferedCount} H, ${accelXferedCount} A, ${gyroXferedCount} G`;
  appBackground.style.fill = appStatusColor[appStatus]

  // Send the gist to companion
  if (peerSocket.readyState === peerSocket.OPEN) {
    let mesg = { type: msgAppGist, data: getAppGist() }
    peerSocket.send(mesg);
  } else {
    console.log('Socket not in open state')
  };
}
// ================================================================

function listDirFiles() {
  const listDir = listDirSync("/private/data");
  let dirIter = listDir.next();
  while (!dirIter.done) {
    let filename = dirIter.value;
    let stats = fs.statSync(filename);
    if (stats) {
      console.log("filename: " + filename + ", size: " + stats.size);
    } else {
      console.log(filename);
    }

    dirIter = listDir.next();
  }
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
  appErrorText = document.getElementById('appErrorText');
  appBackground = document.getElementById("appBackground");

  // Check if this app was run before
  if (fs.existsSync(gistFile)) {
    // Restore the past state
    setAppGist(fs.readFileSync(gistFile, "cbor"));
  }


  // Debug purpose
  listDirFiles();

  // Set status to idle
  appStatus = appIsIdle;
  // notifyGist();
}

// Close the app
function closeApp() {
  // Stop the current operation
  if (appStatus === appIsLogging) {
    // Logging is in progress, stop it
    stopRec();
  }

  // Set status to idle and notify companion
  appStatus = appIsIdle;
  // notifyGist();

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
  console.log(`doStartXfer:`);

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
  console.log(`doStopXfer:`);

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
  console.log(`doResetLog:`);

  // This is allowed only when the app is idle
  if (appStatus != appIsIdle) {
    console.error(`doResetLog: Invalid when appStatus = ${appStatus}`);
    return;
  }

  // Delete all the existing log files
  const listDir = fs.listDirSync("/private/data");
  let dirIter;
  while ((dirIter = listDir.next()) && !dirIter.done) {
    fs.unlinkSync(dirIter.value);
  }

  // Reset the logging file/record status
  accelLogCount = 0;
  gyroLogCount = 0;
  hrmLogCount = 0;
  bpsLogCount = 0;

  accelCurrLogRecordCount = 0;
  gyroCurrLogRecordCount = 0;
  hrmCurrLogRecordCount = 0;
  bpsCurrLogRecordCount = 0;

  // Notify companion
  notifyGist();
}

// Process the reset transfer message
function doResetXfer() {
  console.log(`doResetXfer:`);

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
    console.log(`accelConfig.frequency: ${accelConfig.frequency}`);
    console.log(`${JSON.stringify(accelConfig)}`);
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

  // Check if accel log file sequence started
  if (accelLogCount == 0) {
    // Start the sequence of accel log files
    accelLogCount = 1;
  }

  // Check if gyro log file sequence started
  if (gyroLogCount == 0) {
    // Start the sequence of gyro log files
    gyroLogCount = 1;
  }

  // Check if hrm log file sequence started
  if (hrmLogCount == 0) {
    // Start the sequence of gyro log files
    hrmLogCount = 1;
  }

  // Check if bps log file sequence started
  if (bpsLogCount == 0) {
    // Start the sequence of gyro log files
    bpsLogCount = 1;
  }

  // Generate experiment ID
  experimentID = Date.now();

  // Open the log files for appending
  let accelFilename = generateFileName(deviceName, protocolName, accelLogPrefix, accelConfig.frequency, accelLogCount, experimentID);
  accelLogFD = fs.openSync(accelFilename, "a");

  gyroLogFD = fs.openSync(`${gyroLogPrefix}${gyroLogCount}.bin`, 'a');
  hrmLogFD = fs.openSync(`${hrmLogPrefix}${hrmLogCount}.bin`, 'a');
  bpsLogFD = fs.openSync(`${bpsLogPrefix}${bpsLogCount}.bin`, 'a');

  // Start reading sensors
  activateSensors();

  // Change status to logging and notify companion
  appStatus = appIsLogging;
  notifyGist();
}

// Stop reading sensor data
function stopRec() {
  // Stop reading sensors
  deactivateSensors();

  // Close all the log files
  fs.closeSync(accelLogFD);
  fs.closeSync(gyroLogFD);
  fs.closeSync(hrmLogFD);
  fs.closeSync(bpsLogFD);

  // Change status to idle and notify companion
  appStatus = appIsIdle;
  notifyGist();

  // Note down the stop time
  console.log(`Logging stopped at ${Date.now()}`);
}
// ================================================================


// ================================================================
// Log accelerometer readings
function logAccel() {
  // Convert acceleration in float to a 16-bit integer
  let x = scientific.div(accel.readings.x, accelScaler);
  let y = scientific.div(accel.readings.y, accelScaler);
  let z = scientific.div(accel.readings.z, accelScaler);

  let dataLength = accel.readings.timestamp.length;
  for (let i = 0; i < dataLength; i++) {
    accelRecordTimeView[i] = accel.readings.timestamp[i]; // cast to a 16-bit integer
    accelRecordXView[i] = Math.round(x[i]);
    accelRecordYView[i] = Math.round(y[i]);
    accelRecordZView[i] = Math.round(z[i]);
  }

  if (dataLength > 0) {
    fs.writeSync(accelLogFD, accelRecord);

    // Update the number of records
    accelCurrLogRecordCount += accel.readings.timestamp.length;
  }

  // Check if we need to start a new log file
  if (accelCurrLogRecordCount >= accelLogRecordMax) {
    // Record limit reached.
    // Close the current log file
    fs.closeSync(accelLogFD);

    // Start a new log file
    accelLogCount += 1;
    let accelFilename = generateFileName(deviceName, protocolName, accelLogPrefix, accelConfig.frequency, accelLogCount, experimentID);
    accelLogFD = fs.openSync(accelFilename, "a");

    // Reset the record count
    accelCurrLogRecordCount = 0;

    // Send gist to companion
    notifyGist();
  }
}

// Log gyroscope readings
function logGyro() {
  // Convert gyro measurements in float to a 16-bit integer
  let x = scientific.div(gyro.readings.x, gyroScaler);
  let y = scientific.div(gyro.readings.y, gyroScaler);
  let z = scientific.div(gyro.readings.z, gyroScaler);
  for (let i = 0; i < gyroConfig.batch; i++) {
    gyroRecordTimeView[i] = gyro.readings.timestamp[i]
    gyroRecordXView[i] = Math.round(x[i]);
    gyroRecordYView[i] = Math.round(y[i]);
    gyroRecordZView[i] = Math.round(z[i]);
  }
  fs.writeSync(gyroLogFD, gyroRecord);

  // Update the number of records
  gyroCurrLogRecordCount += gyro.readings.timestamp.length;

  // Check if we need to start a new log file
  if (gyroCurrLogRecordCount >= gyroLogRecordMax) {
    // Record limit reached.
    // Close the current log file
    fs.closeSync(gyroLogFD);

    // Start a new log file
    gyroLogCount += 1;
    gyroLogFD = fs.openSync(`${gyroLogPrefix}${gyroLogCount}.bin`, 'a');

    // Reset the record count
    gyroCurrLogRecordCount = 0;

    // Send gist to companion
    notifyGist();
  }

  // Return here to skip printing to console
  return;

  // Display the readings on console log
  console.log(`Gyro : ${Date.now()}`);
  for (let i = 0; i < gyro.readings.timestamp.length; i++) {
    console.log(`${gyro.readings.timestamp[i]}, ${gyro.readings.x[i]}, ${gyro.readings.y[i]}, ${gyro.readings.z[i]}`);
    console.log(`${gyroRecordTimeView[i]}, ${gyroRecordXView[i]}, ${gyroRecordYView[i]}, ${gyroRecordZView[i]}`);
    console.log(`${gyroRecordXView[i] * gyroScaler}, ${gyroRecordYView[i] * gyroScaler}, ${gyroRecordZView[i] * gyroScaler}`);
  }
}

// Log heart rate readings
function logHeart() {
  // Convert heart measurements in float to a 16-bit integer
  for (let i = 0; i < hrm.readings.timestamp.length; i++) {
    hrmRecordTimeView[i] = hrm.readings.timestamp[i]
    hrmRecordHeartView[i] = hrm.readings.heartRate[i];
  }
  fs.writeSync(hrmLogFD, hrmRecord);

  // Update the number of records
  hrmCurrLogRecordCount += hrm.readings.timestamp.length;

  // Check if we need to start a new log file
  if (hrmCurrLogRecordCount >= hrmLogRecordMax) {
    // Record limit reached.
    // Close the current log file
    fs.closeSync(hrmLogFD);

    // Start a new log file
    hrmLogCount += 1;
    hrmLogFD = fs.openSync(`${hrmLogPrefix}${hrmLogCount}.bin`, 'a');

    // Reset the record count
    hrmCurrLogRecordCount = 0;

    // Send gist to companion
    notifyGist();
  }

  // Return here to skip printing to console
  return;

  // Display the readings on console log
  console.log(`HRM : ${Date.now()}`);
  for (let i = 0; i < hrm.readings.timestamp.length; i++) {
    console.log(`${hrm.readings.timestamp[i]}, ${hrm.readings.heartRate[i]}`);
    console.log(`${hrmRecordTimeView[i]}, ${hrmRecordHeartView[i]}`);
  }
}

// Log body presence status
function logPresence() {
  let currTime = Date.now()
  console.log(`${currTime}`)
  bpsRecordTimeView[0] = (currTime / Math.pow(2, 32));
  console.log(`${currTime / Math.pow(2, 32)}`)
  console.log(`${bpsRecordTimeView[0]}`)
  bpsRecordTimeView[1] = (currTime & (Math.pow(2, 32) - 1));
  console.log(`${currTime & (Math.pow(2, 32) - 1)}`)
  console.log(`${bpsRecordTimeView[1]}`)
  bpsRecordPresView[0] = bps.present;
  fs.writeSync(bpsLogFD, bpsRecord);

  // Update the number of records
  bpsCurrLogRecordCount += 1

  // Check if we need to start a new log file
  if (bpsCurrLogRecordCount >= bpsLogRecordMax) {
    // Record limit reached.
    // Close the current log file
    fs.closeSync(bpsLogFD);

    // Start a new log file
    bpsLogCount += 1;
    bpsLogFD = fs.openSync(`${bpsLogPrefix}${bpsLogCount}.bin`, 'a');

    // Reset the record count
    bpsCurrLogRecordCount = 0;

    // Send gist to companion
    notifyGist();
  }

  // Return here to skip printing to console
  return;

  // Display the readings on console log
  console.log(`BPS : ${Date.now()}`);
  console.log(`${bpsRecordTimeView[0]}, ${bpsRecordPresView[0]}`);
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


// ================================================================

// Get the next file to transfer
function getNextXferFile() {
  // Send all body presence files first
  if (bpsLogCount > bpsXferedCount) {
    return (`${bpsLogPrefix}${bpsXferedCount + 1}.bin`);
  };

  // Send all heart rate files next
  if (hrmLogCount > hrmXferedCount) {
    return (`${hrmLogPrefix}${hrmXferedCount + 1}.bin`);
  };

  // Send all accel files next
  if (accelLogCount > accelXferedCount) {
    let filename = generateFileName(deviceName, protocolName, accelLogPrefix, accelConfig.frequency, accelXferedCount + 1, experimentID);
    console.log("debug accel: " + filename);
    return filename;
  };

  // Send all gyro rate files next
  if (gyroLogCount > gyroXferedCount) {
    return (`${gyroLogPrefix}${gyroXferedCount + 1}.bin`);
  };

  // All done
  return (null);
}

// Set the next file to transfer
function setNextXferFile() {
  // Send all body presence files first
  if (bpsLogCount > bpsXferedCount) {
    bpsXferedCount += 1;
    return;
  }

  // Send all heart rate files next
  if (hrmLogCount > hrmXferedCount) {
    hrmXferedCount += 1
    return;
  }

  // Send all accel files next
  if (accelLogCount > accelXferedCount) {
    accelXferedCount += 1
    return;
  }

  // Send all gyro rate files next
  if (gyroLogCount > gyroXferedCount) {
    gyroXferedCount += 1
    return;
  }
}

// Transfer a file
function xferFile(file) {
  outbox
    .enqueueFile(file)
    .then((ft) => {
      console.log(`Transfer of ${ft.name} successfully queued.`);
      ft.onchange = () => {
        console.log('File Transfer State: ' + ft.readyState);
        if (ft.readyState === 'transferred') {
          console.log('Transfer of ' + ft.name + ' completed.');
          setNextXferFile();
          notifyGist();
          xferNextFile();
        }
      }
    })
    .catch((error) => {
      console.log(`Failed to schedule transfer: ${error}`);
    })
}

// Transfer next file to companion
function xferNextFile() {
  // Ensure app is in transfering status
  if (appStatus != appIsXferring) return;

  // Display xfer status
  console.log(`xferNextFile: ${getAppGist()}`);

  // Get the next file to be transferred
  let file = getNextXferFile();
  if (file) {
    // Initiate the transfer
    xferFile(file)
  } else {
    // Nothing more to transfer
    appStatus = appIsIdle;
    notifyGist();
  }
}

function listAndXferFiles() {
  const listDir = listDirSync("/private/data");
  let dirIter = listDir.next();
  let fileArray = [];
  let i = 0;
  while (!dirIter.done) {
    let filename = dirIter.value;

    fileArray[i] = filename;
    i += 1;

    dirIter = listDir.next();
  }

  if (totalXferedCount >= fileArray.length) {
    appStatus = appIsIdle;
    notifyGist();
  } 
  else 
  {
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

          xferFilesSequentially(fileArray, i + 1);
        }
      }
    })
    .catch((error) => {
      console.log(`Failed to schedule transfer: ${error}`);
    });
}
// ================================================================
