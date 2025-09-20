import os
import json
import tempfile
import sqlite3
import re
from fastapi import FastAPI, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from processor import DocumentProcessor, sanitize_for_json

load_dotenv()

# === Initialize FastAPI ===
app = FastAPI()

# === Enable CORS (Next.js frontend can call this API) ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict later for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Initialize OCI-powered DocumentProcessor ===
processor = DocumentProcessor(config_file="config.ini", profile="DEFAULT")

# === SQLite setup ===
DB_PATH = "documents.db"
conn = sqlite3.connect(DB_PATH, check_same_thread=False)
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    file_type TEXT,
    client_name TEXT,
    language TEXT,
    layout TEXT,       -- JSON array of columns
    user_prompt TEXT,  -- saved prompt if any
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")
conn.commit()

def get_file_type(filename):
    """Extract file type from filename using regex (e.g. pdf, xlsx)."""
    match = re.search(r'\.([^.]+)$', filename)
    return match.group(1).lower() if match else None


# === Upload + Process Document ===
@app.post("/process-document/")
async def process_document(file: UploadFile = File(...), schema_json: str = Form(...)):
    try:
        schema = json.loads(schema_json)

        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        result = processor.process_document(tmp_path)
        structured_markdown = result["structured_markdown"]
        metadata = result["metadata"]
        # embedding = result["embedding"]

        # Get suggested prompt before extraction
        suggested_prompt = processor.find_suggested_prompt(
            current_client=metadata["customer_info"],
            current_layout=metadata["layout"],
            cursor=cur
        )

        # Use suggested prompt in extraction
        generated_json = processor.extract_json_with_schema(
            structured_markdown, 
            schema, 
            suggested_prompt
        )

        file_type = get_file_type(file.filename)
        cur.execute(
            """
            INSERT INTO documents (filename, file_type, client_name, language, layout, user_prompt)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                file.filename,
                file_type,
                metadata["customer_info"],
                metadata["language"],
                json.dumps(metadata["layout"]),
                # json.dumps(embedding.tolist()),
                None
            ),
        )
        doc_id = cur.lastrowid
        conn.commit()

        return {
            "status": "success",
            "document_id": doc_id,
            "filename": file.filename,
            "structured_markdown": structured_markdown,
            "generated_json": sanitize_for_json(generated_json),
            "suggested_prompt": suggested_prompt,
        }

    except json.JSONDecodeError:
        return {"status": "error", "message": "Invalid schema JSON format."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# === Try Prompt (no save) ===
@app.post("/try-prompt/")
async def try_prompt(
    document: str = Body(...),
    user_prompt: str = Body(...),
    schema_json: str = Body(...)
):
    try:
        schema = json.loads(schema_json)

        custom_prompt = f"""
        Instruction: {user_prompt}
        Document: {document}
        Extract data into JSON with this schema:
        {json.dumps(schema, indent=2)}
        """
        raw_json = processor._call_oci_llm(custom_prompt)

        try:
            parsed_json = json.loads(raw_json)
        except:
            parsed_json = {"error": "Failed to parse JSON", "raw": raw_json}

        return {"status": "success", "generated_json": sanitize_for_json(parsed_json)}

    except Exception as e:
        return {"status": "error", "message": str(e)}


# === Save Prompt (persist) ===
@app.post("/save-prompt/")
async def save_prompt(
    document_id: int = Body(...),
    user_prompt: str = Body(...)
):
    try:
        cur.execute("UPDATE documents SET user_prompt=? WHERE id=?", (user_prompt, document_id))
        conn.commit()
        return {"status": "success", "message": "Prompt saved!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}