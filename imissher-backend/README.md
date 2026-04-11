# 🏥 HỒ SƠ Y TẾ THÔNG MINH – I.M.I.S.S.H.E.R (Backend Service)
**Đội thi:** IMISSHER | **Cuộc thi:** WebDev Adventure 2026 - Vòng 2

Đây là kho lưu trữ mã nguồn Backend cho hệ sinh thái y tế cá nhân **I.M.I.S.S.H.E.R**. Hệ thống cung cấp các API xử lý hồ sơ cấp cứu SOS, quản lý tủ thuốc gia đình và hỗ trợ giao tiếp với các dịch vụ AI nhận diện khuôn mặt.

## 👥 Thành viên Đội IMISSHER
- **Nguyễn Anh Khoa** (Đội trưởng - Quản lý kiến trúc hệ thống)
- **Nguyễn Tiến Đạt** (Backend & Database)
- **Dương Hồ Nam** (Frontend)
- **Phan Hải Phong** (Thiết kế UI/UX)
- **Hồ Anh Thư** (Tài liệu & Định hướng)

## 🛠 Công nghệ cốt lõi
- **Framework chính:** NestJS (TypeScript)
- **Cơ sở dữ liệu:** PostgreSQL + `pgvector` (Lưu trữ vector khuôn mặt)
- **ORM:** TypeORM
- **Bảo mật & Chuẩn hóa:** JWT, class-validator, Global Exception Filter
- **Tài liệu API:** Swagger UI

---

## 🚀 Hướng dẫn Cài đặt và Khởi chạy (Dành cho Ban Giám Khảo)

Để vận hành hệ thống Backend dưới môi trường Local, vui lòng thực hiện tuần tự các bước sau:

### Bước 1: Tải mã nguồn
```bash
git clone [https://github.com/IMISSHER-WDA2026/WDA2026-IMISSHER-Healthcare.git](https://github.com/IMISSHER-WDA2026/WDA2026-IMISSHER-Healthcare.git)
cd WDA2026-IMISSHER-Healthcare/imissher-backend
```

### Bước 2: Cài đặt thư viện (Dependencies)
```bash
npm install
```

### Bước 3: Thiết lập Cơ sở dữ liệu (Database)
Dự án sử dụng PostgreSQL tích hợp `pgvector`. Để khởi tạo nhanh Database dưới máy Local, hệ thống đã tích hợp sẵn Docker. Chỉ cần chạy lệnh:
```bash
docker-compose up -d
```
*(Hoặc cấu hình chuỗi kết nối Supabase Cloud thông qua biến `DATABASE_URL` trong file `.env`)*.

### Bước 4: Khởi chạy máy chủ (Run Server)
```bash
# Chạy ở chế độ Development
npm run start:dev
```
Nếu Terminal hiển thị thông báo `Application is running on: http://localhost:3000`, quá trình khởi động đã thành công.

### Bước 5: Kiểm tra Tài liệu API (Swagger)
Toàn bộ danh sách API, cấu trúc Dữ liệu đầu vào (DTOs) và luồng hoạt động đã được chuẩn hóa tự động. Truy cập trình duyệt theo đường dẫn sau để trải nghiệm:
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

---
*© 2026 IMISSHER Team. Sản phẩm dự thi WebDev Adventure 2026.*