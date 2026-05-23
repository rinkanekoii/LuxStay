const router = require('express').Router();
const { get } = require('../database/init');
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

  const hit = get('SELECT id FROM users WHERE member_code = ?', [code]);

  const result = hit
    ? { ok: true, text: 'Mã nhân viên hợp lệ.' }
    : { ok: false, text: 'Mã nhân viên không tồn tại trong hệ thống.' };

  res.render('support/member', {
    code,
    result,
    verifiedMsg: consumeVerifiedFlash(req.session)
  });
});

module.exports = router;
