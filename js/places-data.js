window.SoftPlanetCatalog = {
  countries: [
    { name: "日本", emoji: "🇯🇵", note: "城市散步、親子與四季風景" },
    { name: "韓國", emoji: "🇰🇷", note: "咖啡、美食與自在逛街" },
    { name: "香港", emoji: "🇭🇰", note: "城市節奏與港式味道" },
    { name: "澳門", emoji: "🇲🇴", note: "老城散步與葡式風景" },
    { name: "新加坡", emoji: "🇸🇬", note: "輕鬆移動的親子城市" },
    { name: "泰國", emoji: "🇹🇭", note: "市集、寺院與慢日子" },
    { name: "越南", emoji: "🇻🇳", note: "街角咖啡與在地日常" },
    { name: "馬來西亞", emoji: "🇲🇾", note: "多元文化與南洋味道" }
  ],
  cities: {
    "日本": ["東京", "沖繩", "北海道", "九州", "東京近郊"],
    "韓國": ["首爾", "釜山", "濟州"],
    "香港": ["香港島", "九龍"],
    "澳門": ["澳門半島"],
    "新加坡": ["新加坡"],
    "泰國": ["曼谷", "清邁"],
    "越南": ["峴港", "胡志明市"],
    "馬來西亞": ["吉隆坡", "檳城"]
  },
  categories: [
    { name: "城市介紹", icon: "🧭", note: "先認識這座城市" },
    { name: "景點", icon: "📍", note: "值得停下來的地方" },
    { name: "住宿", icon: "🏨", note: "從區域找到適合的落腳處" },
    { name: "美食", icon: "🍜", note: "沿著味道認識城市" },
    { name: "伴手禮", icon: "🎁", note: "可以勾選的購物清單" },
    { name: "熱門行程", icon: "🗓️", note: "輕鬆安排一日散步" }
  ]
};

