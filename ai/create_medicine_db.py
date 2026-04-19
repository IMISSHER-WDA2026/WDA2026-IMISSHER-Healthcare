import pandas as pd
import random

def tao_file_csv():
    # Danh sách thuốc thuần Việt chia theo nhóm
    thuoc_giam_dau = ["Paracetamol", "Aspirin", "Ibuprofen", "Diclofenac", "Ketoprofen", "Naproxen", "Celecoxib", "Panadol Extra", "Hapacol"]
    thuoc_khang_sinh = ["Amoxicillin", "Augmentin", "Ciprofloxacin", "Azithromycin", "Cephalexin", "Doxycycline", "Metronidazole", "Clarithromycin"]
    thuoc_da_day = ["Omeprazole", "Esomeprazole", "Lansoprazole", "Ranitidine", "Domperidone", "Simethicone", "Sucralfate"]
    thuoc_tim_mach = ["Amlodipine", "Losartan", "Enalapril", "Metoprolol", "Atorvastatin", "Simvastatin", "Clopidogrel", "Warfarin"]
    thuoc_tieu_duong = ["Metformin", "Glibenclamide", "Gliclazide", "Insulin", "Pioglitazone", "Sitagliptin"]
    thuoc_ho_hap = ["Salbutamol", "Prednisolone", "Cetirizine", "Loratadine", "Montelukast", "Budesonide", "Decolgen"]
    vitamin_khoang_chat = ["Vitamin C", "Vitamin D3", "Vitamin B1", "Vitamin B6", "Vitamin B12", "Acid Folic", "Canxi", "Sắt", "Kẽm"]
    thuoc_thong_dung_khac = ["Oresol", "Smecta", "Berberin", "Hydrocortisone", "Clotrimazole", "Loperamide", "Bisacodyl"]

    tat_ca_thuoc = thuoc_giam_dau + thuoc_khang_sinh + thuoc_da_day + thuoc_tim_mach + thuoc_tieu_duong + thuoc_ho_hap + vitamin_khoang_chat + thuoc_thong_dung_khac

    danh_sach_thuoc = []
    
    # Mã vạch quốc gia Việt Nam là 893
    # Bắt đầu dải mã vạch giả lập: 8931110000000
    base_barcode = 8931110000000

    print("🔄 Đang tiến hành tạo dữ liệu...")

    for i, ten_thuoc in enumerate(tat_ca_thuoc):
        barcode = str(base_barcode + i)
        
        # Phân loại công dụng tự động dựa trên mảng
        if ten_thuoc in thuoc_giam_dau:
            cong_dung = f"Giảm đau, hạ sốt, chống viêm liên quan đến {ten_thuoc}."
            chong_chi_dinh = "Người suy gan, suy thận nặng, mẫn cảm với thành phần của thuốc."
        elif ten_thuoc in thuoc_khang_sinh:
            cong_dung = f"Điều trị các bệnh nhiễm khuẩn do vi khuẩn nhạy cảm với {ten_thuoc}."
            chong_chi_dinh = "Người có tiền sử dị ứng với kháng sinh cùng nhóm."
        elif ten_thuoc in thuoc_da_day:
            cong_dung = f"Điều trị viêm loét dạ dày tá tràng, trào ngược dạ dày thực quản."
            chong_chi_dinh = "Không dùng cho người mẫn cảm với thành phần thuốc."
        else:
            cong_dung = f"Bổ sung, hỗ trợ điều trị theo chỉ định của bác sĩ đối với {ten_thuoc}."
            chong_chi_dinh = "Đọc kỹ hướng dẫn sử dụng trước khi dùng."

        # Tạo dictionary chứa các KEY TRÙNG VỚI TÊN CỘT TRONG SUPABASE
        thuoc = {
            "name": ten_thuoc,
            "active_ingredient": ten_thuoc, # Tạm dùng tên thuốc làm hoạt chất
            "barcode": barcode,
            "description": cong_dung,
            "contraindications": chong_chi_dinh
        }
        danh_sach_thuoc.append(thuoc)

    # Chuyển thành file CSV
    df = pd.DataFrame(danh_sach_thuoc)
    file_name = "data/Du_lieu_tu_thuoc_IMISSHER.csv"
    df.to_csv(file_name, index=False, encoding="utf-8-sig")
    
    print(f"✅ Xong! Đã tạo file {file_name} với {len(danh_sach_thuoc)} loại thuốc.")

if __name__ == "__main__":
    tao_file_csv()