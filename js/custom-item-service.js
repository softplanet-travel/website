(function(){
  const KEY="softplanet-custom-places";
  const parse=()=>{try{const data=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(data)?data:[]}catch(error){return[]}};
  const save=items=>localStorage.setItem(KEY,JSON.stringify(items));
  const normalize=value=>String(value||"").toLowerCase().replace(/[\s・·()（）\-_]/g,"");
  const safeUrl=value=>window.SoftPlanetMaps.safe(value);
  function referencesFrom(values){
    let references=values.references;
    if(typeof references==="string"){try{references=JSON.parse(references)}catch(error){references=[]}}
    if(!Array.isArray(references))references=[];
    references=references.map(item=>({name:String(item?.name||"").trim().slice(0,30),url:safeUrl(item?.url)})).filter(item=>item.name&&item.url).slice(0,3);
    if(!references.length){
      const legacy=[values.naver_map_url&&{name:"Naver Map",url:safeUrl(values.naver_map_url)},values.google_map_url&&{name:"Google Maps",url:safeUrl(values.google_map_url)}].filter(item=>item?.url);
      references=legacy.slice(0,3);
    }
    return references;
  }
  function findOfficial(values){return(window.SoftPlanetPlaces||[]).find(item=>!item.custom&&item.country===values.country&&item.city===values.city&&normalize(item.name)===normalize(values.custom_name))||null}
  function create(values){
    const official=findOfficial(values),references=referencesFrom(values),mapReference=references.find(item=>/map|地圖|maps\.app|google\.com\/maps|naver\.com|kakao/i.test(`${item.name} ${item.url}`)),mapUrl=mapReference?.url||null,korean=values.country==="韓國",naver=mapUrl&&/naver\.com/i.test(mapUrl)?mapUrl:null,google=mapUrl&&!naver?mapUrl:null;
    const item={id:`custom-${Date.now()}`,custom_item_id:null,trip_id:values.trip_id,country_id:values.country,country:values.country,destination_id:values.city,city:values.city,area_id:values.area_id,subarea:values.area_name,item_type:values.item_type,category:values.item_type==="餐廳"?"美食":values.item_type,custom_name:values.custom_name,name:values.custom_name,short_note:values.short_note||"",summary:values.short_note||"使用者新增的專屬小卡。",reference_links:references,google_map_url:google,naver_map_url:naver,map_provider:naver&&korean?"naver":google?"google":null,map_url:mapUrl,official_match_id:official?.id||null,upgrade_status:official?"available":"none",created_at:new Date().toISOString(),updated_at:new Date().toISOString(),emoji:values.item_type==="住宿"?"🏨":values.item_type==="餐廳"?"🍜":values.item_type==="交通"?"🚃":values.item_type==="購物"?"🛍️":values.item_type==="生活機能"?"🏪":"📌",tone:"peach",duration:"自行安排",bestTime:"依你的行程",address:values.area_name,tip:"這是你的專屬小卡，出發前記得再次確認資訊。",custom:true,upgraded:false};item.custom_item_id=item.id;const items=parse();items.push(item);save(items);if(window.SoftPlanetPlaces)window.SoftPlanetPlaces.push(item);return item
  }
  function updateStatus(id,status){const items=parse(),item=items.find(value=>value.id===id);if(!item)return null;item.upgrade_status=status;item.updated_at=new Date().toISOString();save(items);return item}
  function upgrade(id){const items=parse(),item=items.find(value=>value.id===id);if(!item?.official_match_id)return null;const official=(window.SoftPlanetPlaces||[]).find(value=>!value.custom&&value.id===item.official_match_id);if(!official)return null;const preserved={id:item.id,custom_item_id:item.custom_item_id,trip_id:item.trip_id,short_note:item.short_note,reference_links:item.reference_links,area_id:item.area_id,created_at:item.created_at,sort_order:item.sort_order,date:item.date,time:item.time,upgrade_status:"accepted",updated_at:new Date().toISOString(),custom:true,upgraded:true,official_match_id:official.id};Object.assign(item,official,preserved);save(items);return item}
  function get(id){return parse().find(item=>item.id===id)||null}
  window.SoftPlanetCustomItems={create,get,findOfficial,upgrade,dismiss(id){return updateStatus(id,"dismissed")},all:parse};
})();
