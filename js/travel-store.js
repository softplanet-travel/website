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
      const trip={id:`guest-${Date.now()}`,title:values.title,country:values.country||null,city:values.city||null,start_date:values.start_date||null,end_date:values.end_date||null,status:"planning",base_currency:"TWD",created_at:new Date().toISOString(),places:[]};const trips=parse(TRIPS_KEY,[]);trips.unshift(trip);save(trips);return trip;
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
  async function googleSignIn(returnTo){
    if(!window.spClient)throw new Error("SERVICE_UNAVAILABLE");sessionStorage.setItem("softplanet-return-to",returnTo);
    const {error}=await window.spClient.auth.signInWithOAuth({provider:"google",options:{redirectTo:new URL(returnTo,location.href).href}});if(error)throw error;
  }
  window.SoftPlanetStore={session,listTrips,createTrip,deleteTrip,getTrip,listPlaceIds,addPlace,removePlace,googleSignIn,enableGuest(){localStorage.setItem(GUEST_KEY,"true")},disableGuest(){localStorage.removeItem(GUEST_KEY)},isGuest(){return localStorage.getItem(GUEST_KEY)==="true"}};
})();
