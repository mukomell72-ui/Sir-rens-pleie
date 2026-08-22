const ALLOWED_ORIGINS = new Set([
  "https://mukomell72-ui.github.io",
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

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });
  }

  try {
    const { plate } = await req.json();
    const normalized = clean(plate).toUpperCase().replace(/\s+/g, "");
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
      console.error("Vegvesen upstream error", upstream.status, await upstream.text());
      return new Response(JSON.stringify({ ok: false, error: "upstream_error" }), { status: 502, headers });
    }

    const data = await upstream.json();
    const k = data?.kjoretoy ?? data;
    const technical = k?.godkjenning?.tekniskGodkjenning?.tekniskeData ?? {};
    const general = technical?.generelt ?? {};
    const bodyData = technical?.karosseriOgLasteplan ?? {};

    const brand = clean(general?.merke?.[0]?.merke);
    const model = clean(general?.handelsbetegnelse?.[0]) || clean(general?.typebetegnelse);
    const regDate = clean(k?.forstegangsregistrering?.registrertForstegangNorgeDato)
      || clean(k?.godkjenning?.forstegangsGodkjenning?.forstegangRegistrertDato);
    const yearMatch = regDate.match(/^(\d{4})/);
    const year = yearMatch ? yearMatch[1] : "";
    const body = clean(bodyData?.karosseritype?.kodeNavn) || clean(bodyData?.karosseritype?.kodeBeskrivelse);

    return new Response(JSON.stringify({
      ok: true,
      vehicle: {
        plate: normalized,
        brand,
        model,
        year,
        body,
      },
    }), { headers });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ ok: false, error: "internal_error" }), { status: 500, headers });
  }
});
