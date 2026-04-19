/**
 * WorkSpace.kz — Auth Manager
 * Exposed as window.Auth (no class/instance name collision)
 */

(function () {
  'use strict';

  const TOKEN_KEY = 'ws_auth_token';

  function loadUser() {
    try {
      const raw = localStorage.getItem(TOKEN_KEY);
      if (!raw) return null;
      return JSON.parse(decodeURIComponent(escape(atob(raw))));
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
  }

  function saveUser(user) {
    const payload = {
      email: user.email,
      name:  user.name  || '',
      phone: user.phone || '',
      role:  user.role  || 'tenant',
    };
    localStorage.setItem(TOKEN_KEY, btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));
    window.Auth.currentUser = payload;
    return payload;
  }

  window.Auth = {
    currentUser: loadUser(),

    /** Login: verify against IndexedDB, save token */
    async login(email, password) {
      if (!email || !password) throw new Error('Введите email и пароль');
      await DB.ready;
      const user = await DB.getUser(email.trim().toLowerCase());
      if (!user) throw new Error('Пользователь не найден. Проверьте email.');
      const ok = user.password === btoa(password) || user.password === password;
      if (!ok) throw new Error('Неверный пароль');
      return saveUser(user);
    },

    /** Register: create user in IndexedDB, save token */
    async register(data) {
      if (!data.email || !data.password) throw new Error('Заполните обязательные поля');
      await DB.ready;
      const email = data.email.trim().toLowerCase();
      const existing = await DB.getUser(email);
      if (existing) throw new Error('Пользователь с таким email уже существует');

      const user = {
        email,
        password: btoa(data.password),
        name:  data.name  || '',
        phone: data.phone || '',
        role:  data.role  || 'tenant',
      };
      await DB.putUser(user);
      return saveUser(user);
    },

    /** Logout */
    logout() {
      localStorage.removeItem(TOKEN_KEY);
      window.Auth.currentUser = null;
    },

    isLoggedIn() { return !!window.Auth.currentUser; },
    isAdmin()    { return window.Auth.currentUser?.role === 'admin'; },

    /* Aliases for legacy code */
    getUser()        { return window.Auth.currentUser; },
    getCurrentUser() { return window.Auth.currentUser; },

    /** Persist profile changes */
    updateCurrentUser(patch) {
      if (!window.Auth.currentUser) return;
      Object.assign(window.Auth.currentUser, patch);
      saveUser(window.Auth.currentUser);
    },
  };

  /* Keep currentUser in sync across browser tabs */
  window.addEventListener('storage', (e) => {
    if (e.key === TOKEN_KEY) {
      window.Auth.currentUser = loadUser();
      if (typeof updateNavbar === 'function') updateNavbar(window.Auth.currentUser);
    }
  });

  /* Legacy alias — all existing code that says "AuthManager.xxx" still works */
  window.AuthManager = window.Auth;

})();
