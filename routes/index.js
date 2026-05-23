const router = require('express').Router();
const { get, all } = require('../database/init');

function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.error = 'Vui lòng đăng nhập để vào dashboard.';
    return res.redirect('/auth/login');
  }
  return next();
}

function bookingRowsFor(user) {
  const sql = user.role === 'admin'
    ? `SELECT b.*, r.name AS room_name, r.city, r.image, u.full_name AS guest_name
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN users u ON u.id = b.user_id
       ORDER BY b.id DESC
       LIMIT 8`
    : `SELECT b.*, r.name AS room_name, r.city, r.image, u.full_name AS guest_name
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN users u ON u.id = b.user_id
       WHERE b.user_id = ?
       ORDER BY b.id DESC
       LIMIT 8`;

  return user.role === 'admin' ? all(sql) : all(sql, [user.id]);
}

router.get('/', (req, res) => {
  const featuredRooms = all(
    `SELECT id, name, city, type, description, image, price_per_night, max_guests, rating
     FROM rooms
     WHERE is_available = 1
     ORDER BY rating DESC, price_per_night DESC
     LIMIT 3`
  );

  res.render('index', { featuredRooms });
});

router.get('/dashboard', requireAuth, (req, res) => {
  const recentMessages = req.session.user.role === 'admin'
    ? all(
      `SELECT id, sender_name, body, created_at
       FROM contact_messages
       ORDER BY id DESC
       LIMIT 4`
    )
    : [];

  const recommendedRooms = all(
    `SELECT id, name, city, type, image, price_per_night, rating
     FROM rooms
     WHERE is_available = 1
     ORDER BY rating DESC
     LIMIT 3`
  );

  res.render('dashboard', {
    bookings: bookingRowsFor(req.session.user),
    recentMessages,
    recommendedRooms
  });
});

module.exports = router;
