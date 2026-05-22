const router = require('express').Router();
const { run, get } = require('../database/init');
const { markVerified, consumeVerifiedFlash, looksLikeXss } = require('../lib/challenges');

router.get('/', (req, res) => {
  res.render('contact/form', {
    verifiedMsg: consumeVerifiedFlash(req.session),
    senderName: ''
  });
});

router.post('/', (req, res) => {
  const senderName = (req.body.sender_name || '').trim();
  const body = (req.body.body || '').trim();

  if (!body) {
    return res.render('contact/form', {
      verifiedMsg: consumeVerifiedFlash(req.session),
      senderName,
      error: 'Nội dung không được để trống.'
    });
  }

  const result = run(
    'INSERT INTO contact_messages (sender_name, body) VALUES (?, ?)',
    [senderName || 'Khách', body]
  );

  res.redirect(`/contact/xem/${result.lastInsertRowid}`);
});

router.get('/xem/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = get('SELECT * FROM contact_messages WHERE id = ?', [id]);

  if (!row) {
    return res.status(404).render('error', {
      error: { status: 404, message: 'Không tìm thấy nội dung.' }
    });
  }

  if (looksLikeXss(row.body)) {
    markVerified(req.session, 'stored_xss');
  }

  res.render('contact/view', {
    message: row,
    verifiedMsg: consumeVerifiedFlash(req.session)
  });
});

module.exports = router;
