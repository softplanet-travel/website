document.addEventListener("DOMContentLoaded",async()=>{
  await window.SoftPlanetCatalogService.ready();
  const $=(id)=>document.getElementById(id),form=$("tripForm"),list=$("tripList"),count=$("tripCount"),status=$("statusText"),sheet=$("tripLoginSheet"),planner=$("plannerCard");let pendingDelete=null,allTrips=[];
  const countrySelect=$("country"),citySelect=$("city");
  // Flight Guide's MUMU booking-confirm Modal sends users with no known trip here via
  // ?assistant=flight so they can pick or create a trip, then land straight in that trip's
  // Flight Assistant - the intent just needs to ride along on whichever trip link/creation they use.
  const assistantIntent=new URLSearchParams(location.search).get("assistant");
  if(assistantIntent==="flight"){document.querySelector(".page-intro")?.insertAdjacentHTML("beforeend",`<p class="field-note">請選擇或建立要輸入航班資訊的旅行。</p>`);}

  // Which countries/cities are open vs. still "即將開放" now comes entirely from each row's status
  // column in the Google Sheet (see js/catalog-service.js) - no hardcoded open-destination list
  // lives in JS anymore. Editing the Sheet is the only way to open a new destination.
  const countryOptions=window.SoftPlanetCatalogService.countriesWithStatus();
  const cityOptionsCache={};
  const citiesForCountry=(country)=>cityOptionsCache[country]||(cityOptionsCache[country]=window.SoftPlanetCatalogService.citiesForWithStatus(country));
  const isOpenStatus=(status)=>status==="open";

  countrySelect.insertAdjacentHTML("beforeend",countryOptions.map(item=>{
    const open=isOpenStatus(item.status);
    return `<option value="${item.name}"${open?"":" disabled"}>${item.emoji} ${item.name}${open?"":"　即將開放"}</option>`;
  }).join(""));
  countrySelect.addEventListener("change",()=>{
    const cities=citiesForCountry(countrySelect.value);
    citySelect.disabled=!cities.length;
    citySelect.innerHTML=cities.length?cities.map(c=>{
      const open=isOpenStatus(c.status);
      return `<option value="${c.name}"${open?"":" disabled"}>${c.name}${open?"":"　即將開放"}</option>`;
    }).join(""):`<option value="">請先選擇國家／地區</option>`;
  });

  // Preserves the not-yet-submitted trip form across the Google OAuth round trip (client-side
  // only, sessionStorage - no new backend). Saved right before leaving for login, restored once
  // here and then cleared, so it never leaks into a later, unrelated visit to this page.
  const DRAFT_KEY="softplanet-trip-draft";
  function saveTripDraft(){try{sessionStorage.setItem(DRAFT_KEY,JSON.stringify({title:form.title.value,country:countrySelect.value,city:citySelect.value}));}catch(error){}}
  function restoreTripDraft(){
    let draft=null;
    try{draft=JSON.parse(sessionStorage.getItem(DRAFT_KEY)||"null");}catch(error){}
    if(!draft)return;
    sessionStorage.removeItem(DRAFT_KEY);
    if(draft.title)form.title.value=draft.title;
    if(draft.country){countrySelect.value=draft.country;countrySelect.dispatchEvent(new Event("change"));}
    if(draft.city)citySelect.value=draft.city;
  }
  restoreTripDraft();

  // Shared by both the dialog's Google button and the guest-mode inline "登入同步" button below -
  // one real login call, not a second parallel login path.
  function startGoogleLogin(btn,statusEl){
    saveTripDraft();
    btn.disabled=true;
    if(statusEl)statusEl.textContent="正在前往 Google 登入…";
    const stuckTimer=setTimeout(()=>{btn.disabled=false;if(statusEl)statusEl.textContent="登入好像卡住了，可以再試一次。";},8000);
    window.SoftPlanetStore.googleSignIn("trips.html").catch((error)=>{
      // Surfaced right next to the button the user actually clicked (not a distant status area),
      // and logged so a silent failure (e.g. the Supabase client never loaded, or the OAuth
      // provider rejected the request) is always visible somewhere.
      console.error("SoftPlanet Google 登入啟動失敗：",error);
      clearTimeout(stuckTimer);
      if(statusEl)statusEl.textContent=error?.message==="SERVICE_UNAVAILABLE"?"登入服務目前連不上，請檢查網路後再試一次。":"目前無法開啟登入，請改用訪客模式或稍後再試。";
      btn.disabled=false;
    });
  }
  function empty(title,message,action=""){list.innerHTML=`<div class="soft-empty"><span aria-hidden="true">🐻</span><h3>${title}</h3><p>${message}</p>${action}</div>`;}
  function card(trip){const article=document.createElement("article");const tripHref=`trip.html?id=${encodeURIComponent(trip.id)}${assistantIntent==="flight"?"&assistant=flight":""}`;article.className="saved-trip-card";article.innerHTML=`<div class="trip-city-icon" aria-hidden="true">${trip.city?"🏙️":"🗺️"}</div><div class="saved-trip-content"><p class="eyebrow">${[trip.country,trip.city].filter(Boolean).join("・")||"目的地慢慢決定"}</p><h3><a href="${tripHref}">${trip.title}</a></h3><p class="trip-created-date">${new Intl.DateTimeFormat("zh-TW",{dateStyle:"medium"}).format(new Date(trip.created_at))} 建立</p></div><button class="trip-more-btn" type="button" aria-label="移除 ${trip.title}">×</button>`;article.querySelector("button").onclick=()=>{pendingDelete=trip.id;$("deleteDialog").showModal()};return article;}
  function renderTrips(term=""){const filtered=allTrips.filter(trip=>`${trip.title} ${trip.country||""} ${trip.city||""} ${trip.created_at||""} ${trip.status||""}`.toLowerCase().includes(term.toLowerCase()));if(!filtered.length){empty(term?`沒有找到符合「${term}」的旅行`:"還沒有旅行",term?"清除搜尋後再看看其他旅行。":"建立第一趟旅行，或先去旅行靈感挑一個喜歡的地方。",term?"":`<a class="primary-link" href="inspiration.html">去找旅行靈感 →</a>`);return}list.replaceChildren(...filtered.map(card))}
  async function load(){
    const session=await window.SoftPlanetStore.session();
    if(session.mode==="signedout"){planner.hidden=true;$("sessionNotice").innerHTML=`<div class="auth-notice"><span aria-hidden="true">🐻</span><div><strong>先選一種保存方式</strong><p>登入可跨裝置保存，也可以先用訪客模式體驗。</p></div><button class="primary-btn" id="chooseSession">開始使用</button></div>`;$("chooseSession").onclick=()=>sheet.showModal();count.textContent="";empty("旅行還沒開始","選擇保存方式後，就能建立第一趟旅行。");return;}
    planner.hidden=false;
    if(session.mode==="guest"){
      $("sessionNotice").innerHTML=`<div class="guest-notice"><div class="guest-notice-row"><span>先在這台裝置開始旅行，登入後就能安心同步保存。</span><button type="button" id="guestSyncLogin">登入同步</button></div><p class="guest-notice-status" id="guestSyncStatus"></p></div>`;
      $("guestSyncLogin").onclick=()=>startGoogleLogin($("guestSyncLogin"),$("guestSyncStatus"));
    }else if(session.mode==="account"){
      $("sessionNotice").innerHTML=`<div class="guest-notice">旅行資料已安心同步，換裝置也能繼續規劃。</div>`;
    }else{
      $("sessionNotice").innerHTML="";
    }
    try{allTrips=await window.SoftPlanetStore.listTrips();count.textContent=`${allTrips.length} 趟`;renderTrips();}catch(error){empty("旅行暫時連不上","請確認網路後重新載入。",`<button class="secondary-btn" id="retryTrips">重新載入</button>`);$("retryTrips").onclick=load;}
  }
  function showAdvisory(trip){
    if(!window.SoftPlanetServices)return;
    const destinationId=window.SoftPlanetServices.destinationIdFor(trip.country,trip.city);
    const month=trip.start_date?Number(trip.start_date.slice(5,7)):null;
    const advisory=window.SoftPlanetServices.seasonAdvisory(destinationId,month);
    window.SoftPlanetServices.saveTripContext(trip.id,{destination_id:destinationId,travel_month:month,season_type:advisory?.season_type||null,advisory_id:advisory?.id||null});
    if(!destinationId||!month)return;
    let dialog=$("advisoryDialog");
    if(!dialog){dialog=document.createElement("dialog");dialog.id="advisoryDialog";dialog.className="confirm-dialog";document.body.appendChild(dialog);}
    dialog.innerHTML=`<form method="dialog"><div class="dialog-bear mumu-asset" data-mumu aria-hidden="true"></div><h2>這個時間去，先知道這些</h2><p>${advisory?advisory.summary:"這個目的地與月份的季節提醒還在準備中，出發前請留意官方與氣象資訊。"}</p><div class="dialog-actions"><button class="primary-btn" value="ok">知道了，繼續</button></div></form>`;
    dialog.showModal();
  }
  form.onsubmit=async(event)=>{
    event.preventDefault();
    const values=Object.fromEntries(new FormData(form));
    values.title=values.title.trim();
    if(!values.title||!values.country||!values.city)return;
    const countryStatus=countryOptions.find(c=>c.name===values.country)?.status;
    const cityStatus=citiesForCountry(values.country).find(c=>c.name===values.city)?.status;
    if(!isOpenStatus(countryStatus)||!isOpenStatus(cityStatus))return;
    values.destination_id=window.SoftPlanetServices.destinationIdFor(values.country,values.city);
    $("addTripBtn").disabled=true;status.textContent="正在建立旅行…";
    try{
      const trip=await window.SoftPlanetStore.createTrip(values);
      showAdvisory(trip);
      status.textContent="旅行建立好了，先一起設定抵達與離開吧！";
      location.href=assistantIntent==="flight"?`trip.html?id=${encodeURIComponent(trip.id)}&assistant=flight`:`trip.html?id=${encodeURIComponent(trip.id)}&setup=boundary`;
    }catch(error){
      status.textContent="暫時無法建立旅行，請稍後再試。";
      $("addTripBtn").disabled=false;
    }
  };
  $("deleteDialog").addEventListener("close",async()=>{if($("deleteDialog").returnValue!=="confirm"||!pendingDelete){pendingDelete=null;return;}try{await window.SoftPlanetStore.deleteTrip(pendingDelete);status.textContent="已移除這趟旅行。";await load();}catch(error){status.textContent="暫時無法移除，請稍後再試。"}pendingDelete=null;});
  $("tripGuestLogin").onclick=(event)=>{event.preventDefault();window.SoftPlanetStore.enableGuest();sheet.close();load()};
  $("tripGoogleLogin").onclick=(event)=>{event.preventDefault();startGoogleLogin($("tripGoogleLogin"),$("tripLoginStatus"));};
  const authResult=window.SoftPlanetStore.consumeAuthError();
  if(authResult)status.textContent=authResult.cancelled?"登入已取消，要再試一次嗎？":"暫時無法完成登入，請再試一次。";
  window.SoftPlanetSearch.mount($("tripSearch"),{placeholder:"搜尋旅行名稱、國家、城市或日期",onSearch:renderTrips});load();
});
