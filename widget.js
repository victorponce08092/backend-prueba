(function () {
  const scriptTag = document.currentScript;
  const widgetId = scriptTag.getAttribute("data-widget-id");

  if (!widgetId) {
    console.error("❌ No se encontró widget_id en el script.");
    return;
  }

  const BASE_URL = "PUBLIC_BASE_URL";

  // SVGs de Lucide
  const SVGS = {
    Bot: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>`,
    Send: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    MessageCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-1.9 5.4 8.5 8.5 0 0 1-6.6 3.1c-1.8 0-3.5-.5-5-1.5L3 20l1.5-4.5c-1-1.5-1.5-3.2-1.5-5A8.5 8.5 0 0 1 11.5 2c2.3 0 4.5.9 6.1 2.5A8.5 8.5 0 0 1 21 11.5z"/></svg>`,
    X: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  };

  fetch(`${BASE_URL}/api/designs/${widgetId}`)
    .then((res) => res.json())
    .then((data) => {
      if (!data?.config) {
        console.error("❌ No se encontró configuración para el widget.");
        return;
      }

      const config = data.config;

      // --- FAB ---
      const fab = document.createElement("button");
      fab.style.position = "fixed";
      fab.style.bottom = "20px";
      fab.style[config.fab?.position === "left" ? "left" : "right"] = "20px";
      fab.style.padding = "12px";
      fab.style.backgroundColor = config.colors?.fabBg || "#000";
      fab.style.borderRadius = config.fab?.shape === "square" ? "12px" : "9999px";
      fab.style.border = "none";
      fab.style.cursor = "pointer";
      fab.style.zIndex = "999999";
      fab.innerHTML = SVGS.MessageCircle;
      document.body.appendChild(fab);

      // --- Iframe ---
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.bottom = "90px";
      iframe.style[config.fab?.position === "left" ? "left" : "right"] = "20px";
      iframe.style.width = "384px"; // max-w-sm
      iframe.style.height = "540px";
      iframe.style.border = "none";
      iframe.style.borderRadius = "12px";
      iframe.style.display = "none";
      iframe.style.zIndex = "999999";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <html>
          <head>
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=${config.typography?.family || "Inter"}:wght@300;400;500;600&display=swap" rel="stylesheet">
            <style>
              body { font-family: ${config.typography?.family || "Inter"}, sans-serif; }
            </style>
          </head>
          <body class="flex flex-col h-full bg-[${config.colors?.chatBg || "#000"}] text-[${config.colors?.text || "#fff"}]">
            <div class="w-full max-w-sm h-full flex flex-col rounded-xl border border-neutral-700 shadow-xl overflow-hidden">
              
              <!-- Header -->
              <div class="px-4 py-3 flex items-center justify-between bg-[${config.colors?.headerBg || "#000"}] text-[${config.colors?.headerText || "#fff"}]">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span class="text-sm font-medium">Asistente</span>
                </div>
                <button id="closeBtn" class="p-1 rounded hover:bg-white/10 transition">${SVGS.X}</button>
              </div>

              <!-- Mensajes -->
              <div id="messages" class="flex-1 p-4 space-y-4 overflow-y-auto min-h-[300px]">
                <div class="flex items-start gap-3">
                  <div class="w-7 h-7 bg-neutral-600 rounded-full flex items-center justify-center flex-shrink-0">${SVGS.Bot}</div>
                  <div class="px-3 py-2 text-sm max-w-[80%]" style="background:${config.colors?.botBubble};border-radius:${config.radii?.bubble || 12}px;">¡Hola! 👋 ¿En qué puedo ayudarte?</div>
                </div>
              </div>

              <!-- Input -->
              <div class="p-4 border-t border-white/10">
                <div class="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                  <input id="msgInput" class="flex-1 bg-transparent outline-none placeholder:text-neutral-400 text-sm" placeholder="Escribe aquí..." />
                  <button id="sendBtn" class="text-neutral-400">${SVGS.Send}</button>
                </div>
              </div>
            </div>

            <script>
              const messages = document.getElementById("messages");
              const input = document.getElementById("msgInput");
              const sendBtn = document.getElementById("sendBtn");
              const closeBtn = document.getElementById("closeBtn");

              function scrollBottom(){ messages.scrollTop = messages.scrollHeight; }

              sendBtn.addEventListener("click", () => {
                const text = input.value.trim();
                if (!text) return;
                const userRow = document.createElement("div");
                userRow.className = "flex justify-end";
                userRow.innerHTML = \`<div class="px-3 py-2 text-sm max-w-[80%]" style="background:${config.colors?.userBubble};border-radius:${config.radii?.bubble || 12}px;color:${config.colors?.userBubble === "#ffffff" ? "#000" : config.colors?.text};">\${text}</div>\`;
                messages.appendChild(userRow);
                input.value = "";
                scrollBottom();

                setTimeout(() => {
                  const botRow = document.createElement("div");
                  botRow.className = "flex items-start gap-3";
                  botRow.innerHTML = \`<div class="w-7 h-7 bg-neutral-600 rounded-full flex items-center justify-center flex-shrink-0">${SVGS.Bot}</div><div class="px-3 py-2 text-sm max-w-[80%]" style="background:${config.colors?.botBubble};border-radius:${config.radii?.bubble || 12}px;">Recibí: \${text}</div>\`;
                  messages.appendChild(botRow);
                  scrollBottom();
                }, 400);
              });

              input.addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); sendBtn.click(); } });
              closeBtn.addEventListener("click", () => window.frameElement.style.display = "none");
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
