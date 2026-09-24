import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://mukomell72-ui.github.io",
  "https://sir-rens.no",
  "https://www.sir-rens.no",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5500",
]);

const KONGSBERG = { lat: 59.6686, lon: 9.6502 };

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "https://mukomell72-ui.github.io";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(req),
      "Cache-Control": status === 200 ? "public, max-age=86400" : "no-store",
    },
  });
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function consumeQuota(req: Request): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new Error("rate_limit_not_configured");

  const forwarded = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "").trim();
  const userAgent = (req.headers.get("user-agent") || "").trim();
  const origin = (req.headers.get("origin") || "").trim();
  const clientHash = await sha256Hex(`postal|${forwarded || "unknown"}|${userAgent}|${origin}`);

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/internal_consume_vehicle_lookup_quota`, {
    method: "POST",
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_client_hash: clientHash }),
  });
  if (!response.ok) throw new Error("rate_limit_unavailable");
  return (await response.json()) === true;
}

function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = (n: number) => n * Math.PI / 180;
  const R = 6371;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(req, { error: "origin_not_allowed" }, 403);
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  try {
    if (!(await consumeQuota(req))) return json(req, { error: "rate_limited" }, 429);
  } catch {
    return json(req, { error: "rate_limit_unavailable" }, 503);
  }

  let postalCode = "";
  try {
    postalCode = String((await req.json())?.postalCode || "").trim();
  } catch {
    return json(req, { error: "invalid_json" }, 400);
  }
  if (!/^\d{4}$/.test(postalCode)) {
    return json(req, { error: "invalid_postal_code" }, 400);
  }

  try {
    const geoResponse = await fetch(
      `https://ws.geonorge.no/adresser/v1/sok?postnummer=${encodeURIComponent(postalCode)}&treffPerSide=100`,
      { headers: { "User-Agent": "SIR-Rens-Pleie/1.0" } },
    );
    if (!geoResponse.ok) return json(req, { error: "geonorge_unavailable" }, 502);

    const geo = await geoResponse.json();
    const addresses = Array.isArray(geo?.adresser) ? geo.adresser : [];
    if (!addresses.length) return json(req, { error: "not_found" }, 404);

    const points = addresses
      .map((address: any) => address?.representasjonspunkt)
      .filter((point: any) => Number.isFinite(point?.lat) && Number.isFinite(point?.lon));
    if (!points.length) return json(req, { error: "coordinates_unavailable" }, 502);

    const point = points.reduce(
      (sum: { lat: number; lon: number }, current: { lat: number; lon: number }) => ({
        lat: sum.lat + current.lat,
        lon: sum.lon + current.lon,
      }),
      { lat: 0, lon: 0 },
    );
    point.lat /= points.length;
    point.lon /= points.length;

    let distanceKm: number;
    let method = "estimated";
    try {
      const routeResponse = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${point.lon},${point.lat};${KONGSBERG.lon},${KONGSBERG.lat}?overview=false`,
        { headers: { "User-Agent": "SIR-Rens-Pleie/1.0" } },
      );
      const route = await routeResponse.json();
      const metres = route?.routes?.[0]?.distance;
      if (!routeResponse.ok || !Number.isFinite(metres)) throw new Error("route_unavailable");
      distanceKm = Math.round(metres / 1000);
      method = "road";
    } catch {
      distanceKm = Math.round(haversine(point, KONGSBERG) * 1.2);
    }

    return json(req, {
      postalCode,
      city: String(addresses[0].poststed || ""),
      municipality: String(addresses[0].kommunenavn || ""),
      distanceKm,
      method,
      approximate: true,
    });
  } catch {
    return json(req, { error: "lookup_failed" }, 502);
  }
});
