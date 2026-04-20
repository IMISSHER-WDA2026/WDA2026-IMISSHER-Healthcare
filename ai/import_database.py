import os
from typing import Final

import pandas as pd
from sentence_transformers import SentenceTransformer
from supabase import Client, create_client

# ==========================================
# 1. SUPABASE CONFIGURATION (ENV-BASED)
# ==========================================
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

EMBEDDING_MODEL_NAME: Final[str] = "keepitreal/vietnamese-sbert"
KNOWLEDGE_CSV_PATH: Final[str] = "data/first_aid_knowledge.csv"
KNOWLEDGE_TABLE_NAME: Final[str] = "first_aid_knowledge"

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ==========================================
# 2. LOAD EMBEDDING MODEL
# ==========================================
print("Loading Vietnamese embedding model (first run may download model artifacts)...")
# The selected model is optimized for Vietnamese and produces 768-dimension vectors.
embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
print("Embedding model loaded successfully.")


def _read_knowledge_csv() -> pd.DataFrame:
    """Read the knowledge CSV with fallback delimiters."""
    try:
        dataframe = pd.read_csv(KNOWLEDGE_CSV_PATH, sep=';', encoding='utf-8')
        if {'title', 'content'}.issubset(dataframe.columns):
            return dataframe
    except Exception:
        pass

    return pd.read_csv(KNOWLEDGE_CSV_PATH, sep=',', encoding='utf-8')


def import_into_supabase() -> None:
    print("Starting offline knowledge embedding import to Supabase...")

    dataframe = _read_knowledge_csv()

    success_count = 0
    failure_count = 0

    for _, row in dataframe.iterrows():
        title = str(row['title']).strip()
        content = str(row['content']).strip()

        if not title or not content:
            continue

        print(f"Embedding record: {title}")

        try:
            # Compute embedding locally and serialize to JSON-compatible list.
            vector_data = embedding_model.encode(content)
            vector_list = vector_data.tolist()

            supabase.table(KNOWLEDGE_TABLE_NAME).insert(
                {
                    "title": title,
                    "content": content,
                    "content_embedding": vector_list,
                }
            ).execute()

            print("  Inserted successfully.")
            success_count += 1

        except Exception as exc:
            print(f"  Failed to import '{title}': {exc}")
            failure_count += 1

    print("========================================")
    print(
        "Import complete. "
        f"Successful: {success_count} | Failed: {failure_count}"
    )

if __name__ == "__main__":
    import_into_supabase()