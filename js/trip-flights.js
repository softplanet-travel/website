(function () {
  const KEY = "softplanet-trip-flights";
  const HUBS = [
    { id: "TPE", type: "airport", code: "TPE", name: "桃園國際機場", destination: "台北", timezone: "Asia/Taipei", arrival_buffer: 90, departure_buffer: 180, map_url: "https://maps.google.com/?q=Taiwan+Taoyuan+International+Airport" },
    { id: "HND", type: "airport", code: "HND", name: "羽田機場", destination: "東京", timezone: "Asia/Tokyo", arrival_buffer: 90, departure_buffer: 150, map_url: "https://maps.google.com/?q=Haneda+Airport" },
    { id: "NRT", type: "airport", code: "NRT", name: "成田國際機場", destination: "東京", timezone: "Asia/Tokyo", arrival_buffer: 120, departure_buffer: 180, map_url: "https://maps.google.com/?q=Narita+International+Airport" },
    { id: "ICN", type: "airport", code: "ICN", name: "仁川國際機場", destination: "首爾", timezone: "Asia/Seoul", arrival_buffer: 120, departure_buffer: 180, map_url: "https://maps.google.com/?q=Incheon+International+Airport" }
  ];
  const parse = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (_) { return []; } };
  const write = (items) => localStorage.setItem(KEY, JSON.stringify(items));
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const list = (tripId) => parse().filter((item) => item.trip_id === tripId).sort((a,b) => a.departure_at.localeCompare(b.departure_at));
  const save = (values) => { const all=parse(); const item={flight_id:`flight-${Date.now()}`,trip_id:values.trip_id,flight_type:values.flight_type,airline:values.airline.trim(),flight_number:values.flight_number.trim(),departure_hub_id:values.departure_hub_id,arrival_hub_id:values.arrival_hub_id,departure_at:values.departure_at,arrival_at:values.arrival_at,seat:values.seat.trim(),booking_reference:values.booking_reference.trim(),created_at:new Date().toISOString()}; all.push(item);write(all);return item; };
  const remove = (id) => write(parse().filter((item)=>item.flight_id!==id));
  window.SoftPlanetTransport={HUBS,list,save,remove};
}());

document.addEventListener("DOMContentLoaded", async () => {
  const tripId=new URLSearchParams(location.search).get("id");
  const collection=document.getElementById("tripCollection");
  if(!tripId||!collection||!window.SoftPlanetTransport) return;
  const trip=await window.SoftPlanetStore.getTrip(tripId); if(!trip)return;
  const {HUBS,list,save,remove}=window.SoftPlanetTransport;
  const section=document.createElement("section"); section.className="flight-block-section";
  section.innerHTML=`<div class="section-head"><div><p class="eyebrow">交通起點與抵達</p><h2>航班與機場動線</h2></div><button class="add-block-btn" id="addFlight" type="button">＋ 新增航班</button></div><div id="flightList"></div>`;
  collection.parentNode.insertBefore(section,collection);
  const dialog=document.createElement("dialog");dialog.className="schedule-sheet";dialog.innerHTML=`<form method="dialog" id="flightForm"><button class="sheet-close" value="cancel" aria-label="關閉">×</button><p class="eyebrow">Flight Block</p><h2>加入航班</h2><div class="form-row"><label>航班類型<select name="flight_type"><option value="outbound">去程</option><option value="return">回程</option></select></label><label>航空公司<input name="airline" maxlength="40" required></label></div><label>航班編號<input name="flight_number" maxlength="12" required placeholder="例如：BR 192"></label><div class="form-row"><label>出發機場<select name="departure_hub_id">${HUBS.map(h=>`<option value="${h.id}">${h.code}・${h.name}</option>`).join("")}</select></label><label>抵達機場<select name="arrival_hub_id">${HUBS.map(h=>`<option value="${h.id}">${h.code}・${h.name}</option>`).join("")}</select></label></div><label>出發時間<input name="departure_at" type="datetime-local" step="60" required></label><label>抵達時間<input name="arrival_at" type="datetime-local" step="60" required></label><div class="form-row"><label>座位（選填）<input name="seat" maxlength="10"></label><label>訂位代號（選填）<input name="booking_reference" maxlength="20"></label></div><p class="mumu-reminder" id="flightStatus" role="status"></p><button class="primary-btn" value="save">儲存航班</button></form>`;document.body.appendChild(dialog);
  const hub=(id)=>HUBS.find(h=>h.id===id); const fmt=(value)=>value.replace("T"," ");
  function render(){const items=list(tripId),root=document.getElementById("flightList");root.innerHTML=items.length?items.map(f=>{const arrival=hub(f.arrival_hub_id),departure=hub(f.departure_hub_id);return `<article class="flight-card"><div class="flight-route"><span>${departure.code}</span><b>✈</b><span>${arrival.code}</span></div><p class="eyebrow">${f.flight_type==="return"?"回程":"去程"}・${f.airline} ${f.flight_number}</p><h3>${departure.name} → ${arrival.name}</h3><p>${fmt(f.departure_at)} 出發<br>${fmt(f.arrival_at)} 抵達</p><div class="arrival-flow"><span>航班抵達</span><span>入境與行李</span><span>機場交通</span><span>住宿報到</span></div><div class="mumu-reminder">🐻 抵達後先保留約 ${arrival.arrival_buffer} 分鐘處理入境與行李，再安排市區行程。</div><div class="card-action-bar"><a class="secondary-btn" href="${arrival.map_url}" target="_blank" rel="noopener noreferrer">開啟機場地圖</a><button class="text-button" type="button" data-remove-flight="${f.flight_id}">移除</button></div></article>`}).join(""):`<div class="soft-empty compact-empty"><span>🐻</span><h3>還沒有航班資料</h3><p>有訂票資訊時再加入，不會用推測班次代替。</p></div>`;root.querySelectorAll('[data-remove-flight]').forEach(b=>b.onclick=()=>{remove(b.dataset.removeFlight);render()});}
  document.getElementById("addFlight").onclick=()=>dialog.showModal();
  dialog.querySelector("form").onsubmit=(event)=>{if(event.submitter?.value!=="save")return;event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget));if(new Date(values.arrival_at)<=new Date(values.departure_at)){document.getElementById("flightStatus").textContent="抵達時間需晚於出發時間。";return;}save({...values,trip_id:tripId});dialog.close();render();};render();
});
