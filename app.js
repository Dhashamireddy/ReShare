/* ══════════════════════════════════════════
   Give & Gather — app.js (donor side)
   Demonstrates: fetch+async/await, try/catch,
   HOFs (map/filter/find), DOM events,
   debouncing, pagination, error handling
   ══════════════════════════════════════════ */
'use strict';

// ── SESSION-AWARE NAV ──
(function initNav() {
  if (session.isValid()) {
    const name = session.get('name') || 'Me';
    const role = session.get('role');
    const btn  = document.getElementById('nav-auth');
    if (btn) {
      btn.textContent = role === 'ngo' ? '🏛 Dashboard' : `👋 ${name.split(' ')[0]}`;
      btn.href = role === 'ngo' ? 'ngo-dashboard.html' : '#';
    }
  }
})();

// ── SEED DATA (fallback when Supabase not yet configured) ──
const SEED_DONATIONS = [
  { id:'d1', category:'food',    title:'30 hot thalis',             qty:'30 portions', area:'MG Road',     expiry:'90 min',      notes:'Veg only · Saffron Kitchen',  urgent:true,  donor_name:'Saffron Kitchen' },
  { id:'d2', category:'clothes', title:'Winter jackets & coats',    qty:'42 items',    area:'Koramangala', expiry:'This weekend', notes:'Adults M–XL · gently used',  urgent:false, donor_name:'Ananya R.' },
  { id:'d3', category:'books',   title:'Class 6–10 textbooks',      qty:'200 books',   area:'Indiranagar', expiry:'Open pickup',  notes:'CBSE & State board',          urgent:false, donor_name:'Priya L.' },
  { id:'d4', category:'clothes', title:"Children's shoes",          qty:'~30 pairs',   area:'Jayanagar',   expiry:'Today',       notes:'Size 4–7 · mixed brands',     urgent:true,  donor_name:'Arjun M.' },
  { id:'d5', category:'food',    title:'Rice & dal ration pack',    qty:'50 kg',       area:'Whitefield',  expiry:'3 days',      notes:'Sealed · surplus from wedding', urgent:false, donor_name:'Deepa S.' },
  { id:'d6', category:'books',   title:'English fiction novels',    qty:'35 books',    area:'HSR Layout',  expiry:'This week',   notes:'Mostly paperback · mixed genres', urgent:false, donor_name:'Rohan K.' },
  { id:'d7', category:'food',    title:'Bakery surplus bread',      qty:'60 loaves',   area:'Sadashivanagar', expiry:'Tonight', notes:'Best before midnight',        urgent:true,  donor_name:'Daily Bread Bakery' },
  { id:'d8', category:'clothes', title:'Sarees & kurtas',           qty:'28 pieces',   area:'Rajajinagar', expiry:'This week',   notes:'Ladies wear · good condition',urgent:false, donor_name:'Kavitha P.' },
  { id:'d9', category:'books',   title:'NEET & JEE prep books',    qty:'15 books',    area:'Banashankari',expiry:'Open pickup',  notes:'2023–24 editions',            urgent:false, donor_name:'Siddharth V.' },
];

const SEED_REQUESTS = [
  { id:'r1', category:'food',    title:'80 meals for night shelter',   qty:'80 portions', area:'Shivaji Nagar', urgency:'high', org:'Roti Bank',           desc:'Serving 200+ nightly. Cooked meals or dry ration kits welcome.' },
  { id:'r2', category:'clothes', title:'School uniforms for 60 kids',  qty:'60 sets',     area:'Hennur',        urgency:'high', org:'Sparsh Foundation',   desc:'Sizes 6–14. Children start school in June.' },
  { id:'r3', category:'books',   title:'Kannada & English textbooks',  qty:'120 books',   area:'Yelahanka',     urgency:'mid',  org:'Paathshala Trust',    desc:'Need Class 1–5 books for the new academic year.' },
  { id:'r4', category:'food',    title:'Ration kits for 30 families',  qty:'30 kits',     area:'K.R. Puram',    urgency:'mid',  org:'Aahar Sewa',          desc:'Rice, dal, oil, and spices. Families affected by flooding.' },
  { id:'r5', category:'books',   title:'Competitive exam guides',      qty:'50+ books',   area:'Rajajinagar',   urgency:'low',  org:'Gyaan Centre',        desc:'UPSC, KCET, NEET books for first-generation students.' },
  { id:'r6', category:'clothes', title:'Warm blankets for elderly',    qty:'40 blankets', area:'Bannerghatta',  urgency:'mid',  org:'New Leaf Home',       desc:'Old age home with 40 residents. Good-condition blankets.' },
];

// ── STATE ──
let allDonations = [];
let displayedDonations = [];
let activeFilter = 'all';
let searchQuery  = '';
const PAGE_SIZE  = 6;
let currentPage  = 1;

// ── CAT META ──
const C = {
  clothes: { icon:'👗', bg:'var(--clothes-bg)', color:'var(--clothes)' },
  books:   { icon:'📚', bg:'var(--books-bg)',   color:'var(--books)' },
  food:    { icon:'🍱', bg:'var(--food-bg)',    color:'var(--food)' },
};

