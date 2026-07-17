// Single source of truth for countries/cities/airports/accommodation areas. All four come from
// data/catalog/*.csv, which is synced from the project's Google Sheet (scripts/sync-catalog.ps1) -
// nothing here is hand-maintained. Editing the Sheet, re-syncing, and redeploying is the entire
// update path; no consumer of window.SoftPlanetCatalog / window.SoftPlanetTransport.HUBS /
// window.SoftPlanetAccommodation needs to change, they just now read data populated after a fetch
// resolves instead of an inline array, and must await ready() before their first synchronous read.
(function () {
  const FILES = {
    countries: "data/catalog/countries.csv",
    cities: "data/catalog/cities.csv",
    airports: "data/catalog/airports.csv",
    accommodationAreas: "data/catalog/accommodation-areas.csv"
  };
  const NUMERIC_FIELDS = new Set(["arrival_buffer", "departure_buffer", "sort_order"]);

  // Real CSV parser (handles quoted fields with embedded commas/newlines/escaped quotes) - Google
  // Sheets' "publish to web as CSV" export requires this; a naive split(",") would corrupt any
  // field containing a comma.
  function parseCsv(text) {
    const rows = [];
    let field = "", row = [], inQuotes = false;
    const pushField = () => { row.push(field); field = ""; };
    const pushRow = () => { pushField(); rows.push(row); row = []; };
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
        else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") pushField();
      else if (c === "\n") { if (field.endsWith("\r")) field = field.slice(0, -1); pushRow(); }
      else field += c;
    }
    if (field || row.length) pushRow();
    return rows.filter((r) => r.some((cell) => cell !== ""));
  }

  function rowsToObjects(rows) {
    if (!rows.length) return [];
    const headers = rows[0].map((h) => h.trim());
    return rows.slice(1).map((cells) => {
      const obj = {};
      headers.forEach((name, i) => {
        const raw = (cells[i] ?? "").trim();
        obj[name] = NUMERIC_FIELDS.has(name) ? (raw === "" ? null : Number(raw)) : raw;
      });
      return obj;
    });
  }

  async function fetchTable(path) {
    const response = await fetch(encodeURI(path));
    if (!response.ok) throw new Error(`Catalog data failed to load: ${path} (${response.status})`);
    return rowsToObjects(parseCsv(await response.text()));
  }

  const isOpen = (row) => row.status === "open";

  let data = null;
  let readyPromise = null;

  function ready() {
    if (!readyPromise) {
      readyPromise = Promise.all([
        fetchTable(FILES.countries),
        fetchTable(FILES.cities),
        fetchTable(FILES.airports),
        fetchTable(FILES.accommodationAreas)
      ]).then(([countries, cities, airports, accommodationAreas]) => {
        data = { countries, cities, airports, accommodationAreas };
      });
    }
    return readyPromise;
  }

  function countries() {
    return (data?.countries || []).filter(isOpen).map((c) => ({ name: c.name, emoji: c.emoji, note: c.note }));
  }
  function citiesFor(countryName) {
    return (data?.cities || []).filter((c) => c.country === countryName && isOpen(c)).map((c) => c.name);
  }
  // "testing" rows are included here (unlike countries()/citiesFor() above) so screens that need to
  // show a not-yet-open destination as a visible-but-disabled "即將開放" option - instead of hiding it
  // outright - can do so without maintaining any separate JS allowlist. "draft"/"hidden" never appear.
  const isListable = (row) => row.status === "open" || row.status === "testing";
  function countriesWithStatus() {
    return (data?.countries || []).filter(isListable).map((c) => ({ name: c.name, emoji: c.emoji, note: c.note, status: c.status }));
  }
  function citiesForWithStatus(countryName) {
    return (data?.cities || []).filter((c) => c.country === countryName && isListable(c)).map((c) => ({ name: c.name, status: c.status }));
  }
  function hubs() {
    return (data?.airports || []).filter(isOpen).map((a) => ({
      id: a.id, type: a.type, code: a.code, name: a.name, destination: a.destination,
      timezone: a.timezone, arrival_buffer: a.arrival_buffer, departure_buffer: a.departure_buffer, map_url: a.map_url
    }));
  }
  function mapArea(a) {
    return {
      accommodation_area_id: a.accommodation_area_id, destination_id: a.destination_id, city: a.city,
      name: a.name, short_recommendation: a.short_recommendation, sort_order: a.sort_order, status: a.status
    };
  }
  function accommodationAreasFor(country, city) {
    const key = `${country}-${city}`;
    return (data?.accommodationAreas || [])
      .filter((a) => a.destination_id === key && isOpen(a))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(mapArea);
  }
  function findAreaById(areaId) {
    const found = (data?.accommodationAreas || []).find((a) => a.accommodation_area_id === areaId && isOpen(a));
    return found ? mapArea(found) : null;
  }

  window.SoftPlanetCatalogService = { ready, countries, citiesFor, countriesWithStatus, citiesForWithStatus, hubs, accommodationAreasFor, findAreaById };
}());
