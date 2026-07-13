(function(){
  function mount(container,options={}){
    const wrapper=document.createElement("div");
    wrapper.className="sp-search";
    wrapper.innerHTML=`<label class="search-field"><span aria-hidden="true">⌕</span><span class="sr-only">搜尋</span><input type="search" autocomplete="off"><button class="search-clear" type="button" aria-label="清除搜尋" hidden>×</button></label><p class="search-feedback" role="status" aria-live="polite"></p>`;
    const input=wrapper.querySelector("input"),clear=wrapper.querySelector("button"),feedback=wrapper.querySelector(".search-feedback");
    input.placeholder=options.placeholder||"搜尋";
    if(options.label)input.setAttribute("aria-label",options.label);
    let timer;
    const emit=()=>{const value=input.value.trim();clear.hidden=!value;feedback.textContent=value?"MUMU 幫你找找看……":"";clearTimeout(timer);timer=setTimeout(()=>{options.onSearch?.(value);feedback.textContent="";},options.delay??80)};
    input.addEventListener("input",emit);
    input.addEventListener("keydown",event=>{if(event.key==="Escape"&&input.value){input.value="";emit();input.focus();}});
    clear.addEventListener("click",()=>{input.value="";emit();input.focus()});
    container.replaceChildren(wrapper);
    return{element:wrapper,input,setValue(value){input.value=value;emit()},setFeedback(message){feedback.textContent=message},clear(){input.value="";emit()}};
  }
  window.SoftPlanetSearch={mount};
})();
