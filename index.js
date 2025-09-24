// index.js
import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";

const app = express();
app.use(cors());
app.use(bodyParser.json());

dotenv.config();

// ---------- Supabase ----------
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Helpers
const PROVIDERS = ["telegram"];

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

  return data.user.id;
}

// Conectar / guardar credenciales
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
      user_id: userId,
    });

    if (error) throw error;
    res.json({ status: "connected" });
  } catch (e) {
    res.status(500).json({ message: e.message || "Server error" });
  }
});

// Probar integración
app.post("/api/integrations/:provider/test", async (req, res) => {
  try {
    const { provider } = req.params;
    const { workspaceId, action, webhookUrl } = req.body || {};

    if (!PROVIDERS.includes(provider)) return res.status(400).json({ message: "Invalid provider" });
    if (!workspaceId) return res.status(400).json({ message: "Missing workspaceId" });

    const creds = await getCredentials(workspaceId, provider);
    if (!creds) return res.status(400).json({ message: "Not connected" });

    // --- Telegram ---
    const token = creds.bot_token;
    if (!token) return res.status(400).json({ message: "Missing bot_token" });

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

    const test = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const j = await test.json();
    if (!j.ok) return res.status(400).json({ message: j.description || "Invalid token" });
    return res.json({ ok: true, bot: j.result?.username });
  } catch (e) {
    res.status(500).json({ message: e.message || "Server error" });
  }
});

// Desconectar
app.delete("/api/integrations/:provider/disconnect", async (req, res) => {
  try {
    const { provider } = req.params;
    const workspaceId = req.body?.workspaceId || req.query.workspaceId;

    if (!PROVIDERS.includes(provider)) return res.status(400).json({ message: "Invalid provider" });
    if (!workspaceId) return res.status(400).json({ message: "Missing workspaceId" });

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

// Estado
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
});

// ---------- Server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
