/**
 * ============================================================
 *  Wellness Chatbot — login.js
 *  Controls:  login.html  +  login.css
 *  Backend:   app.py (Flask)
 *
 *  Features
 *  ─────────
 *  1.  Page loader hide
 *  2.  Dynamic particle generator
 *  3.  Animated stat counters
 *  4.  Dark / light theme toggle (persisted to localStorage)
 *  5.  Floating label inputs (CSS does the animation; JS watches focus)
 *  6.  Real-time email validation with green tick
 *  7.  Live password strength meter (colour + label)
 *  8.  Caps-lock warning
 *  9.  Password show / hide toggle
 * 10.  "Remember me" — persist email in localStorage
 * 11.  Rate limiting + lockout (5 attempts → 15 min cooldown)
 * 12.  Full form validation before submit
 * 13.  Fetch POST to Flask /auth/login with loading + ripple
 * 14.  Session storage (JWT + user info)
 * 15.  Google OAuth redirect → Flask /auth/google
 * 16.  Forgot password → Flask /auth/forgot-password
 * 17.  Alert banner (error / success / warning) with auto-dismiss
 * 18.  Toast notification system
 *  19.  Brand icon hover pulse (CSS class driven by JS)
 * 20.  Shake animation on failed submit
 * ============================================================
 */

'use strict';

/* ──────────────────────────────────────────────────
   CONFIG  — update API_BASE_URL for your Flask server
   ────────────────────────────────────────────────── */
const CONFIG = {
  API_BASE_URL        : 'http://localhost:5000',
  LOGIN_ENDPOINT      : '/auth/login',
  GOOGLE_OAUTH_URL    : '/auth/google',
  FORGOT_PWD_URL      : '/auth/forgot-password',
  REDIRECT_AFTER_LOGIN: '/dashboard',
  MAX_LOGIN_ATTEMPTS  : 5,
  LOCKOUT_MINUTES     : 15,
  SESSION_KEY         : 'wc_session',
  REMEMBER_KEY        : 'wc_remember_email',
  THEME_KEY           : 'wc_theme',
};

/* ──────────────────────────────────────────────────
   RUNTIME STATE
   ────────────────────────────────────────────────── */
const state = {
  loginAttempts  : parseInt(localStorage.getItem('wc_attempts') || '0', 10),
  isLockedOut    : false,
  lockoutTimer   : null,
  isSubmitting   : false,
  passwordVisible: false,
};

/* ──────────────────────────────────────────────────
   DOM HELPERS
   ────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const $q = (sel) => document.querySelector(sel);

const DOM = {
  pageLoader   : () => $('pageLoader'),
  mainPage     : () => $('mainPage'),
  particles    : () => $('particles'),
  brandIcon    : () => $('brandIcon'),
  themeToggle  : () => $('themeToggle'),
  themeIcon    : () => $('themeIcon'),
  loginBox     : () => $('loginBox'),
  googleBtn    : () => $('googleBtn'),
  alertBanner  : () => $('alertBanner'),
  alertText    : () => $('alertText'),
  alertClose   : () => $('alertClose'),
  alertProgress: () => $('alertProgress'),
  emailInput   : () => $('email'),
  emailGroup   : () => $('emailGroup'),
  emailTick    : () => $('emailTick'),
  passwordInput: () => $('password'),
  passwordGroup: () => $('passwordGroup'),
  pwdToggle    : () => $('pwdToggle'),
  eyeIcon      : () => $('eyeIcon'),
  capsWarning  : () => $('capsWarning'),
  strengthMeter: () => $('strengthMeter'),
  strengthFill : () => $('strengthFill'),
  strengthLabel: () => $('strengthLabel'),
  rememberCheck: () => $('remember'),
  forgotLink   : () => $('forgotLink'),
  submitBtn    : () => $('submitBtn'),
  btnLabel     : () => $q('.btn-label'),
  rippleCircle : () => $('rippleCircle'),
  toastContainer:() => $('toastContainer'),
  statNumbers  : () => document.querySelectorAll('.stat-number'),
};

/* ════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initTheme();
  initParticles();
  initStatCounters();
  initEventListeners();
  checkExistingSession();
  loadRememberedEmail();
  restoreLockoutState();
  console.info('🌿 Wellness Chatbot login.js ready');
});

/* ════════════════════════════════════════════════
   1. PAGE LOADER
   ════════════════════════════════════════════════ */
