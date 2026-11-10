const { sendJson, base, readBody } = require("./_utils");
const { authUser, activatePro } = require("./_firebase");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, base("error", { error: "Method not allowed. Use POST with JSON." }));
  }
  let body;
  try { body = await readBody(req); }
  catch (error) { return sendJson(res, 400, base("error", { error: error.message })); }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const magicLink = typeof body.magicLink === "string" ? body.magicLink.trim() : (typeof body.link === "string" ? body.link.trim() : "");
  const customOrderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !magicLink) {
    return sendJson(res, 400, base("error", {
      error: "Both valid email and magicLink fields are required.",
      expected: { email: "user@example.com", magicLink: "https://...", orderId: "optional custom prefix" }
    }));
  }

  try {
    const auth = await authUser(email, magicLink);
    if (!auth.ok) return sendJson(res, 400, base("error", { message: "Magic-link verification failed.", error: auth.why }));

    const premium = await activatePro(auth.idToken, customOrderId || null);
    const now = new Date();
    const expiryMillis = premium?.result?.result?.expiryTimeMillis;
    const validUntil = expiryMillis ? new Date(Number(expiryMillis)) : (() => {
      const date = new Date(now);
      date.setFullYear(date.getFullYear() + 1);
      return date;
    })();

    const account = {
      uid: auth.uid || null,
      email: auth.user?.email || auth.email || email.toLowerCase(),
      status: premium.ok ? "ACTIVE" : "INACTIVE",
      membershipStatus: premium.ok ? "PREMIUM_ACTIVE" : "LOGIN_ONLY",
      planName: "Alight Motion Pro / Member",
      subscriptionType: "Yearly VIP License",
      orderId: premium.order,
      activatedAt: now.toISOString(),
      validUntil: validUntil.toISOString(),
      expiryTimestamp: validUntil.getTime(),
      isNewUser: auth.isNewUser,
      profile: auth.user || null
    };

    if (!premium.ok) {
      return sendJson(res, 400, base("error", {
        message: "Email-link authentication succeeded, but Premium activation failed.",
        data: { email: account.email, orderId: premium.order, account, activationError: premium.why, upstreamStatus: premium.httpStatus || null, upstream: premium.result || null }
      }));
    }
    return sendJson(res, 200, base("success", {
      message: "Alight Motion Pro activation request succeeded.",
      data: { email: account.email, orderId: premium.order, account, premiumDetails: premium.result }
    }));
  } catch (error) {
    return sendJson(res, 502, base("error", { error: error.message || "Authentication or Premium provider request failed." }));
  }
};
