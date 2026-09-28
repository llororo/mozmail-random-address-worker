import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/index.js";

function environment(success = true) {
  return {
    ADDRESS_DOMAIN: "example.mozmail.com",
    ALLOWED_ORIGIN: "https://example.com",
    MASK_LENGTH: "12",
    CONTACT_RATE_LIMITER: {
      async limit() {
        return { success };
      }
    }
  };
}

test("xera un enderezo aleatorio coa lonxitude configurada", async () => {
  const request = new Request("https://worker.example/", {
    method: "POST",
    headers: {
      Origin: "https://example.com",
      "CF-Connecting-IP": "192.0.2.1"
    }
  });
  const response = await worker.fetch(request, environment());
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.match(data.address, /^[a-z0-9]{12}@example\.mozmail\.com$/);
});

test("rexeita as orixes non autorizadas", async () => {
  const request = new Request("https://worker.example/", {
    method: "POST",
    headers: { Origin: "https://outro.example" }
  });
  const response = await worker.fetch(request, environment());

  assert.equal(response.status, 403);
});

test("aplica o límite de solicitudes", async () => {
  const request = new Request("https://worker.example/", {
    method: "POST",
    headers: { Origin: "https://example.com" }
  });
  const response = await worker.fetch(request, environment(false));

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
});
