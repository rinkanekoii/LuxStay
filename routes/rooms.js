const router = require('express').Router();
const { all, get } = require('../database/init');

function normalize(value) {
  return String(value || '').trim();
}


function isLabMode() {
  return process.env.LAB_MODE === 'true' && process.env.NODE_ENV !== 'production';
}

function amenityClause(value, params) {
  const amenity = normalize(value).replace(/\s{2,}/g, ' ').slice(0, 120);
  if (!amenity) return null;

  if (isLabMode()) {
    return `LOWER(amenities) LIKE LOWER('%${amenity}%')`;
  }

  params.push(`%${amenity}%`);
  return 'LOWER(amenities) LIKE LOWER(?)';
}

router.get('/', (req, res) => {
  const city = normalize(req.query.city);
  const guests = Number.parseInt(req.query.guests, 10);
  const amenity = normalize(req.query.amenity);

  const conditions = ['is_available = 1'];
  const params = [];

  if (city) {
    conditions.push('LOWER(city) LIKE LOWER(?)');
    params.push(`%${city}%`);
  }

  if (Number.isInteger(guests) && guests > 0) {
    conditions.push('max_guests >= ?');
    params.push(guests);
  }

  const amenityFilter = amenityClause(amenity, params);
  if (amenityFilter) {
    conditions.push(amenityFilter);
  }

  const rooms = all(
    `SELECT id, name, city, type, description, image, price_per_night, max_guests, beds, amenities, rating
     FROM rooms
     WHERE ${conditions.join(' AND ')}
     ORDER BY rating DESC, price_per_night ASC`,
    params
  );

  res.render('rooms/index', {
    rooms,
    filters: {
      city,
      guests: Number.isInteger(guests) && guests > 0 ? guests : '',
      amenity
    }
  });
});

router.get('/:id', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    return res.status(400).render('error', {
      error: { status: 400, message: 'Mã phòng không hợp lệ.' }
    });
  }

  const room = get(
    `SELECT id, name, city, type, description, image, price_per_night, max_guests, beds, amenities, rating, is_available
     FROM rooms
     WHERE id = ?`,
    [id]
  );

  if (!room) {
    return res.status(404).render('error', {
      error: { status: 404, message: 'Không tìm thấy phòng.' }
    });
  }

  room.amenityList = String(room.amenities || '').split(',').map(item => item.trim()).filter(Boolean);
  res.render('rooms/detail', { room });
});

module.exports = router;
