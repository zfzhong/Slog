#! /usr/bin/env python3

"""
This script do a quick stats on the ascending timestamp segments/series in a given file.
"""

import sys

TIMESTAMP_IDX = 1


def check_timestamp_ascending_segments(filename):
    prevTimestamp = 0
    startTimestamp = 0
    countTotal = 0
    countSegment = 0
    
    with open(filename) as fd:
        line = fd.readline()
        line = line.strip()
        tokens = line.split(',')
        timeStamp = int(tokens[TIMESTAMP_IDX])

        prevTimestamp = timeStamp
        startTimestamp = timeStamp
        countTotal = 1
        countSegment = 1

        line = fd.readline()
        while line:
            line = line.strip()
            tokens = line.split(',')
            timeStamp = int(tokens[TIMESTAMP_IDX])

            if timeStamp < prevTimestamp:
                endTimestamp = prevTimestamp
                print("%s\t%s\t%s\t%s\t%s" % (countTotal-countSegment+1, countTotal, countSegment, startTimestamp, endTimestamp))
                prevTimestamp = timeStamp
                startTimestamp = timeStamp
                countSegment = 1
            else:
                prevTimestamp = timeStamp
                countSegment += 1

            countTotal += 1
            line = fd.readline()
        

    endTimestamp = prevTimestamp
    print("%s\t%s\t%s\t%s\t%s" % (countTotal-countSegment+1, countTotal, countSegment, startTimestamp, endTimestamp))
    startTimestamp = timeStamp
    countSegement = 1

            
if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3", sys.argv[0], "<filename>")
        sys.exit(1)

    filename = sys.argv[1]
    check_timestamp_ascending_segments(filename)
    



    
