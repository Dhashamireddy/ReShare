// Centralized Configuration (Safe for regular vanilla JS script files)
const SUPABASE_URL = 
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) || 
  'https://YOUR_PROJECT.supabase.co'; // Replace with your actual Supabase URL if not using a build bundler

const SUPABASE_ANON = 
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 
  'YOUR_ANON_KEY'; // Replace with your actual anon key if not using a build bundler

// Custom Lightweight Supabase Client
const sb = {
  /**
   * Signs up a new user and automatically populates their profile in the custom profiles table.
   */
  async signUp({ email, password, name, role, org, area }) {
    if (!SUPABASE_URL || !SUPABASE_ANON || SUPABASE_URL.includes('YOUR_PROJECT')) {
      throw new Error("Supabase environment variables are missing or misconfigured.");
    }

    // --- STEP A: Create the User Auth Account ---
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'apikey': SUPABASE_ANON 
      },
      body: JSON.stringify({ email, password }),
    });
    
    const authData = await authResponse.json();
    
    if (authData.error) {
      throw new Error(authData.error.message || authData.msg);
    }

    // --- STEP B: Save Meta-Data to the Custom Profiles Table ---
    const uid = authData.user?.id;
    if (uid) {
      const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${authData.access_token}`, 
        },
        body: JSON.stringify({ 
          id: uid, 
          name: name, 
          role: role, 
          org: org, 
          area: area 
        }),
      });

      if (!profileResponse.ok) {
        const profileError = await profileResponse.json();
        console.warn("Auth succeeded, but profile creation failed:", profileError);
      }
    }

    return authData;
  }
};

// Make it available globally if not using modules, otherwise export it
if (typeof module !== 'undefined' && module.exports) {
  module.exports = sb;
} else {
  window.sb = sb;
}
