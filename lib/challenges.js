/** Phát hiện khai thác thành công (không hiển thị gợi ý trên UI) */

const XSS_RE = /<script|<img|onerror\s*=|onload\s*=|<svg|javascript:|<iframe|onfocus\s*=/i;

const VERIFIED_MSG = 'Thông tin đã được xác minh thành công.';

function markVerified(session, key) {
  if (!session.verified) session.verified = {};
  if (!session.verified[key]) {
    session.verified[key] = true;
    session.showVerified = true;
  }
}

function consumeVerifiedFlash(session) {
  if (!session.showVerified) return null;
  delete session.showVerified;
  return VERIFIED_MSG;
}

function looksLikeXss(value) {
  return typeof value === 'string' && XSS_RE.test(value);
}

module.exports = {
  markVerified,
  consumeVerifiedFlash,
  looksLikeXss
};
