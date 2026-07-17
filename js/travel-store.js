(function(){
  const TRIPS_KEY="softplanet-guest-trips";
  const GUEST_KEY="softplanet-guest-mode";
  const parse=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||"")||fallback}catch(error){return fallback}};
  const save=(trips)=>localStorage.setItem(TRIPS_KEY,JSON.stringify(trips));
  async function session(){
    if(window.spClient){
      try{const {data,error}=await window.spClient.auth.getUser();if(!error&&data.user)return{mode:"account",user:data.user};}catch(error){}
    }
    return localStorage.getItem(GUEST_KEY)==="true"?{mode:"guest",user:null}:{mode:"signedout",user:null};
  }
  async function listTrips(){
    const current=await session();
    if(current.mode==="guest")return parse(TRIPS_KEY,[]);
    if(current.mode==="signedout")return[];
    const {data,error}=await window.spClient.from("trips").select("*").eq("user_id",current.user.id).order("created_at",{ascending:false});
    if(error)throw error;return data||[];
  }
  async function createTrip(values){
    const current=await session();
    if(current.mode==="guest"){
      // destination_id is safe to persist in localStorage (no schema constraint here). The real
      // trips table's column shape is unknown from this repo, so account-mode inserts below
      // deliberately omit it and rely on country/city (already real columns) instead.
      const trip={id:`guest-${Date.now()}`,title:values.title,country:values.country||null,city:values.city||null,destination_id:values.destination_id||null,start_date:values.start_date||null,end_date:values.end_date||null,status:"planning",base_currency:"TWD",created_at:new Date().toISOString(),places:[]};const trips=parse(TRIPS_KEY,[]);trips.unshift(trip);save(trips);return trip;
    }
    if(current.mode!=="account")throw new Error("SIGNED_OUT");
    const {data,error}=await window.spClient.from("trips").insert({user_id:current.user.id,title:values.title,country:values.country||null,city:values.city||null,start_date:values.start_date||null,end_date:values.end_date||null,status:"planning",base_currency:"TWD"}).select().single();if(error)throw error;return data;
  }
  async function deleteTrip(id){
    const current=await session();
    if(current.mode==="guest"){save(parse(TRIPS_KEY,[]).filter(item=>item.id!==id));return;}
    const {error}=await window.spClient.from("trips").delete().eq("id",id).eq("user_id",current.user.id);if(error)throw error;
  }
  async function getTrip(id){
    const current=await session();
    if(current.mode==="guest")return parse(TRIPS_KEY,[]).find(item=>item.id===id)||null;
    if(current.mode!=="account")return null;
    const {data,error}=await window.spClient.from("trips").select("*").eq("id",id).eq("user_id",current.user.id).single();if(error)throw error;return data;
  }
  async function listPlaceIds(id){
    const current=await session();
    if(current.mode==="guest")return(parse(TRIPS_KEY,[]).find(item=>item.id===id)?.places)||[];
    const {data,error}=await window.spClient.from("trip_places").select("place_id").eq("trip_id",id).eq("user_id",current.user.id).order("created_at",{ascending:false});if(error)throw error;return(data||[]).map(item=>item.place_id);
  }
  async function addPlace(tripId,placeId){
    const current=await session();
    if(current.mode==="guest"){const trips=parse(TRIPS_KEY,[]),trip=trips.find(item=>item.id===tripId);if(!trip)throw new Error("NOT_FOUND");trip.places=trip.places||[];if(!trip.places.includes(placeId))trip.places.unshift(placeId);save(trips);return;}
    const {data}=await window.spClient.from("trip_places").select("id").eq("trip_id",tripId).eq("place_id",placeId).eq("user_id",current.user.id).maybeSingle();if(data)return;
    const {error}=await window.spClient.from("trip_places").insert({trip_id:tripId,user_id:current.user.id,place_id:placeId});if(error)throw error;
  }
  async function removePlace(tripId,placeId){
    const current=await session();
    if(current.mode==="guest"){const trips=parse(TRIPS_KEY,[]),trip=trips.find(item=>item.id===tripId);if(trip){trip.places=(trip.places||[]).filter(id=>id!==placeId);save(trips);}return;}
    const {error}=await window.spClient.from("trip_places").delete().eq("trip_id",tripId).eq("place_id",placeId).eq("user_id",current.user.id);if(error)throw error;
  }
  async function updateTripDates(id,values){
    const current=await session();
    if(current.mode==="guest"){const trips=parse(TRIPS_KEY,[]),trip=trips.find(item=>item.id===id);if(!trip)throw new Error("NOT_FOUND");trip.start_date=values.start_date||null;trip.end_date=values.end_date||null;save(trips);return trip;}
    if(current.mode!=="account")throw new Error("SIGNED_OUT");
    const {data,error}=await window.spClient.from("trips").update({start_date:values.start_date||null,end_date:values.end_date||null}).eq("id",id).eq("user_id",current.user.id).select().single();if(error)throw error;return data;
  }
  async function googleSignIn(returnTo){
    if(!window.spClient)throw new Error("SERVICE_UNAVAILABLE");sessionStorage.setItem("softplanet-return-to",returnTo);
    const {error}=await window.spClient.auth.signInWithOAuth({provider:"google",options:{redirectTo:new URL(returnTo,location.href).href}});if(error)throw error;
  }
  // Supabase reports a failed or cancelled OAuth attempt by redirecting back with
  // #error=...&error_description=... in the URL rather than rejecting a promise. Nothing
  // previously read this, so a failed/cancelled login silently landed back on a signed-out
  // page with no message at all. Called once on load by any page that offers Google sign-in.
  function consumeAuthError(){
    const hash=new URLSearchParams(location.hash.startsWith("#")?location.hash.slice(1):location.hash);
    let message=hash.get("error_description")||hash.get("error");
    let cancelled=hash.get("error")==="access_denied";
    if(!message){
      const query=new URLSearchParams(location.search);
      message=query.get("error_description")||query.get("error");
      cancelled=cancelled||query.get("error")==="access_denied";
    }
    if(!message)return null;
    const url=new URL(location.href);
    url.hash="";url.searchParams.delete("error");url.searchParams.delete("error_code");url.searchParams.delete("error_description");
    history.replaceState(null,"",url.pathname+url.search);
    return{cancelled,message:decodeURIComponent(message.replace(/\+/g," "))};
  }
  window.SoftPlanetStore={session,listTrips,createTrip,deleteTrip,getTrip,updateTripDates,listPlaceIds,addPlace,removePlace,googleSignIn,consumeAuthError,enableGuest(){localStorage.setItem(GUEST_KEY,"true")},disableGuest(){localStorage.removeItem(GUEST_KEY)},isGuest(){return localStorage.getItem(GUEST_KEY)==="true"}};
})();
