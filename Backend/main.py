import os
import json
import tempfile
import sqlite3
import re
from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor
import asyncio
from fastapi import FastAPI, UploadFile, File, Form, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from processor import DocumentProcessor, sanitize_for_json
from typing import List, Dict, Any, Tuple
import threading

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

# === Thread pool for CPU-bound operations ===
# This allows multiple document processing tasks to run concurrently
executor = ThreadPoolExecutor(max_workers=4)

# === SQLite setup with thread-safe connection management ===
DB_PATH = "documents.db"

# Thread-local storage for database connections
_thread_local = threading.local()

def get_db_connection():
    """Get a thread-safe database connection."""
    if not hasattr(_thread_local, 'connection'):
        _thread_local.connection = sqlite3.connect(DB_PATH, check_same_thread=True)
    return _thread_local.connection

@contextmanager
def get_db():
    """Context manager for database connections and cursors."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        yield conn, cur
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e

# Initialize database schema
with get_db() as (conn, cur):
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



def get_file_type(filename):
    """Extract file type from filename using regex (e.g. pdf, xlsx)."""
    match = re.search(r'\.([^.]+)$', filename)
    return match.group(1).lower() if match else None


# === Upload + Process Document ===
@app.post("/process-document/")
async def process_document(file: UploadFile = File(...), schema_json: str = Form(...)):
    try:
        schema = json.loads(schema_json)
        # Add FileName to schema
        schema["FileName"] = ""

        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Run CPU-bound processor in thread pool to avoid blocking event loop
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(executor, processor.process_document, tmp_path)
        structured_markdown = result["structured_markdown"]
        metadata = result["metadata"]

        # Use thread-safe database connection
        with get_db() as (conn, cur):
            # Get suggested prompt before extraction
            suggested_prompt = processor.find_suggested_prompt(
                current_client=metadata["client_name"],
                current_layout=metadata["layout"],
                cursor=cur
            )

            # Run CPU-bound extraction in thread pool
            def extract_with_schema():
                return processor.extract_json_with_schema(
                    structured_markdown,
                    schema,
                    suggested_prompt
                )
            
            generated_json, output_tokens = await loop.run_in_executor(executor, extract_with_schema)
            # Add filename to generated JSON
            generated_json["FileName"] = file.filename

            # Check if there are existing prompts for this layout
            layout_json = json.dumps(metadata["layout"])
            existing_prompts = processor.get_latest_prompt_for_layout(layout_json, cur)
            
            # If a suggested prompt was used, add it to the prompt history
            prompt_to_save = existing_prompts
            if suggested_prompt and not existing_prompts:
                # First document with this layout - save the suggested prompt as version 1
                import datetime
                prompt_to_save = [{
                    "prompt": suggested_prompt,
                    "timestamp": datetime.datetime.now().isoformat()
                }]
            elif suggested_prompt and existing_prompts:
                # Check if the suggested prompt is already in the history
                # If not, it means a new prompt was applied, add it
                prompt_texts = [p.get("prompt", "") for p in existing_prompts]
                if suggested_prompt not in prompt_texts:
                    import datetime
                    prompt_to_save = existing_prompts + [{
                        "prompt": suggested_prompt,
                        "timestamp": datetime.datetime.now().isoformat()
                    }]
            
            # Store document in SQLite with inherited/applied prompts
            file_type = get_file_type(file.filename)
            cur.execute(
                """
                INSERT INTO documents (filename, file_type, client_name, language, layout, user_prompt)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    file.filename,
                    file_type,
                    metadata["client_name"],
                    metadata["language"],
                    layout_json,
                    json.dumps(prompt_to_save) if prompt_to_save else None
                ),
            )
            doc_id = cur.lastrowid
            print(generated_json)
            
            # Calculate inherited version
            inherited_version = len(prompt_to_save) if prompt_to_save else 0

        return {
            "status": "success",
            "document_id": doc_id,
            "filename": file.filename,
            "structured_markdown": structured_markdown,
            "generated_json": sanitize_for_json(generated_json),
            "suggested_prompt": suggested_prompt,
            "oci_output_tokens": output_tokens,
            "inherited_version": inherited_version,
            "message": f"Document created with version {inherited_version} (inherited from layout)" if inherited_version > 0 else "Document created with version 0"
        }

    except json.JSONDecodeError:
        return {"status": "error", "message": "Invalid schema JSON format."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/inference-document/")
async def process_document(file: UploadFile = File(...), schema_json: str = Form(...)):
    try:
        schema = json.loads(schema_json)
        # Add FileName to schema
        schema["FileName"] = ""

        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Run CPU-bound processor in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(executor, processor.process_document, tmp_path)
        structured_markdown = result["structured_markdown"]
        metadata = result["metadata"]

        # Use thread-safe database connection
        with get_db() as (conn, cur):
            # Check if client name exists in database
            cur.execute("SELECT COUNT(*) FROM documents WHERE client_name = ?", (metadata["client_name"],))
            client_exists = cur.fetchone()[0] > 0
        
            if not client_exists:
                return {
                    "status": "error", 
                    "message": "We don't have configurations setup for this type of layout. Please Configure it"
                }

            # Get suggested prompt before extraction
            suggested_prompt = processor.find_suggested_prompt(
                current_client=metadata["client_name"],
                current_layout=metadata["layout"],
                cursor=cur
            )

            # Run CPU-bound extraction in thread pool
            def extract_with_schema():
                return processor.extract_json_with_schema(
                    structured_markdown,
                    schema,
                    suggested_prompt
                )
            
            generated_json, output_tokens = await loop.run_in_executor(executor, extract_with_schema)
            # Add filename to generated JSON
            generated_json["FileName"] = file.filename

            # Check if there are existing prompts for this layout
            layout_json = json.dumps(metadata["layout"])
            existing_prompts = processor.get_latest_prompt_for_layout(layout_json, cur)
            
            # If a suggested prompt was used, add it to the prompt history
            prompt_to_save = existing_prompts
            if suggested_prompt and not existing_prompts:
                # First document with this layout - save the suggested prompt as version 1
                import datetime
                prompt_to_save = [{
                    "prompt": suggested_prompt,
                    "timestamp": datetime.datetime.now().isoformat()
                }]
            elif suggested_prompt and existing_prompts:
                # Check if the suggested prompt is already in the history
                # If not, it means a new prompt was applied, add it
                prompt_texts = [p.get("prompt", "") for p in existing_prompts]
                if suggested_prompt not in prompt_texts:
                    import datetime
                    prompt_to_save = existing_prompts + [{
                        "prompt": suggested_prompt,
                        "timestamp": datetime.datetime.now().isoformat()
                    }]
            
            # Store document in SQLite with inherited/applied prompts
            file_type = get_file_type(file.filename)
            cur.execute(
                """
                INSERT INTO documents (filename, file_type, client_name, language, layout, user_prompt)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    file.filename,
                    file_type,
                    metadata["client_name"],
                    metadata["language"],
                    layout_json,
                    json.dumps(prompt_to_save) if prompt_to_save else None
                ),
            )
            doc_id = cur.lastrowid
            
            # Calculate inherited version
            inherited_version = len(prompt_to_save) if prompt_to_save else 0

        return {
            "status": "success",
            "document_id": doc_id,
            "filename": file.filename,
            "structured_markdown": structured_markdown,
            "extracted_data": sanitize_for_json(generated_json),
            "suggested_prompt": suggested_prompt,
            "oci_output_tokens": output_tokens,
            "inherited_version": inherited_version,
            "message": f"Document created with version {inherited_version} (inherited from layout)" if inherited_version > 0 else "Document created with version 0"
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
        raw_json, output_tokens = processor._call_oci_llm(custom_prompt)
        try:
            parsed_json = json.loads(raw_json)
        except:
            parsed_json = {"error": "Failed to parse JSON", "raw": raw_json}

        return {
            "status": "success",
            "generated_json": sanitize_for_json(parsed_json),
            "oci_output_tokens": output_tokens,
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


# === Save Prompt (persist and create new version) ===
@app.post("/save-prompt/")
async def save_prompt(
    document_id: int = Body(...),
    user_prompt: str = Body(...)
):
    """
    Save a user prompt and create a new version.
    This applies the prompt to all documents with the same layout.
    """
    try:
        with get_db() as (conn, cur):
            # Get the document's layout
            cur.execute("SELECT layout FROM documents WHERE id = ?", (document_id,))
        row = cur.fetchone()
        
        if not row:
            return {"status": "error", "message": "Document not found"}
        
            layout = row[0]
            
            # Apply prompt to all documents with the same layout
            updated_count = processor.update_prompt_for_layout(layout, user_prompt, cur, conn)
            
            return {
                "status": "success", 
                "message": f"Prompt saved and applied to {updated_count} document(s) with the same layout",
                "updated_count": updated_count
            }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def _normalize_value(value: Any):
    if value is None:
        return None
    if isinstance(value, str) and value.strip() == "":
        return None
    return value

# === Documents listing (filename, file_type, created_at, user_prompt) ===
@app.get("/documents/")
async def list_documents():
    try:
        with get_db() as (conn, cur):
            cur.execute("""
                SELECT filename, file_type, created_at, user_prompt, client_name, language
                FROM documents
                ORDER BY datetime(created_at) DESC, id DESC
            """)
            rows = cur.fetchall()
            documents: List[Dict[str, Any]] = []
            for row in rows:
                filename, file_type, created_at, user_prompt, client_name, language = row
                documents.append({
                    "filename": _normalize_value(filename),
                    "file_type": _normalize_value(file_type),
                    "created_at": _normalize_value(created_at),
                    "user_prompt": _normalize_value(user_prompt),
                    "client_name": _normalize_value(client_name),
                    "language": _normalize_value(language),     
                })
            return {
                "status": "success",
                "total_processed": len(documents),
                "documents": documents
            }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# === Version Control Endpoints ===

@app.get("/documents-with-versions/")
async def get_documents_with_versions():
    """
    Get all documents with their complete version history.
    Returns documents in the format expected by the frontend version control page.
    """
    try:
        with get_db() as (conn, cur):
            cur.execute("""
                SELECT id, filename, file_type, client_name, language, layout, user_prompt, created_at
                FROM documents
                ORDER BY datetime(created_at) DESC, id DESC
            """)
            rows = cur.fetchall()
            
            documents = []
            for row in rows:
                doc_id, filename, file_type, client_name, language, layout, user_prompt, created_at = row
                
                # Get version history for this document
                versions = processor.get_document_versions(doc_id, cur)
                
                # Determine current version (latest version number)
                current_version = len(versions) - 1 if versions else 0
                
                documents.append({
                    "id": f"doc-{doc_id}",
                    "filename": _normalize_value(filename),
                    "file_type": _normalize_value(file_type),
                    "client_name": _normalize_value(client_name),
                    "language": _normalize_value(language),
                    "created_at": _normalize_value(created_at),
                    "versions": versions,
                    "current_version": current_version
                })
            
            return {
                "status": "success",
                "documents": documents
            }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/document/{document_id}/versions/")
async def get_document_versions(document_id: int):
    """
    Get version history for a specific document.
    """
    try:
        with get_db() as (conn, cur):
            versions = processor.get_document_versions(document_id, cur)
            
            if not versions:
                return {"status": "error", "message": "Document not found"}
            
            return {
                "status": "success",
                "versions": versions,
                "current_version": len(versions) - 1
            }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.put("/document/{document_id}/version/{version}/")
async def update_document_version(
    document_id: int,
    version: int,
    new_prompt: str = Body(...)
):
    """
    Update a specific version's prompt text.
    Version 0 (system prompt) cannot be edited.
    """
    try:
        if version == 0:
            return {"status": "error", "message": "Cannot edit system prompt (version 0)"}
        
        with get_db() as (conn, cur):
            success = processor.update_specific_version(document_id, version, new_prompt, cur, conn)
            
            if success:
                # Get updated versions
                versions = processor.get_document_versions(document_id, cur)
                return {
                    "status": "success",
                    "message": "Prompt updated successfully",
                    "versions": versions
                }
            else:
                return {"status": "error", "message": "Failed to update prompt. Version may not exist."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/document/apply-prompt-to-layout/")
async def apply_prompt_to_layout(
    layout: str = Body(...),
    new_prompt: str = Body(...)
):
    """
    Apply a new user prompt to all documents with the same layout.
    This creates a new version for all matching documents.
    """
    try:
        with get_db() as (conn, cur):
            updated_count = processor.update_prompt_for_layout(layout, new_prompt, cur, conn)
            
            return {
                "status": "success",
                "message": f"Prompt applied to {updated_count} document(s)",
                "updated_count": updated_count
            }
    except Exception as e:
        return {"status": "error", "message": str(e)}


# === Delete all documents from the database ===
@app.delete("/delete-all-documents/")
async def delete_all_documents():
    try:
        with get_db() as (conn, cur):
            cur.execute("DELETE FROM documents")
            return {"status": "success", "message": "All documents have been deleted successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    import uvicorn
    import os
    
    # Run with multiple workers to handle concurrent requests
    # Using asyncio event loop for true async processing
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        log_level="info",
        # Enable concurrent request handling
        loop="asyncio",
        # Increase worker connections for better concurrency
        limit_concurrency=None,  # No limit on concurrent connections
        timeout_keep_alive=5
    )