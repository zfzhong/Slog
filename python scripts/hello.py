#!/usr/bin/env python

# Read from standard input
import sys
data = sys.stdin.buffer.read()

# Write the data into a file with the given name
import os
fd = open(f'C:/Users/Nick/Watch_Extraction/FitBit/htbin/logs/{os.environ["CONTENT_TYPE"]}', 'wb')
fd.write(data)
fd.close()
