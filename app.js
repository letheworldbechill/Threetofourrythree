// Service Worker Registrierung
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}

const toggle = document.getElementById('masterToggle');
const statusEl = document.getElementById('status');
const testBtn = document.getElementById('testBtn');
const notifyBtn = document.getElementById('notifyBtn');

const LS_KEY_ENABLED = 'zt_enabled';
const LS_KEY_TARGET_TS = 'zt_target_ts';

let enabled = false;
let tickHandle = null;
let audioCtx = null;

function randomMinutes() { return Math.floor(Math.random() * 41) + 3; }

function scheduleNextCycle() {
  const mins = randomMinutes();
  const targetTs = Date.now() + mins * 60 * 1000;
  localStorage.setItem(LS_KEY_TARGET_TS, String(targetTs));
}

function updateStatus() {
  statusEl.textContent = enabled ? 'An – unsichtbarer Zufalls‑Timer aktiv' : 'Aus';
}

async function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  return audioCtx;
}

function playTone(ctx, freq, durationMs, gainVal = 0.2) {
  return new Promise(resolve => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = 0.0001;
    osc.connect(gain).connect(ctx.destination);

    const now = ctx.currentTime;
    const dur = durationMs / 1000;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.start(now);
    osc.stop(now + dur + 0.02);
    osc.onended = resolve;
  });
}

async function playDingDong() {
  const ctx = await ensureAudio();
  await playTone(ctx, 880, 220, 0.12);
  await new Promise(r => setTimeout(r, 100));
  await playTone(ctx, 392, 420, 0.28);
}

async function requestNotifyPermission() {
  if (!('Notification' in window)) return 'unsupported';
  const perm = await Notification.requestPermission();
  return perm;
}

async function sendNotification(title, body) {
  if (!('Notification' in window)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && Notification.permission === 'granted') {
      await reg.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [30, 60, 30],
        tag: 'zufalls-timer',
        renotify: true
      });
    } else if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  } catch(e) { console.error(e); }
}

function vibrate(pattern=[20,40,20]) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function startEngine() {
  if (tickHandle) return;
  scheduleNextCycle();
  tickHandle = setInterval(() => {
    const tgt = Number(localStorage.getItem(LS_KEY_TARGET_TS) || 0);
    if (!tgt) return;
    const now = Date.now();
    if (now >= tgt) {
      playDingDong();
      sendNotification('Ding – Dong!', 'Der zufällige Timer ist abgelaufen.');
      vibrate([40,80,40]);
      scheduleNextCycle();
    }
  }, 1000);
}

function stopEngine() {
  if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
  localStorage.removeItem(LS_KEY_TARGET_TS);
}

(async function init() {
  enabled = localStorage.getItem(LS_KEY_ENABLED) === '1';
  toggle.checked = enabled;
  updateStatus();

  document.addEventListener('click', ensureAudio, { once: true });

  if (enabled) startEngine();

  toggle.addEventListener('change', async () => {
    enabled = toggle.checked;
    localStorage.setItem(LS_KEY_ENABLED, enabled ? '1' : '0');
    updateStatus();
    if (enabled) {
      await ensureAudio();
      const perm = await requestNotifyPermission();
      if (perm !== 'granted') console.log('Benachrichtigungen nicht erlaubt:', perm);
      startEngine();
    } else stopEngine();
  });

  testBtn.addEventListener('click', () => playDingDong());
  notifyBtn.addEventListener('click', async () => {
    const perm = await requestNotifyPermission();
    if (perm === 'granted') sendNotification('Benachrichtigung aktiviert', 'Alles bereit für Ding‑Dong.');
  });
})();