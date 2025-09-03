// backend/services/captchaService.js
/**
 * verifyRecaptcha(token)
 * - If RECAPTCHA_SECRET is not configured, function returns { success: true, dev: true }
 * - Otherwise it posts to Google's API to verify using global fetch (Node 18+ / Node 22)
 */
async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) {
    // dev mode: no captcha configured -> skip verification
    return { success: true, dev: true };
  }
  if (!token) {
    return { success: false, error: 'no-token' };
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);

    // Use global fetch (Node 18+). No node-fetch dependency required.
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: params,
    });
    const json = await res.json();
    return json;
  } catch (err) {
    return { success: false, error: 'captcha-verification-failed', details: err.message };
  }
}

module.exports = { verifyRecaptcha };
