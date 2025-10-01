// index.js
import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import twilio from "twilio";
import crypto from "crypto";
import { randomUUID } from "crypto";

const allowedOrigins = [
  "http://localhost:5001",   // tu frontend local
];

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);





const app = express();
app.use(cors({
  origin: allowedOrigins,
  credentials: true, // si usas cookies/tokens
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // Para Twilio webhooks (x-www-form-urlencoded)

dotenv.config();

// ---------- Supabase ----------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Helpers
const PROVIDERS = ["telegram", "twilio"];

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

async function getUserIdFromAuth(req) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  return data.user.id;
}

// ---------- REST: Integraciones ----------
app.post("/api/integrations/:provider/connect", async (req, res) => {
  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { provider } = req.params;
    let { workspaceId, credentials } = req.body;

    if (!PROVIDERS.includes(provider))
      return res.status(400).json({ message: "Invalid provider" });
    if (!workspaceId || !credentials)
      return res.status(400).json({ message: "Missing data" });

    // 🔹 Normalizar credenciales a objeto JSON
    if (typeof credentials === "string") {
      try {
        credentials = JSON.parse(credentials);
      } catch {
        return res.status(400).json({ message: "Invalid credentials format" });
      }
    }

    // 🔹 Validar por proveedor
    if (provider === "telegram" && !credentials.bot_token) {
      return res.status(400).json({ message: "Missing bot_token" });
    }
    if (provider === "twilio") {
      const { accountSid, authToken, phoneNumber } = credentials;
      if (!accountSid || !authToken || !phoneNumber) {
        return res.status(400).json({ message: "Missing Twilio credentials" });
      }
    }

    // 🔹 Guardar igual que Telegram
    const { error } = await supabase.from("integrations").upsert({
      workspace_id: workspaceId,
      provider,
      credentials, // ya es JSON válido
      user_id: userId,
    });

    if (error) {
      console.error("Supabase upsert error:", error);
      throw error;
    }

    res.json({ status: "connected" });
  } catch (e) {
    res.status(500).json({ message: e.message || "Server error" });
  }
});


app.post("/api/integrations/:provider/test", async (req, res) => {
  try {
    const { provider } = req.params;
    const { workspaceId, action, webhookUrl } = req.body || {};

    if (!PROVIDERS.includes(provider))
      return res.status(400).json({ message: "Invalid provider" });
    if (!workspaceId)
      return res.status(400).json({ message: "Missing workspaceId" });

    const creds = await getCredentials(workspaceId, provider);
    if (!creds) return res.status(400).json({ message: "Not connected" });

    // --- Telegram test ---
    if (provider === "telegram") {
      const token = creds.bot_token;
      if (!token) return res.status(400).json({ message: "Missing bot_token" });

      if (action === "setWebhook") {
        if (!webhookUrl)
          return res.status(400).json({ message: "Missing webhookUrl" });
        const r = await fetch(
          `https://api.telegram.org/bot${token}/setWebhook`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: webhookUrl }),
          }
        );
        const j = await r.json();
        if (!j.ok)
          return res
            .status(400)
            .json({ message: j.description || "setWebhook failed" });
        return res.json({ ok: true, result: "webhook set" });
      }

      const test = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const j = await test.json();
      if (!j.ok)
        return res
          .status(400)
          .json({ message: j.description || "Invalid token" });
      return res.json({ ok: true, bot: j.result?.username });
    }

    // --- Twilio test ---
    if (provider === "twilio") {
      const { accountSid, authToken, phoneNumber } = creds;
      if (!accountSid || !authToken || !phoneNumber)
        return res.status(400).json({ message: "Missing Twilio credentials" });

      try {
        const client = twilio(accountSid, authToken);
        const numberInfo = await client.incomingPhoneNumbers.list({
          phoneNumber,
          limit: 1,
        });
        if (numberInfo.length === 0)
          return res.status(400).json({ message: "Invalid phone number" });

        return res.json({ ok: true, result: "Twilio connected" });
      } catch (err) {
        return res.status(400).json({ message: err.message || "Twilio error" });
      }
    }

    res.status(400).json({ message: "Provider not implemented" });
  } catch (e) {
    res.status(500).json({ message: e.message || "Server error" });
  }
});

