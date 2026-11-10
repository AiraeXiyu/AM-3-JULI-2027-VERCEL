const { sendJson, base } = require("./_utils");

module.exports = (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, base("error", { error: "Method not allowed" }));
  }
  return sendJson(res, 200, base("success", {
    total_saved: 0,
    accounts: [],
    note: "No account history is stored by this safe starter project."
  }));
};
