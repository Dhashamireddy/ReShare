/* ══════════════════════════════════════════
   Give & Gather — ngo-dashboard.js
   ══════════════════════════════════════════ */
'use strict';

// Auth guard
session.requireAuth('login.html');
session.requireRole('ngo', 'index.html');

// ── SEED DATA ──
const SEED_REQUESTS = [
  { id:'nr1', category:'food',    icon:'🍱', title:'80 meals for night shelter',   qty:'80 portions', area:'Shivaji Nagar', urgency:'high', status:'matched',   desc:'Cooked meals or dry ration · Tonight' },
  { id:'nr2', category:'clothes', icon:'👕', title:'School uniforms for 60 kids',  qty:'60 sets',     area:'Hennur',        urgency:'high', status:'pending',   desc:'Sizes 6–14 · By May 31' },
  { id:'nr3', category:'food',    icon:'🌾', title:'Ration kits for 30 families',  qty:'30 kits',     area:'K.R. Puram',    urgency:'mid',  status:'matched',   desc:'Rice, dal, oil · This week' },
  { id:'nr4', category:'books',   icon:'📚', title:'Class 1–5 textbooks (Kannada)',qty:'120 books',   area:'Yelahanka',     urgency:'low',  status:'fulfilled', desc:'CBSE & State board · Open' },
];

const SEED_MATCHES = [
  { id:'m1', category:'Food',    icon:'🍱', title:'30 hot thalis',           donor:'Saffron Kitchen · MG Road',  score:98, initials:'SK', thread:'SK' },
  { id:'m2', category:'Food',    icon:'🌾', title:'Rice & dal surplus 50 kg', donor:'Priya L. · Whitefield',     score:91, initials:'PL', thread:'PL' },
  { id:'m3', category:'Clothes', icon:'👕', title:"Children's clothes bundle", donor:'Arjun R. · Jayanagar',     score:85, initials:'AR', thread:'AR' },
];

