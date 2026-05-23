const { getDb, run, execRaw } = require('./init');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🌱 Seeding database...\n');
  await getDb();

  run('DELETE FROM bookings');
  run('DELETE FROM contact_messages');
  run('DELETE FROM rooms');
  run('DELETE FROM users');
  execRaw("DELETE FROM sqlite_sequence WHERE name IN ('users','rooms','bookings','contact_messages')");

  const users = [
    ['admin', 'admin@luxstay.vn', 'Admin@123', 'Nguyễn Quốc Bảo', 'admin', 'LX-ADM-7K2'],
    ['binhtt', 'binh.tran@gmail.com', 'Binh@2024', 'Trần Thị Bình', 'user', 'LX-USR-4M9'],
    ['minhle', 'minh.le@outlook.com', 'Minh@2024', 'Lê Hoàng Minh', 'user', 'LX-USR-8P1'],
    ['student', 'student@lab.local', 'Lab@2024', 'Học viên Lab', 'user', 'LX-USR-2H5']
  ];

  for (const u of users) {
    const hash = bcrypt.hashSync(u[2], 10);
    run(
      `INSERT INTO users (username, email, password, password_hash, full_name, role, member_code)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [u[0], u[1], u[2], hash, u[3], u[4], u[5]]
    );
  }

  const rooms = [
    ['Skyline Deluxe Suite', 'Đà Nẵng', 'Suite', 'Suite tầng cao nhìn ra biển Mỹ Khê, có khu làm việc riêng và bồn tắm cạnh cửa sổ.', '/img/room-skyline.svg', 1850000, 2, '1 giường king', 'View biển, Wi-Fi tốc độ cao, Bồn tắm, Mini bar, Smart TV', 4.9, 1],
    ['Garden Family Villa', 'Đà Lạt', 'Villa', 'Villa sân vườn yên tĩnh, phù hợp gia đình hoặc nhóm bạn muốn nghỉ dưỡng dài ngày.', '/img/room-garden.svg', 2450000, 5, '2 giường queen + sofa bed', 'Sân vườn, Bếp nhỏ, Máy sưởi, BBQ, Bãi đỗ xe', 4.8, 1],
    ['Old Quarter Loft', 'Hà Nội', 'Loft', 'Căn loft phong cách boutique gần phố cổ, thuận tiện đi bộ tới các điểm ăn uống và tham quan.', '/img/room-loft.svg', 1320000, 3, '1 giường queen + sofa', 'Ban công, Máy pha cà phê, Netflix, Bàn làm việc', 4.7, 1],
    ['Riverfront Premium Room', 'TP. Hồ Chí Minh', 'Premium', 'Phòng premium nhìn ra sông, thiết kế tối giản, phù hợp công tác và nghỉ cuối tuần.', '/img/room-river.svg', 1680000, 2, '1 giường king', 'View sông, Gym access, Breakfast, Work desk', 4.8, 1],
    ['Coastal Studio', 'Nha Trang', 'Studio', 'Studio nhỏ gọn gần biển, có bếp mini và không gian sáng cho khách đi du lịch tự túc.', '/img/room-coastal.svg', 980000, 2, '1 giường queen', 'Bếp mini, Gần biển, Máy giặt, Smart lock', 4.6, 1],
    ['Mountain Hideaway', 'Sa Pa', 'Cabin', 'Cabin gỗ nhìn ra thung lũng, có lò sưởi và ban công riêng cho những ngày lạnh.', '/img/room-mountain.svg', 2100000, 4, '2 giường queen', 'Lò sưởi, Ban công, View núi, Bữa sáng', 4.9, 1]
  ];

  for (const r of rooms) {
    run(
      `INSERT INTO rooms (
        name, city, type, description, image, price_per_night, max_guests, beds, amenities, rating, is_available,
        price, capacity, image_url, available
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...r, r[5], r[6], r[4], r[10]]
    );
  }

  run(
    `INSERT INTO contact_messages (sender_name, body)
     VALUES (?, ?)`,
    ['Khách thử nghiệm', 'Tôi muốn hỏi về chính sách nhận phòng sớm cho phòng Skyline Deluxe Suite.']
  );

  console.log(`✅ ${users.length} users`);
  console.log(`✅ ${rooms.length} rooms`);
  console.log('🎉 Done.');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