function initLoader() {
  // After the CSS fill animation (~1.4 s) finishes, hide loader & show page
  setTimeout(() => {
    DOM.pageLoader().classList.add('hidden');
    DOM.mainPage().classList.add('visible');
  }, 1600);
}

/* ════════════════════════════════════════════════
   2. PARTICLE GENERATOR
   ════════════════════════════════════════════════ */
function initParticles() {
  const container = DOM.particles();
  if (!container) return;
  const sizes   = [2, 3, 4, 5, 3, 4, 2, 5];
  const lefts   = [8, 18, 28, 38, 48, 58, 68, 78, 88];
  const durations = [8, 10, 12, 9, 13, 11, 14, 10, 9];
  const delays    = [0, 1.5, 3, 5, 7, 2, 4.5, 6, 8];

  lefts.forEach((left, i) => {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      width:${sizes[i % sizes.length]}px;
      height:${sizes[i % sizes.length]}px;
      left:${left}%;
      bottom:-10px;
      animation-duration:${durations[i]}s;
      animation-delay:${delays[i]}s;
      opacity:${0.3 + (i % 4) * 0.15};
    `;
    container.appendChild(p);
  });
}

/* ════════════════════════════════════════════════
   3. STAT COUNTERS  (animated count-up)
   ════════════════════════════════════════════════ */
function initStatCounters() {
  // Trigger once the left panel has animated in (~1 s delay)
  setTimeout(() => {
    DOM.statNumbers().forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      const suffix = el.dataset.suffix || '';
      animateCount(el, 0, target, 1200, suffix);
    });
  }, 1200);
}

function animateCount(el, from, to, duration, suffix) {
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    // Ease-out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + (to - from) * ease);
    el.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ════════════════════════════════════════════════
   4. THEME TOGGLE
   ════════════════════════════════════════════════ */
function initTheme() {
  const saved = localStorage.getItem(CONFIG.THEME_KEY) || 'light';
  applyTheme(saved, false);
}

function applyTheme(theme, save = true) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = DOM.themeIcon();
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  if (save) localStorage.setItem(CONFIG.THEME_KEY, theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* ════════════════════════════════════════════════
   5. EVENT LISTENERS
   ════════════════════════════════════════════════ */
function initEventListeners() {
  // Theme
  DOM.themeToggle()?.addEventListener('click', toggleTheme);

  // Brand icon pulse on click
  DOM.brandIcon()?.addEventListener('click', () => {
    const el = DOM.brandIcon();
    el.style.animation = 'none';
    void el.offsetWidth; // reflow
    el.style.animation = 'loaderBounce 0.4s ease';
  });

  // Google OAuth
  DOM.googleBtn()?.addEventListener('click', handleGoogle);

  // Alert dismiss
  DOM.alertClose()?.addEventListener('click', hideAlert);

  // Email
  const emailEl = DOM.emailInput();
  emailEl?.addEventListener('input',  () => { clearFieldState('emailGroup', 'email'); liveValidateEmail(); });
  emailEl?.addEventListener('blur',   () => validateEmail(true));
  emailEl?.addEventListener('keydown', (e) => { if (e.key === 'Enter') DOM.passwordInput()?.focus(); });

  // Password
  const pwdEl = DOM.passwordInput();
  pwdEl?.addEventListener('input',   () => { clearFieldError('passwordGroup', 'password'); updateStrengthMeter(pwdEl.value); });
  pwdEl?.addEventListener('blur',    () => validatePassword(true));
  pwdEl?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });
  pwdEl?.addEventListener('keyup',   detectCapsLock);
  pwdEl?.addEventListener('keydown', detectCapsLock);

  // Password toggle
  DOM.pwdToggle()?.addEventListener('click', togglePasswordVisibility);

  // Remember me
  DOM.rememberCheck()?.addEventListener('change', handleRememberChange);

  // Forgot password
  DOM.forgotLink()?.addEventListener('click', (e) => { e.preventDefault(); handleForgotPassword(); });

  // Submit with ripple
  DOM.submitBtn()?.addEventListener('click', (e) => {
    triggerRipple(e);
    handleLogin();
  });
}

/* ════════════════════════════════════════════════
   6. LIVE EMAIL VALIDATION  (green tick on valid)
   ════════════════════════════════════════════════ */
function liveValidateEmail() {
  const val  = DOM.emailInput()?.value.trim() || '';
  const tick = DOM.emailTick();
  const isOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val);
  if (tick) tick.classList.toggle('show', isOk);
  if (isOk) DOM.emailGroup()?.classList.add('is-valid');
}

/* ════════════════════════════════════════════════
   7. PASSWORD STRENGTH METER
   ════════════════════════════════════════════════ */
function updateStrengthMeter(password) {
  const meter = DOM.strengthMeter();
  const fill  = DOM.strengthFill();
  const label = DOM.strengthLabel();
  if (!meter || !fill || !label) return;

  if (!password) {
    meter.classList.remove('show');
    return;
  }
  meter.classList.add('show');

  const { strength, text } = getPasswordStrength(password);
  fill.setAttribute('data-strength', strength);
  label.setAttribute('data-strength', strength);
  label.textContent = text;
}

function getPasswordStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd))    score++;
  if (/[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(pwd)) score++;

  if (score <= 2) return { strength: 'weak',   text: 'Weak' };
  if (score <= 3) return { strength: 'fair',   text: 'Fair' };
  if (score <= 4) return { strength: 'good',   text: 'Good' };
  return           { strength: 'strong', text: 'Strong' };
}

/* ════════════════════════════════════════════════
   8. CAPS LOCK DETECTOR
   ════════════════════════════════════════════════ */
function detectCapsLock(e) {
  const capsOn = e.getModifierState?.('CapsLock');
  const warn   = DOM.capsWarning();
  if (!warn) return;
  warn.classList.toggle('show', !!capsOn);
}

/* ════════════════════════════════════════════════
   9. PASSWORD VISIBILITY TOGGLE
   ════════════════════════════════════════════════ */
function togglePasswordVisibility() {
  state.passwordVisible = !state.passwordVisible;
  const input  = DOM.passwordInput();
  const toggle = DOM.pwdToggle();
  const icon   = DOM.eyeIcon();
  if (!input || !icon) return;

  input.type = state.passwordVisible ? 'text' : 'password';
  toggle?.setAttribute('title', state.passwordVisible ? 'Hide password' : 'Show password');

  icon.innerHTML = state.passwordVisible
    ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
              a18.45 18.45 0 0 1 5.06-5.94
              M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8
              a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
       <line x1="1" y1="1" x2="23" y2="23"/>`
    : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
       <circle cx="12" cy="12" r="3"/>`;
}

/* ════════════════════════════════════════════════
   10. REMEMBER ME
   ════════════════════════════════════════════════ */
function loadRememberedEmail() {
  const saved = localStorage.getItem(CONFIG.REMEMBER_KEY);
  if (!saved) return;
  const emailEl = DOM.emailInput();
  const check   = DOM.rememberCheck();
  if (emailEl) emailEl.value = saved;
  if (check)   check.checked  = true;
  // Trigger live validation to show the tick immediately
  liveValidateEmail();
  // Focus password since email is pre-filled
  setTimeout(() => DOM.passwordInput()?.focus(), 400);
}

function handleRememberChange() {
  const checked = DOM.rememberCheck()?.checked;
  const email   = DOM.emailInput()?.value.trim().toLowerCase();
  if (checked && email) {
    localStorage.setItem(CONFIG.REMEMBER_KEY, email);
  } else if (!checked) {
    localStorage.removeItem(CONFIG.REMEMBER_KEY);
  }
}

/* ════════════════════════════════════════════════
   11. RATE LIMITING & LOCKOUT
   ════════════════════════════════════════════════ */
function restoreLockoutState() {
  const lockoutEnd = localStorage.getItem('wc_lockout_end');
  if (!lockoutEnd) return;
  const remaining = new Date(lockoutEnd) - Date.now();
  if (remaining > 0) {
    applyLockout(Math.ceil(remaining / 60000));
  } else {
    clearLockout();
  }
}

function triggerLockout() {
  const end = new Date(Date.now() + CONFIG.LOCKOUT_MINUTES * 60000);
  localStorage.setItem('wc_lockout_end', end.toISOString());
  state.loginAttempts = CONFIG.MAX_LOGIN_ATTEMPTS;
  localStorage.setItem('wc_attempts', state.loginAttempts);
  applyLockout(CONFIG.LOCKOUT_MINUTES);
}

function applyLockout(minutesRemaining) {
  state.isLockedOut = true;
  const btn = DOM.submitBtn();
  if (btn) { btn.disabled = true; btn.style.background = 'linear-gradient(135deg,#888,#666)'; }

  let seconds = minutesRemaining * 60;
  updateLockoutMsg(seconds);

  state.lockoutTimer = setInterval(() => {
    seconds--;
    if (seconds <= 0) clearLockout();
    else updateLockoutMsg(seconds);
  }, 1000);
}

function updateLockoutMsg(seconds) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  const time = m > 0 ? `${m}m ${s}s` : `${seconds}s`;
  showAlert('error', `Too many attempts. Try again in ${time}.`, false);
}

function clearLockout() {
  state.isLockedOut   = false;
  state.loginAttempts = 0;
  clearInterval(state.lockoutTimer);
  state.lockoutTimer = null;
  localStorage.removeItem('wc_lockout_end');
  localStorage.removeItem('wc_attempts');

  const btn = DOM.submitBtn();
  if (btn) {
    btn.disabled = false;
    btn.style.background = '';
    resetSubmitBtn();
  }
  hideAlert();
  showToast('success', 'You\'re unlocked!', 'You can try signing in again.');
}

/* ════════════════════════════════════════════════
   12. FORM VALIDATION
   ════════════════════════════════════════════════ */
function validateEmail(showUI = false) {
  const val = DOM.emailInput()?.value.trim() || '';
  if (!val)                              { if (showUI) setFieldError('emailGroup', 'email-error', 'Email address is required.'); return false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) { if (showUI) setFieldError('emailGroup', 'email-error', 'Please enter a valid email address.'); return false; }
  if (showUI) setFieldValid('emailGroup');
  liveValidateEmail();
  return true;
}

function validatePassword(showUI = false) {
  const val = DOM.passwordInput()?.value || '';
  if (!val)           { if (showUI) setFieldError('passwordGroup', 'password-error', 'Password is required.'); return false; }
  if (val.length < 6) { if (showUI) setFieldError('passwordGroup', 'password-error', 'Password must be at least 6 characters.'); return false; }
  if (showUI) setFieldValid('passwordGroup');
  return true;
}

function validateAll() {
  return validateEmail(true) & validatePassword(true);  // both run (no short-circuit)
}

/* ── Field state helpers ── */
function setFieldError(groupId, errorId, message) {
  const group = $(groupId);
  const span  = $(errorId);
  group?.classList.add('has-error');
  group?.classList.remove('is-valid');
  if (span) span.textContent = message;
  // shake
  group?.style.setProperty('animation', 'none');
  void group?.offsetWidth;
  group?.style.setProperty('animation', 'shake 0.45s ease');
}

function setFieldValid(groupId) {
  const group = $(groupId);
  group?.classList.remove('has-error');
  group?.classList.add('is-valid');
}

function clearFieldState(groupId, errorId) {
  $(groupId)?.classList.remove('has-error', 'is-valid');
  const span = $(errorId);
  if (span) span.textContent = '';
}

function clearFieldError(groupId, errorId) {
  $(groupId)?.classList.remove('has-error');
  const span = $(errorId);
  if (span) span.textContent = '';
}

/* ════════════════════════════════════════════════
   13. MAIN LOGIN HANDLER
   ════════════════════════════════════════════════ */
async function handleLogin() {
  if (state.isSubmitting) return;
  if (state.isLockedOut) {
    showAlert('error', 'Too many attempts. Please wait for the lockout to expire.');
    shakeBox();
    return;
  }

  hideAlert();
  if (!validateAll()) { shakeBox(); return; }

  const email    = DOM.emailInput().value.trim().toLowerCase();
  const password = DOM.passwordInput().value;
  const remember = DOM.rememberCheck()?.checked || false;

  setSubmitLoading(true);

  try {
    const result = await callLoginAPI(email, password);

    if (result.success) {
      onLoginSuccess(result, email, remember);
    } else {
      onLoginFailure(result.message || 'Incorrect email or password.');
    }
  } catch (err) {
    onLoginFailure(getNetworkError(err));
  } finally {
    if (!state.isLockedOut && state.isSubmitting) setSubmitLoading(false);
  }
}

/* ── API call ── */
async function callLoginAPI(email, password) {
  const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.LOGIN_ENDPOINT}`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));
  return {
    success: response.ok && data.success === true,
    token  : data.token   || null,
    user   : data.user    || { email },
    message: data.message || 'Incorrect email or password.',
    expires: data.expires || null,
  };
}