window.SoftPlanetPlaces = [
  {id:"tokyo-skytree",city:"東京",country:"日本",category:"景點",emoji:"🗼",tone:"peach",name:"東京晴空塔",summary:"從城市最高處慢慢看東京，很適合安排在傍晚到夜晚。",duration:"約 2–3 小時",bestTime:"傍晚",address:"東京都墨田區押上 1-1-2",tip:"熱門時段容易客滿，建議先預約；帶小朋友可預留更多休息時間。",map_provider:"google",map_url:"https://www.google.com/maps/search/?api=1&query=Tokyo+Skytree",google_map_url:"https://www.google.com/maps/search/?api=1&query=Tokyo+Skytree"},
  {id:"asakusa-stroll",city:"東京",country:"日本",category:"景點",emoji:"⛩️",tone:"sand",name:"淺草慢慢逛",summary:"從雷門走進老街，在小吃、寺院與巷弄裡感受東京舊時光。",duration:"約 2 小時",bestTime:"上午",address:"東京都台東區淺草",tip:"早上人潮較少，推車也比較好移動。",map_provider:"google",map_url:"https://www.google.com/maps/search/?api=1&query=Asakusa+Tokyo"},
  {id:"okinawa-aquarium",city:"沖繩",country:"日本",category:"景點",emoji:"🐋",tone:"aqua",name:"沖繩美麗海水族館",summary:"和鯨鯊一起度過療癒午後，是親子旅行很安心的一站。",duration:"約 3–4 小時",bestTime:"下午",address:"沖繩縣國頭郡本部町石川 424",tip:"園區很大，建議穿好走的鞋。",map_provider:"google",map_url:"https://www.google.com/maps/search/?api=1&query=Okinawa+Churaumi+Aquarium"},
  {id:"seoul-forest",city:"首爾",country:"韓國",category:"景點",emoji:"🌳",tone:"sage",name:"首爾林散步",summary:"在城市裡留一段綠色空白，適合野餐、散步與親子放電。",duration:"約 2–3 小時",bestTime:"午後",address:"首爾特別市城東區纛島路 273",tip:"可和聖水洞排在同一天。",map_provider:"naver",map_url:"https://map.naver.com/p/search/서울숲",naver_map_url:"https://map.naver.com/p/search/서울숲",google_map_url:"https://www.google.com/maps/search/?api=1&query=Seoul+Forest"},
  {id:"hongkong-tram",city:"香港島",country:"香港",category:"景點",emoji:"🚋",tone:"lavender",name:"叮叮車城市散策",summary:"坐上慢慢前進的電車，用最柔軟的速度看港島街景。",duration:"約 1–2 小時",bestTime:"傍晚",address:"香港島主要電車路線",tip:"準備八達通，上層前排視野最好。",map_provider:"google",map_url:"https://www.google.com/maps/search/?api=1&query=Hong+Kong+Tramways"},
  {id:"tokyo-ramen",city:"東京",country:"日本",category:"美食",emoji:"🍜",tone:"sand",name:"丸福拉麵（Demo）",summary:"一碗溫暖的醬油拉麵，適合排在淺草散步之後。",duration:"約 1 小時",bestTime:"午餐",address:"東京淺草示範地址",tip:"此為流程展示資料，實際前往前請再次確認店家資訊。",demo:true,map_provider:"google",map_url:"https://www.google.com/maps/search/?api=1&query=ramen+Asakusa"},
  {id:"tokyo-cafe",city:"東京",country:"日本",category:"美食",emoji:"☕",tone:"peach",name:"木日咖啡（Demo）",summary:"留一段午後空白，喝杯咖啡再繼續散步。",duration:"約 1 小時",bestTime:"午後",address:"東京清澄白河示範地址",tip:"此為流程展示資料。",demo:true,map_provider:"google",map_url:"https://www.google.com/maps/search/?api=1&query=cafe+Kiyosumi+Shirakawa"},
  {id:"ueno-family-hotel",city:"東京",country:"日本",category:"住宿",subarea:"上野",emoji:"🏨",tone:"sage",name:"上野柔旅飯店（Demo）",summary:"靠近車站、房型簡單，適合帶著行李移動的家庭。",duration:"住宿",bestTime:"親子旅行",address:"東京上野示範地址",tip:"此為版型展示資料，不代表真實房價或空房。",demo:true,suitable:"親子、第一次到東京、重視交通的人",transport:"從上野站步行約 6 分鐘（Demo）",surroundings:"便利商店、餐廳與藥妝店",facilities:"洗衣設備、行李寄放、家庭房（Demo）",map_provider:"google",map_url:"https://www.google.com/maps/search/?api=1&query=hotel+Ueno+Tokyo"},
  {id:"asakusa-slow-hotel",city:"東京",country:"日本",category:"住宿",subarea:"淺草",emoji:"🛏️",tone:"lavender",name:"淺草慢宿（Demo）",summary:"住進老街附近，早晨可以輕鬆避開人潮。",duration:"住宿",bestTime:"散步旅行",address:"東京淺草示範地址",tip:"此為版型展示資料，不代表真實房價或空房。",demo:true,suitable:"喜歡老城散步、雙人旅行",transport:"從淺草站步行約 8 分鐘（Demo）",surroundings:"雷門、便利商店、街區餐廳",facilities:"行李寄放、公共休息區（Demo）",map_provider:"google",map_url:"https://www.google.com/maps/search/?api=1&query=hotel+Asakusa+Tokyo"}
];

try {
  const customPlaces = JSON.parse(localStorage.getItem("softplanet-custom-places") || "[]");
  if (Array.isArray(customPlaces)) window.SoftPlanetPlaces.push(...customPlaces);
} catch (error) {
  /* Keep the built-in catalog available when local data is invalid. */
}

window.SoftPlanetPlaces.forEach((place) => {
  place.latitude ??= null;
  place.longitude ??= null;
  if (place.country !== "韓國" && !place.google_map_url && place.map_url) place.google_map_url = place.map_url;
});

window.getSoftPlanetPlace = function(id){
  return window.SoftPlanetPlaces.find((place)=>place.id===id)||{id,city:"未分類",country:"旅行靈感",category:"景點",emoji:"📍",tone:"sand",name:id||"未命名景點",summary:"這個地方的介紹還在整理中。",duration:"待確認",bestTime:"都可以",address:"位置待確認",tip:"先把它留在旅行裡，MUMU 會慢慢補上資訊。"};
};
