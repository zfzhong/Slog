#! /usr/bin/env python3

import sys
data = sys.stdin.buffer.read()

import os
fd = open(f'logs/{os.environ["CONTENT_TYPE"]}', 'wb')
fd.write(data)
fd.close()