/* ── Success ── */
function onLoginSuccess(result, email, remember) {
  state.loginAttempts = 0;
  localStorage.removeItem('wc_attempts');

  if (remember) localStorage.setItem(CONFIG.REMEMBER_KEY, email);
  else          localStorage.removeItem(CONFIG.REMEMBER_KEY);

  saveSession({ token: result.token, user: result.user, expires: result.expires });

  setSubmitSuccess();
  showToast('success', 'Signed in!', `Welcome back, ${result.user?.name || email} 🌿`);

  setTimeout(() => { window.location.href = CONFIG.REDIRECT_AFTER_LOGIN; }, 1200);
}

/* ── Failure ── */
function onLoginFailure(message) {
  state.loginAttempts++;
  localStorage.setItem('wc_attempts', state.loginAttempts);

  const left = CONFIG.MAX_LOGIN_ATTEMPTS - state.loginAttempts;

  setSubmitLoading(false);

  if (state.loginAttempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
    triggerLockout();
  } else {
    const hint = left === 1 ? ' (last attempt before lockout!)' : left > 0 ? ` (${left} left)` : '';
    showAlert('error', message + hint);
    shakeBox();
    showToast('error', 'Login failed', message);
  }
}

/* ════════════════════════════════════════════════
   14. SESSION MANAGEMENT
   ════════════════════════════════════════════════ */
