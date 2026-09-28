const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const DEFAULT_LENGTH = 12;
const MIN_LENGTH = 8;
const MAX_LENGTH = 64;

function responseHeaders(origin, methods) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Accept",
    "Access-Control-Allow-Methods": methods,
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff"
  };
}

function json(body, status, origin, methods = "POST, OPTIONS") {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(origin, methods)
  });
}

function allowedOrigin(request, configuredOrigin) {
  const origin = request.headers.get("Origin") || "";

  if (configuredOrigin === "*") return "*";
  if (origin && origin === configuredOrigin) return origin;
  return null;
}

function maskLength(value) {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LENGTH;
  return Math.min(Math.max(parsed, MIN_LENGTH), MAX_LENGTH);
}

function addressDomain(value) {
  const domain = (value || "").trim().toLowerCase().replace(/^@/, "");
  const valid = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain);
  return valid ? domain : null;
}

function createLocalPart(length) {
  let value = "";
  const unbiasedLimit = 256 - (256 % ALPHABET.length);

  while (value.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));

    for (const byte of bytes) {
      if (byte >= unbiasedLimit) continue;
      value += ALPHABET[byte % ALPHABET.length];
      if (value.length === length) break;
    }
  }

  return value;
}

function forbidden() {
  return new Response(JSON.stringify({ error: "Orixe non autorizada" }), {
    status: 403,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env.ALLOWED_ORIGIN);
    if (!origin) return forbidden();

    const url = new URL(request.url);
    if (url.pathname !== "/") {
      return json({ error: "Ruta non atopada" }, 404, origin);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: responseHeaders(origin, "POST, OPTIONS")
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Método non permitido" }, 405, origin);
    }

    const domain = addressDomain(env.ADDRESS_DOMAIN);
    if (!domain) {
      return json({ error: "Dominio de correo incorrecto" }, 500, origin);
    }

    if (!env.CONTACT_RATE_LIMITER?.limit) {
      return json({ error: "Limitador de solicitudes non configurado" }, 500, origin);
    }

    const clientKey = request.headers.get("CF-Connecting-IP") || "unknown";
    const { success } = await env.CONTACT_RATE_LIMITER.limit({ key: `contact:${clientKey}` });

    if (!success) {
      return new Response(JSON.stringify({ error: "Demasiadas solicitudes" }), {
        status: 429,
        headers: {
          ...responseHeaders(origin, "POST, OPTIONS"),
          "Retry-After": "60"
        }
      });
    }

    const length = maskLength(env.MASK_LENGTH);
    return json({ address: `${createLocalPart(length)}@${domain}` }, 200, origin);
  }
};
