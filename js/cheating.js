import { state } from './state.js';
import { showNotification } from './ui.js';

function logEvent(event, details = {}) {
    const timestamp = new Date().toISOString();
    state.currentUser.cheating.push({ event, timestamp, details });
    console.warn(`Cheating detected: ${event}`, details);
    showNotification(`⚠️ Security Alert: ${event.replace(/_/g, ' ')} detected.`, "error");
};

export function setupCheatingDetection() {
  window.addEventListener('blur', () => logEvent('window_blur'));
  document.addEventListener('visibilitychange', () => document.hidden && logEvent('tab_hidden'));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) || (e.ctrlKey && e.key === 'u')) {
      e.preventDefault();
      logEvent('devtools_opened');
    }
    if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey)) {
        logEvent('screenshot_attempt');
    }
  });

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    logEvent('context_menu_opened');
  });
}
