/**
 * WorkSpace.kz - IndexedDB Data Layer (Offline-first)
 * Singleton exposed as window.DB (not WorkSpaceDB to avoid class/instance name collision)
 */

(function () {
  'use strict';

  const DB_NAME    = 'WorkSpaceV8'; // Полностью новое имя для обхода кэша
  const DB_VERSION = 1;

  // ---------- helpers ----------
  function tx(db, store, mode, fn) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(store, mode);
      const req = fn(transaction.objectStore(store));
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  // ---------- seed data ----------
  const SEED_ROOMS = [
    {id:'al1', city:'Алматы', district:'Алмалинский',  title:'Каб. психолога «Гармония»',   category:'Психологи',  price:1200, rating:4.9, img:'https://images.unsplash.com/photo-1576091160399-1d65cdaa8782?w=600', amenities:['Wi-Fi','Кофе','Парковка']},
    {id:'al2', city:'Алматы', district:'Алатау',        title:'Психолог Елена К.',            category:'Психологи',  price:900,  rating:4.8, img:'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600', amenities:['Wi-Fi']},
    {id:'al3', city:'Алматы', district:'Бостандыкский', title:'Совещания «Бизнес Центр»',    category:'Совещания',  price:1500, rating:4.7, img:'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600', amenities:['Wi-Fi','Проектор','Парковка']},
    {id:'al4', city:'Алматы', district:'Алатау',        title:'IT студия «CodeHub»',          category:'IT',         price:1800, rating:4.9, img:'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600', amenities:['Wi-Fi','Проектор']},
    {id:'al5', city:'Алматы', district:'Наурызбай',     title:'Репетитор по математике',      category:'Репетиторы', price:800,  rating:4.6, img:'https://images.unsplash.com/photo-1524178232363-933d15b072d7?w=600', amenities:['Wi-Fi']},
    {id:'as1', city:'Астана', district:'Алматы',        title:'Психолог «Центр Гармонии»',   category:'Психологи',  price:1300, rating:4.8, img:'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600', amenities:['Wi-Fi','Кофе']},
    {id:'as2', city:'Астана', district:'Сарыарка',      title:'Совещательная «Executive»',    category:'Совещания',  price:1600, rating:4.7, img:'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600', amenities:['Wi-Fi','Проектор','Кофе']},
    {id:'as3', city:'Астана', district:'Есиль',         title:'IT коворкинг «Digital»',       category:'IT',         price:2000, rating:4.9, img:'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600', amenities:['Wi-Fi','Проектор','Парковка']},
    {id:'sh1', city:'Шымкент',       district:'Центр',  title:'Юридическая консультация',     category:'Юристы',     price:1100, rating:4.7, img:'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600', amenities:['Wi-Fi']},
    {id:'kg1', city:'Караганда',     district:'Центр',  title:'Репетитор английского',        category:'Репетиторы', price:700,  rating:4.8, img:'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600', amenities:['Wi-Fi']},
    {id:'p1',  city:'Павлодар',      district:'Центр',  title:'Массажный кабинет',            category:'Массаж',     price:950,  rating:4.6, img:'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600', amenities:['Парковка']},
    {id:'ak1', city:'Актобе',        district:'Центр',  title:'Тренинги «Лидер»',             category:'Тренинги',   price:1400, rating:4.9, img:'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600', amenities:['Wi-Fi','Проектор']},
    {id:'at1', city:'Атырау',        district:'Центр',  title:'Логопед кабинет',              category:'Логопеды',   price:850,  rating:4.7, img:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600', amenities:['Wi-Fi']},
    {id:'ur1', city:'Уральск',       district:'Центр',  title:'Бьюти кабинет',                category:'Бьюти',      price:1000, rating:4.8, img:'https://images.unsplash.com/photo-1531432310545-8c8c4c48e016?w=600', amenities:['Wi-Fi','Кофе']},
    {id:'se1', city:'Семей',         district:'Центр',  title:'Совещания «Бизнес»',           category:'Совещания',  price:1200, rating:4.6, img:'https://images.unsplash.com/photo-1556744494-f1a7e0f25d73?w=600', amenities:['Wi-Fi','Проектор']},
    {id:'pe1', city:'Петропавловск', district:'Центр',  title:'Юрист консультация',           category:'Юристы',     price:1050, rating:4.7, img:'https://images.unsplash.com/photo-1582213782174-e1c88c72a5e5?w=600', amenities:['Парковка']},
    {id:'ta1', city:'Тараз',         district:'Центр',  title:'Репетитор физики',             category:'Репетиторы', price:750,  rating:4.8, img:'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600', amenities:[]},
    {id:'k1',  city:'Кокшетау',      district:'Центр',  title:'IT мастерская',                category:'IT',         price:1700, rating:4.9, img:'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600', amenities:['Wi-Fi']},
    {id:'t1',  city:'Туркестан',     district:'Центр',  title:'Каб. логопеда',                category:'Логопеды',   price:900,  rating:4.6, img:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600', amenities:['Wi-Fi']},
  ];

  const SEED_USERS = [
    { email: 'demo@tenant.kz',    password: btoa('password123'), name: 'Демо Арендатор',    role: 'tenant',   phone: '+77778889900' },
    { email: 'demo@landlord.kz',  password: btoa('password123'), name: 'Демо Арендодатель', role: 'landlord', phone: '+77779998800' },
    { email: 'admin@workspace.kz',password: btoa('admin123'),    name: 'Администратор',     role: 'admin',    phone: '+77051234567' },
  ];

  // ---------- DB factory ----------
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Delete old stores to ensure clean slate
        ['rooms', 'users', 'bookings'].forEach(name => {
          if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name);
        });

        const rooms = db.createObjectStore('rooms', { keyPath: 'id' });
        rooms.createIndex('city',     'city',     { unique: false });
        rooms.createIndex('category', 'category', { unique: false });

        db.createObjectStore('users', { keyPath: 'email' });

        const bookings = db.createObjectStore('bookings', { keyPath: 'id', autoIncrement: true });
        bookings.createIndex('userEmail', 'userEmail', { unique: false });
        bookings.createIndex('roomId',    'roomId',    { unique: false });
      };
    });
  }

  // ---------- seeder ----------
  async function seedDB(db) {
    // rooms
    const roomCount = await tx(db, 'rooms', 'readonly', s => s.count());
    if (roomCount === 0) {
      for (const room of SEED_ROOMS) {
        await tx(db, 'rooms', 'readwrite', s => s.put(room));
      }
    }
    // users
    const userCount = await tx(db, 'users', 'readonly', s => s.count());
    if (userCount === 0) {
      for (const user of SEED_USERS) {
        await tx(db, 'users', 'readwrite', s => s.put(user));
      }
    }
    // seed 2 demo bookings on first run
    const bookCount = await tx(db, 'bookings', 'readonly', s => s.count());
    if (bookCount === 0) {
      const today = new Date().toISOString().slice(0, 10);
      for (const b of [
        { userEmail: 'demo@tenant.kz', roomId: 'al1', date: today,       slots: '10:00,11:00', total: 2400, status: 'confirmed' },
        { userEmail: 'demo@tenant.kz', roomId: 'al3', date: '2026-05-10', slots: '14:00',       total: 1500, status: 'confirmed' },
      ]) {
        await tx(db, 'bookings', 'readwrite', s => s.add(b));
      }
    }
  }

  // ---------- public API ----------
  const dbReady = openDB().then(async db => {
    await seedDB(db);
    return db;
  });

  window.DB = {
    /* expose promise so pages can: await DB.ready */
    ready: dbReady,

    /* Rooms */
    async getRooms(filters = {}) {
      const db = await dbReady;
      let rooms = await tx(db, 'rooms', 'readonly', s => s.getAll());
      if (filters.category) {
        const cats = filters.category.toLowerCase().split(',').map(c => c.trim());
        rooms = rooms.filter(r => cats.some(c => r.category.toLowerCase().includes(c)));
      }
      if (filters.city)     rooms = rooms.filter(r => r.city === filters.city);
      if (filters.amenities) {
        const amens = filters.amenities.toLowerCase().split(',').map(a => a.trim());
        rooms = rooms.filter(r => {
          const ra = (r.amenities || []).map(a => a.toLowerCase());
          return amens.every(a => ra.includes(a));
        });
      }
      if (filters.priceMin) rooms = rooms.filter(r => r.price >= +filters.priceMin);
      if (filters.priceMax) rooms = rooms.filter(r => r.price <= +filters.priceMax);
      if (filters.search)   rooms = rooms.filter(r => r.title.toLowerCase().includes(filters.search.toLowerCase()));
      return rooms;
    },

    async getRoom(id) {
      const db = await dbReady;
      return tx(db, 'rooms', 'readonly', s => s.get(String(id)));
    },

    /* Users */
    async getUser(email) {
      const db = await dbReady;
      return tx(db, 'users', 'readonly', s => s.get(email));
    },

    async putUser(user) {
      const db = await dbReady;
      return tx(db, 'users', 'readwrite', s => s.put(user));
    },

    /* Bookings */
    async addBooking(booking) {
      const db = await dbReady;
      const id = await tx(db, 'bookings', 'readwrite', s => s.add(booking));
      return { ...booking, id };
    },

    async getAllBookings() {
      const db = await dbReady;
      return tx(db, 'bookings', 'readonly', s => s.getAll());
    },

    async getBookingsByUser(email) {
      const db = await dbReady;
      const all = await tx(db, 'bookings', 'readonly', s => s.getAll());
      return all.filter(b => b.userEmail === email);
    },

    async getAllUsers() {
      const db = await dbReady;
      return tx(db, 'users', 'readonly', s => s.getAll());
    },

    async cancelBooking(id) {
      const db = await dbReady;
      const booking = await tx(db, 'bookings', 'readonly', s => s.get(Number(id)));
      if (!booking) throw new Error('Бронь не найдена');
      booking.status = 'cancelled';
      return tx(db, 'bookings', 'readwrite', s => s.put(booking));
    },

    async updateBooking(id, patch) {
      const db = await dbReady;
      const booking = await tx(db, 'bookings', 'readonly', s => s.get(Number(id)));
      if (!booking) throw new Error('Бронь не найдена');
      Object.assign(booking, patch);
      await tx(db, 'bookings', 'readwrite', s => s.put(booking));
      return booking;
    },
  };

  // Legacy alias — old code using WorkSpaceDB.dbReady or WorkSpaceDB.xxx still works
  window.WorkSpaceDB = {
    get dbReady() { return dbReady.then(() => {}); },
    getRooms:         (...a) => window.DB.getRooms(...a),
    getRoom:          (...a) => window.DB.getRoom(...a),
    getUser:          (...a) => window.DB.getUser(...a),
    addUser:          (...a) => window.DB.putUser(...a),
    getAllUsers:       (...a) => window.DB.getAllUsers(...a),
    addBooking:       (...a) => window.DB.addBooking(...a),
    getAllBookings:    (...a) => window.DB.getAllBookings(...a),
    getBookingsByUser:(...a) => window.DB.getBookingsByUser(...a),
    cancelBooking:    (...a) => window.DB.cancelBooking(...a),
    updateBooking:    (...a) => window.DB.updateBooking(...a),
  };

})();
