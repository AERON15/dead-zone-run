const SUPABASE_URL = 'https://oxwbcoveslfmasauuoht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94d2Jjb3Zlc2xmbWFzYXV1b2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODU3NzUsImV4cCI6MjA5NTM2MTc3NX0.BhytjubkybsLLikoh5gdYh4vsLF_7A0T_m6vHKUq63o';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────

function usernameToEmail(username) {
  // Fake email so Supabase Auth works without exposing real emails to players.
  return `${username.toLowerCase().replace(/[^a-z0-9_]/g, '')}@deadzone.game`;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function authSignUp(username, password) {
  const email = usernameToEmail(username);

  const { data, error } = await supabaseClient.auth.signUp({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: 'Username already taken.' };
    }
    return { error: error.message };
  }

  if (!data.user) return { error: 'Signup failed. Please try again.' };

  // Create the profile row linked to the new auth user
  const { error: profileError } = await supabaseClient
    .from('profiles')
    .insert({ id: data.user.id, username, coins: 0, unlocked_guns: ['pistol'] });

  if (profileError) {
    // Clean up the dangling auth session so the user can retry cleanly
    await supabaseClient.auth.signOut();
    if (profileError.code === '23505') return { error: 'Username already taken.' };
    return { error: 'Failed to create account. Please try again.' };
  }

  return { user: data.user };
}

async function authSignIn(username, password) {
  const email = usernameToEmail(username);
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Invalid username or password.' };
  return { user: data.user };
}

async function authSignOut() {
  await supabaseClient.auth.signOut();
}

async function authGetSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

// ── Profile ───────────────────────────────────────────────────────────────────

async function loadProfile() {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('username, coins, unlocked_guns')
    .single();
  if (error) return null;
  return data;
}

async function buyGun(gunId, price) {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return { error: 'Not logged in' };

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('coins, unlocked_guns')
    .eq('id', user.id)
    .single();

  if (!profile) return { error: 'Profile not found' };
  if (profile.coins < price) return { error: 'Not enough coins' };
  if (profile.unlocked_guns.includes(gunId)) return { success: true }; // already owned

  const newCoins = profile.coins - price;
  const newGuns = [...profile.unlocked_guns, gunId];

  const { error } = await supabaseClient
    .from('profiles')
    .update({ coins: newCoins, unlocked_guns: newGuns })
    .eq('id', user.id);

  if (error) return { error: error.message };

  return { success: true, newCoins, newGuns };
}

async function addCoins(amount) {
  if (amount <= 0) return;
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('coins')
    .eq('id', user.id)
    .single();

  if (!profile) return;

  await supabaseClient
    .from('profiles')
    .update({ coins: profile.coins + amount })
    .eq('id', user.id);
}

// ── Scores ────────────────────────────────────────────────────────────────────

async function saveScore(playerName, score, waveReached, zombiesKilled, upgradesChosen) {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return; // guests don't save scores

  try {
    const { error } = await supabaseClient.from('game_scores').insert([{
      player_name: playerName,
      score,
      wave_reached: waveReached,
      zombies_killed: zombiesKilled,
      upgrades_chosen: upgradesChosen,
      user_id: user.id
    }]);
    if (error) console.error('saveScore error:', error.message);
  } catch (err) {
    console.error('Failed to save score:', err);
  }
}

async function loadLeaderboard() {
  try {
    // Fetch more than 10 so we can deduplicate by user before slicing
    const { data, error } = await supabaseClient
      .from('game_scores')
      .select('player_name, score, wave_reached, zombies_killed, user_id')
      .order('score', { ascending: false })
      .limit(100);

    if (error || !data) return [];

    // Keep only the best score per account (first occurrence = highest score)
    const seen = new Set();
    return data.filter(row => {
      const key = row.user_id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 10);
  } catch (err) {
    console.error('Failed to load leaderboard:', err);
    return [];
  }
}