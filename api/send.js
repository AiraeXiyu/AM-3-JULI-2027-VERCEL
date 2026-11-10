const { sendJson, base, readBody } = require("./_utils");
const { sendMagicLink } = require("./_firebase");
module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return sendJson(res, 405, base("error", { error: "Method not allowed. Use POST with JSON." })); }
  let body; try { body = await readBody(req); } catch (err) { return sendJson(res, 400, base("error", { error: err.message })); }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, base("error", { error: "A valid email field is required." }));
  try {
    const result = await sendMagicLink(email);
    if (!result.ok) return sendJson(res, result.httpStatus && result.httpStatus >= 400 ? 502 : 400, base("error", { message: "Magic link could not be sent.", error: result.error, upstream: result.upstream || undefined }));
    return sendJson(res, 200, base("success", { message: "Magic-link request accepted by the authentication provider.", data: { email: email.toLowerCase() } }));
  } catch (err) { return sendJson(res, 502, base("error", { error: err.message || "Authentication provider request failed." })); }
};