const THREADS = {
  SK: { name:'Saffron Kitchen', sub:'Donor · MG Road', msgs: [
    { from:'them', text:'Hi! We saw your request for 80 meals tonight.', time:'5:12 PM' },
    { from:'me',   text:'Yes, we serve 200+ at our night shelter. Any help is welcome!', time:'5:14 PM' },
    { from:'them', text:'We can have 30 boxes ready by 6pm. Veg only — is that okay?', time:'5:20 PM' },
    { from:'me',   text:'That's perfect. Can we pick up from MG Road?', time:'5:21 PM' },
  ]},
  PL: { name:'Priya L. (Donor)', sub:'Donor · Whitefield', msgs: [
    { from:'them', text:'I have extra ration packs — about 20 kg rice and 5 kg dal.', time:'4:00 PM' },
    { from:'me',   text:'Amazing! We have 30 families in need right now.', time:'4:05 PM' },
  ]},
  AR: { name:'Arjun R. (Donor)', sub:'Donor · Jayanagar', msgs: [
    { from:'them', text:'Kids clothes, sizes 6–12. Good condition.', time:'2 days ago' },
    { from:'me',   text:'We have families who would love these. Can you drop off?', time:'2 days ago' },
    { from:'them', text:'Happy to drop off on Saturday morning.', time:'2 days ago' },
  ]},
};

// ── STATE ──
let myRequests = [...SEED_REQUESTS];
let currentThread = 'SK';
let postCat = null, postUrgency = null;

const C = {
  food:    { color:'var(--food)',    bg:'var(--food-bg)' },
  clothes: { color:'var(--clothes)', bg:'var(--clothes-bg)' },
  books:   { color:'var(--books)',   bg:'var(--books-bg)' },
};
const STATUS_TAG = { matched:'tag-matched', pending:'tag-pending', fulfilled:'tag-fulfilled' };
const STATUS_LBL = { matched:'Matched', pending:'Pending', fulfilled:'Fulfilled' };

// ── INIT NAV ──
function initProfile() {
  const name = session.get('name') || 'Your Organisation';
  const org  = session.get('org')  || name;
  const area = session.get('area') || 'Bengaluru';
  const initials = org.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  document.getElementById('sb-initials').textContent  = initials;
  document.getElementById('sb-org-name').textContent  = org;
  document.getElementById('sb-area').textContent      = '📍 ' + area;
  document.getElementById('greet-name').textContent   = `Good morning, ${org.split(' ')[0]} 👋`;
}

// ── PAGE NAVIGATION ──
function showPage(name) {
  document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.sb-nav a').forEach(a => a.classList.remove('active'));
  const idx = { overview:0, requests:1, matches:2, messages:3 };
  const links = document.querySelectorAll('.sb-nav a');
  if (links[idx[name]]) links[idx[name]].classList.add('active');
  if (name === 'messages') renderThread(currentThread);
}

// ── RENDER REQUESTS (HOF: map + filter) ──
function renderReqList(containerId, data) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (data.length === 0) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📋</div><h3>No requests yet</h3><p>Post your first request above.</p></div>`;
    return;
  }
  el.innerHTML = data.map(r => `
    <div class="req-row">
      <div class="req-icon" style="background:${C[r.category]?.bg || '#eee'}">${r.icon}</div>
      <div>
        <div class="req-title">${r.title}</div>
        <div class="req-meta">${r.qty} · ${r.area} · ${r.desc}</div>
      </div>
      <span class="tag ${STATUS_TAG[r.status] || 'tag-pending'}">${STATUS_LBL[r.status] || 'Pending'}</span>
      <div class="req-acts">
        <button class="icon-btn" title="Message donor" onclick="showPage('messages')">💬</button>
        <button class="icon-btn" title="Delete" onclick="deleteRequest('${r.id}')">🗑</button>
      </div>
    </div>`).join('');
}

// ── DEBOUNCED SEARCH for request list ──
const filterReqList = debounce((query) => {
  const q = query.toLowerCase();
  // HOF: filter by search term
  const filtered = q
    ? myRequests.filter(r => [r.title, r.category, r.area, r.desc].some(f => f.toLowerCase().includes(q)))
    : myRequests;
  renderReqList('all-req-list', filtered);
}, 300);

// ── RENDER MATCHES ──
function renderMatches() {
  const grid = document.getElementById('matches-grid');
  // HOF: map matches to HTML
  grid.innerHTML = SEED_MATCHES.map(m => `
    <div class="match-card">
      <span class="match-score">${m.score}% match</span>
      <div class="match-cat">${m.category}</div>
      <div class="match-title">${m.title}</div>
      <div class="match-donor">📍 ${m.donor}</div>
      <div class="match-acts">
        <button class="btn btn-primary btn-sm" onclick="openThread('${m.thread}')">💬 Message</button>
        <button class="btn btn-outline btn-sm" onclick="showToast('Claim sent to donor! ✓')">Claim →</button>
      </div>
    </div>`).join('');
}

// ── RENDER THREAD LIST ──
function renderThreadList() {
  const list = document.getElementById('thread-list');
  list.innerHTML = Object.entries(THREADS).map(([key, t]) => `
    <div class="msg-thread ${key === currentThread ? 'active' : ''}" onclick="selectThread('${key}', this)">
      <span class="thread-time">${key === 'SK' ? '2m ago' : key === 'PL' ? '1h ago' : '2d ago'}</span>
      <div class="thread-name">${key !== 'AR' ? '<span class="thread-dot"></span>' : ''}${t.name}</div>
      <div class="thread-preview">${t.msgs[t.msgs.length - 1].text}</div>
    </div>`).join('');
}

function selectThread(key, el) {
  currentThread = key;
  document.querySelectorAll('.msg-thread').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderThread(key);
}

function openThread(key) {
  showPage('messages');
  setTimeout(() => {
    const items = document.querySelectorAll('.msg-thread');
    const keys  = Object.keys(THREADS);
    items.forEach((el, i) => el.classList.toggle('active', keys[i] === key));
    currentThread = key;
    renderThread(key);
  }, 50);
}

function renderThread(key) {
  const t = THREADS[key];
  if (!t) return;
  document.getElementById('chat-name').textContent   = t.name;
  document.getElementById('chat-sub').textContent    = t.sub;
  document.getElementById('chat-avatar').textContent = key;
  const body = document.getElementById('msg-body');
  body.innerHTML = t.msgs.map(m => `
    <div>
      <div class="bubble ${m.from === 'me' ? 'me' : 'them'}">${m.text}</div>
      <div class="bubble-time">${m.time}</div>
    </div>`).join('');
  body.scrollTop = body.scrollHeight;
}

function sendMsg() {
  const inp  = document.getElementById('msg-inp');
  const text = inp.value.trim();
  if (!text) return;
  const now = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  THREADS[currentThread].msgs.push({ from:'me', text, time: now });
  renderThread(currentThread);
  renderThreadList();
  inp.value = '';
}

// ── POST REQUEST MODAL ──
function openPostModal() {
  document.getElementById('post-modal').classList.add('open');
}

function selPostCat(cat, el) {
  postCat = cat;
  document.querySelectorAll('#post-cat-pills .cpill').forEach(p => p.className = 'cpill');
  el.classList.add('on-' + cat);
}

function selUrgency(level, el) {
  postUrgency = level;
  document.querySelectorAll('#post-urgency .upill').forEach(p => p.className = 'upill');
  el.classList.add('on-' + level);
}

async function submitRequest() {
  const title = document.getElementById('post-title').value.trim();
  const desc  = document.getElementById('post-desc').value.trim();
  const qty   = document.getElementById('post-qty').value.trim();
  const loc   = document.getElementById('post-loc').value.trim();
  const errEl = document.getElementById('post-err');
  const btn   = document.getElementById('post-btn');

  errEl.classList.remove('show');
  if (!postCat)  { showFormErr(errEl, 'Please select a category.'); return; }
  if (!title)    { showFormErr(errEl, 'Please enter a title for your request.'); return; }

  btn.innerHTML = '<span class="spinner"></span> Posting…';
  btn.disabled = true;

  try {
    const token = session.get('token');
    const uid   = session.get('uid');
    const ICONS = { food:'🍱', clothes:'👗', books:'📚' };
    const URGENCY_DESC = { high:'Tonight/Today', mid:'This week', low:'This month' };

    const payload = {
      id: 'nr-' + Date.now(), category: postCat,
      icon: ICONS[postCat], title, qty: qty || '—',
      area: loc || session.get('area') || 'Bengaluru',
      urgency: postUrgency || 'mid', status: 'pending',
      desc: (desc || '') + (postUrgency ? ' · ' + URGENCY_DESC[postUrgency] : ''),
    };

    if (token && SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co') {
      await sb.addRequest(token, { ...payload, ngo_id: uid });
    }

    myRequests.unshift(payload);
    renderReqList('overview-req-list', myRequests.slice(0, 3));
    renderReqList('all-req-list', myRequests);
    updateStats();
    closeModal('post-modal');
    showToast('Request posted! Donors in your area will be notified. ✓');
    resetPostForm();

  } catch(err) {
    showFormErr(errEl, err.message || 'Failed to post. Please try again.');
  } finally {
    btn.innerHTML = 'Post request →';
    btn.disabled = false;
  }
}

async function deleteRequest(id) {
  if (!confirm('Delete this request?')) return;
  try {
    // HOF: filter out deleted item
    myRequests = myRequests.filter(r => r.id !== id);
    renderReqList('overview-req-list', myRequests.slice(0, 3));
    renderReqList('all-req-list', myRequests);
    updateStats();
    showToast('Request deleted.');
  } catch(err) {
    showToast('Could not delete. Try again.', 'error');
  }
}

function resetPostForm() {
  ['post-title','post-desc','post-qty','post-loc'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.querySelectorAll('#post-cat-pills .cpill').forEach(p => p.className = 'cpill');
  document.querySelectorAll('#post-urgency .upill').forEach(p => p.className = 'upill');
  postCat = null; postUrgency = null;
}

function updateStats() {
  // HOF: filter active vs fulfilled
  const active    = myRequests.filter(r => r.status !== 'fulfilled').length;
  const fulfilled = myRequests.filter(r => r.status === 'fulfilled').length;
  const el1 = document.getElementById('sc-active');
  const el2 = document.getElementById('sc-fulfilled');
  if (el1) el1.textContent = active;
  if (el2) el2.textContent = fulfilled;
}

// ── HELPERS ──
function closeModal(id)  { document.getElementById(id).classList.remove('open'); }
function showFormErr(el, msg) { el.textContent = msg; el.classList.add('show'); }

function doSignOut() {
  session.clear();
  window.location.href = 'login.html';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal('post-modal');
});

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  initProfile();
  renderReqList('overview-req-list', myRequests.slice(0, 3));
  renderReqList('all-req-list', myRequests);
  renderMatches();
  renderThreadList();
  renderThread(currentThread);
  updateStats();
});
