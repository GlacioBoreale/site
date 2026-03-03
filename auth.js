'use strict';

const USER_KEY = 'glaciopia_user';

const Auth = (() => {
  let _user = null;

  function getUser() {
    if (_user) return _user;
    try { _user = JSON.parse(localStorage.getItem(USER_KEY)); } catch (_) {}
    return _user;
  }

  function setUser(u) {
    _user = u;
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  }

  function isLoggedIn() {
    return !!Api.getToken() && !!getUser();
  }

  async function register(username, email, password) {
    const data = await Api.auth.register(username, email, password);
    Api.setToken(data.token);
    setUser(data.user);
    onAuthChange();
    return data.user;
  }

  async function login(email, password) {
    const data = await Api.auth.login(email, password);
    Api.setToken(data.token);
    setUser(data.user);
    onAuthChange();
    return data.user;
  }

  function logout() {
    Api.setToken(null);
    setUser(null);
    onAuthChange();
  }

  function onAuthChange() {
    updateNavAuth();
    if (typeof syncCloudSave === 'function') syncCloudSave();
  }

  function updateNavAuth() {
    const btn = document.getElementById('nav-auth-btn');
    const label = document.getElementById('nav-auth-label');
    const avatar = document.getElementById('nav-auth-avatar');
    if (!btn) return;
    const user = getUser();
    if (isLoggedIn() && user) {
      if (label) label.textContent = user.username;
      if (avatar) avatar.textContent = user.username.charAt(0).toUpperCase();
      btn.classList.add('logged-in');
    } else {
      if (label) label.textContent = 'Login';
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
        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login">Login</button>
          <button class="auth-tab" data-tab="register">Registrati</button>
        </div>
        <div class="auth-content" data-tab="login">
          <input class="auth-input" id="auth-login-email" type="email" placeholder="Email">
          <input class="auth-input" id="auth-login-password" type="password" placeholder="Password">
          <div class="auth-error" id="auth-login-error"></div>
          <button class="auth-submit" id="auth-login-btn">Accedi</button>
        </div>
        <div class="auth-content hidden" data-tab="register">
          <input class="auth-input" id="auth-reg-username" type="text" placeholder="Username">
          <input class="auth-input" id="auth-reg-email" type="email" placeholder="Email">
          <input class="auth-input" id="auth-reg-password" type="password" placeholder="Password">
          <div class="auth-error" id="auth-reg-error"></div>
          <button class="auth-submit" id="auth-reg-btn">Crea account</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        modal.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        modal.querySelectorAll('.auth-content').forEach(c => c.classList.add('hidden'));
        tab.classList.add('active');
        modal.querySelector(`.auth-content[data-tab="${tab.dataset.tab}"]`).classList.remove('hidden');
      });
    });

    modal.querySelector('.auth-backdrop').addEventListener('click', closeAuthModal);

    document.getElementById('auth-login-btn').addEventListener('click', async () => {
      const email = document.getElementById('auth-login-email').value.trim();
      const pass  = document.getElementById('auth-login-password').value;
      const err   = document.getElementById('auth-login-error');
      err.textContent = '';
      try {
        await login(email, pass);
        closeAuthModal();
      } catch (e) {
        err.textContent = e.message;
      }
    });

    document.getElementById('auth-reg-btn').addEventListener('click', async () => {
      const username = document.getElementById('auth-reg-username').value.trim();
      const email    = document.getElementById('auth-reg-email').value.trim();
      const pass     = document.getElementById('auth-reg-password').value;
      const err      = document.getElementById('auth-reg-error');
      err.textContent = '';
      try {
        await register(username, email, pass);
        closeAuthModal();
      } catch (e) {
        err.textContent = e.message;
      }
    });
  }

  function openAuthModal() {
    buildAuthModal();
    document.getElementById('auth-modal').classList.add('open');
  }

  function closeAuthModal() {
    document.getElementById('auth-modal')?.classList.remove('open');
  }

  function buildProfileModal() {
    if (document.getElementById('profile-modal')) {
      document.getElementById('profile-modal').classList.add('open');
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
    modal.querySelector('.auth-backdrop').addEventListener('click', () => modal.classList.remove('open'));
    document.getElementById('profile-logout-btn').addEventListener('click', () => {
      logout();
      modal.classList.remove('open');
    });
    modal.classList.add('open');
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateNavAuth();
    const btn = document.getElementById('nav-auth-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        if (isLoggedIn()) buildProfileModal();
        else openAuthModal();
      });
    }
  });

  return { register, login, logout, isLoggedIn, getUser, openAuthModal };
})();
