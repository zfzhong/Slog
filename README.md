# Slog

Slog records raw sensor data on the **Fitbit Sense** for research use:
accelerometer, gyroscope, heart rate and body-presence samples, logged on a
schedule and transferred off the watch to a server you nominate.

It was written for studies that need the underlying signal rather than the
summarised activity metrics consumer wearables normally expose. Recording runs
unattended between a configured start and stop time; the watch buffers to its
own storage, and a phone companion moves completed files off the device.

Slog is part of a longer line of measurement instruments built for the same
research programme — see [Related projects](#related-projects).

---

## Architecture

The Fitbit SDK splits an application across three processes, and Slog uses all
three:

| Part | Runs on | Responsibility |
|---|---|---|
| `app/` | the watch | configures the sensors, batches readings, writes log files |
| `companion/` | the paired phone | pulls files off the watch, decodes them, POSTs them to the server |
| `settings/` | the phone's settings UI | recording parameters and start/stop/transfer controls |
| `common/` | both | shared constants: states, message types, scale factors, file prefixes |

The watch and companion communicate by message passing. The companion sends a
command — start logging, stop logging, start transfer, reset — and the watch
acts on it and reports its state back. The watch's state is one of *Idle*,
*Timing*, *Logging*, *Transferring* or *Deleting*, and is surfaced in the
settings UI.

---

## What it records

| Stream | File prefix | Records per file |
|---|---|---|
| Accelerometer | `Accel` | 6000 |
| Gyroscope | `Gyro` | 6000 |
| Heart rate | `Heart` | 120 — roughly one file every two minutes |
| Body presence | `Presence` | 3600 |

Samples are stored on the watch in a packed binary form — 16-bit values behind
typed-array views — because the Sense has little room and little power to spare.
The companion decodes each file after transfer and emits text rows.

Motion values are stored as raw 16-bit integers and scaled on decode:

- accelerometer — ±4 g over 16 bits: `9.80665 * 4 / 32767` per count
- gyroscope — ±2000 °/s over 16 bits, converted to radians

Body presence is what tells you when the watch was not being worn, and should be
consulted before treating any stretch of motion or heart-rate data as
participant data.

---

## Storage limits

The watch holds **14.4 MB** of log files, a deliberate margin under the device's
15 MB ceiling. Logging checks free space and will not run the device out of
storage mid-session. Files are removed once transferred.

At high accelerometer rates this fills quickly. For an overnight or multi-day
protocol, either schedule transfers within the recording window or size the
sampling rates against the time the watch will be out of range of its phone.

---

## Configuration

All settings are made in the phone's settings UI:

| Setting | Meaning |
|---|---|
| Device name | Identifier for this unit; distinguishes watches in a study |
| Protocol selection | Label for the recording condition |
| Log start time / stop time | Hour boundaries for unattended recording |
| Accelerometer / gyroscope / heart rate / body presence frequency | Per-sensor rate in Hz; `0` disables the sensor |
| Disk space (M) | Storage ceiling, default 14.4 |
| Server URL | Where the companion POSTs decoded files |

Each sensor's batch size is set equal to its frequency, so the watch wakes about
once a second per active sensor rather than once per sample. This is what makes
multi-hour recording survivable on the Sense's battery.

**Set your own server URL before collecting data.**

---

## Transfer

The companion drains the watch's outbox, decodes each file, and POSTs the
decoded text to the server with the original filename in a `FILENAME` header.
Transfer can be triggered from the settings UI or left to run as files arrive.

A receiving server for this format is at
[zfzhong/slog-file-server](https://github.com/zfzhong/slog-file-server).

---

## Building and installing

Slog is a Fitbit OS application built with the Fitbit SDK.

```bash
cd app_code
npm install
npx fitbit-build          # then sideload via the Fitbit Developer Bridge
```

The watch must be in developer mode and paired with the phone running the
companion.

---

## Branches

| Branch | What it holds |
|---|---|
| `main` | current code |
| `pause-resume` | pause/resume across the recording window |
| `compress` | on-watch compression experiment |
| `abs-time` | absolute rather than relative timestamps |
| `web-xfer` | transfer over the web companion |

---

## Known device behaviour

The Fitbit accelerometer batch API returns readings whose device timestamps
show **gaps and duplicated blocks**. This was isolated in September 2022 by
writing an independent absolute timestamp into every row: had the corruption
come from the logging code, those timestamps would have been incoherent too.
They were not, which places the fault in the vendor's batch read rather than
anything downstream.

Anyone analysing accelerometer data collected with this application, or with
any Fitbit batch-mode logger, should expect to de-duplicate and check for gaps
on the device timestamp rather than assume a uniform sampling interval.

See [docs/fitbit-accelerometer-batch-timestamps.md](docs/fitbit-accelerometer-batch-timestamps.md)
for the diagnostic method and the recorded data.

## Related projects

Slog is the Fitbit-platform member of a series of measurement instruments built
for the same research programme:

| Project | Platform | Period |
|---|---|---|
| **Slog** (this repository) | Fitbit Sense | 2022–2023 |
| [slog-file-server](https://github.com/zfzhong/slog-file-server) | Python ingest server | 2022–2025 |
| [Slogger](https://github.com/zfzhong/slogger) | Wear OS watches and Android tablets | 2024– |
| [Slog_HR](https://github.com/ACOI-UofSC/Slog_HR) | Deployment repository and user manual, Arnold Childhood Obesity Initiative, University of South Carolina | 2023–2024 |

Slogger was originally named **WearSlog** and renamed in January 2024.

---

## Provenance

This project began as `ntindallUSC/Slog`, started by Nick Tindall in August 2022
at the University of South Carolina. Development continued here through May 2023.
The full commit history is preserved, so every commit carries its original
author; the original repository is recorded as the `upstream` remote.

---

## Support

Research software, maintained by Zifei (David) Zhong. Issues and pull requests
welcome. If you are running it for a study and hit something it was not built
for, please open an issue rather than working around it.
