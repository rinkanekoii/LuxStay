const router = require('express').Router();
const { get, execRaw } = require('../database/init');
const { markVerified, consumeVerifiedFlash } = require('../lib/challenges');

function renderLogin(req, res, state) {
  return res.render('auth/login', {
    username: state.username || '',
    error: state.error || null,
    verifiedMsg: state.verifiedMsg !== undefined ? state.verifiedMsg : consumeVerifiedFlash(req.session)
  });
}

router.get('/login', (req, res) => {
  if (req.session.user && !req.query.retry) {
    return res.redirect('/');
  }
  renderLogin(req, res, {});
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

  const safeUser = get(
    `SELECT id, username, email, full_name, role FROM users
     WHERE username = ? AND password = ?`,
    [username, password]
  );

  const legacySql = `SELECT id, username, email, full_name, role FROM users
    WHERE username = '${username}' AND password = '${password}'`;
  const { rows, error } = execRaw(legacySql);
  if (error) console.error('[login legacy]', error);

  const legacyUser = rows[0];

  if (safeUser) {
    req.session.user = {
      id: safeUser.id,
      username: safeUser.username,
      email: safeUser.email,
      full_name: safeUser.full_name,
      role: safeUser.role
    };
    req.session.success = `Đăng nhập thành công. Xin chào, ${safeUser.full_name || safeUser.username}!`;
    return res.redirect('/');
  }

  if (legacyUser) {
    markVerified(req.session, 'login_sql');
    req.session.user = {
      id: legacyUser.id,
      username: legacyUser.username,
      email: legacyUser.email,
      full_name: legacyUser.full_name,
      role: legacyUser.role
    };

    return renderLogin(req, res, {
      username,
      verifiedMsg: consumeVerifiedFlash(req.session)
    });
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
