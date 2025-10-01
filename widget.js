(function () {
  const scriptTag = document.currentScript;
  const widgetId = scriptTag.getAttribute("data-widget-id");

  if (!widgetId) {
    console.error("❌ No se encontró widget_id en el script.");
    return;
  }

  // Llamar a tu backend para traer la configuración del diseño
  fetch(`https://backend-prueba-production-6838.up.railway.app/api/designs/${widgetId}`)
    .then((res) => res.json())
    .then((data) => {
      if (!data?.config) {
        console.error("❌ No se encontró configuración para el widget.");
        return;
      }

      const config = data.config;

      // Crear un botón flotante (FAB)
      const fab = document.createElement("button");
      fab.style.position = "fixed";
      fab.style.bottom = "20px";
      fab.style[config.fab?.position || "right"] = "20px";
      fab.style.backgroundColor = config.colors?.fabBg || "#000";
      fab.style.border = "none";
      fab.style.borderRadius = config.fab?.shape === "square" ? "12px" : "50%";
      fab.style.width = "50px";
      fab.style.height = "50px";
      fab.style.display = "flex";
      fab.style.alignItems = "center";
      fab.style.justifyContent = "center";
      fab.style.cursor = "pointer";
      fab.style.zIndex = "999999";

      fab.innerHTML = "💬"; // (luego lo puedes personalizar con íconos)
      document.body.appendChild(fab);

      // Crear contenedor del chat (iframe para aislar estilos)
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.bottom = "80px";
      iframe.style[config.fab?.position || "right"] = "20px";
      iframe.style.width = "350px";
      iframe.style.height = "500px";
      iframe.style.border = "1px solid #ccc";
      iframe.style.borderRadius = "16px";
      iframe.style.display = "none"; // oculto hasta que hagan click
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
              }
              .header {
                background: ${config.colors?.headerBg || "#000"};
                color: ${config.colors?.headerText || "#fff"};
                padding: 10px;
                font-weight: bold;
              }
              .messages {
                padding: 10px;
                height: 400px;
                overflow-y: auto;
              }
              .bot {
                background: ${config.colors?.botBubble || "#eee"};
                border-radius: ${config.radii?.bubble || 12}px;
                padding: 8px 12px;
                margin-bottom: 8px;
                max-width: 80%;
              }
              .user {
                background: ${config.colors?.userBubble || "#ccc"};
                border-radius: ${config.radii?.bubble || 12}px;
                padding: 8px 12px;
                margin-bottom: 8px;
                margin-left: auto;
                max-width: 80%;
              }
              .input {
                border-top: 1px solid #ddd;
                padding: 8px;
                display: flex;
              }
              .input input {
                flex: 1;
                border: none;
                outline: none;
                padding: 6px;
              }
              .input button {
                background: ${config.colors?.fabBg || "#000"};
                color: #fff;
                border: none;
                padding: 6px 12px;
                border-radius: 8px;
                cursor: pointer;
              }
            </style>
          </head>
          <body>
            <div class="header">Asistente</div>
            <div class="messages" id="messages">
              <div class="bot">¡Hola! 👋 ¿En qué puedo ayudarte?</div>
            </div>
            <div class="input">
              <input id="msgInput" placeholder="Escribe aquí..." />
              <button id="sendBtn">Enviar</button>
            </div>
            <script>
              const messages = document.getElementById("messages");
              const input = document.getElementById("msgInput");
              const sendBtn = document.getElementById("sendBtn");

              sendBtn.addEventListener("click", () => {
                const text = input.value.trim();
                if (!text) return;
                const userMsg = document.createElement("div");
                userMsg.className = "user";
                userMsg.innerText = text;
                messages.appendChild(userMsg);
                input.value = "";
                messages.scrollTop = messages.scrollHeight;

                // Simulación de respuesta (luego aquí llamas a tu backend/IA)
                setTimeout(() => {
                  const botMsg = document.createElement("div");
                  botMsg.className = "bot";
                  botMsg.innerText = "Recibí: " + text;
                  messages.appendChild(botMsg);
                  messages.scrollTop = messages.scrollHeight;
                }, 500);
              });
            </script>
          </body>
        </html>
      `);
      doc.close();

      // Mostrar/Ocultar chat al hacer click en el FAB
      fab.addEventListener("click", () => {
        iframe.style.display = iframe.style.display === "none" ? "block" : "none";
      });
    })
    .catch((err) => console.error("❌ Error cargando widget:", err));
})();
