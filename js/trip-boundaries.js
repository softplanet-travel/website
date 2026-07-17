(function () {
  const KEY = "softplanet-trip-boundaries";
  const parse = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (_) { return {}; } };
  const write = (all) => localStorage.setItem(KEY, JSON.stringify(all));

  function get(tripId) {
    return parse()[tripId] || null;
  }

  function save(tripId, values) {
    const all = parse();
    all[tripId] = {
      trip_id: tripId,
      arrival_date: values.arrival_date || null,
      arrival_time: values.arrival_time || null,
      arrival_hub_id: values.arrival_hub_id || null,
      arrival_terminal: values.arrival_terminal || null,
      departure_date: values.departure_date || null,
      departure_time: values.departure_time || null,
      departure_hub_id: values.departure_hub_id || null,
      departure_terminal: values.departure_terminal || null,
      // Tentative航班資訊 (no ticket bought yet) vs 正式航班資訊 - lets every display surface
      // (accordion panel, notebook view) show the honest "預計..." wording instead of presenting
      // an estimate as a confirmed flight.
      tentative: Boolean(values.tentative),
      updated_at: new Date().toISOString()
    };
    write(all);
    return all[tripId];
  }

  // Read-only, best-effort prefill from the legacy full-flight records (softplanet-trip-flights).
  // Never writes back to the legacy key and never shows airline/flight-number fields.
  function legacyPrefill(tripId) {
    const flights = window.SoftPlanetTransport?.list(tripId) || [];
    if (!flights.length) return null;
    const outbound = flights.filter((item) => item.flight_type === "outbound").sort((a, b) => b.arrival_at.localeCompare(a.arrival_at))[0];
    const inbound = flights.filter((item) => item.flight_type === "return").sort((a, b) => a.departure_at.localeCompare(b.departure_at))[0];
    const split = (value) => { const [date, time] = String(value || "").split("T"); return { date: date || null, time: time ? time.slice(0, 5) : null }; };
    const arrival = outbound ? split(outbound.arrival_at) : { date: null, time: null };
    const departure = inbound ? split(inbound.departure_at) : { date: null, time: null };
    return {
      arrival_date: arrival.date, arrival_time: arrival.time, arrival_hub_id: outbound?.arrival_hub_id || null,
      departure_date: departure.date, departure_time: departure.time, departure_hub_id: inbound?.departure_hub_id || null
    };
  }

  // No per-mode transit data exists for any hub yet; be honest about it rather than inventing routes.
  function hubTransport(hubId) {
    const hub = (window.SoftPlanetTransport?.HUBS || []).find((item) => item.id === hubId);
    if (!hub) return null;
    return { hub, available: false, message: "目前尚未整理此機場交通資訊。", officialUrl: hub.map_url };
  }

  // City-airport mapping interface: HUBS already carries a real destination-city field per hub
  // (trip-flights.js), so this is the one place that turns "which airports serve this trip's
  // city" into a primary list, instead of leaving that filter scattered in render code.
  //
  // "other" (a same-region airport also reachable for this destination via domestic/regional
  // transit) always stays empty: no real Airport Destination Mapping (19_airports /
  // 20_airport_destination_mapping) has been imported anywhere in this project, and every hub in
  // HUBS already belongs to a single city with no cross-destination relation data at all. Listing
  // every other unrelated hub here (e.g. Seoul's ICN under a Tokyo trip) was exactly the bug
  // report: "沒有正式 Airport Destination Mapping 防呆". The entry point that reveals "other" must
  // stay hidden until real mapping data exists rather than show an arbitrary leftover list.
  function hubsForCity(city) {
    const all = window.SoftPlanetTransport?.HUBS || [];
    return { primary: all.filter((h) => h.destination === city), other: [] };
  }

  const timeMinutes = (value) => { const [h, m] = String(value || "").split(":").map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null; };
  const minutesToTime = (total) => { const wrapped = ((total % 1440) + 1440) % 1440; return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`; };

  // Formal Departure Boundary lock: the trip's last day may never have a general schedule item
  // (spot/food/errand) added or edited into the window that must be reserved for actually getting
  // to and through the airport. Every time here comes from real data only - the hub's own
  // arrival_buffer/departure_buffer (trip-flights.js HUBS) and, once the user has actually added a
  // transport-mode trip_item for this hub (item_type "transport", written by openTransportPicker),
  // that item's own duration. Nothing is guessed: if no transport mode has been added yet,
  // latestDeparture stays null and the lock conservatively starts at suggestedArrival instead (the
  // one time we do know for certain the traveler must already be at the airport) rather than not
  // locking anything at all.
  function departureLock(tripId) {
    const boundary = get(tripId);
    if (!boundary?.departure_date || !boundary?.departure_time || !boundary?.departure_hub_id) return null;
    const hub = (window.SoftPlanetTransport?.HUBS || []).find((h) => h.id === boundary.departure_hub_id);
    if (!hub) return null;
    const flightMinutes = timeMinutes(boundary.departure_time);
    const buffer = hub.departure_buffer ?? null;
    const suggestedArrival = buffer !== null && flightMinutes !== null ? minutesToTime(flightMinutes - buffer) : null;
    const dayItems = window.SoftPlanetTripItems?.itemsForDate(tripId, boundary.departure_date) || [];
    const transportItem = dayItems.find((item) => item.item_type === "transport" && String(item.item_id).startsWith(`transport-${hub.id}-`));
    const transportMinutes = transportItem ? (timeMinutes(transportItem.end_time) - timeMinutes(transportItem.start_time)) : null;
    const latestDeparture = (suggestedArrival !== null && transportMinutes !== null && transportMinutes > 0)
      ? minutesToTime(timeMinutes(suggestedArrival) - transportMinutes) : null;
    return {
      hub, flightTime: boundary.departure_time, suggestedArrival, latestDeparture,
      transportSelected: Boolean(transportItem),
      lockDate: boundary.departure_date,
      lockStart: latestDeparture || suggestedArrival || null
    };
  }

  window.SoftPlanetTripBoundaries = { get, save, legacyPrefill, hubTransport, hubsForCity, departureLock, HUBS: () => window.SoftPlanetTransport?.HUBS || [] };
}());
