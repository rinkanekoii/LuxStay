# LuxStay Web App Update

## Giao diện
- Đổi giao diện sang phong cách web app đặt phòng nghỉ dưỡng.
- Thêm ảnh nền hero, ảnh minh họa phòng và layout responsive.
- Gỡ các khối thống kê ở trang chủ.
- Gỡ các dòng mô tả/hint liên quan đến bài lab khỏi giao diện người dùng.
- Làm lại trang đăng nhập, dashboard, danh sách phòng, chi tiết phòng, liên hệ và xác minh nhân viên.

## Chức năng mới
- Trang `/rooms`: xem danh sách phòng, lọc theo thành phố và số khách.
- Trang `/rooms/:id`: xem chi tiết phòng, giá, sức chứa và tiện nghi.
- Trang `/bookings/new/:roomId`: tạo booking mới sau khi đăng nhập.
- Trang `/bookings`: xem danh sách booking của tài khoản hiện tại.
- Admin có thể xem danh sách booking gần đây và liên hệ gần đây trong dashboard.
- Người dùng có thể hủy booking.
- Đăng nhập thành công chuyển thẳng vào `/dashboard`.

## Hardening giữ lại
- CSRF token cho form POST.
- Regenerate session sau đăng nhập.
- Cookie session `httpOnly`, `sameSite: lax`.
- Giới hạn kích thước body request.
- Tắt `x-powered-by`.
- Dùng Helmet cho header bảo mật cơ bản.

## Điểm lab vẫn giữ có chủ đích
- SQL injection trong flow đăng nhập legacy.
- SQL injection trong flow xác minh mã nhân viên legacy.
- Stored XSS ở trang xem nội dung liên hệ.

Không dùng cấu hình này cho production thật.

## Chạy project
```bash
npm install
npm run seed
npm start
```

Mở: `http://localhost:3000`