function saveSession(data) {
  try { localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(data)); } catch (_) {}
}
function getSession() {
  try { return JSON.parse(localStorage.getItem(CONFIG.SESSION_KEY)); } catch { return null; }
}
function isTokenExpired(session) {
  return session?.expires ? new Date(session.expires) < new Date() : false;
}
function checkExistingSession() {
  const s = getSession();
  if (s?.token && !isTokenExpired(s)) {
    window.location.href = CONFIG.REDIRECT_AFTER_LOGIN;
  }
}

/* ════════════════════════════════════════════════
   15. GOOGLE OAUTH
   ════════════════════════════════════════════════ */
function handleGoogle() {
  const btn = DOM.googleBtn();
  if (!btn) return;
  btn.disabled = true;
  btn.style.opacity = '0.75';
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="#5a8a73" stroke-width="2.5"
         style="animation:btnSpin 0.7s linear infinite">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-.28-4.5"/>
    </svg>
    <span>Redirecting to Google…</span>`;

  setTimeout(() => { window.location.href = `${CONFIG.API_BASE_URL}${CONFIG.GOOGLE_OAUTH_URL}`; }, 600);
}

/* ════════════════════════════════════════════════
   16. FORGOT PASSWORD
   ════════════════════════════════════════════════ */
async function handleForgotPassword() {
  const prefill = DOM.emailInput()?.value.trim();
  const email   = prefill || prompt('Enter your registered email address:');
  if (!email) return;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    showAlert('warning', 'Please enter a valid email address first.');
    return;
  }

  showAlert('success', `If an account exists for ${email}, a reset link has been sent.`);
  showToast('success', 'Check your inbox', `A reset link was sent to ${email}`);

  // Uncomment when Flask is running:
  // try {
  //   await fetch(`${CONFIG.API_BASE_URL}${CONFIG.FORGOT_PWD_URL}`, {
  //     method : 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body   : JSON.stringify({ email }),
  //   });
  // } catch (e) { console.error('Forgot password error:', e); }
}

/* ════════════════════════════════════════════════
   17. ALERT BANNER
   ════════════════════════════════════════════════ */
function showAlert(type, message, autoHide = true) {
  const banner   = DOM.alertBanner();
  const text     = DOM.alertText();
  const progress = DOM.alertProgress();
  if (!banner || !text) return;

  text.textContent = message;
  banner.setAttribute('data-type', type);
  banner.classList.add('show');

  // Restart progress bar
  if (progress) {
    progress.style.animation = 'none';
    void progress.offsetWidth;
    progress.style.animation = 'alertTimer 5s linear forwards';
  }

  if (autoHide) setTimeout(hideAlert, 5000);
}

function hideAlert() {
  DOM.alertBanner()?.classList.remove('show');
}

/* ════════════════════════════════════════════════
   18. TOAST NOTIFICATION SYSTEM
   ════════════════════════════════════════════════ */
const TOAST_EMOJIS = { success: '✅', error: '❌', warning: '⚠️', info: '💡' };

function showToast(type, title, body = '') {
  const container = DOM.toastContainer();
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-emoji">${TOAST_EMOJIS[type] || '💬'}</span>
    <div class="toast-body">
      <strong>${title}</strong>
      ${body}
    </div>`;
  container.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 320);
  }, 3800);
}

