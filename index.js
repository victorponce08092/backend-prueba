// index.js
import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";

const app = express();
app.use(cors()); // 👈 habilita CORS para todos los orígenes
app.use(bodyParser.json());


dotenv.config();



// ---------- Supabase ----------
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Helpers
const PROVIDERS = ["whatsapp", "messenger", "instagram", "telegram"];

async function getCredentials(workspaceId, provider) {
  const { data, error } = await supabase
    .from("integrations")
    .select("credentials")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .single();

  if (error || !data) return null;
  return data.credentials;
}

// ---------- REST: Integraciones (connect / test / disconnect / status) ----------
async function getUserIdFromAuth(req) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  return data.user.id; // 👈 user_id real de Supabase
}


// Conectar / guardar credenciales { workspaceId, credentials }
app.post("/api/integrations/:provider/connect", async (req, res) => {
  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { provider } = req.params;
    const { workspaceId, credentials } = req.body;

    if (!PROVIDERS.includes(provider)) return res.status(400).json({ message: "Invalid provider" });
    if (!workspaceId || !credentials) return res.status(400).json({ message: "Missing data" });

    const { error } = await supabase.from("integrations").upsert({
      workspace_id: workspaceId,
      provider,
      credentials,
      user_id: userId, // 👈 se guarda automáticamente ligado al dueño real
    });

    if (error) throw error;
    res.json({ status: "connected" });
  } catch (e) {
    res.status(500).json({ message: e.message || "Server error" });
  }
});



// Probar integración { workspaceId, ...opcional: action, webhookUrl }
app.post("/api/integrations/:provider/test", async (req, res) => {
  try {
    const { provider } = req.params;
    const { workspaceId, action, webhookUrl } = req.body || {};

    if (!PROVIDERS.includes(provider)) return res.status(400).json({ message: "Invalid provider" });
    if (!workspaceId) return res.status(400).json({ message: "Missing workspaceId" });

    const creds = await getCredentials(workspaceId, provider);
    if (!creds) return res.status(400).json({ message: "Not connected" });

    // --- Telegram ---
    if (provider === "telegram") {
      const token = creds.bot_token;
      if (!token) return res.status(400).json({ message: "Missing bot_token" });

      // Acción especial: setWebhook
      if (action === "setWebhook") {
        if (!webhookUrl) return res.status(400).json({ message: "Missing webhookUrl" });
        const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: webhookUrl }),
        });
        const j = await r.json();
        if (!j.ok) return res.status(400).json({ message: j.description || "setWebhook failed" });
        return res.json({ ok: true, result: "webhook set" });
      }

      // Test: getMe
      const test = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const j = await test.json();
      if (!j.ok) return res.status(400).json({ message: j.description || "Invalid token" });
      return res.json({ ok: true, bot: j.result?.username });
    }

    // --- WhatsApp (Cloud API de Meta) ---
    if (provider === "whatsapp") {
      const { phone_number_id, access_token } = creds || {};
      if (!phone_number_id || !access_token) return res.status(400).json({ message: "Missing phone_number_id or access_token" });

      // Consultar info del número (si responde 200, token/ID son válidos)
      const r = await fetch(`https://graph.facebook.com/v20.0/${phone_number_id}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        return res.status(400).json({ message: j?.error?.message || `WhatsApp check failed: ${r.status}` });
      }
      return res.json({ ok: true });
    }

    // --- Messenger (Facebook Page) ---
    if (provider === "messenger") {
      const { page_id, page_token } = creds || {};
      if (!page_id || !page_token) return res.status(400).json({ message: "Missing page_id or page_token" });

      // Validar page_token consultando la página
      const r = await fetch(`https://graph.facebook.com/v20.0/${page_id}?access_token=${encodeURIComponent(page_token)}`);
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        return res.status(400).json({ message: j?.error?.message || `Messenger check failed: ${r.status}` });
      }
      return res.json({ ok: true });
    }

    // --- Instagram (Graph API para mensajes) ---
    if (provider === "instagram") {
      const { ig_id, access_token } = creds || {};
      if (!ig_id || !access_token) return res.status(400).json({ message: "Missing ig_id or access_token" });

      // Validar IG business account
      const r = await fetch(`https://graph.facebook.com/v20.0/${ig_id}?fields=id,username&access_token=${encodeURIComponent(access_token)}`);
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        return res.status(400).json({ message: j?.error?.message || `Instagram check failed: ${r.status}` });
      }
      return res.json({ ok: true });
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message || "Server error" });
  }
});

// Desconectar { workspaceId }
// Desconectar { workspaceId }
app.delete("/api/integrations/:provider/disconnect", async (req, res) => {
  try {
    const { provider } = req.params;
    // Permitir workspaceId desde body o query
    const workspaceId = req.body?.workspaceId || req.query.workspaceId;

    if (!PROVIDERS.includes(provider))
      return res.status(400).json({ message: "Invalid provider" });
    if (!workspaceId)
      return res.status(400).json({ message: "Missing workspaceId" });

    const { error } = await supabase
      .from("integrations")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("provider", provider);

    if (error) throw error;
    res.json({ status: "disconnected" });
  } catch (e) {
    console.error("Disconnect error:", e.message);
    res.status(500).json({ message: e.message || "Server error" });
  }
});


