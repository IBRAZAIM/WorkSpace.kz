// WorkSpace.kz — API Layer (IndexedDB-backed, no fetch proxy)
// All methods return plain JS objects / arrays.

window.api = {

  /* ── Rooms ─────────────────────────────────────────── */

  async getRooms(filters = {}) {
    await WorkSpaceDB.dbReady;
    return WorkSpaceDB.getRooms(filters);
  },

  async getRoom(id) {
    await WorkSpaceDB.dbReady;
    const room = await WorkSpaceDB.getRoom(String(id));
    if (!room) throw new Error('Кабинет не найден');
    return room;
  },

  /* ── Auth ──────────────────────────────────────────── */

  async login(email, password) {
    await WorkSpaceDB.dbReady;
    const user = await WorkSpaceDB.getUser(email);
    if (!user) throw new Error('Пользователь не найден');
    const stored = user.password;
    const ok = stored === btoa(password) || stored === password;
    if (!ok) throw new Error('Неверный пароль');
    return { email: user.email, role: user.role, name: user.name, phone: user.phone };
  },

  /* ── Bookings ──────────────────────────────────────── */

  async getBookings() {
    await WorkSpaceDB.dbReady;
    const user = AuthManager.currentUser;
    if (!user) throw new Error('Не авторизован');

    const all = await WorkSpaceDB.getAllBookings();
    const list = user.role === 'admin'
      ? all
      : all.filter(b => b.userEmail === user.email);

    return Promise.all(list.map(async b => {
      let room = null;
      try { room = await WorkSpaceDB.getRoom(String(b.roomId)); } catch {}
      return {
        id:           b.id,
        room_id:      b.roomId,
        room_title:   room?.title  || b.roomId,
        room_img:     room?.img    || '',
        booking_date: b.date,
        slot:         b.slots,
        total_price:  b.total,
        status:       (b.status || 'confirmed').toUpperCase(),
        userEmail:    b.userEmail,
      };
    }));
  },

  async addBooking(booking) {
    await WorkSpaceDB.dbReady;
    return WorkSpaceDB.addBooking(booking);
  },

  async cancelBooking(id) {
    await WorkSpaceDB.dbReady;
    return WorkSpaceDB.cancelBooking(id);
  },

  /* ── Availability ──────────────────────────────────── */

  async getAvailability(roomId, date) {
    await WorkSpaceDB.dbReady;
    const all = await WorkSpaceDB.getAllBookings();
    const bookedSlots = [];
    for (const b of all) {
      if (String(b.roomId) === String(roomId) && b.date === date) {
        if (b.status && b.status.toLowerCase() === 'cancelled') continue;
        const slots = (b.slots || '').split(',').map(s => s.trim()).filter(Boolean);
        bookedSlots.push(...slots);
      }
    }
    return { bookedSlots, blockedSlots: [], pendingSlots: [] };
  },

  /* ── Admin — Stats ─────────────────────────────────── */

  async adminGetStats() {
    await WorkSpaceDB.dbReady;
    const [users, rooms, bookings] = await Promise.all([
      WorkSpaceDB._getAll('users'),
      WorkSpaceDB._getAll('rooms'),
      WorkSpaceDB._getAll('bookings'),
    ]);
    const pending = bookings.filter(b => (b.status || '').toLowerCase() === 'pending').length;
    return { users: users.length, rooms: rooms.length, bookings: bookings.length, pending };
  },

  /* ── Admin — Users ─────────────────────────────────── */

  async adminGetUsers() {
    await WorkSpaceDB.dbReady;
    const users = await WorkSpaceDB._getAll('users');
    return users.map(u => ({ ...u, password: undefined })); // hide password
  },

  async adminCreateUser({ name, email, phone, password, role }) {
    await WorkSpaceDB.dbReady;
    const existing = await WorkSpaceDB.getUser(email);
    if (existing) throw new Error('Пользователь с таким email уже существует');
    const user = { email, name, phone: phone || '', password: btoa(password), role: role || 'tenant' };
    await WorkSpaceDB.addUser(user);
    return { ...user, password: undefined };
  },

  async adminUpdateUser(email, { name, phone, role }) {
    await WorkSpaceDB.dbReady;
    const user = await WorkSpaceDB.getUser(email);
    if (!user) throw new Error('Пользователь не найден');
    const updated = { ...user, name, phone: phone || user.phone, role };
    await WorkSpaceDB.addUser(updated);
    return { ...updated, password: undefined };
  },

  async adminDeleteUser(email) {
    await WorkSpaceDB.dbReady;
    return new Promise((resolve, reject) => {
      const tx  = WorkSpaceDB.db.transaction('users', 'readwrite');
      const req = tx.objectStore('users').delete(email);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  },

  /* ── Admin — Rooms ─────────────────────────────────── */

  async adminGetRooms() {
    await WorkSpaceDB.dbReady;
    return WorkSpaceDB._getAll('rooms');
  },

  async adminCreateRoom(payload) {
    await WorkSpaceDB.dbReady;
    // Generate a unique string ID
    const id = 'r' + Date.now();
    const room = {
      id,
      title:       payload.title,
      city:        payload.city        || '',
      district:    payload.district    || '',
      category:    payload.category    || 'Другое',
      price:       payload.price       || 0,
      capacity:    payload.capacity    || null,
      img:         payload.img         || '',
      description: payload.description || '',
      status:      payload.status      || 'active',
      amenities:   payload.amenities   || [],
      rating:      4.7,
    };
    await WorkSpaceDB._add('rooms', room);
    return room;
  },

  async adminUpdateRoom(id, payload) {
    await WorkSpaceDB.dbReady;
    const existing = await WorkSpaceDB.getRoom(String(id));
    if (!existing) throw new Error('Кабинет не найден');
    const updated = {
      ...existing,
      title:       payload.title       ?? existing.title,
      city:        payload.city        ?? existing.city,
      district:    payload.district    ?? existing.district,
      category:    payload.category    ?? existing.category,
      price:       payload.price       ?? existing.price,
      capacity:    payload.capacity    ?? existing.capacity,
      img:         payload.img         ?? existing.img,
      description: payload.description ?? existing.description,
      status:      payload.status      ?? existing.status,
      amenities:   payload.amenities   ?? existing.amenities,
    };
    await WorkSpaceDB._put('rooms', updated);
    return updated;
  },

  async adminDeleteRoom(id) {
    await WorkSpaceDB.dbReady;
    return new Promise((resolve, reject) => {
      const tx  = WorkSpaceDB.db.transaction('rooms', 'readwrite');
      const req = tx.objectStore('rooms').delete(String(id));
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  },

  /* ── Admin — Bookings ──────────────────────────────── */

  async adminGetBookings() {
    await WorkSpaceDB.dbReady;
    const all = await WorkSpaceDB.getAllBookings();
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
    await WorkSpaceDB.dbReady;
    const room = await WorkSpaceDB.getRoom(String(room_id));
    const total = room ? (room.price * (slot || '').split(',').length) : 0;
    const booking = {
      userEmail: user_email,
      roomId:    String(room_id),
      date:      booking_date,
      slots:     slot || '',
      total,
      status:    status || 'pending',
    };
    const id = await WorkSpaceDB.addBooking(booking);
    return { ...booking, id, user_email, room_id, booking_date, slot };
  },

  async adminUpdateBooking(id, { user_email, room_id, booking_date, slot, status }) {
    await WorkSpaceDB.dbReady;
    const all = await WorkSpaceDB.getAllBookings();
    const booking = all.find(b => b.id === id);
    if (!booking) throw new Error('Бронь не найдена');
    const updated = {
      ...booking,
      userEmail: user_email || booking.userEmail,
      roomId:    String(room_id || booking.roomId),
      date:      booking_date || booking.date,
      slots:     slot || booking.slots,
      status:    status || booking.status,
    };
    await WorkSpaceDB._put('bookings', updated);
    return { ...updated, id, user_email: updated.userEmail, room_id: updated.roomId, booking_date: updated.date, slot: updated.slots };
  },

  async adminDeleteBooking(id) {
    await WorkSpaceDB.dbReady;
    return new Promise((resolve, reject) => {
      const tx  = WorkSpaceDB.db.transaction('bookings', 'readwrite');
      const req = tx.objectStore('bookings').delete(id);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  },
};