/* ════════════════════════════════════════════════
   19. BUTTON STATES
   ════════════════════════════════════════════════ */
function setSubmitLoading(active) {
  state.isSubmitting = active;
  const btn   = DOM.submitBtn();
  const label = DOM.btnLabel();
  if (!btn) return;

  if (active) {
    btn.disabled = true;
    btn.classList.add('loading');
    if (label) label.textContent = 'Signing in';
  } else {
    btn.disabled = false;
    btn.classList.remove('loading');
    resetSubmitBtn();
  }
}

function setSubmitSuccess() {
  const btn   = DOM.submitBtn();
  const label = DOM.btnLabel();
  if (!btn) return;
  btn.classList.remove('loading');
  btn.classList.add('success');
  btn.disabled = true;
  if (label) label.textContent = 'Signed in ✓';
  state.isSubmitting = false;
}

function resetSubmitBtn() {
  const btn   = DOM.submitBtn();
  const label = DOM.btnLabel();
  btn?.classList.remove('loading', 'success');
  if (label) label.textContent = 'Sign In';
  if (btn) {
    btn.style.background = '';
    btn.innerHTML = `
      <svg class="btn-icon" width="17" height="17" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2.2">
        <path stroke-linecap="round" stroke-linejoin="round"
              d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
        <polyline points="10 17 15 12 10 7"/>
        <line x1="15" y1="12" x2="3" y2="12"/>
      </svg>
      <span class="btn-label">Sign In</span>
      <span class="ripple-circle" id="rippleCircle"></span>`;
    // Re-bind ripple
    DOM.submitBtn()?.addEventListener('click', (e) => { triggerRipple(e); handleLogin(); }, { once: true });
  }
}

