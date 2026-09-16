# Timestamp gaps and duplicates in the Fitbit accelerometer batch API

*Recorded 29 September 2022. This note and the diagnostic it describes were
written on the `abs-time` branch (commits `0486b3e`, `df41651`, `86b147d`,
`94b1e0b`); it is reproduced here unchanged so the finding is not buried on a
branch. The absolute-timestamp instrumentation it describes lives on that
branch and was not merged into `main`.*

---

# Why Absolute Timestamps? 
We put a absolute timestamp in every row of data from Accelerometer batch reading. Since the
reading from Accelerometer involves timestamp gaps and duplicates. To make sure that the gaps 
and duplicates come from batch reading, not caused by the code logic after reading, we put a 
absolute timestamp in each row. 

The logic is that the absolute timestamps should be coherent (or discretively continuous). If
the absolute timestamps are not coherent, then it means something happened after we read data 
from the Accelerometer batch.

For example, if two processes are writing to the same file in parallel, they might over-write 
some of the data rows. The writing discrepancy will cause data discrepancy. If that happens, 
the absolute timestamps will not be coherent.

# Data Collected
We collected the following data with Fitbit timestamp gaps and duplicates:

| Absolute Timestamp | Fitbit Timestamp | x | y | z | Notes |
| :--: | :--: | :-: | :-: | :-: | :-- |
| 1664461556843 | 57436 | -8 | -120 | 8125 | starting of the batch |
| 1664461556843 | 57456 | -9 | -129 | 8142 |
| 1664461556844 | 57476 | -4 | -120 | 8153 |
| 1664461556844 | 57496 | -29 | -143 | 8148 |
| 1664461556845 | 57515 | -26 | -122 | 8159 |
| 1664461556845 | 57535 | -27 | -121 | 8156 |
| 1664461556846 | 57555 | -36 | -115 | 8178 |
| 1664461556846 | 57575 | -19 | -127 | 8144 |
| 1664461556847 | **57694** | -34 | -137 | 8169 | <-- gap |
| 1664461556847 | 57713 | -25 | -112 | 8132 |
| 1664461556848 | 57733 | -14 | -132 | 8145 |
| 1664461556848 | 57753 | -33 | -113 | 8148 |
| 1664461556849 | 57773 | -3 | -109 | 8164 |
| 1664461556849 | **57694** | -34 | -137 | 8169 | <-- duplication.
| 1664461556850 | 57713 | -25 | -112 | 8132 |
| 1664461556850 | 57733 | -14 | -132 | 8145 |
| 1664461556851 | 57753 | -33 | -113 | 8148 |
| 1664461556851 | 57773 | -3 | -109 | 8164 |
| 1664461556852 | 57793 | -36 | -116 | 8135 |
| 1664461556852 | 57813 | -19 | -116 | 8157 |

Since the absolute timestamps are coherent in the data above, we believe the data is intact after 
being read from Accelerometer batch.

# Why Did the Problem Happen?
It might be that some parts of our code affect the memory of the batch or the accelerometer
reading. Since Fitbit provides very limited documentation on Accelerometer batch reading, we are 
in a very difficult sitution to debug the problem.
