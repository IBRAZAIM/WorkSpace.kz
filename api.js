/**
 * WorkSpace.kz — API Layer
 * Uses window.DB (from db.js) and window.Auth (from auth.js)
 * All methods are async and return plain JS objects / arrays.
 */

window.api = {

  /* ── Rooms ──────────────────────────────────────────────── */

  async getRooms(filters = {}) {
    return DB.getRooms(filters);
  },

  async getRoom(id) {
    const room = await DB.getRoom(String(id));
    if (!room) throw new Error('Кабинет не найден');
    return room;
  },

  /* ── Auth ───────────────────────────────────────────────── */

  async login(email, password) {
    return Auth.login(email, password);
  },

  async register(data) {
    return Auth.register(data);
  },

  /* ── Bookings ───────────────────────────────────────────── */

  async getBookings() {
    const user = Auth.currentUser;
    if (!user) throw new Error('Не авторизован');

    const all = await DB.getAllBookings();
    const list = user.role === 'admin'
      ? all
      : all.filter(b => b.userEmail === user.email);

    return Promise.all(list.map(async b => {
      let room = null;
      try { room = await DB.getRoom(String(b.roomId)); } catch {}
      return {
        id:           b.id,
        room_id:      b.roomId,
        room_title:   room?.title || b.roomId,
        room_img:     room?.img   || '',
        booking_date: b.date,
        slot:         b.slots,
        total_price:  b.total,
        status:       (b.status || 'confirmed').toUpperCase(),
        userEmail:    b.userEmail,
      };
    }));
  },

  async addBooking({ userEmail, roomId, date, slots, total, status }) {
    if (!Auth.currentUser) throw new Error('Необходимо войти');
    return DB.addBooking({
      userEmail: userEmail || Auth.currentUser.email,
      roomId:    String(roomId),
      date,
      slots,
      total:     Number(total),
      status:    status || 'confirmed',
    });
  },

  async cancelBooking(id) {
    return DB.cancelBooking(id);
  },

  /* ── Availability ───────────────────────────────────────── */

  async getAvailability(roomId, date) {
    const all = await DB.getAllBookings();
    const bookedSlots = [];
    for (const b of all) {
      if (String(b.roomId) === String(roomId) && b.date === date) {
        if ((b.status || '').toLowerCase() === 'cancelled') continue;
        const slots = (b.slots || '').split(',').map(s => s.trim()).filter(Boolean);
        bookedSlots.push(...slots);
      }
    }
    return { bookedSlots, blockedSlots: [], pendingSlots: [] };
  },

  /* ── Profile ────────────────────────────────────────────── */

  async getProfile(email) {
    const user = await DB.getUser(email);
    if (!user) throw new Error('Профиль не найден');
    return { email: user.email, name: user.name, phone: user.phone, role: user.role };
  },

  async updateProfile(email, { name, phone }) {
    const user = await DB.getUser(email);
    if (!user) throw new Error('Профиль не найден');
    const updated = { ...user, name: name ?? user.name, phone: phone ?? user.phone };
    await DB.putUser(updated);
    Auth.updateCurrentUser({ name: updated.name, phone: updated.phone });
    return { email: updated.email, name: updated.name, phone: updated.phone, role: updated.role };
  },

  /* ── Admin — Stats ──────────────────────────────────────── */

  async adminGetStats() {
    const [users, rooms, bookings] = await Promise.all([
      DB.getAllUsers ? DB.getAllUsers() : [],
      DB.getRooms(),
      DB.getAllBookings(),
    ]);
    const pending = bookings.filter(b => (b.status || '').toLowerCase() === 'pending').length;
    return { users: users.length, rooms: rooms.length, bookings: bookings.length, pending };
  },

  /* ── Admin — Users ──────────────────────────────────────── */

  async adminGetUsers() {
    const users = await DB.getAllUsers();
    return users.map(u => ({ ...u, password: undefined }));
  },

  async adminCreateUser({ name, email, phone, password, role }) {
    const existing = await DB.getUser(email);
    if (existing) throw new Error('Пользователь с таким email уже существует');
    const user = { email, name: name || '', phone: phone || '', password: btoa(password), role: role || 'tenant' };
    await DB.putUser(user);
    return { ...user, password: undefined };
  },

  async adminUpdateUser(email, { name, phone, role }) {
    const user = await DB.getUser(email);
    if (!user) throw new Error('Пользователь не найден');
    const updated = { ...user, name: name ?? user.name, phone: phone ?? user.phone, role: role ?? user.role };
    await DB.putUser(updated);
    return { ...updated, password: undefined };
  },

  async adminDeleteUser(email) {
    const db = await DB.ready;
    return new Promise((resolve, reject) => {
      try {
        const tx  = db.transaction('users', 'readwrite');
        const req = tx.objectStore('users').delete(email);
        req.onsuccess = () => resolve();
        req.onerror   = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  },

  /* ── Admin — Rooms ──────────────────────────────────────── */

  async adminGetRooms() {
    return DB.getRooms();
  },

  async adminCreateRoom(payload) {
    const id   = 'r' + Date.now();
    const room = {
      id,
      title:       payload.title       || 'Без названия',
      city:        payload.city        || '',
      district:    payload.district    || '',
      category:    payload.category    || 'Другое',
      price:       Number(payload.price) || 0,
      capacity:    payload.capacity    || null,
      img:         payload.img         || '',
      description: payload.description || '',
      status:      payload.status      || 'active',
      amenities:   Array.isArray(payload.amenities) ? payload.amenities : [],
      rating:      4.7,
    };
    const db = await DB.ready;
    await new Promise((resolve, reject) => {
      const tx  = db.transaction('rooms', 'readwrite');
      const req = tx.objectStore('rooms').put(room);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
    return room;
  },

  async adminUpdateRoom(id, payload) {
    const db       = await DB.ready;
    const existing = await DB.getRoom(String(id));
    if (!existing) throw new Error('Кабинет не найден');
    const updated  = {
      ...existing,
      title:       payload.title       ?? existing.title,
      city:        payload.city        ?? existing.city,
      district:    payload.district    ?? existing.district,
      category:    payload.category    ?? existing.category,
      price:       Number(payload.price ?? existing.price),
      capacity:    payload.capacity    ?? existing.capacity,
      img:         payload.img         ?? existing.img,
      description: payload.description ?? existing.description,
      status:      payload.status      ?? existing.status,
      amenities:   payload.amenities   ?? existing.amenities,
    };
    await new Promise((resolve, reject) => {
      const tx  = db.transaction('rooms', 'readwrite');
      const req = tx.objectStore('rooms').put(updated);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
    return updated;
  },

  async adminDeleteRoom(id) {
    const db = await DB.ready;
    return new Promise((resolve, reject) => {
      try {
        const tx  = db.transaction('rooms', 'readwrite');
        const req = tx.objectStore('rooms').delete(String(id));
        req.onsuccess = () => resolve();
        req.onerror   = () => reject(req.error);
      } catch (e) { reject(e); }
    });
  },

  /* ── Admin — Bookings ───────────────────────────────────── */

  async adminGetBookings() {
    const all = await DB.getAllBookings();
    return all.map(b => ({
      id:           b.id,
      user_email:   b.userEmail,
      room_id:      b.roomId,
      booking_date: b.date,
      slot:         b.slots,
      total_price:  b.total,
      status:       (b.status || 'confirmed').toLowerCase(),
    }));
  },

  async adminCreateBooking({ user_email, room_id, booking_date, slot, status }) {
    const room  = await DB.getRoom(String(room_id));
    const total = room ? (room.price * (slot || '').split(',').filter(Boolean).length) : 0;
    const booking = {
      userEmail: user_email,
      roomId:    String(room_id),
      date:      booking_date,
      slots:     slot || '',
      total,
      status:    status || 'pending',
    };
    const result = await DB.addBooking(booking);
    return { ...result, user_email, room_id, booking_date, slot };
  },

  async adminUpdateBooking(id, { user_email, room_id, booking_date, slot, status }) {
    const updated = await DB.updateBooking(id, {
      userEmail: user_email,
      roomId:    room_id ? String(room_id) : undefined,
      date:      booking_date,
      slots:     slot,
      status,
    });
    return {
      ...updated,
      id,
      user_email:   updated.userEmail,
      room_id:      updated.roomId,
      booking_date: updated.date,
      slot:         updated.slots,
    };
  },

  async adminDeleteBooking(id) {
    const db = await DB.ready;
    return new Promise((resolve, reject) => {
      try {
        const tx  = db.transaction('bookings', 'readwrite');
        const req = tx.objectStore('bookings').delete(Number(id));
        req.onsuccess = () => resolve();
        req.onerror   = () => reject(req.error);
      } catch (e) { reject(e); }
    });
  },
};
