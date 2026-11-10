
const API_KEY =
  process.env.FIREBASE_API_KEY ||
  "AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0";

const IDT = "https://www.googleapis.com/identitytoolkit/v3/relyingparty";

const VERIFY_URL =
  process.env.AM_VERIFY_URL ||
  "https://us-central1-alight-creative.cloudfunctions.net/verifyPurchase";

const PURCHASE_TOKEN =
  process.env.AM_PURCHASE_TOKEN ||
  "ndnccldphehmcdeihplilfed.AO-J1OyW90adCvVh-FjXKdXV_K6wr82pxY7HQC65iRo0UgNuKeqhEOQ9BUN1qIlwXP3kdhdsTUy7pKTdP5jJbTWftXmOsiaMHIZbJtTvNcLHdrWf5wMGHdk";

const FIREBASE_INSTANCE_ID_TOKEN =
  process.env.FIREBASE_INSTANCE_ID_TOKEN ||
  "cSDnCyp3T-uwp07z3tL86T:APA91bFkmvvsHw5nnqa1SBFci-99DRsKClLiETdRrVcJjS5yBx1v_FbCb1d8WhBuea_zmwnYBktyTIzcRhN4b6uNOUur9wPc0gKXmJDoZic0LhNq5V2s0xI";

const ANDROID_HEADERS = {
  "content-type": "application/json",
  "x-android-package": "com.alightcreative.motion",
  "x-android-cert": "ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8",
  "user-agent":
    "dalvik/2.1.0 (linux; u; android 15; 23127pn0cc build/bp1a.250505.005)"
};

const VERIFY_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "user-agent": "okhttp/3.12.1",
  "accept-encoding": "gzip"
};

async function postIdentityToolkit(path, payload, key = API_KEY) {
  if (!key || typeof key !== "string") {
    throw new Error("Firebase API key is missing.");
  }

  const response = await fetch(
    `${IDT}/${path}?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: ANDROID_HEADERS,
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json().catch(() => ({}));

  return { response, data };
}

async function sendMagicLink(email) {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const { response, data } = await postIdentityToolkit(
      "getOobConfirmationCode",
      {
        requestType: 6,
        email: normalizedEmail,
        androidInstallApp: true,
        canHandleCodeInApp: true,
        continueUrl:
          "https://alightcreative.com?ui_sid=0366624874&ui_sd=0",
        iosBundleId: "com.alightcreative.motion",
        androidPackageName: "com.alightcreative.motion",
        androidMinimumVersion: "585",
        clientType: "CLIENT_TYPE_ANDROID"
      }
    );

    if (!response.ok) {
      return {
        ok: false,
        httpStatus: response.status,
        error:
          data?.error?.message ||
          "Upstream authentication request failed",
        upstream: data
      };
    }

    return {
      ok: true,
      email: normalizedEmail,
      upstream: data
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message || "Authentication provider request failed"
    };
  }
}

function extractCode(raw) {
  if (!raw) return null;

  let value = String(raw).replace(/&amp;/g, "&");

  try {
    value = decodeURIComponent(value);
  } catch (_) {}

  try {
    const url = new URL(value);
    let code = url.searchParams.get("oobCode");

    if (!code) {
      const nested =
        url.searchParams.get("link") ||
        url.searchParams.get("q") ||
        url.searchParams.get("url");

      if (nested) {
        try {
          code = new URL(nested).searchParams.get("oobCode");
        } catch (_) {}
      }
    }

    if (code) {
      return code.replace(/[^a-zA-Z0-9_-]/g, "");
    }
  } catch (_) {}

  const match = value.match(/[?&]oobCode=([a-zA-Z0-9_-]+)/i);

  if (match) return match[1];

  const trimmed = String(raw).trim();

  return /^[a-zA-Z0-9_-]{10,}$/.test(trimmed) &&
    !trimmed.includes("://")
    ? trimmed
    : null;
}

async function authUser(email, rawLink) {
  const code = extractCode(rawLink);

  if (!code) {
    return {
      ok: false,
      why: "oobCode tidak ditemukan di magicLink."
    };
  }

  let linkKey = null;

  const match = String(rawLink)
    .replace(/&amp;/g, "&")
    .match(/[?&]apiKey=([^&]+)/i);

  if (match) {
    try {
      linkKey = decodeURIComponent(match[1]);
    } catch (_) {
      linkKey = match[1];
    }
  }

  const keys =
    linkKey && linkKey !== API_KEY
      ? [API_KEY, linkKey]
      : [API_KEY];

  let lastError = "Magic-link verification failed.";

  for (const key of keys) {
    try {
      const { response, data } = await postIdentityToolkit(
        "emailLinkSignin",
        {
          email: email.trim().toLowerCase(),
          oobCode: code,
          clientType: "CLIENT_TYPE_ANDROID"
        },
        key
      );

      if (!response.ok) {
        lastError = data?.error?.message || JSON.stringify(data);
        continue;
      }

      let user = null;

      try {
        const account = await postIdentityToolkit(
          "getAccountInfo",
          { idToken: data.idToken },
          key
        );

        user = account.data?.users?.[0] || null;
      } catch (_) {}

      return {
        ok: true,
        email: email.trim().toLowerCase(),
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        uid: data.localId,
        isNewUser: !!data.isNewUser,
        user: user
          ? {
              localId: user.localId,
              email: user.email,
              emailVerified: !!user.emailVerified,
              displayName: user.displayName || null
            }
          : null
      };
    } catch (error) {
      lastError = error.message || String(error);
    }
  }

  return {
    ok: false,
    why: lastError
  };
}

// Pertahankan generator order ID dari source asli.
function generateOrderId(customPrefix = null) {
  const randomDigits = (length) => {
    let result = "";

    while (result.length < length) {
      result += Math.floor(Math.random() * 10).toString();
    }

    return result.slice(0, length);
  };

  const gpa =
    `GPA.${randomDigits(4)}-${randomDigits(4)}-` +
    `${randomDigits(4)}-${randomDigits(5)}`;

  if (!customPrefix || !String(customPrefix).trim()) {
    return `AixiCodex-${gpa}`;
  }

  const clean = String(customPrefix).trim();

  if (clean.includes("GPA.")) return clean;

  return `${clean}-${gpa}`;
}

async function activatePro(idToken, customOrderId = null) {
  const orderId = generateOrderId(customOrderId);

  const payload = {
    data: {
      productId: "am.full.sub.annual.19q4",
      token: PURCHASE_TOKEN,
      skuType: "subs",
      orderId
    }
  };

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: {
        ...VERIFY_HEADERS,
        authorization: `Bearer ${idToken}`,
        "firebase-instance-id-token": FIREBASE_INSTANCE_ID_TOKEN
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (
      !response.ok ||
      (
        data?.result?.status !== "success" &&
        !data?.result?.valid
      )
    ) {
      return {
        ok: false,
        order: orderId,
        httpStatus: response.status,
        why: JSON.stringify(data),
        result: data
      };
    }

    return {
      ok: true,
      order: orderId,
      result: data
    };
  } catch (error) {
    return {
      ok: false,
      order: orderId,
      why: error.message || String(error)
    };
  }
}

module.exports = {
  sendMagicLink,
  authUser,
  activatePro,
  generateOrderId
};
