(function () {
  const scriptTag = document.currentScript;
  const widgetId = scriptTag.getAttribute("data-widget-id");

  if (!widgetId) {
    console.error("❌ No se encontró widget_id en el script.");
    return;
  }

  // 🔹 Diccionario de íconos en SVG
  const ICONS = {
    MessageCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-1.9 5.4 8.5 8.5 0 0 1-6.6 3.1c-1.8 0-3.5-.5-5-1.5L3 20l1.5-4.5c-1-1.5-1.5-3.2-1.5-5A8.5 8.5 0 0 1 11.5 2c2.3 0 4.5.9 6.1 2.5A8.5 8.5 0 0 1 21 11.5z"/></svg>`,
    Bot: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="16" y1="15" x2="16" y2="15"/></svg>`,
    Send: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    MessageSquare: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    Sparkles: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v2m0 14v2m9-9h-2M5 12H3m14.07 7.07l-1.41-1.41M6.34 6.34 4.93 4.93m12.73 0-1.41 1.41M6.34 17.66l-1.41 1.41M12 8a4 4 0 0 0 0 8 4 4 0 0 0 0-8z"/></svg>`,
  };

  fetch(`${window.location.origin}/api/designs/${widgetId}`)
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
      fab.style[config.fab?.position || "right"] = "20px";
      fab.style.backgroundColor = config.colors?.fabBg || "#000";
      fab.style.border = "none";
      fab.style.borderRadius = config.fab?.shape === "square" ? "12px" : "50%";
      fab.style.width = "56px";
      fab.style.height = "56px";
      fab.style.display = "flex";
      fab.style.alignItems = "center";
      fab.style.justifyContent = "center";
      fab.style.cursor = "pointer";
      fab.style.zIndex = "999999";
      fab.style.color = config.colors?.fabBg === "#ffffff" ? "#000" : "#fff";

      // Asigna el icono desde config
      const chosenIcon = ICONS[config.fab?.icon] || ICONS.MessageCircle;
      fab.innerHTML = chosenIcon;
      document.body.appendChild(fab);

      // --- Iframe del chat ---
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.bottom = "90px";
      iframe.style[config.fab?.position || "right"] = "20px";
      iframe.style.width = "370px";
      iframe.style.height = "540px";
      iframe.style.border = "none";
      iframe.style.borderRadius = "16px";
      iframe.style.display = "none";
      iframe.style.boxShadow = "0 4px 16px rgba(0,0,0,0.25)";
      iframe.style.zIndex = "999999";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <html>
          <head>
            <link href="https://fonts.googleapis.com/css2?family=${config.typography?.family || "Inter"}&display=swap" rel="stylesheet">
            <style>
              body {
                margin: 0;
                font-family: ${config.typography?.family || "Inter"}, sans-serif;
                background: ${config.colors?.chatBg || "#fff"};
                color: ${config.colors?.text || "#000"};
                display: flex;
                flex-direction: column;
                height: 100%;
              }
              .chat-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                border-radius: 16px;
                overflow: hidden;
              }
              .header {
                background: ${config.colors?.headerBg || "#000"};
                color: ${config.colors?.headerText || "#fff"};
                padding: 12px;
                font-weight: 600;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .messages {
                flex: 1;
                padding: 12px;
                overflow-y: auto;
              }
              .bot {
                background: ${config.colors?.botBubble || "#eee"};
                border-radius: ${config.radii?.bubble || 12}px;
                padding: 8px 12px;
                margin-bottom: 8px;
                max-width: 80%;
                font-size: 14px;
              }
              .user {
                background: ${config.colors?.userBubble || "#ccc"};
                border-radius: ${config.radii?.bubble || 12}px;
                padding: 8px 12px;
                margin-bottom: 8px;
                margin-left: auto;
                max-width: 80%;
                font-size: 14px;
              }
              .input {
                border-top: 1px solid #ddd;
                padding: 10px;
                display: flex;
                gap: 8px;
                background: rgba(0,0,0,0.05);
              }
              .input input {
                flex: 1;
                border: none;
                outline: none;
                padding: 8px;
                border-radius: 8px;
              }
              .input button {
                background: ${config.colors?.fabBg || "#000"};
                color: ${config.colors?.fabBg === "#ffffff" ? "#000" : "#fff"};
                border: none;
                padding: 8px 14px;
                border-radius: 8px;
                cursor: pointer;
              }
            </style>
          </head>
          <body>
            <div class="chat-container">
              <div class="header">
                <span>Asistente</span>
                <button id="closeBtn" style="background:none;border:none;color:inherit;cursor:pointer;">✖</button>
              </div>
              <div class="messages" id="messages">
                <div class="bot">¡Hola! 👋 ¿En qué puedo ayudarte?</div>
              </div>
              <div class="input">
                <input id="msgInput" placeholder="Escribe aquí..." />
                <button id="sendBtn">Enviar</button>
              </div>
            </div>
            <script>
              const messages = document.getElementById("messages");
              const input = document.getElementById("msgInput");
              const sendBtn = document.getElementById("sendBtn");
              const closeBtn = document.getElementById("closeBtn");

              sendBtn.addEventListener("click", () => {
                const text = input.value.trim();
                if (!text) return;
                const userMsg = document.createElement("div");
                userMsg.className = "user";
                userMsg.innerText = text;
                messages.appendChild(userMsg);
                input.value = "";
                messages.scrollTop = messages.scrollHeight;

                setTimeout(() => {
                  const botMsg = document.createElement("div");
                  botMsg.className = "bot";
                  botMsg.innerText = "Recibí: " + text;
                  messages.appendChild(botMsg);
                  messages.scrollTop = messages.scrollHeight;
                }, 500);
              });

              closeBtn.addEventListener("click", () => {
                window.frameElement.style.display = "none";
              });
            </script>
          </body>
        </html>
      `);
      doc.close();

      fab.addEventListener("click", () => {
        iframe.style.display = iframe.style.display === "none" ? "block" : "none";
      });
    })
    .catch((err) => console.error("❌ Error cargando widget:", err));
})();

