# LabStudy AutoLearn (USTC)

Tampermonkey userscript that automatically stays on each required learning page for the USTC Lab Safety platform, waits until the required time is met, and then switches to the next required item. Includes a floating control panel with live progress and controls.

> URL scope: `https://sysaq.ustc.edu.cn/lab-study-front/*`

## Features

- Floating panel (top‑right) showing status and live progress.
- Start/Stop/Next controls.
- Automatically keeps the page active while waiting (gentle auto‑scroll).
- Reads the current item's "Learned" and "Required" times and waits the remaining time plus a small buffer.
- Automatically switches to the next required entry when the current one completes.
- After pressing Next, the script re‑reads times on the new item and auto‑starts.

## Install

1. Install Tampermonkey (or a compatible userscript manager) in your browser.
2. Open the script file `ustc-lab-study-autolearn.user.js` and paste it into a new Tampermonkey script, then Save.
3. Visit any learning detail page on the USTC Lab Study site; the panel will appear at the top‑right.

## Usage

- Click `Start` to begin. The panel shows `elapsed / total` for the current item and the remaining time.
- The script auto‑scrolls gently to keep the page active and prevent idle timeouts.
- When time completes, it clicks the next required item and continues.
- Click `Next` to skip the current item. The script will auto‑read the new item's times and start automatically.
- Click `Stop` to pause at any time.

## Configuration

Edit the constants near the top of the script if desired:

- `EXTRA_SECONDS` (default `8`): extra buffer seconds added to the remaining time.
- `POLL_MS` (default `1000`): timer/DOM polling interval.

## Notes

- If a browser tab is minimized or the system sleeps, some browsers throttle timers or pause the page; this can affect time accumulation. Keep the tab visible when possible.
- The script relies on the page's DOM structure; if the site updates, selectors may need minor adjustments.

## Troubleshooting

- "Stuck after Next": The script now restarts its main loop automatically after `Next`. If it still seems stuck, wait 2–3 seconds or click `Next` again.
- "Time not updating": Use the platform's own "Update learning progress" after several minutes; the platform itself may delay global progress updates.