// Estado ?workspaceId=...
app.get("/api/integrations/status", async (req, res) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ message: "Missing workspaceId" });

    const { data, error } = await supabase
      .from("integrations")
      .select("provider")
      .eq("workspace_id", workspaceId);

    if (error) throw error;

    const connected = data?.map((d) => d.provider) || [];
    const status = {};
    PROVIDERS.forEach((p) => {
      status[p] = connected.includes(p) ? { status: "connected" } : { status: "disconnected" };
    });
    res.json(status);
  } catch (e) {
    res.status(500).json({ message: e.message || "Server error" });
  }
});

// ---------- WEBHOOKS ----------
// IMPORTANTE: Meta (WhatsApp/Messenger/Instagram) exige GET para verificación de webhook (hub.verify_token / hub.challenge)

// --- WhatsApp ---
app.get("/webhooks/whatsapp/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode !== "subscribe") return res.sendStatus(403);

    const creds = await getCredentials(workspaceId, "whatsapp");
    const verifyToken = creds?.verify_token;
    if (token && verifyToken && token === verifyToken) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  } catch {
    return res.sendStatus(403);
  }
});

app.post("/webhooks/whatsapp/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const payload = req.body;

    const creds = await getCredentials(workspaceId, "whatsapp");
    if (!creds) return res.sendStatus(403);

    // Parse mensajes entrantes (Cloud API -> entry[0].changes[0].value.messages[0])
    const change = payload?.entry?.[0]?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    const from = message?.from; // número del usuario
    const text = message?.text?.body;

    // Respuesta simple (no IA)
    if (from && text) {
      await fetch(`https://graph.facebook.com/v20.0/${creds.phone_number_id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${creds.access_token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: { body: `Recibido por WhatsApp: "${text}"` },
        }),
      });
    }

    res.sendStatus(200);
  } catch (e) {
    console.error("WA webhook error:", e.message);
    res.sendStatus(200); // Siempre 200 para evitar reintentos excesivos
  }
});

// --- Messenger (Facebook Page) ---
app.get("/webhooks/messenger/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode !== "subscribe") return res.sendStatus(403);

    const creds = await getCredentials(workspaceId, "messenger");
    const verifyToken = creds?.verify_token;
    if (token && verifyToken && token === verifyToken) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  } catch {
    return res.sendStatus(403);
  }
});

app.post("/webhooks/messenger/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const body = req.body;

    const creds = await getCredentials(workspaceId, "messenger");
    if (!creds) return res.sendStatus(403);

    if (body?.object === "page") {
      for (const entry of body.entry || []) {
        for (const messaging of entry.messaging || []) {
          const senderId = messaging.sender?.id;
          const text = messaging.message?.text;
          if (senderId && text) {
            await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${encodeURIComponent(creds.page_token)}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipient: { id: senderId },
                message: { text: `Recibido por Messenger: "${text}"` },
                messaging_type: "RESPONSE",
              }),
            });
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (e) {
    console.error("Messenger webhook error:", e.message);
    res.sendStatus(200);
  }
});

// --- Instagram (Graph API / Messenger Platform) ---
app.get("/webhooks/instagram/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode !== "subscribe") return res.sendStatus(403);

    const creds = await getCredentials(workspaceId, "instagram");
    const verifyToken = creds?.verify_token;
    if (token && verifyToken && token === verifyToken) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  } catch {
    return res.sendStatus(403);
  }
});

app.post("/webhooks/instagram/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const body = req.body;

    const creds = await getCredentials(workspaceId, "instagram");
    if (!creds) return res.sendStatus(403);

    // Instagram DM events llegan con object "instagram"
    // y entry[].messaging[] similar a Messenger
    if (body?.object === "instagram") {
      for (const entry of body.entry || []) {
        for (const messaging of entry.messaging || []) {
          const senderId = messaging.sender?.id; // PSID IG
          const text = messaging.message?.text;
          if (senderId && text) {
            // Enviar respuesta por el mismo endpoint de Messenger Platform
            await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${encodeURIComponent(creds.access_token)}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipient: { id: senderId },
                message: { text: `Recibido por Instagram: "${text}"` },
                messaging_type: "RESPONSE",
              }),
            });
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (e) {
    console.error("Instagram webhook error:", e.message);
    res.sendStatus(200);
  }
});

// --- Telegram ---
app.post("/webhooks/telegram/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const update = req.body;

    const creds = await getCredentials(workspaceId, "telegram");
    if (!creds) return res.sendStatus(403);

    const token = creds.bot_token;
    const chatId = update?.message?.chat?.id || update?.edited_message?.chat?.id;
    const text = update?.message?.text || update?.edited_message?.text;

    if (chatId && text) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: `Recibido por Telegram: "${text}"` }),
      });
    }

    res.sendStatus(200);
  } catch (e) {
    console.error("Telegram webhook error:", e.message);
    res.sendStatus(200);
  }

  // --- Telegram ---
if (provider === "telegram") {
  const token = creds.bot_token;
  if (!token) return res.status(400).json({ message: "Missing bot_token" });

  if (action === "setWebhook") {
    if (!webhookUrl)
      return res.status(400).json({ message: "Missing webhookUrl" });
    const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const j = await r.json();
    console.log("Telegram setWebhook response:", j); // <---- AQUI
    if (!j.ok)
      return res
        .status(400)
        .json({ message: j.description || "setWebhook failed" });
    return res.json({ ok: true, result: "webhook set" });
  }

  const test = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const j = await test.json();
  console.log("Telegram getMe response:", j); // <---- AQUI
  if (!j.ok)
    return res.status(400).json({ message: j.description || "Invalid token" });
  return res.json({ ok: true, bot: j.result?.username });
}

});

// ---------- Server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
