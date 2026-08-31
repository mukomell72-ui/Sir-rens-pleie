const ALLOWED_ORIGINS = new Set([
  "https://mukomell72-ui.github.io",
  "https://sir-rens.no",
  "https://www.sir-rens.no",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function cors(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://mukomell72-ui.github.io";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

  const forwarded = clean(req.headers.get("cf-connecting-ip"))
    || clean(req.headers.get("x-forwarded-for")?.split(",")[0]);
  const userAgent = clean(req.headers.get("user-agent"));
  const origin = clean(req.headers.get("origin"));
  const clientHash = await sha256Hex(`${forwarded || "unknown"}|${userAgent}|${origin}`);

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/internal_consume_vehicle_lookup_quota`, {
    method: "POST",
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_client_hash: clientHash }),
  });

  if (!response.ok) {
    console.error("Vehicle lookup rate limiter error", response.status);
    throw new Error("rate_limit_unavailable");
  }

  return (await response.json()) === true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });
  }

  try {
    const quotaAllowed = await consumeQuota(req);
    if (!quotaAllowed) {
      return new Response(JSON.stringify({ ok: false, error: "rate_limited" }), { status: 429, headers });
    }

    const body = await req.json();
    const normalized = clean(body?.registrationNumber ?? body?.plate).toUpperCase().replace(/\s+/g, "");
    if (!/^[A-ZÆØÅ0-9]{2,10}$/.test(normalized)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_plate" }), { status: 400, headers });
    }

    const apiKey = Deno.env.get("VEGVESEN_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "server_not_configured" }), { status: 503, headers });
    }

    const url = new URL("https://www.vegvesen.no/ws/no/vegvesen/kjoretoy/felles/datautlevering/enkeltoppslag/kjoretoydata");
    url.searchParams.set("kjennemerke", normalized);

    const upstream = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "SVV-Authorization": `Apikey ${apiKey}`,
      },
    });

    if (upstream.status === 404) {
      return new Response(JSON.stringify({ ok: false, error: "not_found" }), { status: 404, headers });
    }
    if (!upstream.ok) {
      console.error("Vegvesen upstream error", upstream.status);
      return new Response(JSON.stringify({ ok: false, error: "upstream_error" }), { status: 502, headers });
    }

    const data = await upstream.json();
    const k = Array.isArray(data?.kjoretoydataListe)
      ? data.kjoretoydataListe[0]
      : (data?.kjoretoy ?? data);
    if (!k) {
      return new Response(JSON.stringify({ ok: false, error: "not_found" }), { status: 404, headers });
    }

    const technical = k?.godkjenning?.tekniskGodkjenning?.tekniskeData ?? {};
    const general = technical?.generelt ?? {};
    const bodyData = technical?.karosseriOgLasteplan ?? {};

    const brand = clean(general?.merke?.[0]?.merke);
    const model = clean(general?.handelsbetegnelse?.[0]) || clean(general?.typebetegnelse);
    const regDate = clean(k?.forstegangsregistrering?.registrertForstegangNorgeDato)
      || clean(k?.godkjenning?.forstegangsGodkjenning?.forstegangRegistrertDato);
    const yearMatch = regDate.match(/^(\d{4})/);
    const year = yearMatch ? yearMatch[1] : "";
    const bodyType = bodyData?.karosseritype;
    const vehicleBody = clean(bodyType?.kodeNavn) || clean(bodyType?.kodeBeskrivelse);
    const vehicle = { plate: normalized, brand, model, year, body: vehicleBody };

    return new Response(JSON.stringify({ ok: true, ...vehicle, vehicle }), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "vehicle_lookup_error";
    console.error(message);
    if (message === "rate_limit_not_configured" || message === "rate_limit_unavailable") {
      return new Response(JSON.stringify({ ok: false, error: "rate_limit_unavailable" }), { status: 503, headers });
    }
    return new Response(JSON.stringify({ ok: false, error: "internal_error" }), { status: 500, headers });
  }
});
