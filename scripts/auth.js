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
    Api.setToken(data.token);
    setUser(data.user);
    handleAuthChange();
    return data.user;
  }

  async function login(email, password) {
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
      if (label)  label.textContent  = user.username;
      if (avatar) avatar.textContent = user.username.charAt(0).toUpperCase();
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

          <p class="auth-switch">
            <span data-i18n="auth.hasAccount">Hai già un account?</span>
            <button type="button" data-goto="login" data-i18n="auth.goLogin">Accedi</button>
          </p>
        </div>

        <div class="auth-view hidden" data-view="forgot">
          <div class="auth-header">
            <div class="auth-icon"><i class="fas fa-key"></i></div>
            <h2 data-i18n="auth.forgotTitle">Password dimenticata</h2>
          </div>
          <p class="auth-forgot-text" data-i18n="auth.forgotText">Il recupero automatico non è ancora attivo. Scrivi a glaciopia@outlook.com dall'indirizzo del tuo account e ti aiuteremo a rientrare.</p>
          <a class="auth-submit auth-submit-link" href="mailto:glaciopia@outlook.com?subject=Recupero%20password">
            <i class="fas fa-envelope"></i>
            <span data-i18n="auth.forgotMail">Scrivi a glaciopia@outlook.com</span>
          </a>
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
        err.textContent = e.message;
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
        closeAuthModal();
      } catch (e) {
        err.textContent = e.message;
      } finally {
        setAuthLoading(btn, false);
      }
    });

    if (typeof applyTranslations === 'function') applyTranslations();
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
    setTimeout(() => {
      modal.querySelector(`.auth-view[data-view="${view}"] .auth-input`)?.focus();
    }, 60);
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

  function buildProfileModal() {
    if (document.getElementById('profile-modal')) {
      document.getElementById('profile-modal').classList.add('open');
      document.body.classList.add('modal-open');
      return;
    }
    const modal = document.createElement('div');
    modal.id = 'profile-modal';
    const user = getUser();
    modal.innerHTML = `
      <div class="auth-backdrop"></div>
      <div class="auth-box">
        <div class="profile-avatar">${user.username.charAt(0).toUpperCase()}</div>
        <div class="profile-username">${user.username}</div>
        <div class="profile-email">${user.email}</div>
        <div class="profile-since">Registrato il ${new Date(user.created_at).toLocaleDateString('it-IT')}</div>
        <button class="auth-submit logout-btn" id="profile-logout-btn">Logout</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.auth-backdrop').addEventListener('click', () => {
      modal.classList.remove('open');
      document.body.classList.remove('modal-open');
    });
    document.getElementById('profile-logout-btn').addEventListener('click', () => {
      logout();
      modal.classList.remove('open');
      document.body.classList.remove('modal-open');
    });
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

  return { register, login, logout, isLoggedIn, getUser, openAuthModal, initNavAuthBtn };
})();
