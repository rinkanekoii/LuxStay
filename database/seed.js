const { getDb, run } = require('./init');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🌱 Seeding database...\n');
  await getDb();

  run('DELETE FROM contact_messages');
  run('DELETE FROM users');

  const users = [
    ['admin', 'admin@luxstay.vn', 'Admin@123', 'Nguyễn Quốc Bảo', 'admin', 'LX-ADM-7K2'],
    ['binhtt', 'binh.tran@gmail.com', 'Binh@2024', 'Trần Thị Bình', 'user', 'LX-USR-4M9'],
    ['minhle', 'minh.le@outlook.com', 'Minh@2024', 'Lê Hoàng Minh', 'user', 'LX-USR-8P1'],
    ['student', 'student@lab.local', 'Lab@2024', 'Học viên Lab', 'user', 'LX-USR-2H5'],
  ];

  for (const u of users) {
    const hash = bcrypt.hashSync(u[2], 10);
    run(
      `INSERT INTO users (username, email, password, password_hash, full_name, role, member_code)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [u[0], u[1], u[2], hash, u[3], u[4], u[5]]
    );
  }

  console.log(`✅ ${users.length} users`);
  console.log('🎉 Done.');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
