(function () {
  // Single source of truth: the project's "32_airport_transport" Google Sheet tab, synced via
  // scripts/sync-catalog.ps1 (same mechanism as the other data/catalog/*.csv tables) into this
  // file. Nothing here is hand-maintained - editing the Sheet, re-syncing, and redeploying is the
  // entire update path for every transport_id/airport_id row this module serves to
  // js/trip-detail.js's arrival transport handoff (大眾運輸/當地包車).
  const CSV_PATH = "data/catalog/airport-transport.csv";
  const NUMERIC_FIELDS = ["estimated_minutes_min", "estimated_minutes_max", "estimated_cost_min", "estimated_cost_max", "display_order"];

  // Real CSV parser (handles quoted fields with embedded commas/newlines/escaped quotes) - matches
  // js/catalog-service.js and js/flight-guide-service.js, since this is the same "Google Sheets
  // publish-to-web CSV" shape.
  function parseCsvRows(text) {
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

  function parseCsv(text) {
    const rawRows = parseCsvRows(text);
    if (!rawRows.length) return [];
    const headers = rawRows[0].map((h) => h.trim()).filter(Boolean);
    const rows = [];
    for (let i = 1; i < rawRows.length; i += 1) {
      const cells = rawRows[i];
      const row = {};
      headers.forEach((name, index) => {
        const raw = (cells[index] ?? "").trim();
        row[name] = NUMERIC_FIELDS.includes(name) ? (raw === "" ? null : Number(raw)) : raw;
      });
      if (!row.transport_id) continue;
      rows.push(row);
    }
    return rows;
  }

  let rows = [];
  let readyPromise = null;

  function ready() {
    if (!readyPromise) {
      readyPromise = fetch(encodeURI(CSV_PATH))
        .then((response) => {
          if (!response.ok) throw new Error(`Airport transport data failed to load (${response.status})`);
          return response.text();
        })
        .then((text) => { rows = parseCsv(text); });
    }
    return readyPromise;
  }

  const isPublished = (r) => r.status === "published";

  // Maps a raw Sheet row onto exactly the fields js/trip-detail.js's arrival transit/charter cards
  // already read. estimated_minutes_min feeds the single `estimated_minutes` slot the UI expects
  // (a range takes the shorter value - same convention as trip-detail.js's own parseDurationMinutes).
  // official_url feeds `guide_url` (transit's "攻略或票券" link) - confirmed with the user, since the
  // Sheet has no separate guide_url field and official_url is the closest real field for that slot.
  // service_area_summary feeds charter's `service_area`. Fields the Sheet doesn't carry at all
  // (boarding_location, drop_off, suited_for, source_type) are left undefined so the existing UI's
  // own rendering (`r.field ? ... : ""` for optional fields, or its own default branch for
  // source_type) handles them without any fabricated value being introduced here.
  function mapRecord(r) {
    return {
      transport_id: r.transport_id,
      title: r.title,
      summary: r.summary,
      estimated_minutes: r.estimated_minutes_min || null,
      service_area: r.service_area_summary || "",
      guide_url: r.official_url || "",
      booking_url: r.booking_url || "",
      status: r.status
    };
  }

  function transitOptions(airportId) {
    return rows
      .filter((r) => r.airport_id === airportId && r.direction === "arrival" && r.transport_type === "transit" && isPublished(r))
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map(mapRecord);
  }

  function charterOptions(airportId) {
    return rows
      .filter((r) => r.airport_id === airportId && r.direction === "arrival" && r.transport_type === "charter" && isPublished(r))
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map(mapRecord);
  }

  window.SoftPlanetAirportTransport = { ready, transitOptions, charterOptions };
}());
