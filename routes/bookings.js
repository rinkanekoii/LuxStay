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

function isLabMode() {
  return process.env.LAB_MODE === 'true' && process.env.NODE_ENV !== 'production';
}

function requireAdmin(req, res, next) {
  if (req.session.user.role !== 'admin') {
    return res.status(403).render('error', {
      error: { status: 403, message: 'Bạn không có quyền xem báo cáo này.' }
    });
  }

  return next();
}

function reportDimension(value) {
  const selected = String(value || 'city').trim();
  return {
    city: 'r.city',
    status: 'b.status',
    month: "substr(b.check_in, 1, 7)",
    room_type: 'r.type'
  }[selected] || 'r.city';
}

function reportOrder(value) {
  const selected = String(value || 'revenue_desc').trim();
  return {
    revenue_desc: 'revenue DESC',
    revenue_asc: 'revenue ASC',
    count_desc: 'bookings_count DESC',
    name_asc: 'bucket ASC'
  }[selected] || 'revenue DESC';
}


function noteReferenceClause(value, params) {
  const note = String(value || '').trim().replace(/\s{2,}/g, ' ').slice(0, 500);
  if (!note) return null;

  if (isLabMode()) {
    return `COALESCE(b.note, '') LIKE '%${note}%'`;
  }

  params.push(`%${note}%`);
  return "COALESCE(b.note, '') LIKE ?";
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

router.get('/report', requireAdmin, (req, res) => {
  const dimension = String(req.query.dimension || 'city').trim();
  const status = String(req.query.status || '').trim();
  const from = String(req.query.from || '').trim();
  const to = String(req.query.to || '').trim();
  const sort = String(req.query.sort || 'revenue_desc').trim();
  const relatedTo = Number.parseInt(req.query.related_to, 10);

  const conditions = ['1 = 1'];
  const params = [];
  let relatedBooking = null;

  if (status && ['confirmed', 'cancelled'].includes(status)) {
    conditions.push('b.status = ?');
    params.push(status);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    conditions.push('b.check_in >= ?');
    params.push(from);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    conditions.push('b.check_out <= ?');
    params.push(to);
  }

  if (Number.isInteger(relatedTo) && relatedTo > 0) {
    relatedBooking = get(
      `SELECT b.id, b.note, r.name AS room_name, u.full_name AS guest_name
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN users u ON u.id = b.user_id
       WHERE b.id = ?`,
      [relatedTo]
    );

    const relatedClause = relatedBooking ? noteReferenceClause(relatedBooking.note, params) : null;
    if (relatedClause) conditions.push(relatedClause);
  }

  const groupExpr = reportDimension(dimension);
  const sql = `SELECT ${groupExpr} AS bucket,
      COUNT(b.id) AS bookings_count,
      SUM(b.total_price) AS revenue,
      ROUND(AVG(b.guests), 1) AS avg_guests
    FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    JOIN users u ON u.id = b.user_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY ${groupExpr}
    ORDER BY ${reportOrder(sort)}
    LIMIT 12`;

  let rows = [];
  let reportError = null;

  try {
    rows = all(sql, params);
  } catch (err) {
    console.error('[report]', err.message || err);
    reportError = 'Không thể tạo báo cáo với bộ lọc hiện tại.';
  }

  res.render('bookings/report', {
    rows,
    reportError,
    relatedBooking,
    filters: { dimension, status, from, to, sort, relatedTo: Number.isInteger(relatedTo) && relatedTo > 0 ? relatedTo : '' }
  });
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


router.get('/:id/related', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).render('error', {
      error: { status: 400, message: 'Mã booking không hợp lệ.' }
    });
  }

  const booking = get(
    `SELECT b.*, r.name AS room_name, r.city, r.type
     FROM bookings b
     JOIN rooms r ON r.id = b.room_id
     WHERE b.id = ?`,
    [id]
  );

  if (!booking) {
    return res.status(404).render('error', {
      error: { status: 404, message: 'Không tìm thấy booking.' }
    });
  }

  const canView = req.session.user.role === 'admin' || Number(booking.user_id) === Number(req.session.user.id);
  if (!canView) {
    return res.status(403).render('error', {
      error: { status: 403, message: 'Bạn không có quyền xem booking này.' }
    });
  }

  const note = String(booking.note || '').trim().replace(/\s{2,}/g, ' ').slice(0, 500);
  const params = [booking.id];
  const conditions = ['b.id != ?', "b.status = 'confirmed'"];

  if (note) {
    if (isLabMode()) {
      conditions.push(`COALESCE(b.note, '') LIKE '%${note}%'`);
    } else {
      conditions.push("COALESCE(b.note, '') LIKE ?");
      params.push(`%${note}%`);
    }
  }

  const sql = `SELECT r.name AS room_name,
      r.city AS city,
      r.type AS room_type,
      COUNT(b.id) AS bookings_count
    FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY r.id, r.name, r.city, r.type
    ORDER BY bookings_count DESC, r.rating DESC
    LIMIT 8`;

  let rows = [];
  let relatedError = null;

  try {
    rows = all(sql, params);
  } catch (err) {
    console.error('[related bookings]', err.message || err);
    relatedError = 'Không thể tải gợi ý liên quan cho booking này.';
  }

  return res.render('bookings/related', {
    booking,
    rows,
    relatedError
  });
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
