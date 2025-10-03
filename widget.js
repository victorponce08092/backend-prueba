(function(){
  const s=document.currentScript,wid=s.getAttribute("data-widget-id");
  if(!wid){console.error("❌ No se encontró widget_id");return;}
  const BASE_URL="PUBLIC_BASE_URL",SVGS={
    MessageCircle:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-1.9 5.4 8.5 8.5 0 0 1-6.6 3.1c-1.8 0-3.5-.5-5-1.5L3 20l1.5-4.5c-1-1.5-1.5-3.2-1.5-5A8.5 8.5 0 0 1 11.5 2c2.3 0 4.5.9 6.1 2.5A8.5 8.5 0 0 1 21 11.5z"/></svg>`,
    Bot:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>`,
    Send:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    X:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  };
  fetch(`${BASE_URL}/api/designs/${wid}`).then(r=>r.json()).then(d=>{
    if(!d?.config){console.error("❌ Sin configuración");return;}
    const c=d.config,icon=SVGS[c.fab?.icon]||SVGS.MessageCircle,icColor=(c.colors?.fabBg||"#fff").toLowerCase()==="#ffffff"?"#000":"#fff";
    const fab=document.createElement("button");
    Object.assign(fab.style,{position:"fixed",bottom:"20px",[c.fab?.position==="left"?"left":"right"]:"20px",padding:"12px",background:c.colors?.fabBg||"#fff",border:"none",borderRadius:c.fab?.shape==="square"?"12px":"9999px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",zIndex:"999999",transition:"transform .2s"});
    fab.innerHTML=icon;fab.querySelector("svg").setAttribute("stroke",icColor);
    fab.onmouseenter=()=>fab.style.transform="scale(1.1)";
    fab.onmouseleave=()=>fab.style.transform="scale(1)";
    document.body.appendChild(fab);

    const ifr=document.createElement("iframe");
    Object.assign(ifr.style,{position:"fixed",bottom:"90px",[c.fab?.position==="left"?"left":"right"]:"20px",width:"384px",height:"540px",border:"none",borderRadius:"12px",display:"none",opacity:"0",transform:"scale(.95)",transition:"all .2s ease",boxShadow:"0 20px 25px -5px rgba(0,0,0,.1),0 10px 10px -5px rgba(0,0,0,.04)",zIndex:"999999"});
    document.body.appendChild(ifr);
    const doc=ifr.contentDocument||ifr.contentWindow.document;
    doc.open();doc.write(`
      <html><head>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <link href="https://fonts.googleapis.com/css2?family=${c.typography?.family||"Inter"}:wght@300;400;500;600&display=swap" rel="stylesheet">
      <style>
      :root{--chat-bg:${c.colors?.chatBg||"#000"};--text:${c.colors?.text||"#fff"};--header-bg:${c.colors?.headerBg||"#000"};--header-text:${c.colors?.headerText||"#fff"};--bot-bubble:${c.colors?.botBubble||"#1a1a1a"};--user-bubble:${c.colors?.userBubble||"#fff"};--bubble-radius:${c.radii?.bubble||12}px;}
      body{margin:0;height:100%;font-family:${c.typography?.family||"Inter"},sans-serif;background:var(--chat-bg);color:var(--text);display:flex;flex-direction:column}
      .card{flex:1;max-width:384px;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;background:var(--chat-bg);border:1px solid rgba(255,255,255,.06)}
      .header{background:var(--header-bg);color:var(--header-text);padding:12px 16px;font-weight:600;display:flex;justify-content:space-between;align-items:center}
      .green-dot{width:8px;height:8px;border-radius:50%;background:#34d399;margin-right:8px}
      .messages{flex:1;padding:16px;display:flex;flex-direction:column;gap:16px;overflow-y:auto}
      .row{display:flex;gap:12px;align-items:flex-start}
      .botIcon{width:28px;height:28px;border-radius:50%;background:#4b5563;display:flex;align-items:center;justify-content:center}
      .botBubble{background:var(--bot-bubble);border-radius:var(--bubble-radius);padding:8px 12px;font-size:14px;max-width:80%}
      .userRow{display:flex;justify-content:flex-end}
      .userBubble{background:var(--user-bubble);border-radius:var(--bubble-radius);padding:8px 12px;font-size:14px;max-width:80%;color:${(c.colors?.userBubble||"#fff").toLowerCase()==="#ffffff"?"#000":"var(--text)"}}
      .inputArea{border-top:1px solid rgba(255,255,255,.06);padding:16px;background:rgba(255,255,255,.02)}
      .inputInner{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.04);border-radius:10px;padding:10px 12px}
      .inputInner input{flex:1;background:transparent;border:none;outline:none;color:var(--text);font-size:14px}
      .sendBtn{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.6)}
      </style></head><body>
      <div class="card">
        <div class="header"><div style="display:flex;align-items:center;gap:8px"><div class="green-dot"></div><span>Asistente</span></div>
        <button id="closeBtn" style="background:none;border:none;cursor:pointer">${SVGS.X}</button></div>
        <div class="messages" id="messages"><div class="row"><div class="botIcon">${SVGS.Bot}</div><div class="botBubble">¡Hola! 👋 ¿En qué puedo ayudarte?</div></div></div>
        <div class="inputArea"><div class="inputInner"><input id="msgInput" placeholder="Escribe aquí..."/><button id="sendBtn" class="sendBtn">${SVGS.Send}</button></div></div>
      </div>
      <script>
        (function(){
          const m=document.getElementById("messages"),i=document.getElementById("msgInput"),b=document.getElementById("sendBtn"),c=document.getElementById("closeBtn");
          function scroll(){m.scrollTop=m.scrollHeight;}
          b.onclick=()=>{const t=i.value.trim();if(!t)return;let u=document.createElement("div");u.className="userRow";u.innerHTML='<div class="userBubble"></div>';u.firstChild.innerText=t;m.appendChild(u);i.value="";scroll();
            setTimeout(()=>{let r=document.createElement("div");r.className="row";r.innerHTML='<div class="botIcon">${SVGS.Bot}</div><div class="botBubble">Recibí: '+t+'</div>';m.appendChild(r);scroll();},400);}
          i.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();b.click();}}
          c.onclick=()=>window.frameElement.style.display="none";
        })();
      </script></body></html>
    `);doc.close();

    fab.onclick=()=>{
      if(ifr.style.display==="none"){ifr.style.display="block";requestAnimationFrame(()=>{ifr.style.opacity="1";ifr.style.transform="scale(1)"});}
      else{ifr.style.opacity="0";ifr.style.transform="scale(.95)";setTimeout(()=>ifr.style.display="none",200);}
    };
  }).catch(e=>console.error("❌ Error widget:",e));
})();
