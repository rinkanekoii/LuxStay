const router = require('express').Router();
const { run, get } = require('../database/init');

router.get('/', (req, res) => {
  res.render('contact/form', {
    senderName: ''
  });
});

router.post('/', (req, res) => {
  const senderName = (req.body.sender_name || '').trim().slice(0, 80);
  const body = (req.body.body || '').trim();

  if (!body) {
    return res.render('contact/form', {
      senderName,
      error: 'Nội dung không được để trống.'
    });
  }

  if (body.length > 2000) {
    return res.render('contact/form', {
      senderName,
      error: 'Nội dung tối đa 2000 ký tự.'
    });
  }

  const result = run(
    'INSERT INTO contact_messages (sender_name, body) VALUES (?, ?)',
    [senderName || 'Khách', body]
  );

  res.redirect(`/contact/xem/${result.lastInsertRowid}`);
});

router.get('/xem/:id', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    return res.status(400).render('error', {
      error: { status: 400, message: 'Mã nội dung không hợp lệ.' }
    });
  }

  const row = get('SELECT * FROM contact_messages WHERE id = ?', [id]);

  if (!row) {
    return res.status(404).render('error', {
      error: { status: 404, message: 'Không tìm thấy nội dung.' }
    });
  }


  res.render('contact/view', {
    message: row
  });
});

module.exports = router;
