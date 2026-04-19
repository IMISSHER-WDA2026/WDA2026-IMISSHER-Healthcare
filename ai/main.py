from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace
import cv2
import numpy as np

# Khởi tạo App
app = FastAPI(
    title="I.M.I.S.S.H.E.R - AI Face Recognition Core",
    description="Microservice AI THẬT trích xuất đặc trưng khuôn mặt (Trực tiếp qua RAM)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/face/recognize", summary="Trích xuất Sinh trắc học Khuôn mặt (512 chiều)")
async def recognize_face(file: UploadFile = File(..., description="Ảnh khuôn mặt nạn nhân (JPG/PNG)")):
    try:
        # 1. ĐỌC ẢNH TRỰC TIẾP VÀO BỘ NHỚ RAM (Né hoàn toàn lỗi đường dẫn tiếng Việt)
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Không thể đọc được định dạng ảnh này.")

        # 2. ĐƯA ẢNH TỪ RAM VÀO AI DEEPFACE XỬ LÝ
        embeddings = DeepFace.represent(
            img_path=img,               # Truyền thẳng mảng ảnh vào, không cần file path
            model_name="Facenet512", 
            enforce_detection=False     # Quét cả những ảnh hơi mờ/nghiêng
        )
        
        # 3. LẤY KẾT QUẢ VECTOR
        face_vector = embeddings[0]["embedding"]

        return {
            "status": "success",
            "message": f"AI đã phân tích thành công: {file.filename}",
            "data": {
                "dimensions": len(face_vector),
                "vector": face_vector
            }
        }
        
    except Exception as e:
        print(f"Lỗi chi tiết: {str(e)}") # In lỗi ra Terminal để dễ debug
        raise HTTPException(status_code=500, detail=f"Lỗi AI khi quét khuôn mặt: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)