app.delete("/api/integrations/:provider/disconnect", async (req, res) => {
  try {
    const { provider } = req.params;
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

app.get("/api/integrations/status", async (req, res) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId)
      return res.status(400).json({ message: "Missing workspaceId" });

    const { data, error } = await supabase
      .from("integrations")
      .select("provider")
      .eq("workspace_id", workspaceId);

    if (error) throw error;

    const connected = data?.map((d) => d.provider) || [];
    const status = {};
    PROVIDERS.forEach((p) => {
      status[p] = connected.includes(p)
        ? { status: "connected" }
        : { status: "disconnected" };
    });
    res.json(status);
  } catch (e) {
    res.status(500).json({ message: e.message || "Server error" });
  }
});

// ---------- WEBHOOKS ----------
// Telegram webhook (ya estaba)
app.post("/webhooks/telegram/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const update = req.body;

    const creds = await getCredentials(workspaceId, "telegram");
    if (!creds) return res.sendStatus(403);

    const token = creds.bot_token;
    const chatId =
      update?.message?.chat?.id || update?.edited_message?.chat?.id;
    const text = update?.message?.text || update?.edited_message?.text;

    if (chatId && text) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Recibido por Telegram: "${text}"`,
        }),
      });
    }

    res.sendStatus(200);
  } catch (e) {
    console.error("Telegram webhook error:", e.message);
    res.sendStatus(200);
  }
});

// Twilio WhatsApp webhook
app.post("/webhooks/twilio/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Validar firma Twilio
    const creds = await getCredentials(workspaceId, "twilio");
    if (!creds) return res.sendStatus(403);

    const { accountSid, authToken } = creds;
    const twilioSignature = req.headers["x-twilio-signature"];
    const url = `${process.env.PUBLIC_BASE_URL}/webhooks/twilio/${workspaceId}`;
    const params = req.body;

    const expectedSignature = twilio.validateRequest(
      authToken,
      twilioSignature,
      url,
      params
    );

    if (!expectedSignature) {
      console.warn("Twilio signature invalid");
      return res.sendStatus(403);
    }

    const from = req.body.From;
    const body = req.body.Body;

    console.log(`Mensaje WhatsApp de ${from}: ${body}`);

    // 🔹 Aquí integras tu IA (Aurora) para generar respuesta
    const reply = `Recibido por WhatsApp: "${body}"`;

    // Enviar respuesta
    // Enviar respuesta
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      from: `whatsapp:${creds.phoneNumber}`, // tu número de Twilio habilitado
      to: from, // ya viene como "whatsapp:+5217293141857"
      body: reply,
    });


    res.send("<Response></Response>");
  } catch (e) {
    console.error("Twilio webhook error:", e.message);
    res.sendStatus(200);
  }
});



app.post("/api/designs/save", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    // cliente con el JWT del usuario
    const userClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) return res.status(401).json({ message: "Invalid user" });
    const userId = userData.user.id;

    const { config } = req.body;
    if (!config) return res.status(400).json({ message: "Missing config" });

    // 🔹 Primero buscamos si ya existe
    let { data: existing, error: existingError } = await userClient
      .from("chatbot_designs")
      .select("user_id, widget_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) throw existingError;

    // 🔹 Si no existe, Supabase le asignará automáticamente un widget_id por defecto
    const { data, error } = await userClient
      .from("chatbot_designs")
      .upsert(
        {
          user_id: userId,
          config,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("user_id, widget_id, config")
      .single();

    if (error) throw error;

    // 🔹 Construir el widget_link con el widget_id que devuelve Supabase
    const widget_link = `<script src="${process.env.PUBLIC_BASE_URL}/widget.js" data-widget-id="${data.widget_id}"></script>`;

    // 🔹 Actualizamos el widget_link en la BD (opcional pero recomendable)
    await userClient
      .from("chatbot_designs")
      .update({ widget_link })
      .eq("user_id", userId);

    // 🔹 Respuesta final
    res.json({ status: "saved", design: { ...data, widget_link } });
  } catch (e) {
    console.error("Error saving design:", e);
    res.status(500).json({ message: e.message || "Server error" });
  }
});

// Ruta para obtener diseño por widget_id
app.get("/api/designs/:widget_id", async (req, res) => {
  try {
    const { widget_id } = req.params;

    console.log("Buscando widget_id:", widget_id);

    const { data, error } = await supabase
      .from("chatbot_designs")
      .select("config, widget_id")
      .eq("widget_id", widget_id)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ message: "Error consultando Supabase" });
    }

    if (!data) {
      return res.status(404).json({ message: "Widget no encontrado" });
    }

    res.json(data);
  } catch (e) {
    console.error("Error en GET /api/designs/:widget_id:", e);
    res.status(500).json({ message: e.message || "Server error" });
  }
});




app.get("/widget.js", (req, res) => {
  res.sendFile(path.join(__dirname, "widget.js"));
});

// ---------- Server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
