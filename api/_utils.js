function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload, null, 2));
}

function base(status, extra = {}) {
  return {
    status,
    developer: "XIYU",
    service: "XIYU API PRIVATE",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    ...extra
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error("Request body must be valid JSON")); }
    });
    req.on("error", reject);
  });
}

module.exports = { sendJson, base, readBody };
