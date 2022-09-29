// ================================================================
// Definitions that are common to both the app and the companion
// ================================================================


// ================================================================
// Possible states of the app
export const appIsNone = 0;
export const appIsIdle = 1;
export const appIsTiming = 2;
export const appIsLogging = 3;
export const appIsXferring = 4;

export const appStatusString = ['Away', 'Idle', 'Timing', 'Logging', 'Transferring']
export const appStatusColor = ['grey', 'grey', 'yellow', 'green', 'orange']
// ================================================================


// ================================================================
// Possible messages from the companion
export const msgAppGist = 0;
export const msgStartLog = 1;
export const msgStopLog = 2;
export const msgStartXfer = 3;
export const msgStopXfer = 4;
export const msgResetLog = 5;
export const msgResetXfer = 6;
// ================================================================

// ================================================================
// Accelerometer scale factor (+-4g with resolution of 16 bits)
export const accelScaler = 9.80665 * 4 / 32767;

// Gyroscope scale factor (+-radians = +-2000 degrees with resolution of 16 bits)
export const gyroScaler = (Math.PI * 2000 / 180) / 32767;

// File name prefixes for the log files
export const accelLogPrefix = "Accel";
export const gyroLogPrefix = "Gyro";
export const hrmLogPrefix = "Heart";
export const bpsLogPrefix = "Presence";

// Number of records per log file
export const accelLogRecordMax = 6000;
export const gyroLogRecordMax = 6000;
export const hrmLogRecordMax = 3600;
export const bpsLogRecordMax = 3600;
// ================================================================


// ================================================================
// Duration (hours) in which logging is on
export let logStartTime;
export let logStopTime;

// Set the log start time
export function setLogStartTime(time) {
    logStartTime = time;
}

// Set the log stop time
export function setLogStopTime(time) {
    logStopTime = time;
}

// Calculate the time (in ms) to start logging
export function getLogStartDelay() {
  // Get the current time
  var d = new Date();
  var h = d.getHours();
  var m = d.getMinutes();
  var s = d.getSeconds();

  // No delay if log start hour is past current hour
  if (h >= logStartTime) {
    return(0)
  }

  // Count the milliseconds of delay
  return((((((logStartTime-h-1) * 60) + (60-m-1)) * 60) + (60-s)) * 1000)
}

// Calculate the time (in ms) to stop logging
export function getLogStopDelay() {
  // Get the current time
  var d = new Date();
  var h = d.getHours();
  var m = d.getMinutes();
  var s = d.getSeconds();

  // Consider tomorrow if stop hour is past current hour
  if (h >= logStopTime) {
    // Pushing hour to yesterday, as the diff will be same
    h = h - 24;
  }

  // Count the milliseconds of delay
  return((((((logStopTime-h-1) * 60) + (60-m-1)) * 60) + (60-s)) * 1000)
}
// ================================================================


// ================================================================
// Accelerometer sensor and log record settings
export let accelConfig = {};
export let accelRecordSize;
export let accelRecord;
export let accelRecordAbsTimeView;
export let accelRecordTimeView;
export let accelRecordXView;
export let accelRecordYView;
export let accelRecordZView;

// Configure the acceleromter
export function setAccelConfig(freq) {
  // Set the frequency and batch to given frequency
  accelConfig.frequency = parseInt(freq);
  accelConfig.batch = parseInt(freq);

  // Frequency of 0 implies no logging
  if (accelConfig.frequency === 0) {
    accelRecordSize = 0;
    return;
  }

  // Structure of the accelerometer log record
  accelRecordSize = (accelConfig.batch * 16);
  accelRecord = new ArrayBuffer(accelRecordSize);
  
  // To store the absolute time, we need 32 x 2 = 64 bits
  accelRecordAbsTimeView = new Uint32Array(accelRecord, 0, 2 * accelConfig.batch); 

  accelRecordTimeView = new Uint16Array(accelRecord, 4 * 2 * accelConfig.batch, accelConfig.batch);
  accelRecordXView = new Int16Array(accelRecord, 5 * 2 * accelConfig.batch, accelConfig.batch);
  accelRecordYView = new Int16Array(accelRecord, 6 * 2 * accelConfig.batch, accelConfig.batch);
  accelRecordZView = new Int16Array(accelRecord, 7 * 2 * accelConfig.batch, accelConfig.batch);
}


// Gyroscope sensor and log record settings
export let gyroConfig = {};
export let gyroRecordSize;
export let gyroRecord;
export let gyroRecordTimeView;
export let gyroRecordXView;
export let gyroRecordYView;
export let gyroRecordZView;

// Configure the gyroscope
export function setGyroConfig(freq) {
  // Set the frequency and batch to given frequency
  gyroConfig.frequency = parseInt(freq);
  gyroConfig.batch = parseInt(freq);

  // Frequency of 0 implies no logging
  if (gyroConfig.frequency === 0) {
    gyroRecordSize = 0;
    return;
  }

  // Structure of the gyroscope log record
  gyroRecordSize = (gyroConfig.batch * 8);
  gyroRecord = new ArrayBuffer(gyroRecordSize);
  gyroRecordTimeView = new Uint16Array(gyroRecord, 0, gyroConfig.batch);
  gyroRecordXView = new Int16Array(gyroRecord, 2 * gyroConfig.batch, gyroConfig.batch);
  gyroRecordYView = new Int16Array(gyroRecord, 4 * gyroConfig.batch, gyroConfig.batch);
  gyroRecordZView = new Int16Array(gyroRecord, 6 * gyroConfig.batch, gyroConfig.batch);
}


// Heart rate monitor and log record settings
export let hrmConfig = {};
export let hrmRecordSize;
export let hrmRecord;
export let hrmRecordTimeView;
export let hrmRecordHeartView;

// Configure the heart rate monitor
export function setHRMConfig(freq) {
  // Set the frequency and batch to given frequency
  hrmConfig.frequency = parseInt(freq);
  hrmConfig.batch = parseInt(freq);

  // Frequency of 0 implies no logging
  if (hrmConfig.frequency === 0) {
    hrmRecordSize = 0;
    return;
  }

  // Structure of the heart rate monitor log record
  hrmRecordSize = (hrmConfig.batch * 4);
  hrmRecord = new ArrayBuffer(hrmRecordSize);
  hrmRecordTimeView = new Uint16Array(hrmRecord, 0, hrmConfig.batch);
  hrmRecordHeartView = new Uint16Array(hrmRecord, 2 * hrmConfig.batch, hrmConfig.batch);
}


// Body presence sensor and log record settings
export let bpsConfig = {};
export let bpsRecordSize;
export let bpsRecord;
export let bpsRecordTimeView;
export let bpsRecordPresView;

// Configure the body presence sensor
export function setBPSConfig(freq) {
  // Set the frequency to 0 or 1
  bpsConfig.frequency = parseInt(freq);

  // Frequency of 0 implies no logging
  if (bpsConfig.frequency === 0) {
    bpsRecordSize = 0;
    return;
  }

  // Structure of the body presence sensor log record
  bpsRecordSize = 12;
  bpsRecord = new ArrayBuffer(bpsRecordSize);
  bpsRecordTimeView = new Uint32Array(bpsRecord, 0, 2);
  bpsRecordPresView = new Uint32Array(bpsRecord, 8, 1);
}
// ================================================================
