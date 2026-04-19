// WorkSpace.kz — Auth Manager (LocalStorage + IndexedDB)

class AuthManager {
  constructor() {
    this.tokenKey = 'ws_token';
    this.currentUser = this._loadUser();
  }

  _loadUser() {
    try {
      const token = localStorage.getItem(this.tokenKey);
      if (!token) return null;
      return JSON.parse(atob(token));
    } catch {
      localStorage.removeItem(this.tokenKey);
      return null;
    }
  }

  _saveUser(user) {
    const payload = { email: user.email, role: user.role, name: user.name, phone: user.phone };
    localStorage.setItem(this.tokenKey, btoa(JSON.stringify(payload)));
    this.currentUser = payload;
    return payload;
  }

  // Alias for compatibility
  getUser() {
    return this.currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  async login(email, password) {
    // api.login throws on wrong credentials
    const user = await window.api.login(email, password);
    return this._saveUser(user);
  }

  async register(data) {
    await WorkSpaceDB.dbReady;
    const existing = await WorkSpaceDB.getUser(data.email);
    if (existing) throw new Error('Пользователь уже существует');

    const user = {
      email:    data.email,
      password: btoa(data.password),
      name:     data.name  || '',
      phone:    data.phone || '',
      role:     data.role  || 'renter',
    };
    await WorkSpaceDB.addUser(user);
    return this._saveUser(user);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.currentUser = null;
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  isAdmin() {
    return this.currentUser?.role === 'admin';
  }
}

// Global singleton
window.AuthManager = new AuthManager();

// Keep currentUser fresh across tabs
window.addEventListener('storage', (e) => {
  if (e.key === AuthManager.tokenKey) {
    AuthManager.currentUser = AuthManager._loadUser();
    if (typeof updateNavbar === 'function') updateNavbar(AuthManager.currentUser);
  }
});
