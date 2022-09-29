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
  - The main logic starts from function openApp(), where event listener handlePeerMessage() gets setup. It receives messages from the companion, and does corresponding work following the command in the message.
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
 - others - serverIP, serverPort, userID

 ## Design Logic
 - userID is designed such that every user can be differentiated at the server side.
 - when save log files, ideally the APP should also put datetime info in the filename, however we decide to do the work on the server side, since putting to much logic in the filenames on the fit app just make things too complicated. Keep in mind that everything become much easier on the server side.
 - when the fit app uploads files to the server, it also sends an unique userID. Any files received in the server side will be renamed: appending userID and timestamp to the original filename. For example:
 ```
   Accel2.bin ---> Accel2-davidz-20220912|12:21:32.bin
 ``` 
 - The userID should be an ID that's authenticated by the server.

 ## Server Side Design
 - The server side waits for files to be uploaded. Upon receiving each file, it quickly scan the file and get statistics, and store the statistics in database.
 - The statistics datatable contains: filename, # of records, max-timediff, min-timediff, frequency, # of segments, created; "filename" is the unique key.
 - The segments datatable: filename, seg-start, seg-length, created; "filename + seg-start" is the unique key.
 - for authentication purpose, we have to customize the user table.

 ## Timestamp Discrepency Issue (missing, duplicates)
 - Seems duplicates always happen after timestamp gaps. Why do we have timestamp gaps?
 - one scenario: 120 ms missing:
 ```
   63624, 231, 874, 8121
   63674
   63724
   63743, 225, 869, 
   63793
 ```
 - another scenario: 110 ms missing:
 ```
A, 703, -1171, -4551, 6678
A, 713, -1146, -4589, 6672
A, 723, -1154, -4595, 6639
A, 733, -1166, -4582, 6624
A, 743, -1160, -4589, 6652
A, 752, -1149, -4584, 6692
A, 762, -1151, -4532, 6706
A, 772, -1168, -4480, 6663
A, 782, -1206, -4478, 6682
A, 792, -1207, -4515, 6701
   801
   811
   821
   831
   841
   851
   861
   871
   881
   891
A, 901, -1171, -4552, 6650
A, 911, -1169, -4534, 6655
A, 921, -1163, -4525, 6650
A, 931, -1177, -4532, 6658
A, 941, -1175, -4544, 6653
A, 950, -1186, -4526, 6667
A, 960, -1174, -4531, 6682
A, 970, -1177, -4517, 6693
A, 980, -1190, -4522, 6698
A, 990, -1187, -4540, 6702
A, 1000, -1215, -4545, 6683
A, 901, -1171, -4552, 6650
A, 911, -1169, -4534, 6655
A, 921, -1163, -4525, 6650
A, 931, -1177, -4532, 6658
A, 941, -1175, -4544, 6653
A, 950, -1186, -4526, 6667
A, 960, -1174, -4531, 6682
A, 970, -1177, -4517, 6693
A, 980, -1190, -4522, 6698
```