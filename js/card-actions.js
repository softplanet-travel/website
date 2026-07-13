(function () {
  const FAVORITES_KEY = "softplanet-favorites";
  let toastTimer;

  function favoriteIds() {
    try {
      const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      return new Set(Array.isArray(stored) ? stored : []);
    } catch (error) {
      return new Set();
    }
  }

  function showToast(message) {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
  }

  function refreshFavoriteButtons() {
    const favorites = favoriteIds();
    document.querySelectorAll("[data-favorite-id]").forEach((button) => {
      const active = favorites.has(button.dataset.favoriteId);
      const name = button.dataset.favoriteName || "這個內容";
      button.classList.toggle("active", active);
      button.textContent = active ? "♥" : "♡";
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", `${active ? "取消收藏" : "收藏"}${name}`);
    });
  }

  function toggleFavorite(id, name) {
    const favorites = favoriteIds();
    const active = !favorites.has(id);
    active ? favorites.add(id) : favorites.delete(id);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
    refreshFavoriteButtons();
    showToast(active ? "已幫你收進收藏。" : "已從收藏移除。");
    window.dispatchEvent(new CustomEvent("softplanet:favorite-changed", { detail: { id, active } }));
    return active;
  }

  async function share({ title, text, url }) {
    const shareData = {
      title: title || "SoftPlanet 柔軟星球",
      text: text || "世界很大，我陪你慢慢看。",
      url: new URL(url || location.href.split("#")[0], location.href).href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return true;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        showToast("連結已複製，可以傳給旅伴囉 🐻");
        return true;
      }
      showToast("可以從瀏覽器網址列複製連結分享。");
      return false;
    } catch (error) {
      if (error.name !== "AbortError") showToast("目前沒有順利分享，請再試一次。");
      return false;
    }
  }

  function mount(root = document) {
    root.querySelectorAll("[data-favorite-id]").forEach((button) => {
      if (button.dataset.actionReady) return;
      button.dataset.actionReady = "true";
      button.addEventListener("click", () => toggleFavorite(button.dataset.favoriteId, button.dataset.favoriteName));
    });
    root.querySelectorAll("[data-share-url]").forEach((button) => {
      if (button.dataset.actionReady) return;
      button.dataset.actionReady = "true";
      button.addEventListener("click", () => share({
        title: button.dataset.shareTitle,
        text: button.dataset.shareText,
        url: button.dataset.shareUrl
      }));
    });
    refreshFavoriteButtons();
  }

  window.SoftPlanetCardActions = { mount, share, showToast, toggleFavorite, refreshFavoriteButtons };
}());
