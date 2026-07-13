document.addEventListener("DOMContentLoaded", () => {

  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.hidden = true;
    document.body.appendChild(toast);
  }
  let toastTimer;
  let favoriteIds = [];
  try {
    const stored = JSON.parse(localStorage.getItem("softplanet-favorites") || "[]");
    favoriteIds = Array.isArray(stored) ? stored : [];
  } catch (error) {
    favoriteIds = [];
  }
  const favorites = new Set(favoriteIds);

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 2600);
  }

  // 收藏
  document.querySelectorAll(".heart-btn").forEach(btn => {
    const placeId = btn.dataset.placeId;
    if (placeId && favorites.has(placeId)) {
      btn.classList.add("active");
      btn.textContent = "♥";
      btn.setAttribute("aria-pressed", "true");
    }
    btn.addEventListener("click", () => {
      const active = btn.classList.toggle("active");
      btn.textContent = active ? "♥" : "♡";
      btn.setAttribute("aria-pressed", String(active));
      if (placeId) {
        active ? favorites.add(placeId) : favorites.delete(placeId);
        localStorage.setItem("softplanet-favorites", JSON.stringify([...favorites]));
      }
      showToast(active ? "已先幫你記下這個靈感" : "已移除這個靈感");
    });
  });

  document.querySelectorAll("[data-coming-soon]").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      showToast(`${item.dataset.comingSoon}正在準備中，MUMU 會再告訴你`);
    });
  });

  const menuButton = document.getElementById("menuBtn");
  const menu = document.getElementById("siteMenu");

  if (menuButton && menu) {
    menuButton.addEventListener("click", () => {
      const willOpen = menu.hidden;
      menu.hidden = !willOpen;
      menuButton.setAttribute("aria-expanded", String(willOpen));
      menuButton.setAttribute("aria-label", willOpen ? "關閉選單" : "開啟選單");
    });
    document.addEventListener("click", (event) => {
      if (!menu.hidden && !menu.contains(event.target) && !menuButton.contains(event.target)) {
        menu.hidden = true;
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "開啟選單");
      }
    });
  }

  const shareButton = document.getElementById("shareBtn");
  if (shareButton) {
    shareButton.addEventListener("click", async () => {
      const shareData = {
        title: "SoftPlanet 柔軟星球",
        text: "世界很大，讓 MUMU 陪你慢慢看。",
        url: window.location.href.split("#")[0]
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareData.url);
          showToast("連結已複製，可以傳給旅伴囉 🐻");
        } else {
          showToast("可以從瀏覽器網址列複製連結分享");
        }
      } catch (error) {
        if (error.name !== "AbortError") showToast("暫時無法分享，請稍後再試");
      }
    });
  }

});
