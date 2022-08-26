#!/usr/bin/env python

# Import pandas module
import pandas as pd

# Import sys module
from sys import *

# Import module for path stuff
from pathlib import Path

# Accelerometer scaling constant
accelScaler = 9.80665 * 4 / 32767

# Check usage
if len(argv) != 2:
    print("usage:", argv[0], "<log dir path>")
    exit()

# Get hold of the log dir path
logDir = Path(argv[1])

# Keep track of the carryover time
overTime = 0
currTime = 0

# Go through all heart files
count = 1
while True:
    # Form the in and out log file names
    logInFile = logDir.joinpath('Heart' + str(count) + '.csv')
    logOutFile = logDir.joinpath('Heart' + str(count) + '_Long.csv')

    # If the file does not exist, we are done
    if not logInFile.exists():
        break

    # Needs to process this file
    print('Processing', logInFile)
    logInTable = pd.read_csv(logInFile, header=None)

    # Drop the first column
    logInTable = logInTable.drop(0, axis=1)

    # Go through each row in log file
    for i, row in logInTable.iterrows():
        if (logInTable.iat[i, 0] < currTime):
            overTime += 2**16
        currTime = logInTable.iat[i, 0]
        logInTable.iat[i, 0] += overTime

    # Write the table into a csv file
    logInTable.to_csv(logOutFile, index=False, header=False)

    # Go to the next log file
    count += 1


# Keep track of the carryover time
overTime = 0
currTime = 0

# Go through all accel files
count = 1
while True:
    # Form the in and out log file names
    logInFile = logDir.joinpath('Accel' + str(count) + '.csv')
    logOutFile = logDir.joinpath('Accel' + str(count) + '_Long.csv')

    # If the file does not exist, we are done
    if not logInFile.exists():
        break

    # Needs to process this file
    print('Processing', logInFile)
    logInTable = pd.read_csv(logInFile, header=None)

    # Drop the first column
    logInTable = logInTable.drop(0, axis=1)

    # Create an empty table
    logOutTable = pd.DataFrame()

    # Go through each row in log file
    for i, row in logInTable.iterrows():
        # if the time decreased, it imploes carryover
        if (logInTable.iat[i, 0] < currTime):
            overTime += 2**16
        currTime = logInTable.iat[i, 0]

        # Get the log timestamp and scaled x, y, z valies
        accelT = logInTable.iat[i, 0] + overTime
        accelX = logInTable.iat[i, 1] * accelScaler
        accelY = logInTable.iat[i, 2] * accelScaler
        accelZ = logInTable.iat[i, 3] * accelScaler
        # print(accelT, accelX, accelY, accelZ)
        logOutTable = logOutTable.append(pd.Series([accelT, accelX, accelY, accelZ]), ignore_index=True)

    # Write the table into a csv file
    logOutTable.to_csv(logOutFile, index=False, header=False)

    # Go to the next log file
    count += 1


# Keep track of the carryover time
overTime = 0
currTime = 0

# Go through all gyro files
count = 1
while True:
    # Form the in and out log file names
    logInFile = logDir.joinpath('Gyro' + str(count) + '.csv')
    logOutFile = logDir.joinpath('Gyro' + str(count) + '_Long.csv')

    # If the file does not exist, we are done
    if not logInFile.exists():
        break

    # Needs to process this file
    print('Processing', logInFile)
    logInTable = pd.read_csv(logInFile, header=None)

    # Drop the first column
    logInTable = logInTable.drop(0, axis=1)

    # Create an empty table
    logOutTable = pd.DataFrame()

    # Go through each row in log file
    for i, row in logInTable.iterrows():
        # if the time decreased, it imploes carryover
        if (logInTable.iat[i, 0] < currTime):
            overTime += 2**16
        currTime = logInTable.iat[i, 0]

        # Get the log timestamp and scaled x, y, z valies
        accelT = logInTable.iat[i, 0] + overTime
        accelX = logInTable.iat[i, 1] * accelScaler
        accelY = logInTable.iat[i, 2] * accelScaler
        accelZ = logInTable.iat[i, 3] * accelScaler
        # print(accelT, accelX, accelY, accelZ)
        logOutTable = logOutTable.append(pd.Series([accelT, accelX, accelY, accelZ]), ignore_index=True)

    # Write the table into a csv file
    logOutTable.to_csv(logOutFile, index=False, header=False)

    # Go to the next log file
    count += 1
