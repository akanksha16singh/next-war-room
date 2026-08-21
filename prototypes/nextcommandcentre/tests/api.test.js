const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const crypto = require("node:crypto");

process.env.DATABASE_URL = path.join(os.tmpdir(), `next-test-api-${crypto.randomUUID()}.sqlite`);
process.env.ENABLE_SCHEDULER = "false";
process.env.CRON_SECRET = "test-secret";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

let server;
let baseUrl;

before(async () => {
  const app = require("../backend/server");
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  for (const suffix of ["", "-wal", "-shm"]) {
    try { fs.unlinkSync(process.env.DATABASE_URL + suffix); } catch (e) {}
  }
  // express-rate-limit's in-memory store keeps an interval timer alive for the
  // window duration; nothing else in the app keeps the event loop open after
  // the server closes, so force the process to end rather than let the test
  // runner sit and wait for a 60s+ rate-limit timer to expire.
  setImmediate(() => process.exit(0));
});

test("GET /api/health returns ok", async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
});

test("GET /api/dashboard returns the full bundle shape even with an empty database", async () => {
  const res = await fetch(`${baseUrl}/api/dashboard`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.moments, {});
  assert.equal(body.roles.length, 6);
  assert.equal(body.domains.length, 5);
  assert.ok(body.meta);
});

test("GET /api/sources lists every configured source with reliability metadata", async () => {
  const res = await fetch(`${baseUrl}/api/sources`);
  const body = await res.json();
  assert.ok(body.items.length >= 8);
  assert.ok(body.items.every((s) => typeof s.reliability === "number"));
});

test("GET /api/news validates a malformed date parameter", async () => {
  const res = await fetch(`${baseUrl}/api/news?date=not-a-date`);
  assert.equal(res.status, 400);
});

test("GET /api/news?date=today accepts the 'today' shorthand", async () => {
  const res = await fetch(`${baseUrl}/api/news?date=today`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.items, []);
});

test("GET /api/news/:id returns 404 for an unknown article", async () => {
  const res = await fetch(`${baseUrl}/api/news/does-not-exist`);
  assert.equal(res.status, 404);
});

test("GET /api/digest/today returns honest zero counts with no data ingested", async () => {
  const res = await fetch(`${baseUrl}/api/digest/today`);
  const body = await res.json();
  assert.equal(body.totals.articlesToday, 0);
  assert.deepEqual(body.topSignals, []);
});

test("POST /api/decisions rejects an unknown momentId", async () => {
  const res = await fetch(`${baseUrl}/api/decisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ momentId: "does-not-exist", action: "approve" }),
  });
  assert.equal(res.status, 404);
});

test("POST /api/decisions rejects an invalid action", async () => {
  const res = await fetch(`${baseUrl}/api/decisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ momentId: "whatever", action: "delete-everything" }),
  });
  assert.equal(res.status, 400);
});

test("POST /api/cron/news requires the configured secret", async () => {
  const unauthed = await fetch(`${baseUrl}/api/cron/news`, { method: "POST" });
  assert.equal(unauthed.status, 401);

  const authed = await fetch(`${baseUrl}/api/cron/news`, {
    method: "POST",
    headers: { "X-Cron-Secret": "test-secret" },
  });
  assert.equal(authed.status, 200);
});

test("unknown API route returns a JSON 404, not an HTML error page", async () => {
  const res = await fetch(`${baseUrl}/api/does-not-exist`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.ok(body.error);
});

test("GET / serves the front-end shell", async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.ok(text.includes("NEXT") || text.includes("x-dc"));
});
