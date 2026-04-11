# 🚑 HỒ SƠ Y TẾ THÔNG MINH – I.M.I.S.S.H.E.R (Monorepo)

**Đội thi:** IMISSHER | **Cuộc thi:** WebDev Adventure 2026 - Vòng 2

Dự án tập trung giải quyết **Vấn đề 2 – Y tế**, được định hướng xây dựng thành một hệ sinh thái số hóa toàn diện nhằm tối ưu hóa "thời gian vàng" trong cấp cứu và tự động hóa quy trình quản lý tủ thuốc tại gia.

## 👥 Đội ngũ Phát triển
* **Nguyễn Anh Khoa** (Đội trưởng - Quản lý tiến độ chung, Kiến trúc hệ thống)
* **Phan Hải Phong** (Thiết kế UI/UX, UML, BPMN)
* **Dương Hồ Nam** (Frontend Developer)
* **Nguyễn Tiến Đạt** (Backend & Database Developer)
* **Hồ Anh Thư** (Báo cáo, Định hướng phát triển & QA)

## 🌟 Tính năng Cốt lõi
Hệ thống I.M.I.S.S.H.E.R được phát triển với 4 nhóm chức năng chính:
1.  **Hồ sơ cấp cứu SOS (1 chạm):** Cho phép người sơ cứu quét mã QR hoặc nhận diện khuôn mặt nạn nhân để truy xuất ngay lập tức thông tin sinh tồn (nhóm máu, dị ứng, bệnh nền) mà không cần đăng nhập.
2.  **Quản lý tủ thuốc thông minh:** Tự động hóa nhập liệu thông qua quét mã vạch (Barcode Scanner), theo dõi số lượng và gửi cảnh báo khi thuốc sắp hết hạn.
3.  **Lịch nhắc nhở & Theo dõi sức khỏe:** Tự động nhắc nhở uống thuốc, ngày tái khám và theo dõi lịch tiêm chủng.
4.  **Trợ lý Y tế AI (Phase 2):** Chatbot hỗ trợ tư vấn y khoa tại gia, tích hợp công nghệ RAG để ngăn chặn rủi ro "ảo giác" (hallucination) của AI.

---

## 🏛 Kiến trúc Hệ thống (Microservices Architecture)
Dự án được tổ chức theo mô hình Monorepo, bao gồm 2 dịch vụ hoạt động độc lập nhằm đảm bảo hiệu năng và khả năng mở rộng:

### 1. [Backend Service](./imissher-backend)
* **Thư mục:** `imissher-backend/`
* **Công nghệ:** Node.js, NestJS, TypeScript.
* **Database:** PostgreSQL tích hợp extension `pgvector`.
* **Vai trò:** Đóng vai trò là Core Application Server, xử lý logic nghiệp vụ chính (Quản lý hồ sơ, tủ thuốc, xác thực người dùng) và giao tiếp với Database.

### 2. [AI Service](./imissher-ai-service)
* **Thư mục:** `imissher-ai-service/`
* **Công nghệ:** Python, FastAPI.
* **Vai trò:** Microservice chuyên biệt thực hiện bóc tách, trích xuất điểm neo hình học trên khuôn mặt thành vector đặc trưng (Feature Vector Matching) để đối chiếu tìm kiếm hồ sơ khẩn cấp.

---

## 🚀 Hướng dẫn Cài đặt và Khởi chạy (Dành cho Ban Giám Khảo)
Để hệ thống vận hành đầy đủ luồng nghiệp vụ (từ quét khuôn mặt đến truy xuất Database), vui lòng khởi chạy song song cả 2 môi trường dưới đây:

### Bước 1: Khởi chạy Backend Service (Core Server)
Dịch vụ này cung cấp các API chính và kết nối với cơ sở dữ liệu.
```bash
cd imissher-backend

# Cài đặt thư viện
npm install

# Khởi tạo Database PostgreSQL (Docker)
docker-compose up -d

# Khởi chạy server ở chế độ Development (Cổng 3000)
npm run start:dev
```
👉 **Tài liệu API (Swagger):** `http://localhost:3000/api-docs`

### Bước 2: Khởi chạy AI Microservice (Face Recognition)
Dịch vụ này cung cấp API trích xuất vector khuôn mặt.
```bash
cd imissher-ai-service

# Khởi tạo môi trường ảo Python
python -m venv venv

# Kích hoạt môi trường ảo
# Trên Windows:
.\venv\Scripts\activate
# Trên Mac/Linux:
source venv/bin/activate

# Cài đặt thư viện lõi
pip install -r requirements.txt

# Khởi chạy AI Server (Cổng 8001)
uvicorn main:app --reload --port 8001
```
👉 **Tài liệu API (Swagger):** `http://localhost:8001/docs`

---
*© 2026 IMISSHER Team. Mã nguồn mở phục vụ quá trình dự thi.*