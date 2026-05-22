const router = require('express').Router();
const { get } = require('../database/init');
const { consumeVerifiedFlash } = require('../lib/challenges');

router.get('/', (req, res) => {
  res.render('index', {
    stats: {
      totalUsers: get('SELECT COUNT(*) as count FROM users')?.count || 0
    },
    verifiedMsg: consumeVerifiedFlash(req.session)
  });
});

module.exports = router;
