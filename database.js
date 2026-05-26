// database.js — Supabase Integration for Dead Zone Run Leaderboard
// This file handles saving scores and loading the leaderboard from Supabase.

// ============================================================
// STEP 1: Paste your Supabase credentials below.
//
// Go to your Supabase project dashboard:
//   → Settings → API
//   → Copy the "Project URL" and paste it as SUPABASE_URL
//   → Copy the "anon public" key and paste it as SUPABASE_ANON_KEY
// ============================================================

const SUPABASE_URL  = 'YOUR_SUPABASE_URL_HERE';      // Example: 'https://abcdefg.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE'; // Example: 'eyJhbGciOi...'

// Create the Supabase client using the CDN library loaded in index.html.
// The "supabase" global comes from the Supabase CDN script.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ============================================================
// STEP 2: Make sure your Supabase table is set up.
//
// Table name: game_scores
// Columns:
//   id             → int8, primary key, auto-increment
//   player_name    → text
//   score          → int4
//   wave_reached   → int4
//   zombies_killed → int4
//   upgrades_chosen→ text[] (array of text) or jsonb
//   created_at     → timestamptz, default now()
// ============================================================


/**
 * Saves the player's run data to Supabase after they die.
 * Called automatically from gameOver() in script.js.
 *
 * @param {string}   playerName     - The player's display name.
 * @param {number}   score          - Final score.
 * @param {number}   waveReached    - Highest wave the player reached.
 * @param {number}   zombiesKilled  - Total zombies killed.
 * @param {string[]} upgradesChosen - Array of upgrade names picked during the run.
 */
async function saveScore(playerName, score, waveReached, zombiesKilled, upgradesChosen) {
  try {
    const { data, error } = await supabaseClient
      .from('game_scores')
      .insert([
        {
          player_name:     playerName,
          score:           score,
          wave_reached:    waveReached,
          zombies_killed:  zombiesKilled,
          upgrades_chosen: upgradesChosen
        }
      ]);

    if (error) {
      console.error('Supabase saveScore error:', error.message);
      return;
    }

    console.log('Score saved successfully!', data);
  } catch (err) {
    // Network error or Supabase is unreachable
    console.error('Failed to save score:', err);
  }
}


/**
 * Loads the top 10 scores from Supabase, sorted by highest score first.
 * Called when the player opens the leaderboard screen.
 *
 * @returns {Array} An array of score objects, or an empty array if loading fails.
 *   Each object has: { player_name, score, wave_reached, zombies_killed }
 */
async function loadLeaderboard() {
  try {
    const { data, error } = await supabaseClient
      .from('game_scores')
      .select('player_name, score, wave_reached, zombies_killed')
      .order('score', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Supabase loadLeaderboard error:', error.message);
      return [];
    }

    // Return the data so script.js can render it
    return data;
  } catch (err) {
    // Network error or Supabase is unreachable
    console.error('Failed to load leaderboard:', err);
    return [];
  }
}
