/* ── login.js ── */
'use strict';

// Redirect if already logged in
if (session.isValid()) {
  window.location.href = session.get('role') === 'ngo' ? 'ngo-dashboard.html' : 'index.html';
}

let selectedRole = null;

// ── ROLE SELECTION ──
function selectRole(role) {
  selectedRole = role;
  ['donor','ngo'].forEach(r => {
    document.getElementById('rc-' + r).classList.toggle('selected', r === role);
  });
  document.getElementById('role-next').disabled = false;
}

// ── STEP NAVIGATION ──
function showStep(id) {
  document.querySelectorAll('.login-step').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function applyRoleUI() {
  const isNgo = selectedRole === 'ngo';
  document.getElementById('si-badge').style.display  = isNgo ? 'inline-block' : 'none';
  document.getElementById('su-badge').style.display  = isNgo ? 'inline-block' : 'none';
  document.getElementById('si-sub').textContent = isNgo ? 'Welcome back — NGO portal.' : 'Welcome back, donor.';
  document.getElementById('su-sub').textContent = isNgo ? 'Register your organisation.' : 'Join as a donor.';
  document.getElementById('su-org-wrap').style.display = isNgo ? 'block' : 'none';
}

function goToSignIn() {
  applyRoleUI();
  showStep('step-signin');
}

function goToSignUp() {
  applyRoleUI();
  showStep('step-signup');
}

// ── SIGN IN ──
async function handleSignIn() {
  const email = document.getElementById('si-email').value.trim();
  const pw    = document.getElementById('si-pw').value;
  const errEl = document.getElementById('si-error');
  const btn   = document.getElementById('si-btn');

  errEl.classList.remove('show');
  if (!email || !pw) { showErr(errEl, 'Please fill in all fields.'); return; }

  btn.innerHTML = '<span class="spinner"></span>';
  btn.disabled = true;

  try {
    const data = await sb.signIn({ email, password: pw });
    const profile = await sb.getProfile(data.user.id, data.access_token);

    if (!profile) throw new Error('Profile not found. Please sign up first.');

    session.save(data, profile);
    window.location.href = profile.role === 'ngo' ? 'ngo-dashboard.html' : 'index.html';

  } catch (err) {
    showErr(errEl, err.message || 'Sign-in failed. Check your credentials.');
    btn.innerHTML = 'Sign in →';
    btn.disabled = false;
  }
}

// ── SIGN UP ──
async function handleSignUp() {
  const first = document.getElementById('su-first').value.trim();
  const last  = document.getElementById('su-last').value.trim();
  const org   = document.getElementById('su-org').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const phone = document.getElementById('su-phone').value.trim();
  const area  = document.getElementById('su-area').value.trim();
  const pw    = document.getElementById('su-pw').value;
  const errEl = document.getElementById('su-error');
  const btn   = document.getElementById('su-btn');

  errEl.classList.remove('show');

  if (!first || !last || !email || !area || !pw) { showErr(errEl, 'Please fill in all required fields.'); return; }
  if (pw.length < 6) { showErr(errEl, 'Password must be at least 6 characters.'); return; }
  if (selectedRole === 'ngo' && !org) { showErr(errEl, 'Please enter your organisation name.'); return; }

  btn.innerHTML = '<span class="spinner"></span>';
  btn.disabled = true;

  try {
    const data = await sb.signUp({
      email, password: pw,
      name: `${first} ${last}`,
      role: selectedRole,
      org: org || null,
      area,
    });

    // Some Supabase setups require email confirmation — handle gracefully
    if (data.user) {
      const profile = { role: selectedRole, name: `${first} ${last}`, org: org || '', area };
      session.save(data, profile);
      window.location.href = selectedRole === 'ngo' ? 'ngo-dashboard.html' : 'index.html';
    } else {
      showErr(errEl, 'Check your email to confirm your account, then sign in.');
      btn.innerHTML = 'Create account →';
      btn.disabled = false;
    }

  } catch (err) {
    showErr(errEl, err.message || 'Sign-up failed. Please try again.');
    btn.innerHTML = 'Create account →';
    btn.disabled = false;
  }
}

function showErr(el, msg) {
  el.textContent = msg;
  el.classList.add('show');
}

// ── ENTER KEY ──
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const active = document.querySelector('.login-step.active')?.id;
  if (active === 'step-signin') handleSignIn();
  if (active === 'step-signup') handleSignUp();
});
