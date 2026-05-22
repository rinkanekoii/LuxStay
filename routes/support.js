const router = require('express').Router();
const { get, execRaw } = require('../database/init');
const { markVerified, consumeVerifiedFlash } = require('../lib/challenges');

router.get('/member', (req, res) => {
  res.render('support/member', {
    code: req.query.code || '',
    result: null,
    verifiedMsg: consumeVerifiedFlash(req.session)
  });
});

router.post('/member', (req, res) => {
  const code = (req.body.code || '').trim();

  if (!code) {
    return res.render('support/member', {
      code: '',
      result: { ok: false, text: 'Vui lòng nhập mã nhân viên.' },
      verifiedMsg: consumeVerifiedFlash(req.session)
    });
  }

  const safeHit = get('SELECT id FROM users WHERE member_code = ?', [code]);

  const legacySql = `SELECT id FROM users WHERE member_code = '${code}'`;
  const { rows, error } = execRaw(legacySql);
  if (error) console.error('[support/member]', error);

  const legacyHit = rows.length > 0;

  if (legacyHit && !safeHit) {
    markVerified(req.session, 'member_sql');
  }

  const result = legacyHit
    ? { ok: true, text: 'Mã nhân viên hợp lệ.' }
    : { ok: false, text: 'Mã nhân viên không tồn tại trong hệ thống.' };

  res.render('support/member', {
    code,
    result,
    verifiedMsg: consumeVerifiedFlash(req.session)
  });
});

module.exports = router;
