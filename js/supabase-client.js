(function setupSoftPlanetClient() {
  const SUPABASE_URL = "https://ftlpxesmzchwzeurmupr.supabase.co";
  const SUPABASE_KEY = "sb_publishable_5fxS5Fm4dqXNFIMyVtTm0w_gnncuTRh";

  if (!window.supabase) {
    window.spClient = null;
    return;
  }

  window.spClient = window.spClient || window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
})();
