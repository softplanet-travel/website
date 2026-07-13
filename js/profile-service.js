(function () {
  const KEY = "softplanet-profile";
  const parse = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; }
    catch (error) { return {}; }
  };
  const saveLocal = (profile) => localStorage.setItem(KEY, JSON.stringify(profile));
  const clean = (value) => String(value || "").trim();
  const length = (value) => [...clean(value)].length;

  function fallback(user, profile = {}) {
    const metadata = user?.user_metadata || {};
    const emailName = clean(user?.email).split("@")[0];
    return clean(profile.preferred_name)
      || clean(profile.display_name)
      || clean(metadata.full_name || metadata.name)
      || emailName
      || "旅人";
  }

  async function getUser() {
    if (!window.spClient) return null;
    try {
      const { data, error } = await window.spClient.auth.getUser();
      return error ? null : data?.user || null;
    } catch (error) {
      return null;
    }
  }

  async function load(user = null) {
    const local = parse();
    if (!user || !window.spClient) return { ...local, preferred_name: clean(local.preferred_name), resolved_name: fallback(user, local) };
    try {
      const { data, error } = await window.spClient.from("profiles").select("preferred_name,display_name,email,avatar_url,updated_at").eq("user_id", user.id).maybeSingle();
      if (!error && data) {
        const merged = { ...local, ...data };
        saveLocal(merged);
        return { ...merged, resolved_name: fallback(user, merged) };
      }
    } catch (error) {}
    return { ...local, resolved_name: fallback(user, local) };
  }

  async function savePreferredName(value, user = null) {
    const preferredName = clean(value);
    if (!preferredName) throw new Error("稱呼不能只留空白。");
    if (length(preferredName) > 20) throw new Error(`稱呼超出 ${length(preferredName) - 20} 個字元。`);
    const metadata = user?.user_metadata || {};
    const profile = {
      ...parse(),
      preferred_name: preferredName,
      display_name: clean(metadata.full_name || metadata.name) || null,
      email: user?.email || null,
      avatar_url: metadata.avatar_url || metadata.picture || null,
      updated_at: new Date().toISOString()
    };
    saveLocal(profile);
    if (user && window.spClient) {
      try {
        await window.spClient.from("profiles").upsert({ user_id: user.id, ...profile }, { onConflict: "user_id" });
      } catch (error) {}
    }
    return { ...profile, resolved_name: preferredName };
  }

  window.SoftPlanetProfile = { getUser, load, savePreferredName, resolve: fallback, length };
}());
