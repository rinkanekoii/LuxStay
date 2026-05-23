const router = require('express').Router();
const { get } = require('../database/init');

function renderLogin(req, res, state) {
  return res.render('auth/login', {
    username: state.username || '',
    error: state.error || null
  });
}

function startSession(req, res, user) {
  req.session.regenerate((err) => {
    if (err) {
      console.error('[session regenerate]', err);
      return res.status(500).render('error', {
        error: { status: 500, message: 'Không thể tạo phiên đăng nhập mới.' }
      });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };

    req.session.success = `Đăng nhập thành công. Xin chào, ${user.full_name || user.username}!`;
    return res.redirect('/dashboard');
  });
}

router.get('/login', (req, res) => {
  if (req.session.user && !req.query.retry) {
    return res.redirect('/dashboard');
  }
  return renderLogin(req, res, {});
});

router.post('/login', (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';

  if (!username || !password) {
    return renderLogin(req, res, {
      username,
      error: 'Tên đăng nhập và mật khẩu không được để trống.'
    });
  }

  const user = get(
    `SELECT id, username, email, full_name, role FROM users
     WHERE username = ? AND password = ?`,
    [username, password]
  );

  if (user) {
    return startSession(req, res, user);
  }

  return renderLogin(req, res, {
    username,
    error: 'Tên đăng nhập hoặc mật khẩu không đúng.'
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
