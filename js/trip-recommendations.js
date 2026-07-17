(function () {
  // Official product priority chain: living_cluster_id -> area_id -> station_id -> destination_id/city.
  // Verified by full-project search: living_cluster_id, station_id, and food_cluster_id do not exist
  // anywhere in this project's current data (places-data.js, custom-item-service.js, supabase-schema.sql,
  // or any migration). The chain below reads these fields defensively so it activates the moment a real
  // Living Cluster master / enriched Hotel/Attraction/Food dataset is imported. It never fabricates an id.
  function clusterOf(place) {
    return {
      living_cluster: place.living_cluster_id || null,
      area: place.area_id || place.subarea || null,
      station: place.station_id || null,
      city: place.city || null,
      country: place.country || null
    };
  }
  function matchLevel(anchor, candidate) {
    const a = clusterOf(anchor), c = clusterOf(candidate);
    if (a.living_cluster && c.living_cluster && a.living_cluster === c.living_cluster) return "living_cluster";
    if (a.area && c.area && a.area === c.area) return "area";
    if (a.station && c.station && a.station === c.station) return "station";
    if (a.city && c.city && a.city === c.city && a.country === c.country) return "city";
    return null;
  }
  const LEVEL_ORDER = ["living_cluster", "area", "station", "city"];
  function recommend(anchorPlace, categories, excludeIds = []) {
    const exclude = new Set([anchorPlace.id, ...excludeIds]);
    const pool = (window.SoftPlanetPlaces || []).filter((p) => categories.includes(p.category) && !exclude.has(p.id));
    for (const level of LEVEL_ORDER) {
      const matches = pool.filter((p) => matchLevel(anchorPlace, p) === level);
      if (matches.length) return { level, items: matches };
    }
    return { level: "none", items: [] };
  }
  function guidesFor(anchorPlace) {
    return (window.SoftPlanetGuides || []).filter((g) => (g.country === anchorPlace.country || g.country === "全部") && (!g.city || g.city === anchorPlace.city));
  }
  function souvenirLink(anchorPlace, tripId) {
    return `inspiration.html?${new URLSearchParams({ country: anchorPlace.country || "", city: anchorPlace.city || "", category: "伴手禮", trip: tripId || "" })}`;
  }
  // Approved copy only. living_cluster is the only tier allowed to claim "同一生活圈"; area/station
  // are a looser "這一區"; city must not claim proximity at all.
  function levelHeading(level) {
    if (level === "living_cluster") return "同一生活圈推薦";
    if (level === "area" || level === "station") return "這一區還可以去";
    if (level === "city") return "同城市推薦";
    return "";
  }

  window.SoftPlanetRecommendations = { clusterOf, matchLevel, recommend, guidesFor, souvenirLink, levelHeading };
}());
