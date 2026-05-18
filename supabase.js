// ── supabase.js ──
// Replace these two values with your own from https://supabase.com → Project Settings → API
const SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_KEY';

// Thin REST client — no npm needed
const sb = {
  // ── AUTH ──
  async signUp({ email, password, name, role, org, area }) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || data.msg);

    // Save profile to profiles table
    const uid = data.user?.id;
    if (uid) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${data.access_token}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ id: uid, name, role, org: org || null, area }),
      });
    }
    return data;
  },

  async signIn({ email, password }) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || data.msg);
    return data;
  },

  async getProfile(uid, token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}&select=*`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` },
    });
    const rows = await res.json();
    return rows[0] || null;
  },

  // ── DONATIONS ──
  async getDonations(token) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/donations?select=*,profiles(name,area)&order=created_at.desc`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` } }
    );
    return res.json();
  },

  async addDonation(token, payload) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${token}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // ── REQUESTS ──
  async getRequests(token) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/requests?select=*,profiles(name,area)&order=created_at.desc`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` } }
    );
    return res.json();
  },

  async addRequest(token, payload) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${token}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // ── MESSAGES ──
  async getMessages(token, threadId) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?thread_id=eq.${threadId}&select=*&order=created_at.asc`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` } }
    );
    return res.json();
  },

  async sendMessage(token, payload) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${token}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  },
};

// ── SESSION HELPERS ──
const session = {
  save(data, profile) {
    localStorage.setItem('gg_token',   data.access_token);
    localStorage.setItem('gg_uid',     data.user.id);
    localStorage.setItem('gg_role',    profile.role);
    localStorage.setItem('gg_name',    profile.name);
    localStorage.setItem('gg_org',     profile.org || '');
    localStorage.setItem('gg_area',    profile.area || '');
  },
  get(key)  { return localStorage.getItem('gg_' + key); },
  clear()   { ['token','uid','role','name','org','area'].forEach(k => localStorage.removeItem('gg_' + k)); },
  isValid() { return !!localStorage.getItem('gg_token'); },
  requireAuth(redirectTo = 'login.html') {
    if (!this.isValid()) window.location.href = redirectTo;
  },
  requireRole(role, redirectTo = 'index.html') {
    if (this.get('role') !== role) window.location.href = redirectTo;
  },
};

// ── UTILITY: DEBOUNCE ──
function debounce(fn, delay = 350) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── UTILITY: TOAST ──
function showToast(msg, type = 'default') {
  const existing = document.querySelector('.gg-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'gg-toast';
  t.textContent = msg;
  t.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:${type === 'error' ? '#B84040' : '#1C1A14'};color:#FDFBF7;
    padding:12px 24px;border-radius:100px;font-size:14px;
    font-family:'DM Sans',sans-serif;z-index:9999;white-space:nowrap;
    animation:toastIn 0.3s ease;pointer-events:none;
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── UTILITY: CATEGORY META ──
const CAT_META = {
  clothes: { icon: '👗', color: '#C0785A', bg: '#FAF0EB', label: 'Clothes' },
  books:   { icon: '📚', color: '#4A7B6F', bg: '#EAF3F0', label: 'Books'   },
  food:    { icon: '🍱', color: '#BF8C2A', bg: '#FBF3E0', label: 'Food'    },
};
