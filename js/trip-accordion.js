(function () {
  function createGroup() {
    const items = [];
    function open(id) {
      items.forEach((item) => {
        const active = item.id === id;
        item.panel.hidden = !active;
        item.header.setAttribute("aria-expanded", String(active));
        item.header.classList.toggle("open", active);
      });
    }
    function close(id) {
      const item = items.find((entry) => entry.id === id);
      if (!item) return;
      item.panel.hidden = true;
      item.header.setAttribute("aria-expanded", "false");
      item.header.classList.remove("open");
    }
    function register(id, header, panel, { openByDefault = false } = {}) {
      items.push({ id, header, panel });
      panel.hidden = !openByDefault;
      header.setAttribute("aria-expanded", String(openByDefault));
      header.classList.toggle("open", openByDefault);
      header.addEventListener("click", () => {
        const isOpen = header.getAttribute("aria-expanded") === "true";
        isOpen ? close(id) : open(id);
      });
    }
    return { register, open, close };
  }
  window.SoftPlanetAccordion = { createGroup };
}());
