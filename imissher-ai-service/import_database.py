import pandas as pd
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
import time

# ==========================================
# 1. CẤU HÌNH SUPABASE (Vẫn dùng Service Role Key)
# ==========================================
SUPABASE_URL = "https://wunmyjagiwljvxrsurxe.supabase.co"
SUPABASE_KEY = "sb_secret_F6NleWDh6j8C7x8KlbXkmA_s6Rp9hTO" # LƯU Ý: NÊN ĐỔI KEY SAU KHI CODE XONG NHÉ SẾP!

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==========================================
# 2. TẢI MODEL AI MIỄN PHÍ VÀO MÁY
# ==========================================
print("📥 Đang tải Model AI Tiếng Việt (Chỉ tải 1 lần đầu tiên)...")
# Model này nặng khoảng 400MB, chuyên trị tiếng Việt, tạo ra vector 768 chiều
ai_model = SentenceTransformer('keepitreal/vietnamese-sbert')
print("✅ Tải Model hoàn tất!")

def import_len_supabase():
    print("🚀 Bắt đầu nhúng dữ liệu Cẩm Nang Sơ Cứu vào Supabase (OFFLINE MODE)...")
    
    # Đọc file CSV
    try:
        df = pd.read_csv("data/cam_nang_so_cuu.csv", sep=';', encoding='utf-8')
    except:
        df = pd.read_csv("data/cam_nang_so_cuu.csv", sep=',', encoding='utf-8')
        
    thanh_cong = 0
    that_bai = 0

    for index, row in df.iterrows():
        title = str(row['title']).strip()
        content = str(row['content']).strip()
        
        print(f"⏳ Đang nhúng Vector cho: {title}...")
        
        try:
            # Dùng model Offline trên máy tính để tạo Vector
            vector_data = ai_model.encode(content)
            
            # Phải chuyển định dạng mảng numpy của AI thành list thường để đẩy lên web
            vector_list = vector_data.tolist()
            
            # Đẩy lên Supabase
            supabase.table("first_aid_knowledge").insert({
                "title": title,
                "content": content,
                "content_embedding": vector_list
            }).execute()
            
            print("  ✅ Đẩy thành công!")
            thanh_cong += 1
            
        except Exception as e:
            print(f"  ❌ Lỗi ở dòng {title}: {e}")
            that_bai += 1

    print("========================================")
    print(f"🎉 XONG! DỮ LIỆU ĐÃ LÊN SUPABASE MIỄN PHÍ 100%! (Thành công: {thanh_cong} | Thất bại: {that_bai})")

if __name__ == "__main__":
    import_len_supabase()