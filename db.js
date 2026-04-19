/**
 * WorkSpace.kz - IndexedDB Data Layer (Offline-first)
 * Seeds 18+ rooms, users, bookings for demo/PWA
 */

class WorkSpaceDB {
  constructor() {
    this.dbName = 'WorkSpaceKZ';
    this.version = 4; // bumped to force schema upgrade
    this.db = null;
    this.dbReady = this._init();
  }

  _init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);

      req.onerror = () => reject(req.error);

      req.onsuccess = () => {
        this.db = req.result;
        resolve();
      };

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        if (!db.objectStoreNames.contains('rooms')) {
          const s = db.createObjectStore('rooms', { keyPath: 'id' });
          s.createIndex('city',     'city',     { unique: false });
          s.createIndex('category', 'category', { unique: false });
          s.createIndex('price',    'price',    { unique: false });
        }

        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'email' });
        }

        if (!db.objectStoreNames.contains('bookings')) {
          const s = db.createObjectStore('bookings', { keyPath: 'id', autoIncrement: true });
          s.createIndex('userEmail', 'userEmail', { unique: false });
          s.createIndex('roomId',    'roomId',    { unique: false });
        }
      };
    }).then(() => this._seedData());
  }

  /* ── Helpers ───────────────────────────────────────────── */

  _get(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx  = this.db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  _getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx  = this.db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  _put(storeName, record) {
    return new Promise((resolve, reject) => {
      const tx  = this.db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).put(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  _add(storeName, record) {
    return new Promise((resolve, reject) => {
      const tx  = this.db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).add(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  _count(storeName) {
    return new Promise((resolve, reject) => {
      const tx  = this.db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  /* ── Seed ──────────────────────────────────────────────── */

  async _seedData() {
    // --- Rooms ---
    const roomCount = await this._count('rooms');
    if (roomCount === 0) {
      const rooms = [
        // Алматы
        {id:'al1', city:'Алматы', district:'Алмалинский', title:'Каб. психолога «Гармония»', category:'Психологи', price:1200, rating:4.9, img:'https://images.unsplash.com/photo-1576091160399-1d65cdaa8782?w=600', amenities:['Wi-Fi','Кофе','Парковка']},
        {id:'al2', city:'Алматы', district:'Алатау',      title:'Психолог Елена К.',         category:'Психологи', price:900,  rating:4.8, img:'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600', amenities:['Wi-Fi']},
        {id:'al3', city:'Алматы', district:'Бостандыкский', title:'Совещания «Бизнес Центр»', category:'Совещания', price:1500, rating:4.7, img:'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600', amenities:['Wi-Fi','Проектор','Парковка']},
        {id:'al4', city:'Алматы', district:'Алатау',      title:'IT студия «CodeHub»',       category:'IT',        price:1800, rating:4.9, img:'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600', amenities:['Wi-Fi','Проектор']},
        {id:'al5', city:'Алматы', district:'Наурызбай',   title:'Репетитор по математике',   category:'Репетиторы',price:800,  rating:4.6, img:'https://images.unsplash.com/photo-1524178232363-933d15b072d7?w=600', amenities:['Wi-Fi']},
        // Астана
        {id:'as1', city:'Астана', district:'Алматы',  title:'Психолог «Центр Гармонии»',  category:'Психологи', price:1300, rating:4.8, img:'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600', amenities:['Wi-Fi','Кофе']},
        {id:'as2', city:'Астана', district:'Сарыарка',title:'Совещательная «Executive»',   category:'Совещания', price:1600, rating:4.7, img:'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600', amenities:['Wi-Fi','Проектор','Кофе']},
        {id:'as3', city:'Астана', district:'Есиль',   title:'IT коворкинг «Digital»',      category:'IT',        price:2000, rating:4.9, img:'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600', amenities:['Wi-Fi','Проектор','Парковка']},
        // Другие города
        {id:'sh1', city:'Шымкент',       district:'Центр', title:'Юридическая консультация', category:'Юристы',    price:1100, rating:4.7, img:'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600', amenities:['Wi-Fi']},
        {id:'kg1', city:'Караганда',     district:'Центр', title:'Репетитор английского',    category:'Репетиторы',price:700,  rating:4.8, img:'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600', amenities:['Wi-Fi']},
        {id:'p1',  city:'Павлодар',      district:'Центр', title:'Массажный кабинет',        category:'Массаж',    price:950,  rating:4.6, img:'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600', amenities:['Парковка']},
        {id:'ak1', city:'Актобе',        district:'Центр', title:'Тренинги «Лидер»',         category:'Тренинги',  price:1400, rating:4.9, img:'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600', amenities:['Wi-Fi','Проектор']},
        {id:'at1', city:'Атырау',        district:'Центр', title:'Логопед кабинет',           category:'Логопеды',  price:850,  rating:4.7, img:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600', amenities:['Wi-Fi']},
        {id:'ur1', city:'Уральск',       district:'Центр', title:'Бьюти кабинет',             category:'Бьюти',     price:1000, rating:4.8, img:'https://images.unsplash.com/photo-1531432310545-8c8c4c48e016?w=600', amenities:['Wi-Fi','Кофе']},
        {id:'se1', city:'Семей',         district:'Центр', title:'Совещания «Бизнес»',        category:'Совещания', price:1200, rating:4.6, img:'https://images.unsplash.com/photo-1556744494-f1a7e0f25d73?w=600', amenities:['Wi-Fi','Проектор']},
        {id:'pe1', city:'Петропавловск', district:'Центр', title:'Юрист консультация',        category:'Юристы',    price:1050, rating:4.7, img:'https://images.unsplash.com/photo-1582213782174-e1c88c72a5e5?w=600', amenities:['Парковка']},
        {id:'ta1', city:'Тараз',         district:'Центр', title:'Репетитор физики',          category:'Репетиторы',price:750,  rating:4.8, img:'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600', amenities:[]},
        {id:'k1',  city:'Кокшетау',      district:'Центр', title:'IT мастерская',             category:'IT',        price:1700, rating:4.9, img:'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600', amenities:['Wi-Fi']},
        {id:'t1',  city:'Туркестан',     district:'Центр', title:'Каб. логопеда',             category:'Логопеды',  price:900,  rating:4.6, img:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600', amenities:['Wi-Fi']},
      ];
      for (const room of rooms) {
        await this._add('rooms', room);
      }
    }

    // --- Users ---
    const userCount = await this._count('users');
    if (userCount === 0) {
      const users = [
        { email: 'demo@renter.kz',    password: btoa('password123'), name: 'Демо Арендатор',   role: 'renter',   phone: '+77778889900' },
        { email: 'demo@landlord.kz',  password: btoa('password123'), name: 'Демо Арендодатель',role: 'landlord', phone: '+77779998800' },
        { email: 'admin@workspace.kz',password: btoa('admin123'),    name: 'Администратор',    role: 'admin',    phone: '+77051234567' },
      ];
      for (const user of users) {
        await this._add('users', user);
      }
    }

    // --- Bookings ---
    const bookingCount = await this._count('bookings');
    if (bookingCount === 0) {
      const today = new Date().toISOString().slice(0, 10);
      const bookings = [
        { userEmail: 'demo@renter.kz', roomId: 'al1', date: today,       slots: '10:00,11:00', total: 2400, status: 'confirmed' },
        { userEmail: 'demo@renter.kz', roomId: 'al3', date: '2026-04-25', slots: '14:00',       total: 1500, status: 'confirmed' },
      ];
      for (const b of bookings) {
        await this._add('bookings', b);
      }
    }
  }

  /* ── Public API ────────────────────────────────────────── */

  async getRooms(filters = {}) {
    let rooms = await this._getAll('rooms');
    if (filters.category) rooms = rooms.filter(r => r.category.toLowerCase().includes(filters.category.toLowerCase()));
    if (filters.city)     rooms = rooms.filter(r => r.city === filters.city);
    if (filters.priceMin) rooms = rooms.filter(r => r.price >= Number(filters.priceMin));
    if (filters.priceMax) rooms = rooms.filter(r => r.price <= Number(filters.priceMax));
    if (filters.search)   rooms = rooms.filter(r => r.title.toLowerCase().includes(filters.search.toLowerCase()));
    return rooms;
  }

  async getRoom(id) {
    return this._get('rooms', String(id));
  }

  async addUser(user) {
    return this._put('users', user);
  }

  async getUser(email) {
    return this._get('users', email);
  }

  async addBooking(booking) {
    return this._add('bookings', booking);
  }

  async getAllBookings() {
    return this._getAll('bookings');
  }

  async getBookingsByUser(email) {
    const all = await this._getAll('bookings');
    return all.filter(b => b.userEmail === email);
  }

  async cancelBooking(id) {
    const booking = await this._get('bookings', id);
    if (!booking) throw new Error('Бронь не найдена');
    booking.status = 'cancelled';
    return this._put('bookings', booking);
  }
}

// Global singleton
window.WorkSpaceDB = new WorkSpaceDB();
