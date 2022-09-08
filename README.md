# Slog
Slog is a an app for the Fitbit Sense that collects Heart Rate, Accelerometer, and Gyroscope data.

## Code Structure
- app/index.js - records batched sensor readings and stores data in multiple files.
- common/common.js - parameters and setup configurations for both app and companion.
- companion/index.js - companion to pull log data from fitbit.
- resources/ - resource files.
- settings/index.jsx - frontend interface showing on phone to set recording parameters for app.
- package.json - code environment configurations.

## [app/index.js](app_code/app/index.js)
  - The main logic start from function openApp(), where event listener handlePeerMessage() gets setup. It receives messages from the companion, and does corresponding work following the command in the message.
## [common/common.js](app_code/common/common.js)
  - definitions: states, message types, file prfixes, 
  - Accelerometer sensor and log record settings 
  - Gyroscope sensor and log record settings
  - Heart rate monitor and log record settings
  - Body presence sensor and log record settings
## [companion/index.js](app_code/companion/index.js)
  - init() - handleSettingChange, processAllFiles
  - getConfigOptions, setConfigOptions
  - sendMesg, handlePeerClose, handlePeerMessage
  - printAccelLog, printGyroLog, printHRMLog, printBPSLog, 
  - The main logic starts from function init(), where we set up handleSettingsChange(evnt), which handles the following operations: logBtnClick, xferBtnClick, resetLogBtnClick, resetXferBtnClick, serverIP, and serverPort.
  - when logBtn is clicked, the companion sends message to the watch. The watch receives the message, and starts to log or stops logging.
## [settings/index.jsx](app_code/settings/index.jsx)
 - status - appStatus, logStatus, xferStatus
 - operation - logBtn, xferBtn, resetLogBtn, resetXferBtn
 - configuration - logStartTime, logStopTime, accelFreq, gyroFreq, hrmFreq, bpsFreq
 - others - serverIP, serverPort