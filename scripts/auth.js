'use strict';

const USER_KEY = 'glaciopia_user';

const Auth = (() => {
  let cachedUser = null;

  function getUser() {
    if (cachedUser) return cachedUser;
    try { cachedUser = JSON.parse(localStorage.getItem(USER_KEY)); } catch (_) {}
    return cachedUser;
  }

  function setUser(u) {
    cachedUser = u;
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else    localStorage.removeItem(USER_KEY);
  }

  function isLoggedIn() {
    return !!Api.getToken() && !!getUser();
  }

  async function register(username, email, password) {
    const data = await Api.auth.register(username, email, password);
    // ora la registrazione non logga: richiede verifica email
    return data;
  }

  async function verify(email, code) {
    const data = await Api.auth.verify(email, code);
    Api.setToken(data.token);
    setUser(data.user);
    handleAuthChange(true);
    return data.user;
  }

  async function resend(email) {
    return Api.auth.resend(email);
  }

  async function forgot(email) {
    return Api.auth.forgot(email);
  }

  async function reset(email, code, password) {
    return Api.auth.reset(email, code, password);
  }

  function displayNameOf(u) {
    if (!u) return '';
    return (u.display_name && u.display_name.trim()) ? u.display_name : u.username;
  }

  async function updateProfile(data) {
    const res = await Api.me.update(data);
    if (res.token) Api.setToken(res.token);
    setUser(res.user);
    refreshNavUser();
    document.dispatchEvent(new Event('authChange'));
    return res.user;
  }

  async function requestPasswordCode() {
    return Api.me.requestPwdCode();
  }

  async function changePassword(data) {
    return Api.me.changePassword(data);
  }

  async function login(email, password) {
    Api.setToken(null);
    setUser(null);
    const data = await Api.auth.login(email, password);
    Api.setToken(data.token);
    setUser(data.user);
    handleAuthChange(true);
    return data.user;
  }

  function logout() {
    Api.setToken(null);
    setUser(null);
    handleAuthChange();
  }

  function handleAuthChange(forceCloud = false) {
    refreshNavUser();
    document.dispatchEvent(new Event('authChange'));
    if (typeof syncCloudSave === 'function') syncCloudSave(forceCloud);
  }

  function refreshNavUser() {
    const btn    = document.getElementById('nav-auth-btn');
    const label  = document.getElementById('nav-auth-label');
    const avatar = document.getElementById('nav-auth-avatar');
    if (!btn) return;
    const user = getUser();
    if (isLoggedIn() && user) {
      const dn = displayNameOf(user);
      if (label)  label.textContent  = dn;
      if (avatar) avatar.textContent = dn.charAt(0).toUpperCase();
      btn.classList.add('logged-in');
    } else {
      if (label)  label.textContent  = 'Login';
      if (avatar) avatar.textContent = '';
      btn.classList.remove('logged-in');
    }
  }

  function buildAuthModal() {
    if (document.getElementById('auth-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.innerHTML = `
      <div class="auth-backdrop"></div>
      <div class="auth-box">
        <button class="auth-close" id="auth-close-btn" aria-label="Chiudi">
          <i class="fas fa-xmark"></i>
        </button>

        <div class="auth-view" data-view="login">
          <div class="auth-header">
            <div class="auth-icon"><i class="fas fa-right-to-bracket"></i></div>
            <h2 data-i18n="auth.loginTitle">Accedi</h2>
            <p data-i18n="auth.loginSubtitle">Bentornato su Glaciopia</p>
          </div>

          <div class="auth-field">
            <label for="auth-login-email" data-i18n="auth.email">Email</label>
            <input class="auth-input" id="auth-login-email" type="email" autocomplete="email" placeholder="nome@esempio.com">
          </div>

          <div class="auth-field">
            <label for="auth-login-password" data-i18n="auth.password">Password</label>
            <div class="auth-input-wrap">
              <input class="auth-input" id="auth-login-password" type="password" autocomplete="current-password" placeholder="••••••••">
              <button class="auth-eye" data-target="auth-login-password" type="button" aria-label="Mostra password">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>

          <button class="auth-forgot" id="auth-forgot-btn" type="button" data-i18n="auth.forgot">Password dimenticata?</button>

          <div class="auth-error" id="auth-login-error"></div>

          <button class="auth-submit" id="auth-login-btn">
            <span data-i18n="auth.loginBtn">Accedi</span>
          </button>

          <p class="auth-switch">
            <span data-i18n="auth.noAccount">Non sei registrato?</span>
            <button type="button" data-goto="register" data-i18n="auth.goRegister">Registrati</button>
          </p>
        </div>

        <div class="auth-view hidden" data-view="register">
          <div class="auth-header">
            <div class="auth-icon"><i class="fas fa-user-plus"></i></div>
            <h2 data-i18n="auth.registerTitle">Crea un account</h2>
            <p data-i18n="auth.registerSubtitle">Benvenuto tra i nostri</p>
          </div>

          <div class="auth-field">
            <label for="auth-reg-username" data-i18n="auth.username">Username</label>
            <input class="auth-input" id="auth-reg-username" type="text" autocomplete="username" maxlength="18" placeholder="IsottaCiabatta">
          </div>

          <div class="auth-field">
            <label for="auth-reg-email" data-i18n="auth.email">Email</label>
            <input class="auth-input" id="auth-reg-email" type="email" autocomplete="email" placeholder="nome@esempio.com">
          </div>

          <div class="auth-field">
            <label for="auth-reg-password" data-i18n="auth.password">Password</label>
            <div class="auth-input-wrap">
              <input class="auth-input" id="auth-reg-password" type="password" autocomplete="new-password" placeholder="••••••••">
              <button class="auth-eye" data-target="auth-reg-password" type="button" aria-label="Mostra password">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>

          <div class="auth-error" id="auth-reg-error"></div>

          <button class="auth-submit" id="auth-reg-btn">
            <span data-i18n="auth.registerBtn">Crea account</span>
          </button>

          <div id="auth-reg-code-block" style="display:none;">
            <div class="auth-field" style="margin-top:0.85rem;">
              <label for="auth-reg-code" data-i18n="auth.code">Codice</label>
              <input class="auth-input auth-code-input" id="auth-reg-code" type="text" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code">
            </div>
            <p class="auth-forgot-text" id="auth-reg-code-hint" style="margin-bottom:0.6rem;"></p>
            <div class="auth-error" id="auth-reg-code-error"></div>
            <button class="auth-submit" id="auth-reg-verify-btn">
              <span data-i18n="auth.verifyBtn">Verifica</span>
            </button>
            <p class="auth-switch">
              <span data-i18n="auth.noCode">Non hai ricevuto il codice?</span>
              <button type="button" id="auth-reg-resend-btn" data-i18n="auth.resend">Reinvia</button>
            </p>
          </div>

          <p class="auth-switch" id="auth-reg-switch-login">
            <span data-i18n="auth.hasAccount">Hai già un account?</span>
            <button type="button" data-goto="login" data-i18n="auth.goLogin">Accedi</button>
          </p>
        </div>

        <div class="auth-view hidden" data-view="verify">
          <div class="auth-header">
            <div class="auth-icon"><i class="fas fa-envelope-circle-check"></i></div>
            <h2 data-i18n="auth.verifyTitle">Verifica la tua email</h2>
            <p data-i18n="auth.verifySubtitle">Ti abbiamo inviato un codice a 6 cifre</p>
          </div>
          <p class="auth-forgot-text" id="auth-verify-hint"></p>
          <div class="auth-field">
            <label for="auth-verify-code" data-i18n="auth.code">Codice</label>
            <input class="auth-input auth-code-input" id="auth-verify-code" type="text" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code">
          </div>
          <div class="auth-error" id="auth-verify-error"></div>
          <button class="auth-submit" id="auth-verify-btn">
            <span data-i18n="auth.verifyBtn">Verifica</span>
          </button>
          <p class="auth-switch">
            <span data-i18n="auth.noCode">Non hai ricevuto il codice?</span>
            <button type="button" id="auth-resend-btn" data-i18n="auth.resend">Reinvia</button>
          </p>
        </div>

        <div class="auth-view hidden" data-view="forgot">
          <div class="auth-header">
            <div class="auth-icon"><i class="fas fa-key"></i></div>
            <h2 data-i18n="auth.forgotTitle">Password dimenticata</h2>
            <p data-i18n="auth.forgotSubtitle">Inserisci la tua email per ricevere un codice</p>
          </div>
          <div class="auth-field">
            <label for="auth-forgot-email" data-i18n="auth.email">Email</label>
            <input class="auth-input" id="auth-forgot-email" type="email" autocomplete="email" placeholder="nome@esempio.com">
          </div>
          <div class="auth-error" id="auth-forgot-error"></div>
          <button class="auth-submit" id="auth-forgot-send-btn">
            <span data-i18n="auth.forgotSendBtn">Invia codice</span>
          </button>
          <p class="auth-switch">
            <button type="button" data-goto="login" data-i18n="auth.backToLogin">Torna al login</button>
          </p>
        </div>

        <div class="auth-view hidden" data-view="reset">
          <div class="auth-header">
            <div class="auth-icon"><i class="fas fa-lock-open"></i></div>
            <h2 data-i18n="auth.resetTitle">Nuova password</h2>
            <p data-i18n="auth.resetSubtitle">Inserisci il codice ricevuto e la nuova password</p>
          </div>
          <div class="auth-field">
            <label for="auth-reset-code" data-i18n="auth.code">Codice</label>
            <input class="auth-input auth-code-input" id="auth-reset-code" type="text" inputmode="numeric" maxlength="6" placeholder="000000">
          </div>
          <div class="auth-field">
            <label for="auth-reset-password" data-i18n="auth.newPassword">Nuova password</label>
            <div class="auth-input-wrap">
              <input class="auth-input" id="auth-reset-password" type="password" autocomplete="new-password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022">
              <button class="auth-eye" data-target="auth-reset-password" type="button" aria-label="Mostra password">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>
          <div class="auth-error" id="auth-reset-error"></div>
          <button class="auth-submit" id="auth-reset-btn">
            <span data-i18n="auth.resetBtn">Reimposta password</span>
          </button>
          <p class="auth-switch">
            <button type="button" data-goto="login" data-i18n="auth.backToLogin">Torna al login</button>
          </p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll('[data-goto]').forEach(btn => {
      btn.addEventListener('click', () => showAuthView(btn.dataset.goto));
    });
    document.getElementById('auth-forgot-btn').addEventListener('click', () => showAuthView('forgot'));

    modal.querySelectorAll('.auth-eye').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        const show  = input.type === 'password';
        input.type  = show ? 'text' : 'password';
        btn.innerHTML = `<i class="fas fa-eye${show ? '-slash' : ''}"></i>`;
      });
    });

    modal.querySelector('.auth-backdrop').addEventListener('click', closeAuthModal);
    document.getElementById('auth-close-btn').addEventListener('click', closeAuthModal);

    modal.querySelectorAll('.auth-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const view = input.closest('.auth-view').dataset.view;
        if (view === 'login')    document.getElementById('auth-login-btn').click();
        if (view === 'register') document.getElementById('auth-reg-btn').click();
      });
    });

    document.getElementById('auth-login-btn').addEventListener('click', async () => {
      const btn   = document.getElementById('auth-login-btn');
      const email = document.getElementById('auth-login-email').value.trim();
      const pass  = document.getElementById('auth-login-password').value;
      const err   = document.getElementById('auth-login-error');
      err.textContent = '';

      if (!email || !pass) {
        err.textContent = at('auth.errEmptyLogin', 'Inserisci email e password.');
        return;
      }

      setAuthLoading(btn, true);
      try {
        await login(email, pass);
        closeAuthModal();
      } catch (e) {
        if (e.needs_verification || e.data?.needs_verification) {
          _pendingEmail = e.data?.email || email;
          showVerifyView(_pendingEmail);
        } else {
          err.textContent = e.message;
        }
      } finally {
        setAuthLoading(btn, false);
      }
    });

    document.getElementById('auth-reg-btn').addEventListener('click', async () => {
      const btn      = document.getElementById('auth-reg-btn');
      const username = document.getElementById('auth-reg-username').value.trim();
      const email    = document.getElementById('auth-reg-email').value.trim();
      const pass     = document.getElementById('auth-reg-password').value;
      const err      = document.getElementById('auth-reg-error');
      err.textContent = '';

      if (!username || !email || !pass) {
        err.textContent = at('auth.errEmptyRegister', 'Compila tutti i campi.');
        return;
      }
      if (pass.length < 6) {
        err.textContent = at('auth.errShortPassword', 'La password deve avere almeno 6 caratteri.');
        return;
      }

      setAuthLoading(btn, true);
      try {
        await register(username, email, pass);
        _pendingEmail = email;
        showRegCodeStep(email);
      } catch (e) {
        err.textContent = e.message;
      } finally {
        setAuthLoading(btn, false);
      }
    });

    document.getElementById('auth-reg-verify-btn').addEventListener('click', async () => {
      const btn  = document.getElementById('auth-reg-verify-btn');
      const code = document.getElementById('auth-reg-code').value.trim();
      const err  = document.getElementById('auth-reg-code-error');
      err.textContent = '';
      if (!code) { err.textContent = at('auth.errEmptyCode', 'Inserisci il codice.'); return; }

      setAuthLoading(btn, true);
      try {
        await verify(_pendingEmail, code);
        closeAuthModal();
      } catch (e) {
        err.textContent = e.message;
      } finally {
        setAuthLoading(btn, false);
      }
    });

    document.getElementById('auth-reg-resend-btn').addEventListener('click', async () => {
      const err = document.getElementById('auth-reg-code-error');
      err.textContent = '';
      try {
        await resend(_pendingEmail);
        err.style.color = 'var(--accent, #5b9cf6)';
        err.textContent = at('auth.resendDone', 'Nuovo codice inviato.');
      } catch (e) {
        err.style.color = '';
        err.textContent = e.message;
      }
    });

    document.getElementById('auth-verify-btn').addEventListener('click', async () => {
      const btn  = document.getElementById('auth-verify-btn');
      const code = document.getElementById('auth-verify-code').value.trim();
      const err  = document.getElementById('auth-verify-error');
      err.textContent = '';
      if (!code) { err.textContent = at('auth.errEmptyCode', 'Inserisci il codice.'); return; }

      setAuthLoading(btn, true);
      try {
        await verify(_pendingEmail, code);
        closeAuthModal();
      } catch (e) {
        err.textContent = e.message;
      } finally {
        setAuthLoading(btn, false);
      }
    });

    document.getElementById('auth-resend-btn').addEventListener('click', async () => {
      const err = document.getElementById('auth-verify-error');
      err.textContent = '';
      try {
        await resend(_pendingEmail);
        err.style.color = 'var(--accent, #5b9cf6)';
        err.textContent = at('auth.resendDone', 'Nuovo codice inviato.');
      } catch (e) {
        err.style.color = '';
        err.textContent = e.message;
      }
    });

    document.getElementById('auth-forgot-send-btn').addEventListener('click', async () => {
      const btn   = document.getElementById('auth-forgot-send-btn');
      const email = document.getElementById('auth-forgot-email').value.trim();
      const err   = document.getElementById('auth-forgot-error');
      err.textContent = '';
      if (!email) { err.textContent = at('auth.errEmptyEmail', 'Inserisci la tua email.'); return; }

      setAuthLoading(btn, true);
      try {
        await forgot(email);
        _pendingEmail = email;
        showAuthView('reset');
      } catch (e) {
        err.textContent = e.message;
      } finally {
        setAuthLoading(btn, false);
      }
    });

    document.getElementById('auth-reset-btn').addEventListener('click', async () => {
      const btn  = document.getElementById('auth-reset-btn');
      const code = document.getElementById('auth-reset-code').value.trim();
      const pass = document.getElementById('auth-reset-password').value;
      const err  = document.getElementById('auth-reset-error');
      err.textContent = '';
      if (!code || !pass) { err.textContent = at('auth.errEmptyReset', 'Inserisci codice e nuova password.'); return; }
      if (pass.length < 6) { err.textContent = at('auth.errShortPassword', 'La password deve avere almeno 6 caratteri.'); return; }

      setAuthLoading(btn, true);
      try {
        await reset(_pendingEmail, code, pass);
        showAuthView('login');
        const lerr = document.getElementById('auth-login-error');
        if (lerr) { lerr.style.color = 'var(--accent, #5b9cf6)'; lerr.textContent = at('auth.resetDone', 'Password reimpostata! Ora puoi accedere.'); }
      } catch (e) {
        err.textContent = e.message;
      } finally {
        setAuthLoading(btn, false);
      }
    });

    if (typeof applyTranslations === 'function') applyTranslations();
  }

  let _pendingEmail = '';

  function showRegCodeStep(email) {
    document.getElementById('auth-reg-username').disabled = true;
    document.getElementById('auth-reg-email').disabled    = true;
    document.getElementById('auth-reg-password').disabled = true;
    document.getElementById('auth-reg-btn').style.display = 'none';
    const switchLogin = document.getElementById('auth-reg-switch-login');
    if (switchLogin) switchLogin.style.display = 'none';
    const hint = document.getElementById('auth-reg-code-hint');
    if (hint) hint.textContent = at('auth.verifyHint', 'Controlla la casella') + ' ' + email;
    document.getElementById('auth-reg-code-block').style.display = 'block';
    setTimeout(() => document.getElementById('auth-reg-code')?.focus(), 60);
  }

  function showVerifyView(email) {
    const hint = document.getElementById('auth-verify-hint');
    if (hint) hint.textContent = at('auth.verifyHint', 'Controlla la casella') + ' ' + email;
    showAuthView('verify');
  }

  function at(key, fallback) {
    if (typeof getNestedTranslation === 'function') {
      return getNestedTranslation(key) || fallback;
    }
    return fallback;
  }

  function setAuthLoading(btn, loading) {
    btn.disabled = loading;
    btn.classList.toggle('loading', loading);
  }

  function showAuthView(view) {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.querySelectorAll('.auth-view').forEach(v => {
      v.classList.toggle('hidden', v.dataset.view !== view);
    });
    modal.querySelectorAll('.auth-error').forEach(e => e.textContent = '');
    if (view === 'register') resetRegView();
    setTimeout(() => {
      modal.querySelector(`.auth-view[data-view="${view}"] .auth-input`)?.focus();
    }, 60);
  }

  function resetRegView() {
    const block = document.getElementById('auth-reg-code-block');
    if (!block) return;
    block.style.display = 'none';
    ['auth-reg-username','auth-reg-email','auth-reg-password'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = false;
    });
    const btn = document.getElementById('auth-reg-btn');
    if (btn) btn.style.display = '';
    const switchLogin = document.getElementById('auth-reg-switch-login');
    if (switchLogin) switchLogin.style.display = '';
    const codeErr = document.getElementById('auth-reg-code-error');
    if (codeErr) codeErr.textContent = '';
  }

  function openAuthModal() {
    buildAuthModal();
    showAuthView('login');
    document.getElementById('auth-modal').classList.add('open');
    document.body.classList.add('modal-open');
  }

  function closeAuthModal() {
    document.getElementById('auth-modal')?.classList.remove('open');
    document.body.classList.remove('modal-open');
  }

  function closeProfileModal() {
    document.getElementById('profile-modal')?.classList.remove('open');
    document.body.classList.remove('modal-open');
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function buildProfileModal() {
    const existing = document.getElementById('profile-modal');
    if (existing) existing.remove();

    const user = getUser();
    const modal = document.createElement('div');
    modal.id = 'profile-modal';
    modal.innerHTML = `
      <div class="auth-backdrop"></div>
      <div class="auth-box">
        <button class="auth-close" id="profile-close-btn" aria-label="Chiudi"><i class="fas fa-xmark"></i></button>

        <div class="profile-avatar" id="profile-avatar">${esc(displayNameOf(user).charAt(0).toUpperCase())}</div>
        <div class="profile-username" id="profile-dn-label">${esc(displayNameOf(user))}</div>
        <div class="profile-email" id="profile-email-label">${esc(user.email)}</div>
        <div class="profile-since">${at('profile.since', 'Registrato il')} ${new Date(user.created_at).toLocaleDateString('it-IT')}</div>

        <div class="profile-tabs">
          <button class="profile-tab active" data-ptab="info" data-i18n="profile.tabInfo">Informazioni</button>
          <button class="profile-tab" data-ptab="password" data-i18n="profile.tabPassword">Password</button>
        </div>

        <div class="profile-pane" data-ppane="info">
          <div class="auth-field">
            <label for="profile-display-name" data-i18n="profile.displayName">Nome visualizzato</label>
            <input class="auth-input" id="profile-display-name" type="text" maxlength="24" placeholder="${esc(user.username)}" value="${esc(user.display_name || '')}">
          </div>
          <div class="auth-field">
            <label for="profile-email-input" data-i18n="auth.email">Email</label>
            <input class="auth-input" id="profile-email-input" type="email" autocomplete="email" value="${esc(user.email)}">
          </div>
          <div class="auth-error" id="profile-info-error"></div>
          <button class="auth-submit" id="profile-save-info-btn"><span data-i18n="profile.saveInfo">Salva modifiche</span></button>
        </div>

        <div class="profile-pane" data-ppane="password" style="display:none;">
          <div class="profile-pwd-mode">
            <button class="profile-mode-btn active" data-pmode="current" data-i18n="profile.modeCurrent">Con password attuale</button>
            <button class="profile-mode-btn" data-pmode="code" data-i18n="profile.modeCode">Con codice email</button>
          </div>

          <div class="auth-field" id="profile-current-wrap">
            <label for="profile-current-pwd" data-i18n="profile.currentPwd">Password attuale</label>
            <div class="auth-input-wrap">
              <input class="auth-input" id="profile-current-pwd" type="password" autocomplete="current-password" placeholder="••••••••">
              <button class="auth-eye" data-target="profile-current-pwd" type="button" aria-label="Mostra password"><i class="fas fa-eye"></i></button>
            </div>
          </div>

          <div class="auth-field" id="profile-code-wrap" style="display:none;">
            <label for="profile-pwd-code" data-i18n="auth.code">Codice</label>
            <input class="auth-input auth-code-input" id="profile-pwd-code" type="text" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code">
            <button class="auth-forgot" id="profile-send-code-btn" type="button" data-i18n="profile.sendCode">Inviami un codice</button>
            <p class="auth-forgot-text" id="profile-code-hint" style="text-align:left;margin-top:0.2rem;"></p>
          </div>

          <div class="auth-field">
            <label for="profile-new-pwd" data-i18n="auth.newPassword">Nuova password</label>
            <div class="auth-input-wrap">
              <input class="auth-input" id="profile-new-pwd" type="password" autocomplete="new-password" placeholder="••••••••">
              <button class="auth-eye" data-target="profile-new-pwd" type="button" aria-label="Mostra password"><i class="fas fa-eye"></i></button>
            </div>
          </div>
          <div class="auth-error" id="profile-pwd-error"></div>
          <button class="auth-submit" id="profile-save-pwd-btn"><span data-i18n="profile.savePwd">Aggiorna password</span></button>
        </div>

        <button class="auth-submit logout-btn" id="profile-logout-btn"><span data-i18n="profile.logout">Logout</span></button>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => closeProfileModal();
    modal.querySelector('.auth-backdrop').addEventListener('click', close);
    document.getElementById('profile-close-btn').addEventListener('click', close);

    modal.querySelectorAll('.profile-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        modal.querySelectorAll('.profile-tab').forEach(t => t.classList.toggle('active', t === tab));
        modal.querySelectorAll('.profile-pane').forEach(p => {
          p.style.display = p.dataset.ppane === tab.dataset.ptab ? 'flex' : 'none';
        });
      });
    });

    modal.querySelectorAll('.profile-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.pmode;
        modal.querySelectorAll('.profile-mode-btn').forEach(b => b.classList.toggle('active', b === btn));
        document.getElementById('profile-current-wrap').style.display = mode === 'current' ? 'flex' : 'none';
        document.getElementById('profile-code-wrap').style.display    = mode === 'code' ? 'flex' : 'none';
        document.getElementById('profile-pwd-error').textContent = '';
      });
    });

    modal.querySelectorAll('.auth-eye').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        const show  = input.type === 'password';
        input.type  = show ? 'text' : 'password';
        btn.innerHTML = `<i class="fas fa-eye${show ? '-slash' : ''}"></i>`;
      });
    });

    document.getElementById('profile-save-info-btn').addEventListener('click', async () => {
      const btn = document.getElementById('profile-save-info-btn');
      const err = document.getElementById('profile-info-error');
      err.style.color = '';
      err.textContent = '';
      const u = getUser();
      const dn    = document.getElementById('profile-display-name').value.trim();
      const email = document.getElementById('profile-email-input').value.trim();
      const payload = {};
      if (dn !== (u.display_name || '')) payload.display_name = dn;
      if (email && email.toLowerCase() !== (u.email || '').toLowerCase()) payload.email = email;
      if (!Object.keys(payload).length) {
        err.style.color = 'var(--accent, #5b9cf6)';
        err.textContent = at('profile.noChanges', 'Nessuna modifica da salvare.');
        return;
      }
      setAuthLoading(btn, true);
      try {
        const updated = await updateProfile(payload);
        document.getElementById('profile-dn-label').textContent = displayNameOf(updated);
        document.getElementById('profile-email-label').textContent = updated.email;
        document.getElementById('profile-avatar').textContent = displayNameOf(updated).charAt(0).toUpperCase();
        err.style.color = 'var(--accent, #5b9cf6)';
        err.textContent = at('profile.saved', 'Profilo aggiornato!');
      } catch (e) {
        err.style.color = '';
        err.textContent = e.message;
      } finally {
        setAuthLoading(btn, false);
      }
    });

    document.getElementById('profile-send-code-btn').addEventListener('click', async () => {
      const hint = document.getElementById('profile-code-hint');
      hint.style.color = '';
      hint.textContent = '';
      try {
        await requestPasswordCode();
        hint.style.color = 'var(--accent, #5b9cf6)';
        hint.textContent = at('profile.codeSent', 'Codice inviato alla tua email.');
      } catch (e) {
        hint.style.color = '#f87171';
        hint.textContent = e.message;
      }
    });

    document.getElementById('profile-save-pwd-btn').addEventListener('click', async () => {
      const btn = document.getElementById('profile-save-pwd-btn');
      const err = document.getElementById('profile-pwd-error');
      err.style.color = '';
      err.textContent = '';
      const mode    = modal.querySelector('.profile-mode-btn.active')?.dataset.pmode || 'current';
      const newPwd  = document.getElementById('profile-new-pwd').value;
      if (!newPwd || newPwd.length < 6) {
        err.textContent = at('auth.errShortPassword', 'La password deve avere almeno 6 caratteri.');
        return;
      }
      const payload = { new_password: newPwd };
      if (mode === 'current') {
        const cur = document.getElementById('profile-current-pwd').value;
        if (!cur) { err.textContent = at('profile.errNoCurrent', 'Inserisci la password attuale.'); return; }
        payload.current_password = cur;
      } else {
        const code = document.getElementById('profile-pwd-code').value.trim();
        if (!code) { err.textContent = at('auth.errEmptyCode', 'Inserisci il codice.'); return; }
        payload.code = code;
      }
      setAuthLoading(btn, true);
      try {
        await changePassword(payload);
        err.style.color = 'var(--accent, #5b9cf6)';
        err.textContent = at('profile.pwdUpdated', 'Password aggiornata!');
        document.getElementById('profile-new-pwd').value = '';
        document.getElementById('profile-current-pwd').value = '';
        document.getElementById('profile-pwd-code').value = '';
      } catch (e) {
        err.style.color = '';
        err.textContent = e.message;
      } finally {
        setAuthLoading(btn, false);
      }
    });

    document.getElementById('profile-logout-btn').addEventListener('click', () => {
      logout();
      closeProfileModal();
    });

    if (typeof applyTranslations === 'function') applyTranslations();
    modal.classList.add('open');
    document.body.classList.add('modal-open');
  }

  function initNavAuthBtn() {
    const btn = document.getElementById('nav-auth-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (isLoggedIn()) buildProfileModal();
      else openAuthModal();
    });
    refreshNavUser();
  }

  document.addEventListener('navbarLoaded', initNavAuthBtn);

  return { register, verify, resend, forgot, reset, login, logout, isLoggedIn, getUser, displayNameOf, updateProfile, requestPasswordCode, changePassword, openAuthModal, initNavAuthBtn };
})();