/* ════════════════════════════════════════════════
   20. RIPPLE EFFECT ON BUTTON
   ════════════════════════════════════════════════ */
function triggerRipple(e) {
  const btn    = DOM.submitBtn();
  const ripple = $('rippleCircle');
  if (!btn || !ripple) return;

  const rect   = btn.getBoundingClientRect();
  const size   = Math.max(rect.width, rect.height);
  const x      = e.clientX - rect.left - size / 2;
  const y      = e.clientY - rect.top  - size / 2;

  ripple.style.cssText = `
    width:${size}px; height:${size}px;
    left:${x}px; top:${y}px;
    transform: scale(0); opacity: 0.25;`;

  ripple.classList.remove('animate');
  void ripple.offsetWidth;
  ripple.classList.add('animate');
}

/* ════════════════════════════════════════════════
   UTILITIES
   ════════════════════════════════════════════════ */
function shakeBox() {
  const box = DOM.loginBox();
  if (!box) return;
  box.style.animation = 'none';
  void box.offsetWidth;
  box.style.animation = 'shake 0.45s ease';
}

function getNetworkError(err) {
  if (!navigator.onLine) return 'No internet connection. Please check your network.';
  if (err?.name === 'AbortError') return 'Request timed out. Please try again.';
  return 'Unable to reach the server. Please try again shortly.';
}

/* Inject @keyframes that CSS file can't add dynamically */
(function injectKeyframes() {
  const s = document.createElement('style');
  s.textContent = `
    @keyframes btnSpin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }`;
  document.head.appendChild(s);
})();
