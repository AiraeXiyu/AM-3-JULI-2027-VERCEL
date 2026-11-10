const { sendJson, base } = require("./_utils");
module.exports = (req, res) => {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return sendJson(res, 405, base("error", { error: "Method not allowed" })); }
  return sendJson(res, 200, base("success", { status: "Operational", total_endpoints: 7, persistent_storage: false, note: "Serverless runtime; no account tokens or authentication history are stored." }));
};
