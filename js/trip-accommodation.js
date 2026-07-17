(function () {
  // Accommodation Area is a distinct concept from Living Cluster (still unpopulated everywhere -
  // see the comment in trip-recommendations.js) AND from the generic services.areas() helper used
  // for custom-item tagging - conflating those was a previous bug (Tokyo once showed 8 generic
  // areas including 澀谷/池袋/台場/其他, none of which are the real Accommodation Area set).
  //
  // Areas are populated from data/catalog/accommodation-areas.csv (synced from the project's
  // Google Sheet - see js/catalog-service.js) once ready() resolves. No hardcoded area list lives
  // here anymore; every consumer already reads through areasForDestination()/areaDetail(), never a
  // raw object, so this stays correct regardless of how many destinations the Sheet ends up with.
  //
  // Image assets: only 3 real image assets exist anywhere in this project (site logo, the generic
  // MUMU bear hero, and one Tokyo city map). No per-area hero photo exists; hero_image is left
  // unset rather than guessing a URL - area/hotel cards keep using this app's existing emoji-in-
  // card convention instead of a broken <img>.
  function areasForDestination(country, city) {
    return window.SoftPlanetCatalogService.accommodationAreasFor(country, city);
  }

  function areaDetail(areaId) {
    return window.SoftPlanetCatalogService.findAreaById(areaId);
  }

  // Hotels formally catalogued for a specific accommodation area. Demo-flagged records (layout
  // placeholders such as "上野柔旅飯店（Demo）") are deliberately excluded - they must never be
  // presented as this area's real hotel catalog. They remain reachable normally through
  // favorites/inspiration, just not through this area-browsing list. Matches by area_id first
  // (the formal key), falling back to matching this area's name against a place's legacy subarea
  // text field for any place created before area_id existed.
  function hotelsForArea(country, city, areaId) {
    const area = areaDetail(areaId);
    return (window.SoftPlanetPlaces || []).filter((place) =>
      place.category === "住宿" && !place.demo && place.country === country && place.city === city &&
      (place.area_id === areaId || (area && place.subarea === area.name))
    ).slice(0, 5);
  }

  window.SoftPlanetAccommodation = { areasForDestination, areaDetail, hotelsForArea };
}());
