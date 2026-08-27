const ALLOWED_ORIGINS = new Set([
  "https://acewalt.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  return /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
}

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (isAllowedOrigin(origin) && origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function jsonResponse(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(origin),
    },
  });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeVisitorId(value) {
  const visitorId = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(visitorId)) return "";
  return visitorId;
}

async function readJsonBody(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return {};
  return await request.json().catch(() => ({}));
}

async function getCounter(db, name) {
  const row = await db.prepare("SELECT value FROM stats WHERE name = ?").bind(name).first();
  return Number(row?.value || 0);
}

async function incrementCounter(db, name, amount = 1) {
  const row = await db.prepare(`
    INSERT INTO stats (name, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(name) DO UPDATE SET
      value = value + excluded.value,
      updated_at = CURRENT_TIMESTAMP
    RETURNING value
  `).bind(name, amount).first();
  return Number(row?.value || 0);
}

async function getVisitorStats(db, visitDate) {
  const row = await db.prepare(`
    SELECT
      SUM(CASE WHEN visit_date = ? THEN 1 ELSE 0 END) AS visitors_today,
      COUNT(DISTINCT visitor_id) AS total_visitors
    FROM daily_visitors
  `).bind(visitDate).first();

  return {
    visitorsToday: Number(row?.visitors_today || 0),
    totalVisitors: Number(row?.total_visitors || 0),
  };
}

async function readStats(db) {
  const visitDate = todayKey();
  const documentsGenerated = await getCounter(db, "documents_generated");
  const { visitorsToday, totalVisitors } = await getVisitorStats(db, visitDate);
  return { documentsGenerated, visitorsToday, totalVisitors };
}

async function handleRequest(request, env) {
  const origin = request.headers.get("Origin") || "";
  if (!isAllowedOrigin(origin)) {
    return jsonResponse({ error: "Origin not allowed" }, 403, origin);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (!env.DB) {
    return jsonResponse({ error: "D1 binding DB is missing" }, 500, origin);
  }

  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/stats") {
    return jsonResponse(await readStats(env.DB), 200, origin);
  }

  if (request.method === "POST" && url.pathname === "/api/generated") {
    const documentsGenerated = await incrementCounter(env.DB, "documents_generated", 1);
    const { visitorsToday, totalVisitors } = await getVisitorStats(env.DB, todayKey());
    return jsonResponse({ documentsGenerated, visitorsToday, totalVisitors }, 200, origin);
  }

  if (request.method === "POST" && url.pathname === "/api/visit") {
    const payload = await readJsonBody(request);
    const visitorId = normalizeVisitorId(payload.visitorId);
    if (!visitorId) {
      return jsonResponse({ error: "Invalid visitorId" }, 400, origin);
    }
    const visitDate = todayKey();
    await env.DB.prepare(`
      INSERT OR IGNORE INTO daily_visitors (visit_date, visitor_id)
      VALUES (?, ?)
    `).bind(visitDate, visitorId).run();
    const { visitorsToday, totalVisitors } = await getVisitorStats(env.DB, visitDate);
    const documentsGenerated = await getCounter(env.DB, "documents_generated");
    return jsonResponse({ documentsGenerated, visitorsToday, totalVisitors }, 200, origin);
  }

  if (request.method === "GET" && url.pathname === "/") {
    return jsonResponse({
      ok: true,
      endpoints: ["/api/stats", "/api/generated", "/api/visit"],
    }, 200, origin);
  }

  return jsonResponse({ error: "Not found" }, 404, origin);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env).catch((error) => {
      const origin = request.headers.get("Origin") || "";
      return jsonResponse({ error: error?.message || "Internal error" }, 500, origin);
    });
  },
};
