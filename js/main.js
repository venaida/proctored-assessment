import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { state } from './state.js';
import { showIntro } from './ui.js';

function initializeSupabase() {
    try {
        state.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase initialized.");
    } catch (e) {
        console.error("Error initializing Supabase. Make sure you have created `js/config.js` with your credentials.", e);
        document.getElementById("app").innerHTML = "<h1>Error: Supabase configuration is missing.</h1><p>Please follow the setup instructions in `js/config.js.example`.</p>";
    }
}

// --- INITIALIZE APP ---
document.addEventListener('DOMContentLoaded', () => {
    initializeSupabase();
    if (state.supabase) {
        showIntro();
    }
});
