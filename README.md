# Slog
Slog is a an app for the Fitbit Sense that collects Heart Rate, Accelerometer, and Gyroscope data.

## Code Structure
- app/index.js - records batched sensor readings and stores data in multiple files.
- common/common.js - parameters and setup configurations for both app and companion.
- companion/index.js - companion to pull log data from fitbit.
- resources/ - resource files.
- settings/index.jsx - frontend interface showing on phone to set recording parameters for app.
- package.json - code environment configurations.

## app/index.js
## common/common.js
## companion/index.js
## settings/index.jsx
 - status - appStatus, logStatus, xferStatus
 - operation - logBtn, xferBtn, resetLogBtn, resetXferBtn
 - configuration - logStartTime, logStopTime, accelFreq, gyroFreq, hrmFreq, bpsFreq
 - others - serverIP, serverPort
