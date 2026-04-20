import pandas as pd


def create_csv_file() -> None:
    # Medicine catalog grouped by category.
    pain_relief_medicines = [
        "Paracetamol",
        "Aspirin",
        "Ibuprofen",
        "Diclofenac",
        "Ketoprofen",
        "Naproxen",
        "Celecoxib",
        "Panadol Extra",
        "Hapacol",
    ]
    antibiotics = [
        "Amoxicillin",
        "Augmentin",
        "Ciprofloxacin",
        "Azithromycin",
        "Cephalexin",
        "Doxycycline",
        "Metronidazole",
        "Clarithromycin",
    ]
    stomach_medicines = [
        "Omeprazole",
        "Esomeprazole",
        "Lansoprazole",
        "Ranitidine",
        "Domperidone",
        "Simethicone",
        "Sucralfate",
    ]
    cardiovascular_medicines = [
        "Amlodipine",
        "Losartan",
        "Enalapril",
        "Metoprolol",
        "Atorvastatin",
        "Simvastatin",
        "Clopidogrel",
        "Warfarin",
    ]
    diabetes_medicines = [
        "Metformin",
        "Glibenclamide",
        "Gliclazide",
        "Insulin",
        "Pioglitazone",
        "Sitagliptin",
    ]
    respiratory_medicines = [
        "Salbutamol",
        "Prednisolone",
        "Cetirizine",
        "Loratadine",
        "Montelukast",
        "Budesonide",
        "Decolgen",
    ]
    vitamins_and_minerals = [
        "Vitamin C",
        "Vitamin D3",
        "Vitamin B1",
        "Vitamin B6",
        "Vitamin B12",
        "Acid Folic",
        "Canxi",
        "Sắt",
        "Kẽm",
    ]
    other_common_medicines = [
        "Oresol",
        "Smecta",
        "Berberin",
        "Hydrocortisone",
        "Clotrimazole",
        "Loperamide",
        "Bisacodyl",
    ]

    all_medicines = (
        pain_relief_medicines
        + antibiotics
        + stomach_medicines
        + cardiovascular_medicines
        + diabetes_medicines
        + respiratory_medicines
        + vitamins_and_minerals
        + other_common_medicines
    )

    medicine_records = []

    # Vietnam barcode prefix: 893.
    # Start a synthetic barcode range at 8931110000000.
    base_barcode = 8931110000000

    print("Generating medicine dataset...")

    for index, medicine_name in enumerate(all_medicines):
        barcode = str(base_barcode + index)

        # Derive generic usage and contraindication by category.
        if medicine_name in pain_relief_medicines:
            description = f"Giảm đau, hạ sốt, chống viêm liên quan đến {medicine_name}."
            contraindications = "Người suy gan, suy thận nặng, mẫn cảm với thành phần của thuốc."
        elif medicine_name in antibiotics:
            description = f"Điều trị các bệnh nhiễm khuẩn do vi khuẩn nhạy cảm với {medicine_name}."
            contraindications = "Người có tiền sử dị ứng với kháng sinh cùng nhóm."
        elif medicine_name in stomach_medicines:
            description = "Điều trị viêm loét dạ dày tá tràng, trào ngược dạ dày thực quản."
            contraindications = "Không dùng cho người mẫn cảm với thành phần thuốc."
        else:
            description = f"Bổ sung, hỗ trợ điều trị theo chỉ định của bác sĩ đối với {medicine_name}."
            contraindications = "Đọc kỹ hướng dẫn sử dụng trước khi dùng."

        # Keep keys aligned with Supabase table column names.
        medicine = {
            "name": medicine_name,
            "active_ingredient": medicine_name,  # Placeholder until richer active-ingredient data is available.
            "barcode": barcode,
            "description": description,
            "contraindications": contraindications,
        }
        medicine_records.append(medicine)

    dataframe = pd.DataFrame(medicine_records)
    file_name = "data/healthcare_medicine_catalog.csv"
    dataframe.to_csv(file_name, index=False, encoding="utf-8-sig")

    print(f"Medicine dataset created: {file_name} ({len(medicine_records)} records).")


if __name__ == "__main__":
    create_csv_file()