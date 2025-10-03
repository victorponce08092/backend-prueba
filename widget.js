(function(){
  const s=document.currentScript,wid=s.getAttribute("data-widget-id");
  if(!wid){console.error("❌ No se encontró widget_id");return;}
  const BASE_URL="PUBLIC_BASE_URL",SVGS={
    MessageCircle:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-1.9 5.4 8.5 8.5 0 0 1-6.6 3.1c-1.8 0-3.5-.5-5-1.5L3 20l1.5-4.5c-1-1.5-1.5-3.2-1.5-5A8.5 8.5 0 0 1 11.5 2c2.3 0 4.5.9 6.1 2.5A8.5 8.5 0 0 1 21 11.5z"/></svg>`,
    Bot:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>`,
    Send:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    X:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    MessageSquare:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    Sparkles:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`
  };
  
  fetch(`${BASE_URL}/api/designs/${wid}`).then(r=>r.json()).then(d=>{
    if(!d?.config){console.error("❌ Sin configuración");return;}
    const c=d.config;
    
    // Seleccionar el ícono correcto
    const icon=SVGS[c.fab?.icon]||SVGS.MessageCircle;
    const fabColor=c.colors?.fabBg||"#ffffff";
    const iconColor=fabColor.toLowerCase()==="#ffffff"?"#000":"#fff";
    
    // Crear botón flotante (FAB)
    const fab=document.createElement("button");
    Object.assign(fab.style,{
      position:"fixed",
      bottom:"32px",
      [c.fab?.position==="left"?"left":"right"]:"32px",
      padding:"12px",
      background:fabColor,
      border:"none",
      borderRadius:c.fab?.shape==="square"?"12px":"9999px",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      cursor:"pointer",
      zIndex:"999999",
      transition:"transform .2s, box-shadow .2s",
      boxShadow:"0 10px 15px -3px rgba(0,0,0,.3), 0 4px 6px -2px rgba(0,0,0,.1)"
    });
    fab.innerHTML=icon;
    fab.querySelector("svg").setAttribute("stroke",iconColor);
    fab.onmouseenter=()=>{fab.style.transform="scale(1.1)";fab.style.boxShadow="0 20px 25px -5px rgba(0,0,0,.4), 0 10px 10px -5px rgba(0,0,0,.2)";};
    fab.onmouseleave=()=>{fab.style.transform="scale(1)";fab.style.boxShadow="0 10px 15px -3px rgba(0,0,0,.3), 0 4px 6px -2px rgba(0,0,0,.1)";};
    fab.onclick=()=>toggleChat();
    document.body.appendChild(fab);

    // Crear iframe con el chat
    const ifr=document.createElement("iframe");
    Object.assign(ifr.style,{
      position:"fixed",
      bottom:"100px",
      [c.fab?.position==="left"?"left":"right"]:"32px",
      width:"384px",
      maxWidth:"calc(100vw - 64px)",
      height:"540px",
      maxHeight:"calc(100vh - 132px)",
      border:"none",
      borderRadius:"12px",
      display:"none",
      opacity:"0",
      transform:"scale(.95)",
      transition:"all .3s ease-out",
      boxShadow:"0 20px 25px -5px rgba(0,0,0,.3), 0 10px 10px -5px rgba(0,0,0,.2)",
      zIndex:"999999"
    });
    document.body.appendChild(ifr);

    const doc=ifr.contentDocument||ifr.contentWindow.document;
    doc.open();
    doc.write(`
      <html><head>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <link href="https://fonts.googleapis.com/css2?family=${c.typography?.family||"Inter"}:wght@300;400;500;600&display=swap" rel="stylesheet">
      <style>
      *{margin:0;padding:0;box-sizing:border-box}
      :root{
        --chat-bg:${c.colors?.chatBg||"#000000"};
        --text:${c.colors?.text||"#ffffff"};
        --header-bg:${c.colors?.headerBg||"#000000"};
        --header-text:${c.colors?.headerText||"#ffffff"};
        --bot-bubble:${c.colors?.botBubble||"#1a1a1a"};
        --user-bubble:${c.colors?.userBubble||"#ffffff"};
        --bubble-radius:${c.radii?.bubble||12}px;
      }
      body{
        height:100vh;
        font-family:'${c.typography?.family||"Inter"}',-apple-system,BlinkMacSystemFont,sans-serif;
        background:var(--chat-bg);
        color:var(--text);
        display:flex;
        flex-direction:column;
        overflow:hidden;
      }
      
      /* Header - Igual que en el preview */
      .header{
        background:var(--header-bg);
        color:var(--header-text);
        padding:12px 16px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        border-bottom:1px solid rgba(255,255,255,.1);
      }
      .header-left{
        display:flex;
        align-items:center;
        gap:8px;
      }
      .green-dot{
        width:8px;
        height:8px;
        border-radius:50%;
        background:#34d399;
      }
      .header-title{
        font-size:14px;
        font-weight:500;
      }
      .close-btn{
        background:none;
        border:none;
        cursor:pointer;
        padding:4px;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius:4px;
        transition:background .2s;
        color:var(--header-text);
      }
      .close-btn:hover{
        background:rgba(255,255,255,.1);
      }
      
      /* Messages - Igual que en el preview */
      .messages{
        flex:1;
        padding:16px;
        display:flex;
        flex-direction:column;
        gap:16px;
        overflow-y:auto;
        overflow-x:hidden;
      }
      .messages::-webkit-scrollbar{
        width:6px;
      }
      .messages::-webkit-scrollbar-track{
        background:transparent;
      }
      .messages::-webkit-scrollbar-thumb{
        background:rgba(255,255,255,.2);
        border-radius:3px;
      }
      
      /* Bot message */
      .bot-row{
        display:flex;
        align-items:flex-start;
        gap:12px;
      }
      .bot-icon{
        width:28px;
        height:28px;
        min-width:28px;
        border-radius:50%;
        background:#4b5563;
        display:flex;
        align-items:center;
        justify-content:center;
      }
      .bot-bubble{
        background:var(--bot-bubble);
        color:${(c.colors?.botBubble||"#1a1a1a").toLowerCase()==="#ffffff"?"#000":"var(--text)"};
        border-radius:var(--bubble-radius);
        padding:8px 12px;
        font-size:14px;
        line-height:1.4;
        max-width:80%;
        word-wrap:break-word;
      }
      
      /* User message */
      .user-row{
        display:flex;
        justify-content:flex-end;
      }
      .user-bubble{
        background:var(--user-bubble);
        color:${(c.colors?.userBubble||"#ffffff").toLowerCase()==="#ffffff"?"#000":"var(--text)"};
        border-radius:var(--bubble-radius);
        padding:8px 12px;
        font-size:14px;
        line-height:1.4;
        max-width:80%;
        word-wrap:break-word;
      }
      
      /* Input - Igual que en el preview */
      .input-area{
        border-top:1px solid rgba(255,255,255,.1);
        padding:16px;
        background:rgba(0,0,0,.2);
      }
      .input-container{
        display:flex;
        align-items:center;
        gap:8px;
        background:rgba(255,255,255,.1);
        border-radius:8px;
        padding:8px 12px;
      }
      .input-container input{
        flex:1;
        background:transparent;
        border:none;
        outline:none;
        color:var(--text);
        font-size:14px;
        font-family:inherit;
      }
      .input-container input::placeholder{
        color:rgba(255,255,255,.4);
      }
      .send-btn{
        background:none;
        border:none;
        cursor:pointer;
        color:rgba(255,255,255,.6);
        display:flex;
        align-items:center;
        justify-content:center;
        padding:4px;
        transition:color .2s;
      }
      .send-btn:hover{
        color:var(--text);
      }
      </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="header-left">
            <div class="green-dot"></div>
            <span class="header-title">Asistente</span>
          </div>
          <button class="close-btn" id="closeBtn">${SVGS.X}</button>
        </div>
        
        <!-- Messages -->
        <div class="messages" id="messages">
          <div class="bot-row">
            <div class="bot-icon">${SVGS.Bot}</div>
            <div class="bot-bubble">¡Hola! 👋 ¿En qué puedo ayudarte?</div>
          </div>
        </div>
        
        <!-- Input -->
        <div class="input-area">
          <div class="input-container">
            <input id="msgInput" placeholder="Escribe aquí..." autocomplete="off"/>
            <button id="sendBtn" class="send-btn">${SVGS.Send}</button>
          </div>
        </div>
        
        <script>
          (function(){
            const m=document.getElementById("messages");
            const i=document.getElementById("msgInput");
            const b=document.getElementById("sendBtn");
            const c=document.getElementById("closeBtn");
            
            function scroll(){
              m.scrollTop=m.scrollHeight;
            }
            
            function sendMessage(){
              const t=i.value.trim();
              if(!t)return;
              
              // Add user message
              const userRow=document.createElement("div");
              userRow.className="user-row";
              userRow.innerHTML='<div class="user-bubble"></div>';
              userRow.firstChild.textContent=t;
              m.appendChild(userRow);
              
              i.value="";
              scroll();
              
              // Simulate bot response
              setTimeout(()=>{
                const botRow=document.createElement("div");
                botRow.className="bot-row";
                botRow.innerHTML='<div class="bot-icon">${SVGS.Bot}</div><div class="bot-bubble"></div>';
                botRow.querySelector(".bot-bubble").textContent="Recibí: "+t;
                m.appendChild(botRow);
                scroll();
              },400);
            }
            
            b.onclick=sendMessage;
            i.onkeydown=e=>{
              if(e.key==="Enter"){
                e.preventDefault();
                sendMessage();
              }
            };
            c.onclick=()=>{
              window.parent.postMessage({type:"closeChat"},"*");
            };
          })();
        </script>
      </body>
      </html>
    `);
    doc.close();

    let isOpen=false;
    let isAnimating=false;

    function toggleChat(){
      if(isAnimating)return;
      isAnimating=true;
      
      if(!isOpen){
        ifr.style.display="block";
        requestAnimationFrame(()=>{
          requestAnimationFrame(()=>{
            ifr.style.opacity="1";
            ifr.style.transform="scale(1)";
            isOpen=true;
            setTimeout(()=>isAnimating=false,300);
          });
        });
      }else{
        ifr.style.opacity="0";
        ifr.style.transform="scale(.95)";
        setTimeout(()=>{
          ifr.style.display="none";
          isOpen=false;
          isAnimating=false;
        },300);
      }
    }

    // Listen for close message from iframe
    window.addEventListener("message",e=>{
      if(e.data?.type==="closeChat"){
        toggleChat();
      }
    });

  }).catch(e=>console.error("❌ Error widget:",e));
})();