// ── COUNTERS ──
function animateNum(el, target) {
  let v = 0;
  const step = Math.ceil(target / 55);
  const t = setInterval(() => {
    v = Math.min(v + step, target);
    el.textContent = v.toLocaleString();
    if (v >= target) clearInterval(t);
  }, 20);
}

// ── FETCH DONATIONS (async/await + try/catch + HOF) ──
async function loadDonations() {
  try {
    const token = session.get('token');
    let data;
    if (token && SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co') {
      data = await sb.getDonations(token);
      // HOF: map API response to unified shape
      allDonations = data.map(d => ({
        id: d.id, category: d.category, title: d.title,
        qty: d.qty, area: d.area, expiry: d.expiry,
        notes: d.notes, urgent: d.urgent,
        donor_name: d.profiles?.name || 'Anonymous',
      }));
    } else {
      // Fallback seed data
      allDonations = SEED_DONATIONS;
    }
    applyFilters();
  } catch (err) {
    console.error('loadDonations error:', err);
    // Graceful fallback
    allDonations = SEED_DONATIONS;
    applyFilters();
  }
}

// ── HOFs: filter + find ──
function applyFilters() {
  const q = searchQuery.toLowerCase();

  // HOF filter: category match AND search match
  displayedDonations = allDonations.filter(d => {
    const catOk  = activeFilter === 'all' || d.category === activeFilter;
    const termOk = !q || [d.title, d.category, d.area, d.notes, d.donor_name]
      .some(f => f && f.toLowerCase().includes(q));
    return catOk && termOk;
  });

  currentPage = 1;
  renderCards();
  updateCount();
}

// ── RENDER CARDS (HOF: map to HTML) ──
function renderCards() {
  const grid = document.getElementById('cards-grid');
  const loadBtn = document.getElementById('load-more-btn');
  const slice = displayedDonations.slice(0, currentPage * PAGE_SIZE);

  if (displayedDonations.length === 0) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🔍</div><h3>No donations found</h3><p>Try a different search or category.</p></div>`;
    loadBtn.classList.add('hidden');
    return;
  }

  // HOF: map donations to card HTML
  grid.innerHTML = slice.map(d => {
    const m = C[d.category] || C.food;
    return `
      <div class="card donation-card" data-cat="${d.category}">
        <div class="card-top">
          <span class="tag tag-${d.category}">${d.category}</span>
          ${d.urgent ? '<span class="tag tag-urgent">Urgent</span>' : `<span style="font-size:12px;color:var(--ink-muted);background:rgba(28,26,20,.05);border-radius:20px;padding:3px 10px">${d.qty}</span>`}
        </div>
        <div class="card-icon" style="background:${m.bg}">${m.icon}</div>
        <div class="card-title">${d.title}</div>
        <div class="card-meta">${d.notes}</div>
        <div class="card-footer">
          <span class="card-location">📍 ${d.area}</span>
          <span class="card-expiry">${d.expiry ? '⏱ ' + d.expiry : ''}</span>
          <button class="btn btn-primary btn-xs" onclick="openClaimModal('${d.id}','${escHtml(d.title)}')">Claim</button>
        </div>
      </div>`;
  }).join('');

  // Pagination — show load more if more items exist
  const hasMore = displayedDonations.length > currentPage * PAGE_SIZE;
  loadBtn.classList.toggle('hidden', !hasMore);
}

function loadMore() {
  currentPage++;
  renderCards();
}

function updateCount() {
  const el = document.getElementById('donation-count');
  if (el) el.textContent = `${displayedDonations.length} donation${displayedDonations.length !== 1 ? 's' : ''}`;
}

// ── FILTER BY CATEGORY (DOM event + HOF) ──
function filterCat(cat, btn) {
  activeFilter = cat;
  document.querySelectorAll('.cat-tab').forEach(t => t.className = 'cat-tab');
  btn.classList.add('sel-' + cat);
  applyFilters();
}

// ── DEBOUNCED SEARCH ──
const onSearch = debounce((val) => {
  searchQuery = val;
  applyFilters();
}, 350);

// ── LOAD NGO REQUESTS ──
async function loadRequests() {
  try {
    const token = session.get('token');
    let data;
    if (token && SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co') {
      data = await sb.getRequests(token);
    } else {
      data = SEED_REQUESTS;
    }
    renderRequests(data);
  } catch (err) {
    console.error('loadRequests:', err);
    renderRequests(SEED_REQUESTS);
  }
}

const URGENCY = { high: { dot:'var(--urgent)', label:'Urgent' }, mid: { dot:'var(--food)', label:'This week' }, low: { dot:'var(--books)', label:'Ongoing' } };

function renderRequests(data) {
  const grid = document.getElementById('requests-grid');
  if (!data || data.length === 0) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">📋</div><h3>No requests at the moment</h3></div>`;
    return;
  }

  // HOF: map requests to card HTML
  grid.innerHTML = data.map(r => {
    const u = URGENCY[r.urgency] || URGENCY.low;
    return `
      <div class="card" style="border-left:4px solid ${C[r.category]?.color || '#888'};padding-left:1rem">
        <div style="font-size:11px;font-weight:500;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-light);margin-bottom:5px">${r.org} · ${r.area}</div>
        <div class="card-title">${r.title}</div>
        <div class="card-meta" style="margin-bottom:12px">${r.desc}</div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:12px;color:var(--ink-muted);display:flex;align-items:center;gap:5px">
            <span style="width:7px;height:7px;border-radius:50%;background:${u.dot};display:inline-block"></span>${u.label}
          </span>
          <button class="btn btn-outline btn-xs" onclick="openDonateModal('${r.category}')">Help fulfill →</button>
        </div>
      </div>`;
  }).join('');
}

