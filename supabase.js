// 1. Centralized Configuration
// This will automatically pull the live keys from Vercel's Environment Variables
const SUPABASE_URL = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  import.meta.env?.VITE_SUPABASE_URL;

const SUPABASE_ANON = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  import.meta.env?.VITE_SUPABASE_ANON_KEY;

// 2. Custom Lightweight Supabase Client
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
    
    // If Supabase Auth returns an error, stop here and bubble it up
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
          // Attaches the user's secure token so Row Level Security (RLS) knows who is writing
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

      // Optional check to ensure profile creation didn't fail quietly
      if (!profileResponse.ok) {
        const profileError = await profileResponse.json();
        console.warn("Auth succeeded, but profile creation failed:", profileError);
      }
    }

    return authData;
  }
};

export default sb;
