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

Below are two common ways to install the userscript into Tampermonkey.

### A) One‑click install from GitHub (Recommended)

1. Install Tampermonkey (see the next section) and make sure it is enabled.
2. Open this URL in your browser:  
   `https://raw.githubusercontent.com/ALHDLIOX/LabStudyAutoLearn/main/ustc-lab-study-autolearn.user.js`
3. Your browser should show Tampermonkey’s install page automatically. Click “Install”.
4. Visit a learning detail page on the USTC Lab Study site; a floating panel should appear in the top‑right.

Tampermonkey will be able to auto‑check for updates if you installed via the URL above.

### B) Manual import from a local file

1. Install Tampermonkey (see below).
2. Download `ustc-lab-study-autolearn.user.js` to your computer.
3. Click the Tampermonkey icon → “Dashboard” → “Utilities” tab.
4. In the “Zip/Local” section, click “Choose File”, select the downloaded `.user.js`, then click “Import”.
5. Confirm the install prompt. Open a learning detail page to verify the floating panel.

### How to install Tampermonkey

- Chrome / Chromium: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo
- Microsoft Edge: https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd
- Firefox: https://addons.mozilla.org/firefox/addon/tampermonkey/
- Safari: search “Tampermonkey” in the Mac App Store (paid) or use a compatible userscript manager.

## Usage

- Click `Start` to begin. The panel shows `elapsed / total` for the current item and the remaining time.
- The script auto‑scrolls gently to keep the page active and prevent idle timeouts.
- When time completes, it clicks the next required item and continues.
- Click `Next` to skip the current item. The script will auto‑read the new item's times and start automatically.
- Click `Stop` to pause at any time.

If the panel does not appear, ensure you are on a “learning detail” page where both “已学习” and “要求学习” labels are visible, and that the userscript is enabled in Tampermonkey.

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