// ── DONATE MODAL ──
let donCat = null;

function openDonateModal(cat) {
  if (cat) selDonCat(cat, document.querySelector(`[onclick="selDonCat('${cat}',this)"]`));
  document.getElementById('donate-modal').classList.add('open');
}

function selDonCat(cat, el) {
  donCat = cat;
  document.querySelectorAll('#donate-cat-pills .cpill').forEach(p => p.className = 'cpill');
  if (el) el.classList.add('on-' + cat);
}

async function submitDonation() {
  const title  = document.getElementById('don-title').value.trim();
  const qty    = document.getElementById('don-qty').value.trim();
  const area   = document.getElementById('don-area').value.trim();
  const expiry = document.getElementById('don-expiry').value.trim();
  const notes  = document.getElementById('don-notes').value.trim();
  const errEl  = document.getElementById('donate-err');
  const btn    = document.getElementById('don-btn');

  errEl.classList.remove('show');
  if (!donCat) { showFormErr(errEl, 'Please select a category.'); return; }
  if (!title || !area)  { showFormErr(errEl, 'Please fill in item name and your area.'); return; }

  btn.innerHTML = '<span class="spinner"></span> Posting…';
  btn.disabled = true;

  try {
    const token = session.get('token');
    const uid   = session.get('uid');
    const payload = { category: donCat, title, qty, area, expiry, notes, urgent: false, donor_id: uid };

    if (token && SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co') {
      await sb.addDonation(token, payload);
      await loadDonations();
    } else {
      // Local optimistic add
      allDonations.unshift({ ...payload, id: 'local-' + Date.now(), donor_name: session.get('name') || 'You' });
      applyFilters();
    }

    closeModal('donate-modal');
    showToast('Donation posted! Donors nearby will be notified. 🎉');
    resetDonateForm();
  } catch (err) {
    showFormErr(errEl, err.message || 'Failed to post. Please try again.');
  } finally {
    btn.innerHTML = 'Post donation →';
    btn.disabled = false;
  }
}

function resetDonateForm() {
  ['don-title','don-qty','don-area','don-expiry','don-notes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.querySelectorAll('#donate-cat-pills .cpill').forEach(p => p.className = 'cpill');
  donCat = null;
}

// ── CLAIM MODAL ──
let claimItemId = null;

function openClaimModal(id, title) {
  claimItemId = id;
  document.getElementById('claim-title').textContent = 'Claim: ' + title;
  document.getElementById('claim-modal').classList.add('open');
}

async function submitClaim() {
  const name  = document.getElementById('claim-name').value.trim();
  const phone = document.getElementById('claim-phone').value.trim();
  const time  = document.getElementById('claim-time').value.trim();
  const errEl = document.getElementById('claim-err');
  const btn   = document.getElementById('claim-btn');

  errEl.classList.remove('show');
  if (!name || !phone) { showFormErr(errEl, 'Please enter your name and phone number.'); return; }

  btn.innerHTML = '<span class="spinner"></span>';
  btn.disabled = true;

  try {
    // Simulate async API call
    await new Promise(r => setTimeout(r, 800));
    closeModal('claim-modal');
    showToast('Claimed! Donor details sent to your phone. ✓');
    // Mark item as claimed using find HOF
    const item = allDonations.find(d => d.id === claimItemId);
    if (item) item.claimed = true;
  } catch(err) {
    showFormErr(errEl, 'Something went wrong. Please try again.');
  } finally {
    btn.innerHTML = 'Confirm claim →';
    btn.disabled = false;
  }
}

// ── MODAL HELPERS ──
function closeModal(id)  { document.getElementById(id).classList.remove('open'); }
function overlayClose(e, id) { if (e.target.classList.contains('modal-overlay')) closeModal(id); }
function showFormErr(el, msg) { el.textContent = msg; el.classList.add('show'); }
function escHtml(str) { return str.replace(/'/g,"&#39;").replace(/"/g,"&quot;"); }

// ── ESCAPE KEY ──
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') ['donate-modal','claim-modal'].forEach(id => closeModal(id));
});

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
  // Animate counters
  animateNum(document.getElementById('cnt-meals'),  4821);
  animateNum(document.getElementById('cnt-donors'),  312);
  animateNum(document.getElementById('cnt-ngos'),     47);
  animateNum(document.getElementById('cnt-items'),  9340);

  // Load data
  await Promise.all([loadDonations(), loadRequests()]);
});
