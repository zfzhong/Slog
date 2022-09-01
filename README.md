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
  - to be done ...
## common/common.js
  - definitions: states, message types, file prfixes, 
  - Accelerometer sensor and log record settings 
  - Gyroscope sensor and log record settings
  - Heart rate monitor and log record settings
  - Body presence sensor and log record settings
## companion/index.js
  - init() - handleSettingChange, processAllFiles
  - getConfigOptions, setConfigOptions
  - sendMesg, handlePeerClose, handlePeerMessage
  - printAccelLog, printGyroLog, printHRMLog, printBPSLog, 
## settings/index.jsx
 - status - appStatus, logStatus, xferStatus
 - operation - logBtn, xferBtn, resetLogBtn, resetXferBtn
 - configuration - logStartTime, logStopTime, accelFreq, gyroFreq, hrmFreq, bpsFreq
 - others - serverIP, serverPort