(function(){
  const rules=[
    {id:"disney",priority:80,match:c=>c.tags.includes("Disney"),message:"出發前確認官方 App、行動電源與入園憑證。",guide:{title:"樂園行前準備",summary:"把官方 App、票券與行動電源先收好。"}},
    {id:"shopping",priority:60,match:c=>c.tags.includes("Shopping"),message:"購物行程可以先留意退稅門檻與護照。",guide:{title:"購物與退稅提醒",summary:"退稅規則以店家與官方公告為準。"}},
    {id:"winter",priority:70,match:c=>[12,1,2].includes(c.month),message:"冬季旅行記得確認保暖、防滑與當地天氣。",guide:{title:"冬季旅行準備",summary:"出發前再依正式天氣資訊調整衣物。"}}
  ];
  function evaluate(context){return rules.filter(rule=>rule.match(context)).sort((a,b)=>b.priority-a.priority).map(rule=>({...rule,source:"rule"}));}
  window.SoftPlanetReminderEngine={rules,evaluate};
}());

document.addEventListener("DOMContentLoaded",async()=>{
  const tripId=new URLSearchParams(location.search).get("id"),collection=document.getElementById("tripCollection");if(!tripId||!collection)return;
  const trip=await window.SoftPlanetStore.getTrip(tripId);if(!trip)return;
  const flights=window.SoftPlanetTransport?.list(tripId)||[];
  const month=Number((trip.start_date||new Date().toISOString()).slice(5,7));
  const reminders=window.SoftPlanetReminderEngine.evaluate({destination:trip.city,country:trip.country,month,tags:[]});
  if(flights.length){reminders.unshift({id:"arrival",priority:100,message:"🐻 這個時間可能還在入境或前往市區途中，要不要再確認一下？",guide:{title:"抵達機場後怎麼走",summary:"依機場官方指引完成入境、行李與市區交通。"}});reminders.unshift({id:"departure",priority:110,message:"🐻 這個時間可能需要準備前往機場，記得確認交通與報到時間。",guide:{title:"出發前的機場準備",summary:"依航空公司通知確認報到與登機時間。"}})}
  if(!reminders.length)return;
  const section=document.createElement("section");section.className="reminder-section";section.innerHTML=`<div class="section-head"><div><p class="eyebrow">MUMU Reminder</p><h2>這趟可以先留意</h2></div></div><div class="guide-reminder-list">${reminders.map(r=>`<article class="guide-card"><span>🐻</span><div><h3>${r.guide.title}</h3><p>${r.message}</p><small>${r.guide.summary}</small></div></article>`).join("")}</div><p class="service-note">提醒由固定規則產生，請以航空公司、機場與官方資訊為準。</p>`;collection.parentNode.insertBefore(section,collection);
});
