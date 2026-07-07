document.addEventListener("DOMContentLoaded", () => {

  // CTA
  document.querySelectorAll(".cta-card").forEach(card => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      alert("功能開發中");
    });
  });

  // 收藏
  document.querySelectorAll(".heart-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      btn.textContent = btn.classList.contains("active") ? "♥" : "♡";
    });
  });

  // Bottom Navigation
  document.querySelectorAll(".bottom-nav a").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();

      document
        .querySelectorAll(".bottom-nav a")
        .forEach(nav => nav.classList.remove("active"));

      item.classList.add("active");
    });
  });

  // 漢堡選單
  const menu = document.querySelector(".header-actions .icon-btn:last-child");

  if (menu) {
    menu.addEventListener("click", () => {
      alert("漢堡選單（開發中）");
    });
  }

  console.log("SoftPlanet P01 Ready");

});