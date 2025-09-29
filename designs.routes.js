// designs.routes.js
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const router = express.Router();

// Conexión a Supabase con la service key (solo backend)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Validación del payload
const saveSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  config: z.any(),
  previewSnapshot: z.string().max(20000).optional(),
});

// Middleware para autenticar al usuario
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: "Invalid token" });

  req.user = data.user;
  next();
}

// Guardar o actualizar diseño
router.post("/", requireAuth, async (req, res) => {
  const parse = saveSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid payload", details: parse.error.errors });
  }

  const { name = "default", config, previewSnapshot } = parse.data;
  const size = Buffer.byteLength(JSON.stringify(config), "utf8");
  if (size > 100 * 1024) return res.status(413).json({ error: "Config too big" });

  const record = {
    user_id: req.user.id,
    name,
    config,
    preview_snapshot: previewSnapshot || null,
  };

  const { data, error } = await supabase
    .from("chat_designs")
    .upsert(record, { onConflict: ["user_id", "name"], returning: "representation" });

  if (error) return res.status(500).json({ error: "Database error" });

  res.json({ ok: true, design: data?.[0] || null });
});

// Obtener diseño
router.get("/:name", requireAuth, async (req, res) => {
  const { name } = req.params;
  const { data, error } = await supabase
    .from("chat_designs")
    .select("*")
    .eq("user_id", req.user.id)
    .eq("name", name)
    .single();

  if (error && error.code !== "PGRST116") {
    return res.status(500).json({ error: "Database error" });
  }
  if (!data) return res.status(404).json({ error: "Not found" });

  res.json({ ok: true, design: data });
});

export default router;
