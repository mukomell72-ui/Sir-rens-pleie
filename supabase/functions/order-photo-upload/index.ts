import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://mukomell72-ui.github.io",
  "https://sir-rens.no",
  "https://www.sir-rens.no",
  "http://localhost:3000",
  "http://127.0.0.1:5500"
]);
const allowedTypes = new Set(["image/jpeg","image/png","image/webp","image/heic","image/heif"]);
const maxBytes = 10 * 1024 * 1024;
const maxPhotos = 5;

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allow = allowedOrigins.has(origin) ? origin : "https://mukomell72-ui.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" }
  });
}
async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,"0")).join("");
}
function safeExt(type: string) {
  return ({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/heic":"heic","image/heif":"heif"} as Record<string,string>)[type] || "bin";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(req, { error: "origin_not_allowed" }, 403);

  try {
    const form = await req.formData();
    const orderNo = String(form.get("order_no") || "").trim();
    const token = String(form.get("token") || "").trim();
    const file = form.get("file");
    if (!/^SIR-[A-Z0-9-]{4,30}$/.test(orderNo) || token.length < 32 || !(file instanceof File)) {
      return json(req, { error: "invalid_request" }, 400);
    }
    if (!allowedTypes.has(file.type) || file.size < 1 || file.size > maxBytes) {
      return json(req, { error: "invalid_file" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json(req, { error: "server_not_configured" }, 500);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id,public_token_hash,public_token_expires_at")
      .eq("order_no", orderNo)
      .maybeSingle();
    if (orderError || !order?.id || !order.public_token_hash) return json(req, { error: "order_not_found" }, 404);
    if (!order.public_token_expires_at || new Date(order.public_token_expires_at).getTime() < Date.now()) {
      return json(req, { error: "upload_window_expired" }, 403);
    }
    if ((await sha256Hex(token)) !== order.public_token_hash) return json(req, { error: "invalid_token" }, 403);

    const { count } = await admin.from("order_photos").select("id", { count: "exact", head: true }).eq("order_id", order.id);
    if ((count || 0) >= maxPhotos) return json(req, { error: "photo_limit_reached" }, 409);

    const path = `${order.id}/${crypto.randomUUID()}.${safeExt(file.type)}`;
    const { error: uploadError } = await admin.storage.from("order-photos").upload(path, file, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600"
    });
    if (uploadError) return json(req, { error: "upload_failed" }, 500);

    const { error: metaError } = await admin.from("order_photos").insert({
      order_id: order.id,
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size
    });
    if (metaError) {
      await admin.storage.from("order-photos").remove([path]);
      if ((metaError.message || "").toLowerCase().includes("photo limit reached")) {
        return json(req, { error: "photo_limit_reached" }, 409);
      }
      return json(req, { error: "metadata_failed" }, 500);
    }
    return json(req, { uploaded: true });
  } catch (_e) {
    return json(req, { error: "bad_request" }, 400);
  }
});
