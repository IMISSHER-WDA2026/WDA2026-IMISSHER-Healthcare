from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import random
import asyncio

# 1. Khởi tạo App
app = FastAPI(
    title="I.M.I.S.S.H.E.R - Face Recognition AI",
    description="Microservice trích xuất đặc trưng khuôn mặt (Face Embeddings)",
    version="1.0.0"
)

# 2. Mở cổng CORS cho Frontend gọi thoải mái
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Viết API nhận ảnh và trả về Vector
@app.post("/api/v1/face/recognize", summary="Trích xuất Vector Khuôn mặt 512 chiều")
async def recognize_face(file: UploadFile = File(..., description="Ảnh khuôn mặt nạn nhân (JPG/PNG)")):
    """
    Mock API: Giả lập thời gian AI xử lý ảnh và sinh ra Vector 512 chiều.
    """
    # Giả lập thời gian AI đọc ảnh mất khoảng 1 giây
    await asyncio.sleep(1)
    
    # Sinh ra một mảng gồm 512 con số ngẫu nhiên (từ -1.0 đến 1.0) giống hệ thống FaceNet thật
    dummy_vector = [round(random.uniform(-1.0, 1.0), 6) for _ in range(512)]

    return {
        "status": "success",
        "message": f"Đã quét và trích xuất thành công: {file.filename}",
        "data": {
            "dimensions": 512,
            "vector": dummy_vector
        }
    }