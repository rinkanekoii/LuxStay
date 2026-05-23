# LuxStay modifications

## Mục tiêu

Phiên bản này dùng cho môi trường luyện tập kiểm thử bảo mật nội bộ trên web đặt phòng LuxStay. Flow nghiệp vụ được giữ gần với web thật: tìm phòng, đặt phòng, báo cáo booking, đăng nhập và liên hệ.

## Chế độ chạy

Dùng môi trường development khi luyện tập:

```env
LAB_MODE=true
NODE_ENV=development
```

Không bật cấu hình luyện tập khi deploy thật. Nếu chạy `NODE_ENV=production`, những nhánh chỉ dành cho môi trường luyện tập sẽ không hoạt động.

## Tính năng chính đã chỉnh

- Giao diện tìm phòng có bộ lọc tiện nghi dùng truy vấn an toàn.
- Trang báo cáo booking dành cho admin hoạt động như một chức năng quản trị bình thường.
- Trang liên hệ có chế độ xem bản định dạng cho nội dung khách gửi.
- Login chính và thao tác đặt phòng bình thường vẫn giữ flow cũ.

## Chạy thử

```bash
npm install
npm run seed
npm start
```

Tài khoản kiểm tra bình thường:

```txt
admin / Admin@123
student / Lab@2024
```

## Ghi chú

Đây là bản dùng cho lab nội bộ, không dùng làm production nguyên trạng.
