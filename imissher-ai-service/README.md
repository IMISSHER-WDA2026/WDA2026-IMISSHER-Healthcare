# 🧠 I.M.I.S.S.H.E.R - AI Face Recognition Service

Đây là Microservice xử lý Nhận diện khuôn mặt khẩn cấp (Face Embedding) thuộc hệ sinh thái I.M.I.S.S.H.E.R. 
*Hiện tại, service đang ở chế độ **Mock Endpoint** (Giả lập AI) để Frontend và Backend kết nối luồng dữ liệu trước khi tích hợp Core Model thật (FaceNet/InsightFace).*

## 🛠 Công nghệ sử dụng
* **Framework:** FastAPI (Python)
* **Server:** Uvicorn
* **Data Flow:** Trả về Vector không gian đặc trưng (Feature Vector).

---

## 🚀 Hướng dẫn khởi chạy (Local)

**Bước 1: Cài đặt môi trường ảo và thư viện**
```bash
python -m venv venv
# Kích hoạt (Windows):
.\venv\Scripts\activate
# Cài đặt dependencies:
pip install -r requirements.txt
```

**Bước 2: Chạy Server AI**
```bash
# Khởi chạy server bằng file main.py
python main.py
```

**Bước 3: Xem tài liệu và Test API**
Truy cập Swagger UI tự động: 👉 **http://localhost:8001/docs**

---

## 🤝 CHUẨN GIAO TIẾP VỚI BACKEND (Dành cho Team Backend/Frontend)

Để luồng Cấp cứu SOS hoạt động trơn tru, toàn bộ hệ thống phải tuân thủ tuyệt đối các tiêu chuẩn sau:

### 1. Chuẩn Kích thước Vector (Dimension Size)
* **Tiêu chuẩn:** `512 dimensions` (512 chiều).
* **Quy định Database:** Cột `faceVector` trong bảng `sos_profiles` (PostgreSQL) bắt buộc phải cấu hình: `@Column({ type: 'vector', length: 512 })`.

### 2. Chuẩn Thuật toán So khớp (Similarity Search)
* Không sử dụng các toán tử so sánh thông thường (`=`, `LIKE`).
* **Bắt buộc sử dụng:** Toán tử **Cosine Distance (`<=>`)** của pgvector.
* **Câu lệnh SQL tham khảo cho TypeORM:**
```sql
SELECT id, blood_type, allergies 
FROM sos_profiles 
ORDER BY faceVector <=> '[mảng_512_số_từ_AI]' 
LIMIT 1;
```

### 3. Sơ đồ Luồng dữ liệu Cấp cứu (SOS Data Flow)
1. **Frontend (Mobile/Web):** Gửi ảnh chụp khuôn mặt nạn nhân (POST `multipart/form-data`) lên AI Service (Cổng `8001`).
2. **AI Service:** Phân tích và trả về cho Frontend mảng JSON chứa 512 số thực (Giả lập).
3. **Frontend:** Chuyển tiếp mảng 512 số này gọi vào API `/sos/scan` của Backend NestJS (Cổng `3000`).
4. **Backend:** Dùng pgvector (`<=>`) truy xuất DB Supabase, tìm ra ID khớp nhất và trả về thông tin sinh tồn (Nhóm máu, Dị ứng) cho Frontend hiển thị.