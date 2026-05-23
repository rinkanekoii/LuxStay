const router = require('express').Router();
const { all, get, run } = require('../database/init');

function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.error = 'Vui lòng đăng nhập để đặt phòng.';
    return res.redirect('/auth/login');
  }
  return next();
}

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calculateNights(checkIn, checkOut) {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / (24 * 60 * 60 * 1000));
}

function bookingListSql(whereClause = '') {
  return `SELECT b.*, r.name AS room_name, r.city, r.type, r.image, r.price_per_night, u.full_name AS guest_name
    FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    JOIN users u ON u.id = b.user_id
    ${whereClause}
    ORDER BY b.id DESC`;
}

router.use(requireAuth);

router.get('/', (req, res) => {
  const user = req.session.user;
  const bookings = user.role === 'admin'
    ? all(bookingListSql())
    : all(bookingListSql('WHERE b.user_id = ?'), [user.id]);

  res.render('bookings/index', { bookings });
});

router.get('/new/:roomId', (req, res) => {
  const roomId = Number.parseInt(req.params.roomId, 10);
  const room = get('SELECT * FROM rooms WHERE id = ? AND is_available = 1', [roomId]);

  if (!room) {
    return res.status(404).render('error', {
      error: { status: 404, message: 'Không tìm thấy phòng có thể đặt.' }
    });
  }

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextDay = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const toIsoDate = (date) => date.toISOString().slice(0, 10);

  res.render('bookings/new', {
    room,
    form: {
      check_in: req.query.check_in || toIsoDate(tomorrow),
      check_out: req.query.check_out || toIsoDate(nextDay),
      guests: req.query.guests || 1,
      note: ''
    },
    formError: null
  });
});

router.post('/', (req, res) => {
  const roomId = Number.parseInt(req.body.room_id, 10);
  const guests = Number.parseInt(req.body.guests, 10);
  const checkIn = parseDate(req.body.check_in);
  const checkOut = parseDate(req.body.check_out);
  const note = String(req.body.note || '').trim().slice(0, 500);
  const room = get('SELECT * FROM rooms WHERE id = ? AND is_available = 1', [roomId]);

  function rerender(message) {
    return res.status(400).render('bookings/new', {
      room,
      form: {
        check_in: req.body.check_in || '',
        check_out: req.body.check_out || '',
        guests: req.body.guests || 1,
        note
      },
      formError: message
    });
  }

  if (!room) {
    return res.status(404).render('error', {
      error: { status: 404, message: 'Không tìm thấy phòng có thể đặt.' }
    });
  }

  if (!checkIn || !checkOut) return rerender('Ngày nhận và trả phòng không hợp lệ.');

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (checkIn < today) return rerender('Ngày nhận phòng không được nằm trong quá khứ.');

  const nights = calculateNights(checkIn, checkOut);
  if (nights < 1) return rerender('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.');

  if (!Number.isInteger(guests) || guests < 1 || guests > room.max_guests) {
    return rerender(`Số khách phải từ 1 đến ${room.max_guests}.`);
  }

  const totalPrice = nights * Number(room.price_per_night);
  const result = run(
    `INSERT INTO bookings (user_id, room_id, check_in, check_out, guests, total_price, status, note)
     VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
    [req.session.user.id, room.id, req.body.check_in, req.body.check_out, guests, totalPrice, note]
  );

  req.session.success = 'Đặt phòng thành công.';
  return res.redirect(`/bookings#booking-${result.lastInsertRowid}`);
});

router.post('/:id/cancel', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    return res.status(400).render('error', {
      error: { status: 400, message: 'Mã booking không hợp lệ.' }
    });
  }

  const booking = get('SELECT * FROM bookings WHERE id = ?', [id]);
  if (!booking) {
    return res.status(404).render('error', {
      error: { status: 404, message: 'Không tìm thấy booking.' }
    });
  }

  const canCancel = req.session.user.role === 'admin' || Number(booking.user_id) === Number(req.session.user.id);
  if (!canCancel) {
    return res.status(403).render('error', {
      error: { status: 403, message: 'Bạn không có quyền hủy booking này.' }
    });
  }

  run(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`, [id]);
  req.session.success = 'Đã hủy booking.';
  return res.redirect('/bookings');
});

module.exports = router;
