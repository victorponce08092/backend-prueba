(function () {
  const scriptTag = document.currentScript;
  const widgetId = scriptTag.getAttribute("data-widget-id");

  if (!widgetId) {
    console.error("❌ No se encontró widget_id en el script.");
    return;
  }

  const BASE_URL = "PUBLIC_BASE_URL";

  // --- SVGs oficiales (Lucide-style) ---
  // Usamos stroke="currentColor" y viewBox 0 0 24 24 para que escalen exactamente.
  const SVGS = {
    MessageCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-1.9 5.4 8.5 8.5 0 0 1-6.6 3.1c-1.8 0-3.5-.5-5-1.5L3 20l1.5-4.5c-1-1.5-1.5-3.2-1.5-5A8.5 8.5 0 0 1 11.5 2c2.3 0 4.5.9 6.1 2.5A8.5 8.5 0 0 1 21 11.5z"/></svg>`,
    Bot: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>`,
    Send: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    X: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  };

  fetch(`${BASE_URL}/api/designs/${widgetId}`)
    .then((res) => res.json())
    .then((data) => {
      if (!data?.config) {
        console.error("❌ No se encontró configuración para el widget.");
        return;
      }

      const config = data.config;

      // --- FAB (botón flotante) ---
      const fab = document.createElement("button");
      fab.style.position = "fixed";
      fab.style.bottom = "20px";
      fab.style[config.fab?.position === "left" ? "left" : "right"] = "20px";
      // en preview el botón no tiene un ancho fijo, usa padding p-3 y rounded.
      fab.style.padding = "12px"; // p-3
      fab.style.backgroundColor = config.colors?.fabBg || "#ffffff";
      fab.style.border = "none";
      fab.style.borderRadius = config.fab?.shape === "square" ? "12px" : "9999px";
      fab.style.display = "flex";
      fab.style.alignItems = "center";
      fab.style.justifyContent = "center";
      fab.style.cursor = "pointer";
      fab.style.zIndex = "999999";
      // icon color según fondo del fab
      fab.style.color = (config.colors?.fabBg || "#ffffff").toLowerCase() === "#ffffff" ? "#000" : "#fff";
      fab.style.boxShadow = "0 10px 25px rgba(0,0,0,0.15)";

      const fabIcon = SVGS[config.fab?.icon] || SVGS.MessageCircle;
      // Ajustamos el tamaño del SVG interior para que sea h-5 w-5 (20px)
      fab.innerHTML = fabIcon.replace(/width="24" height="24"/g, 'width="20" height="20"').replace('stroke="currentColor"', `stroke="${fab.style.color}"`);
      document.body.appendChild(fab);

      // --- Iframe del chat ---
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.bottom = "90px";
      iframe.style[config.fab?.position === "left" ? "left" : "right"] = "20px";
      iframe.style.width = "384px"; // max-w-sm (24rem)
      iframe.style.height = "540px";
      iframe.style.border = "none";
      iframe.style.borderRadius = "12px"; // rounded-xl
      iframe.style.display = "none";
      // Shadow similar to tailwind shadow-xl
      iframe.style.boxShadow = "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)";
      iframe.style.zIndex = "999999";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();

      // Variables CSS rápidas
      const chatBg = config.colors?.chatBg || "#000000";
      const textColor = config.colors?.text || "#ffffff";
      const headerBg = config.colors?.headerBg || "#000000";
      const headerText = config.colors?.headerText || "#ffffff";
      const botBubble = config.colors?.botBubble || "#1a1a1a";
      const userBubble = config.colors?.userBubble || "#ffffff";
      const radii = config.radii?.bubble || 12;

      doc.write(`
        <html>
          <head>
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <link href="https://fonts.googleapis.com/css2?family=${config.typography?.family || "Inter"}:wght@300;400;500;600&display=swap" rel="stylesheet">
            <style>
              :root{
                --chat-bg: ${chatBg};
                --text: ${textColor};
                --header-bg: ${headerBg};
                --header-text: ${headerText};
                --bot-bubble: ${botBubble};
                --user-bubble: ${userBubble};
                --bubble-radius: ${radii}px;
              }

              html,body{height:100%;margin:0;padding:0}
              body {
                margin: 0;
                font-family: ${config.typography?.family || "Inter"}, -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial;
                background: var(--chat-bg);
                color: var(--text);
                display: flex;
                flex-direction: column;
                height: 100%;
                -webkit-font-smoothing:antialiased;
              }

              /* Card (igual que preview) */
              .card {
                width: 100%;
                max-width: 384px;
                border-radius: 12px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                background: var(--chat-bg);
                border: 1px solid rgba(255,255,255,0.06); /* border-neutral-700 look */
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
                height: 100%;
              }

              .header {
                background: var(--header-bg);
                color: var(--header-text);
                padding: 12px 16px; /* px-4 py-3 */
                font-weight: 600;
                display:flex;
                align-items:center;
                justify-content:space-between;
              }

              .header .left { display:flex; align-items:center; gap:8px; }
              .green-dot { width:8px; height:8px; border-radius:9999px; background: #34d399; } /* green-400 */
              .header .title { font-size:14px; }

              .messages {
                flex:1;
                padding: 16px; /* p-4 */
                overflow-y:auto;
                min-height:300px;
                display:flex;
                flex-direction:column;
                gap:16px;
              }

              /* Bot message row */
              .row { display:flex; gap:12px; align-items:flex-start; }
              .botIcon {
                width:28px; height:28px; border-radius:50%;
                background:#4b5563; /* neutral-600 */
                display:flex; align-items:center; justify-content:center; flex-shrink:0;
              }
              .botIcon svg { width:16px; height:16px; color: #fff; }

              .botBubble {
                background: var(--bot-bubble);
                border-radius: var(--bubble-radius);
                padding: 8px 12px;
                max-width:80%;
                font-size:14px;
                line-height:1.25;
              }

              .userRow { display:flex; justify-content:flex-end; }
              .userBubble {
                background: var(--user-bubble);
                border-radius: var(--bubble-radius);
                padding: 8px 12px;
                max-width:80%;
                font-size:14px;
                line-height:1.25;
                color: ${userBubble.toLowerCase() === '#ffffff' ? '#000' : 'var(--text)'};
              }

              .inputArea {
                border-top: 1px solid rgba(255,255,255,0.06);
                padding: 16px; /* p-4 */
                background: rgba(255,255,255,0.02);
              }

              .inputInner {
                display:flex;
                align-items:center;
                gap:8px;
                background: rgba(255,255,255,0.04); /* bg-white/10 */
                padding: 10px 12px; /* px-3 py-2 */
                border-radius: 10px;
              }

              .inputInner input {
                flex:1;
                background:transparent;
                border:none;
                outline:none;
                color: var(--text);
                font-size:14px;
              }

              .sendBtn {
                background: none;
                border: none;
                padding: 4px;
                cursor:pointer;
                display:flex;
                align-items:center;
                justify-content:center;
                color: rgba(255,255,255,0.6); /* text-neutral-400 */
              }

              /* small helpers */
              .small { font-size:12px; opacity:0.85; }
            </style>
          </head>
          <body>
            <div class="card" role="region" aria-label="chat-widget">
              <div class="header" role="banner">
                <div class="left">
                  <div class="green-dot" aria-hidden="true"></div>
                  <div class="title">Asistente</div>
                </div>
                <button id="closeBtn" aria-label="Cerrar" style="background:none;border:none;color:inherit;cursor:pointer">${SVGS.X}</button>
              </div>

              <div class="messages" id="messages" role="log" aria-live="polite">
                <div class="row">
                  <div class="botIcon" aria-hidden="true">${SVGS.Bot}</div>
                  <div class="botBubble">¡Hola! 👋 ¿En qué puedo ayudarte?</div>
                </div>
              </div>

              <div class="inputArea">
                <div class="inputInner">
                  <input id="msgInput" placeholder="Escribe aquí..." aria-label="Mensaje"/>
                  <button id="sendBtn" class="sendBtn" aria-label="Enviar">${SVGS.Send}</button>
                </div>
              </div>
            </div>

            <script>
              (function(){
                const messages = document.getElementById('messages');
                const input = document.getElementById('msgInput');
                const sendBtn = document.getElementById('sendBtn');
                const closeBtn = document.getElementById('closeBtn');

                function scrollToBottom(){ messages.scrollTop = messages.scrollHeight; }

                sendBtn.addEventListener('click', () => {
                  const text = input.value.trim();
                  if(!text) return;
                  // user message
                  const ur = document.createElement('div');
                  ur.className = 'userRow';
                  ur.innerHTML = '<div class="userBubble"></div>';
                  ur.querySelector('.userBubble').innerText = text;
                  messages.appendChild(ur);
                  input.value = '';
                  scrollToBottom();

                  // fake bot reply
                  setTimeout(() => {
                    const br = document.createElement('div');
                    br.className = 'row';
                    br.innerHTML = '<div class="botIcon">${SVGS.Bot.replace(/"/g, '\\"')}</div><div class="botBubble">Recibí: ' + text + '</div>';
                    messages.appendChild(br);
                    scrollToBottom();
                  }, 450);
                });

                input.addEventListener('keydown', (e) => {
                  if(e.key === 'Enter') { e.preventDefault(); sendBtn.click(); }
                });

                closeBtn.addEventListener('click', () => {
                  // oculta el iframe (mismo comportamiento del preview)
                  window.frameElement.style.display = 'none';
                });
              })();
            </script>
          </body>
        </html>
      `);
      doc.close();

      // toggle
      fab.addEventListener("click", () => {
        iframe.style.display = iframe.style.display === "none" ? "block" : "none";
      });
    })
    .catch((err) => console.error("❌ Error cargando widget:", err));
})();
