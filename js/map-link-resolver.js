(function(){
  function safe(value){
    if(!value)return null;
    try{const url=new URL(String(value).trim());return url.protocol==="https:"?url.href:null}catch(error){return null}
  }
  function resolve(item){
    const korean=item.country==="韓國";
    const naver=safe(item.naver_map_url),google=safe(item.google_map_url),legacy=safe(item.map_url);
    if(korean)return{provider:naver?"naver":google?"google":null,url:naver||google||null,naver,google};
    return{provider:google?"google":legacy?item.map_provider||"google":null,url:google||legacy||null,naver,google:google||legacy};
  }
  function apply(anchor,item){const result=resolve(item);if(!result.url){anchor.hidden=true;anchor.removeAttribute("href");return result}anchor.hidden=false;anchor.href=result.url;anchor.target="_blank";anchor.rel="noopener noreferrer";return result}
  window.SoftPlanetMaps={safe,resolve,apply};
})();
