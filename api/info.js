const { sendJson, base } = require("./_utils");
module.exports = (req, res) => {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return sendJson(res, 405, base("error", { error: "Method not allowed" })); }
  const origin = `https://${req.headers.host || "your-project.vercel.app"}`;
  return sendJson(res, 200, base("online", { base_url: origin, endpoints: [
    { path: "/api/send", method: "POST", description: "Request an email magic link" },
    { path: "/api/verif", method: "POST", description: "Verify/sign in with a magic link" },
    { path: "/api/verify", method: "POST", description: "Alias for /api/verif" },
    { path: "/api/history", method: "GET", description: "History status" },
    { path: "/api/health", method: "GET", description: "Health check" },
    { path: "/api/stats", method: "GET", description: "Service statistics" }
  ] }));
};
