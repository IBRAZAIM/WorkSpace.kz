// WorkSpace.kz — Main Logic

/* ── Toast ──────────────────────────────────────────────── */
window.Utils = {
  showToast(msg, type = 'default') {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    clearTimeout(toast._timer);
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
  }
};

/* ── Navbar ─────────────────────────────────────────────── */
function updateNavbar(user) {
  const navRight = document.getElementById('navRight') || document.querySelector('.nav-right');
  if (!navRight) return;

  if (user) {
    const name = user.name ? user.name.split(' ')[0] : user.email.split('@')[0];
    navRight.innerHTML = `
      <span style="font-size:0.85rem;color:var(--tx2);">${name}</span>
      <a href="dashboard.html" class="header-back">Кабинет</a>
      <a href="#" onclick="AuthManager.logout(); window.location.reload();" class="header-back">Выход</a>
    `;
  } else {
    navRight.innerHTML = '<a href="login.html" class="header-back">Войти</a>';
  }
}

/* ── Hero search ─────────────────────────────────────────── */
async function heroSearch() {
  const city = document.getElementById('heroCity')?.value || '';
  const cat  = document.getElementById('heroCat')?.value  || '';
  if (!city && !cat) { Utils.showToast('Выберите город или категорию'); return; }
  window.location.href = `catalog.html?city=${encodeURIComponent(city)}&cat=${encodeURIComponent(cat)}`;
}

/* ── Filters toggle ──────────────────────────────────────── */
function toggleFilters() {
  document.getElementById('filtersSidebar')?.classList.toggle('open');
}

/* ── Modal ───────────────────────────────────────────────── */
function closeModal(e) {
  if (e) e.stopPropagation();
  document.getElementById('overlay')?.classList.remove('open');
}

/* ── Filter tabs ─────────────────────────────────────────── */
window.toggleCat = function(btn, cat) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // Reload cards with filter
  if (typeof loadIndexCards === 'function') loadIndexCards(cat);
};

window.toggleAmenity = function(btn) {
  btn.classList.toggle('on');
};

/* ── Index: cards ────────────────────────────────────────── */
async function loadIndexCards(categoryFilter = '') {
  const loader = document.getElementById('cardsLoader');
  const grid   = document.getElementById('cardsGrid');
  const label  = document.getElementById('resultLabel');
  if (!loader || !grid) return;

  loader.style.display = 'flex';
  grid.style.display   = 'none';

  try {
    await WorkSpaceDB.dbReady;
    const filters = categoryFilter ? { category: categoryFilter } : {};
    const rooms = await Data.getRooms(filters);

    grid.innerHTML = rooms.map(room => `
      <div class="space-card" onclick="window.location.href='room.html?id=${room.id}'" style="cursor:pointer;">
        <div class="space-img-container">
          <img src="${room.img}" alt="${room.title}" class="space-img" loading="lazy"
               onerror="this.src='https://placehold.co/400x300/18181C/5A5A62?text=Фото';">
          <div class="card-label">${room.category}</div>
        </div>
        <div style="padding:1.5rem;">
          <h3 style="font-size:1.1rem;margin-bottom:0.5rem;">${room.title}</h3>
          <div style="font-size:1.3rem;font-weight:800;color:var(--accent);margin-bottom:0.6rem;">${room.price}₸/ч</div>
          <div style="display:flex;gap:1rem;margin-bottom:0.75rem;font-size:0.88rem;">
            <div style="color:var(--ok);">★ ${room.rating || '4.7'}</div>
            <div style="color:var(--tx2);">${room.city}${room.district ? ', ' + room.district : ''}</div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
            ${(room.amenities || []).slice(0,3).map(a => `<span class="badge">${a}</span>`).join('')}
            ${(room.amenities || []).length > 3 ? '<span class="badge">+ещё</span>' : ''}
          </div>
        </div>
      </div>
    `).join('');

    loader.style.display = 'none';
    grid.style.display   = 'grid';
    if (label) label.textContent = `Доступные кабинеты (${rooms.length})`;
  } catch (e) {
    loader.innerHTML = `<span style="color:var(--err);">Ошибка загрузки: ${e.message}</span>`;
    console.error('Cards error:', e);
  }
}

/* ── Page init ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Update navbar immediately with cached user
  updateNavbar(AuthManager.currentUser);

  // Wait for DB then re-update (in case of async auth check)
  await WorkSpaceDB.dbReady;

  // Detect page by body data-attribute or script element
  const bodyPage = document.body.dataset.page;
  const scriptEl = document.querySelector('script[data-page]');
  const page = bodyPage || (scriptEl ? scriptEl.dataset.page : '');

  if (page === 'index')  { await loadIndexCards(); }
  if (page === 'login')  { /* Login handlers are inline */ }
  if (page === 'catalog'){ initCatalog(); }
});

async function initCatalog() {
  const p = new URLSearchParams(window.location.search);
  // catalog.html has its own inline logic
}
