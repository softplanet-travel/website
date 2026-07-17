(function () {
  const KEY = "softplanet-trip-flights";
  // HUBS is populated from data/catalog/airports.csv (synced from the project's Google Sheet - see
  // js/catalog-service.js) once ready() resolves. No hardcoded hub list lives here anymore; every
  // consumer of window.SoftPlanetTransport.HUBS must await window.SoftPlanetCatalogService.ready()
  // before its first read. Only "open"-status rows ever appear, so a Taiwan hub (or any other
  // destination not meant to be live) simply can't leak in unless someone marks it open in the Sheet.
  let HUBS = [];
  window.SoftPlanetCatalogService.ready().then(() => { HUBS = window.SoftPlanetCatalogService.hubs(); });
  const parse = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (_) { return []; } };
  const write = (items) => localStorage.setItem(KEY, JSON.stringify(items));
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const list = (tripId) => parse().filter((item) => item.trip_id === tripId).sort((a,b) => a.departure_at.localeCompare(b.departure_at));
  const save = (values) => { const all=parse(); const item={flight_id:`flight-${Date.now()}`,trip_id:values.trip_id,flight_type:values.flight_type,airline:values.airline.trim(),flight_number:values.flight_number.trim(),departure_hub_id:values.departure_hub_id,arrival_hub_id:values.arrival_hub_id,departure_at:values.departure_at,arrival_at:values.arrival_at,seat:values.seat.trim(),booking_reference:values.booking_reference.trim(),created_at:new Date().toISOString()}; all.push(item);write(all);return item; };
  const remove = (id) => write(parse().filter((item)=>item.flight_id!==id));
  // Legacy full-flight data API. No longer self-mounts a UI on trip.html — trip-boundaries.js
  // owns the My Trip arrival/departure UI and reads this list read-only for best-effort prefill.
  // HUBS is a getter (not a plain property) so it always reflects the current value of the module-
  // level `HUBS` variable once the catalog fetch above resolves, instead of freezing at [].
  window.SoftPlanetTransport={get HUBS(){return HUBS;},list,save,remove};
}());
