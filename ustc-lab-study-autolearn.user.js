// ==UserScript==
// @name         Lab Study AutoLearn
// @namespace    ustc-lab-study
// @version      0.2.0
// @description  Auto stay-and-switch with a floating panel showing live progress.
// @author       alhdliox
// @match        https://sysaq.ustc.edu.cn/lab-study-front/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ===== Config =====
  const EXTRA_SECONDS = 8; // 额外缓冲秒数
  const POLL_MS = 1000;    // 轮询间隔

  const log = (...args) => console.log('[AutoLearn]', ...args);

  // ===== UI Panel =====
  const state = {
    running: false,
    waitingTotalSec: 0,
    waitStartTs: 0,
    ticker: null,
    stopScroll: null,
    looping: false,
  };

  function fmt(sec) {
    if (!Number.isFinite(sec)) return '--:--';
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${String(h).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  function ensurePanel() {
    if (document.getElementById('ustc-autolearn-panel')) return;
    const wrap = document.createElement('div');
    wrap.id = 'ustc-autolearn-panel';
    wrap.style.cssText = [
      'position:fixed','top:18px','right:18px','z-index:999999',
      'background:rgba(33,37,41,0.92)','color:#fff','padding:16px 18px',
      'border-radius:12px','box-shadow:0 8px 24px rgba(0,0,0,.35)',
      'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,Noto Sans,Apple Color Emoji,Segoe UI Emoji',
      'min-width:280px','max-width:360px'
    ].join(';');
    wrap.innerHTML = `
      <div style="font-weight:700;font-size:20px;line-height:1.2;margin-bottom:8px;">Lab Study AutoLearn</div>
      <div id="ustc-al-status" style="opacity:.9;margin-bottom:8px;">待命… 打开某篇学习详情页以开始</div>
      <div id="ustc-al-progress" style="font-size:16px;margin-bottom:10px;"></div>
      <div style="display:flex;gap:8px;margin-bottom:6px;">
        <button id="ustc-al-start" style="flex:0 0 auto;background:#28a745;border:none;color:#fff;padding:6px 12px;border-radius:8px;cursor:pointer;">Start</button>
        <button id="ustc-al-stop" style="flex:0 0 auto;background:#dc3545;border:none;color:#fff;padding:6px 12px;border-radius:8px;cursor:pointer;">Stop</button>
        <button id="ustc-al-next" style="flex:0 0 auto;background:#0d6efd;border:none;color:#fff;padding:6px 12px;border-radius:8px;cursor:pointer;">Next</button>
      </div>
      <div id="ustc-al-sub" style="font-size:13px;opacity:.85;">页面将自动保持活动，计时结束后自动切换。</div>
    `;
    document.body.appendChild(wrap);

    document.getElementById('ustc-al-start').addEventListener('click', () => {
      state.running = true;
      runSequenceFromCurrent();
    });
    document.getElementById('ustc-al-stop').addEventListener('click', () => {
      halt();
      setStatus('已暂停');
    });
    document.getElementById('ustc-al-next').addEventListener('click', async () => {
      // Skip当前并立即跳转下一条并重新开始自动计时
      halt();
      clickNextItem();
      // 等待内容区域刷新
      await sleep(1600);
      state.running = true;
      // 强制允许重新进入主循环
      state.looping = false;
      runSequenceFromCurrent();
      setStatus('已跳到下一条，准备读取时间…');
      setProgress('');
    });
  }

  function setStatus(t) {
    const el = document.getElementById('ustc-al-status');
    if (el) el.textContent = t;
  }
  function setProgress(t) {
    const el = document.getElementById('ustc-al-progress');
    if (el) el.textContent = t || '';
  }

  // ===== DOM helpers =====
  function parseTimeToSeconds(str) {
    if (!str) return null;
    const s = String(str).trim();
    const hms = /^\d{2}:\d{2}:\d{2}$/;
    const ms = /^\d{2}:\d{2}$/;
    if (hms.test(s)) {
      const [h, m, sec] = s.split(':').map(Number);
      return h * 3600 + m * 60 + sec;
    }
    if (ms.test(s)) {
      const [m, sec] = s.split(':').map(Number);
      return m * 60 + sec;
    }
    return null;
  }

  function findTimeNearLabel(labelText) {
    const els = Array.from(document.querySelectorAll('body *'));
    const labelEl = els.find(e => (e.innerText || '').trim() === labelText);
    if (!labelEl) return null;
    let cur = labelEl.nextElementSibling;
    for (let i = 0; i < 6 && cur; i++, cur = cur.nextElementSibling) {
      const t = (cur.innerText || '').trim();
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(t)) return t;
    }
    const parent = labelEl.parentElement;
    if (parent) {
      const maybe = Array.from(parent.querySelectorAll('*'))
        .map(n => (n.innerText || '').trim())
        .find(txt => /^\d{2}:\d{2}(:\d{2})?$/.test(txt));
      if (maybe) return maybe;
    }
    return null;
  }

  function readPerItemTimes() {
    const learnedStr = findTimeNearLabel('已学习');
    const requiredStr = findTimeNearLabel('要求学习');
    const learned = parseTimeToSeconds(learnedStr);
    const required = parseTimeToSeconds(requiredStr);
    return { learnedStr, requiredStr, learned, required };
  }

  function activeListAndNext() {
    const container = document.querySelector('.ivu-scroll-content ul');
    if (!container) return { list: [], index: -1, next: null };
    const list = Array.from(container.querySelectorAll('li.panelItem'));
    const idx = list.findIndex(li => li.classList.contains('activeitem'));
    const next = idx >= 0 && idx + 1 < list.length ? list[idx + 1] : null;
    return { list, index: idx, next };
  }

  function clickElement(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }, 200);
  }

  function autoScrollStart() {
    let dir = 1;
    const step = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (y <= 0) dir = 1;
      if (y >= max - 2) dir = -1;
      window.scrollBy(0, dir * 80);
    };
    const id = setInterval(step, 1500);
    return () => clearInterval(id);
  }

  function isStudyDetailPage() {
    const hasLabels = !!findTimeNearLabel('已学习') && !!findTimeNearLabel('要求学习');
    const hasList = !!document.querySelector('.ivu-scroll-content ul li.panelItem');
    return hasLabels && hasList;
  }

  async function waitFor(conditionFn, timeoutMs = 30000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const t = setInterval(() => {
        try {
          if (conditionFn()) {
            clearInterval(t);
            resolve(true);
          } else if (Date.now() - start > timeoutMs) {
            clearInterval(t);
            resolve(false);
          }
        } catch (e) {
          clearInterval(t);
          reject(e);
        }
      }, POLL_MS);
    });
  }

  async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async function runOnceForCurrentItem() {
    const ok = await waitFor(() => {
      const t = readPerItemTimes();
      return Number.isFinite(t.learned) && Number.isFinite(t.required);
    }, 60000);
    if (!ok) {
      log('Timeout waiting for per-item times; skipping to next item.');
      setStatus('无法读取时间，跳过当前条目');
      return true;
    }
    const { learned, required, learnedStr, requiredStr } = readPerItemTimes();
    const remaining = Math.max(required - learned, 0);
    log(`Times - learned: ${learnedStr}, required: ${requiredStr}, remaining: ${remaining}s`);

    if (remaining <= 0) {
      log('Already meets requirement; moving on.');
      setStatus('当前条目已达标，准备切换…');
      return true;
    }

    state.stopScroll = autoScrollStart();
    state.waitingTotalSec = remaining + EXTRA_SECONDS;
    state.waitStartTs = Date.now();
    state.running = true;
    setStatus('学习中…');

    await new Promise((resolve) => {
      state.ticker && clearInterval(state.ticker);
      state.ticker = setInterval(() => {
        if (!state.running) {
          clearInterval(state.ticker);
          resolve();
          return;
        }
        const elapsed = (Date.now() - state.waitStartTs) / 1000;
        const remainingNow = Math.max(state.waitingTotalSec - elapsed, 0);
        setProgress(`${fmt(elapsed)} / ${fmt(state.waitingTotalSec)}`);
        setStatus(`学习中… 剩余 ${fmt(remainingNow)}`);
        if (elapsed >= state.waitingTotalSec) {
          clearInterval(state.ticker);
          resolve();
        }
      }, 1000);
    });

    if (state.stopScroll) { state.stopScroll(); state.stopScroll = null; }
    setStatus('本条完成，准备切换…');
    setProgress('');
    return true;
  }

  function clickNextItem() {
    const { next } = activeListAndNext();
    if (next) {
      log('Switching to next item ...');
      clickElement(next);
    } else {
      setStatus('已到列表末尾');
    }
  }

  function halt() {
    state.running = false;
    if (state.ticker) { clearInterval(state.ticker); state.ticker = null; }
    if (state.stopScroll) { state.stopScroll(); state.stopScroll = null; }
    setProgress('');
  }

  async function runSequenceFromCurrent() {
    if (state.looping) return; // prevent duplicate loops
    state.looping = true;
    if (!isStudyDetailPage()) {
      ensurePanel();
      setStatus('请进入某篇“学习详情”页后再开始');
      state.looping = false;
      return;
    }
    ensurePanel();
    log('AutoLearn started.');
    while (state.running) {
      await runOnceForCurrentItem();
      if (!state.running) break;
      const { next } = activeListAndNext();
      if (!next) {
        setStatus('到达最后一条，已停止');
        break;
      }
      clickElement(next);
      await sleep(1500);
    }
    log('AutoLearn finished.');
    state.looping = false;
  }

  // 初始化：插入面板，不自动开始
  window.addEventListener('load', () => setTimeout(() => {
    ensurePanel();
    if (isStudyDetailPage()) {
      setStatus('已就绪，可点击 Start');
    } else {
      setStatus('待命… 打开“学习详情”页以开始');
    }
  }, 1200));
})();
