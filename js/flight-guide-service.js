(function () {
  // Single source of truth: the project's "33_Flight Knowledge Master" Google Sheet tab, synced
  // via scripts/sync-catalog.ps1 (same mechanism as data/catalog/*.csv) into this file. Nothing
  // here is hand-maintained - editing the Sheet, re-syncing, and redeploying is the entire update
  // path for every guide_id/level/parent_id row this module serves to js/flight-guide.js.
  const CSV_PATH = "data/flights/33-flight-knowledge-master.csv";
  const NUMERIC_FIELDS = ["display_order", "estimated_reading_time"];

  // Real CSV parser (handles quoted fields with embedded commas/newlines/escaped quotes) - matches
  // js/catalog-service.js's parser, since this is the same "Google Sheets publish-to-web CSV" shape.
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
        row[name] = NUMERIC_FIELDS.includes(name) ? (raw === "" ? 0 : Number(raw)) : raw;
      });
      if (!row.guide_id) continue;
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
          if (!response.ok) throw new Error(`Flight guide data failed to load (${response.status})`);
          return response.text();
        })
        .then((text) => { rows = parseCsv(text); });
    }
    return readyPromise;
  }

  const byOrder = (a, b) => a.display_order - b.display_order;

  function root() {
    return rows.filter((r) => !r.parent_id).sort(byOrder);
  }

  function children(parentId) {
    return rows.filter((r) => r.parent_id === parentId).sort(byOrder);
  }

  function find(idOrSlug) {
    if (!idOrSlug) return null;
    return rows.find((r) => r.guide_id === idOrSlug || r.content_slug === idOrSlug) || null;
  }

  // Generic, per-node rule (never per-platform): a real affiliate link, once live, always wins
  // over the plain public URL; swapping affiliate deals later only ever means editing the CSV.
  function resolveUrl(node) {
    return node?.affiliate_url || node?.target_url || null;
  }

  window.SoftPlanetFlightGuide = { ready, root, children, find, resolveUrl };
}());
