(function(){
  // Rules kept as-is for Sprint B; Sprint A does not render them anywhere yet.
  const rules=[
    {id:"disney",priority:80,match:c=>c.tags.includes("Disney"),message:"出發前確認官方 App、行動電源與入園憑證。",guide:{title:"樂園行前準備",summary:"把官方 App、票券與行動電源先收好。"}},
    {id:"shopping",priority:60,match:c=>c.tags.includes("Shopping"),message:"購物行程可以先留意退稅門檻與護照。",guide:{title:"購物與退稅提醒",summary:"退稅規則以店家與官方公告為準。"}},
    {id:"winter",priority:70,match:c=>[12,1,2].includes(c.month),message:"冬季旅行記得確認保暖、防滑與當地天氣。",guide:{title:"冬季旅行準備",summary:"出發前再依正式天氣資訊調整衣物。"}}
  ];
  function evaluate(context){return rules.filter(rule=>rule.match(context)).sort((a,b)=>b.priority-a.priority).map(rule=>({...rule,source:"rule"}));}
  function arrivalReminder(){return "🐻 這個時間可能還在入境或前往市區途中，要不要再確認一下？";}
  function departureReminder(){return "🐻 這個時間可能需要準備前往機場，記得確認交通與報到時間。";}
  window.SoftPlanetReminderEngine={rules,evaluate,arrivalReminder,departureReminder};
}());
