// designs.routes.js
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const router = express.Router();

// Conexión a Supabase con service key SOLO para DB
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

// 🔹 Helper para obtener el userId igual que en index.js
async function getUserIdFromAuth(req) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;

  // Usamos el cliente con ANON KEY solo para validar token
  const supabaseAuth = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user) return null;

  return data.user.id;
}

// Guardar o actualizar diseño
router.post("/", async (req, res) => {
  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const parse = saveSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: "Invalid payload",
        details: parse.error.errors,
      });
    }

    const { name = "default", config, previewSnapshot } = parse.data;
    const size = Buffer.byteLength(JSON.stringify(config), "utf8");
    if (size > 100 * 1024)
      return res.status(413).json({ error: "Config too big" });

    const record = {
      user_id: userId,
      name,
      config,
      preview_snapshot: previewSnapshot || null,
    };

    const { data, error } = await supabase
      .from("chat_designs")
      .upsert(record, {
        onConflict: ["user_id", "name"],
        returning: "representation",
      });

    if (error) return res.status(500).json({ error: "Database error" });

    res.json({ ok: true, design: data?.[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message || "Server error" });
  }
});

// Obtener diseño
router.get("/:name", async (req, res) => {
  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { name } = req.params;
    const { data, error } = await supabase
      .from("chat_designs")
      .select("*")
      .eq("user_id", userId)
      .eq("name", name)
      .single();

    if (error && error.code !== "PGRST116") {
      return res.status(500).json({ error: "Database error" });
    }
    if (!data) return res.status(404).json({ error: "Not found" });

    res.json({ ok: true, design: data });
  } catch (err) {
    res.status(500).json({ error: err.message || "Server error" });
  }
});

export default router;
