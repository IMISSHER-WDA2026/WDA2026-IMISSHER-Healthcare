# Sử dụng Python 3.11 phiên bản nhẹ (slim) làm môi trường gốc
FROM python:3.11-slim

# Chuyển thư mục làm việc vào /app trong container
WORKDIR /app

# Copy file requirements.txt vào trước để cài đặt thư viện
COPY requirements.txt .

# Cài đặt các thư viện cần thiết (không lưu cache để giảm dung lượng image)
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ mã nguồn và thư mục data vào trong container
COPY . .

# Khai báo cổng 8001 (Khớp với cổng chạy uvicorn của service)
EXPOSE 8001

# Lệnh khởi chạy server FastAPI khi container bật lên
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]