import os
import re
import json
import math
from pathlib import Path
from typing import Dict, Any, Tuple
import oci
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import (
    PdfPipelineOptions,
    TesseractCliOcrOptions,
)
from docling.document_converter import DocumentConverter, PdfFormatOption


def sanitize_for_json(data):
    """Ensure all values are JSON serializable."""
    if isinstance(data, float):
        if math.isnan(data) or math.isinf(data):
            return "NaN"
        return data
    elif isinstance(data, dict):
        return {str(k): sanitize_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_for_json(v) for v in data]
    else:
        try:
            json.dumps(data)
            return data
        except Exception:
            return str(data)

def get_file_type(filename: str) -> str:
    """Extract file type (extension) using regex, e.g., pdf, xlsx, docx."""
    match = re.search(r'\.([^.]+)$', filename)
    return match.group(1).lower() if match else "unknown"
class DocumentProcessor:
    def __init__(self, config_file: str = "config.ini", profile: str = "DEFAULT"):
        """
        Initialize OCI Generative AI Client + Docling.
        """
        if not Path(config_file).exists():
            raise FileNotFoundError("❌ config.ini not found. Please set up OCI credentials.")

        # Load OCI config
        self.config = oci.config.from_file(config_file, profile)
        self.compartment_id = self.config.get("compartment_id", None)
        if not self.compartment_id:
            raise ValueError("compartment_id missing in config.ini")

        # Service endpoint
        self.endpoint = "https://inference.generativeai.us-chicago-1.oci.oraclecloud.com"

        # OCI client
        self.client = oci.generative_ai_inference.GenerativeAiInferenceClient(
            config=self.config,
            service_endpoint=self.endpoint,
            retry_strategy=oci.retry.NoneRetryStrategy(),
            timeout=(10, 240)
        )

        # Docling converter
        ocr_options = TesseractCliOcrOptions(lang=["auto"])

        pipeline_options = PdfPipelineOptions(
            do_ocr=True,
            force_full_page_ocr=True,
            ocr_options=ocr_options,
        )

        self.converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(
                    pipeline_options=pipeline_options
                )
            }
        )

    def extract_with_docling(self, file_path: str) -> Tuple[str, Dict[str, Any]]:
        """
        Convert file → Markdown and return raw markdown + basic metadata.
        """
        import time
        from datetime import datetime

        try:
            # Start timing
            start_time = time.time()
            start_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
            print(f"\n{'='*80}")
            print(f"[DOCLING START] {start_timestamp}")
            print(f"Processing file: {file_path}")
            print(f"{'='*80}\n")

            conv = self.converter.convert(file_path)

            # End timing for Docling conversion
            docling_time = time.time() - start_time
            docling_end_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
            print(f"\n{'='*80}")
            print(f"[DOCLING COMPLETE] {docling_end_timestamp}")
            print(f"Duration: {docling_time:.2f} seconds")
            print(f"{'='*80}\n")

            markdown = conv.document.export_to_markdown()

            metadata = {
                "language": getattr(conv, "language", "auto")
            }
            return markdown, metadata

        except Exception as e:
            raise RuntimeError(f"Docling extraction failed: {e}")


    def _call_oci_llm(self, prompt: str) -> Tuple[str, int | None]:
        """Call OCI Generative AI with a text prompt and return response text plus output tokens."""
        import time
        from datetime import datetime
        
        # Start timing
        start_time = time.time()
        start_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        print(f"\n[OCI API START] {start_timestamp}")
        print(f"Prompt length: {len(prompt)} characters")
        
        content = oci.generative_ai_inference.models.TextContent()
        content.text = prompt
        message = oci.generative_ai_inference.models.Message()
        message.role = "USER"
        message.content = [content]

        chat_request = oci.generative_ai_inference.models.CohereChatRequest()
        chat_request.message = message.content[0].text
        chat_request.max_tokens = 4000
        chat_request.temperature = 0.1
        chat_request.frequency_penalty = 0
        chat_request.top_p = 0.75
        chat_request.top_k = 0

        chat_detail = oci.generative_ai_inference.models.ChatDetails()
        chat_detail.serving_mode = oci.generative_ai_inference.models.OnDemandServingMode(
            model_id="cohere.command-r-plus-08-2024"
        )
        chat_detail.chat_request = chat_request
        chat_detail.compartment_id = self.compartment_id

        chat_response = self.client.chat(chat_detail)
        
        # End timing
        api_time = time.time() - start_time
        end_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        
        # Extract output tokens
        output_tokens = None
        if hasattr(chat_response.data, 'chat_response') and hasattr(chat_response.data.chat_response, 'meta'):
            meta = chat_response.data.chat_response.meta
            if hasattr(meta, 'tokens') and hasattr(meta.tokens, 'output_tokens'):
                output_tokens = meta.tokens.output_tokens
        
        # Print timing summary
        response_text = chat_response.data.chat_response.text
        print(f"[OCI API COMPLETE] {end_timestamp}")
        print(f"Duration: {api_time:.2f} seconds")
        if output_tokens:
            print(f"Output tokens: {output_tokens}")
        print(f"Response length: {len(response_text)} characters\n")

        return response_text, output_tokens

    def process_document(self, file_path: str) -> Dict[str, Any]:
        """
        1. Docling → Markdown
        2. Regex → File type
        3. LLM → Extract language, client_name, layout
        4. Return markdown + metadata
        """
        import time
        from datetime import datetime
        
        # Overall timing
        overall_start = time.time()
        overall_start_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        print(f"\n{'#'*80}")
        print(f"# DOCUMENT PROCESSING START: {overall_start_timestamp}")
        print(f"# File: {file_path}")
        print(f"{'#'*80}\n")
        
        # Phase 1: Docling conversion
        phase1_start = time.time()
        print(f"[PHASE 1] Starting Docling conversion...")
        markdown, doc_metadata = self.extract_with_docling(file_path)
        phase1_time = time.time() - phase1_start
        print(f"[PHASE 1 COMPLETE] Docling conversion: {phase1_time:.2f}s\n")
        
        # Phase 2: File type extraction
        phase2_start = time.time()
        print(f"[PHASE 2] Extracting file type...")
        filename = Path(file_path).name
        file_type = get_file_type(filename)
        phase2_time = time.time() - phase2_start
        print(f"[PHASE 2 COMPLETE] File type extraction: {phase2_time:.3f}s\n")
        
        # Phase 3: Metadata extraction via LLM
        phase3_start = time.time()
        print(f"[PHASE 3] Extracting metadata (language, client, layout) via LLM...")
        meta_prompt = f"""
        Extract metadata from this document and return ONLY a JSON object with this structure:
        {{
          "language": "<document language>",
          "client_name": "<company name or client name>",
          "layout": ["<column1>", "<column2>", "<column3>", ...]  # column headers if any
        }}

        Filename: {filename}
        Content: {markdown}
        """
        raw_meta, _ = self._call_oci_llm(meta_prompt)
        phase3_time = time.time() - phase3_start
        print(f"[PHASE 3 COMPLETE] Metadata extraction: {phase3_time:.2f}s\n")

        try:
            meta_json = json.loads(raw_meta)
        except:
            meta_json = {
                "language": doc_metadata.get("language", "NaN"),
                "layout": [],
                "client_name": re.sub(r"\..*$", "", filename),
            }

        normalized_meta = {
            "file_type": file_type,  # from regex
            "language": meta_json.get("language", doc_metadata.get("language", "NaN")),
            "layout": meta_json.get("layout", []),
            "client_name": meta_json.get("client_name", re.sub(r"\..*$", "", filename)),
        }
        
        # Overall summary
        overall_time = time.time() - overall_start
        overall_end_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        print(f"\n{'#'*80}")
        print(f"# DOCUMENT PROCESSING COMPLETE: {overall_end_timestamp}")
        print(f"# Total Duration: {overall_time:.2f}s")
        print(f"# Breakdown:")
        print(f"#   - Docling Conversion: {phase1_time:.2f}s ({phase1_time/overall_time*100:.1f}%)")
        print(f"#   - File Type: {phase2_time:.3f}s ({phase2_time/overall_time*100:.1f}%)")
        print(f"#   - Metadata Extraction: {phase3_time:.2f}s ({phase3_time/overall_time*100:.1f}%)")
        print(f"{'#'*80}\n")

        return {
            "structured_markdown": markdown,
            "metadata": normalized_meta,
        }

    def extract_json_with_schema(
        self,
        structured_markdown: str,
        schema: Dict[str, Any],
        suggested_prompt: str = None
    ) -> Dict[str, Any]:
        """
        Apply schema to structured markdown and return JSON.
        If suggested_prompt is available, apply it along with the base schema extraction.
        """
        # Create a sample JSON with empty values based on schema
        sample_json = {}
        for key in schema:
            sample_json[key] = ""
            
        if suggested_prompt:
            schema_prompt = f"""
    You are a document data extraction expert.
    
    Use the following instruction to improve extraction: "{suggested_prompt}"

    Extract structured data from the document into JSON that EXACTLY follows this schema:
    {json.dumps(schema, indent=2)}
    
    Expected output format:
    {json.dumps(sample_json, indent=2)}

    Pay special attention to the Language field. It should be the primary language 
    used in the document content. Use ISO language codes (e.g., 'en' for English, 
    'es' for Spanish, etc.) if possible.

    Special Instructions for OrderDetailNotes field:
    1. Extract Order Information such as:
       - Order Information
       - Order type
       - Special handling instructions
       - Priority level
       - Order status
       - Customer requirements
       - Urgent
    2. Format as key-value pairs
    3. If no order information found, return empty string ("")

    Special Instructions for DeliveryDate field:
    1. First, look for explicit delivery date in the document
    2. If delivery date not found, use Cargo Ready Date
    3. If cargo ready date not found, use preparation date
    4. If no date is found, return null
    5. Maintain date format as found in document

    Special Instructions for OrderDetailNotes field:
    1. DO NOT summarize the document
    2. ONLY extract urgent/important notes like "urgent delivery", "handle with care", etc.
    3. If no urgent/important notes found, return empty string ("")

    Special Instructions for UnitOfMeasure field:
    1. Look for standard units of measurement (e.g., "pcs", "kg", "lbs", "m", "ft", "each", "box", "set", "ea")
    2. Convert common variations to standard format:
        - pieces/piece → "pcs"
        - kilograms/kilo → "kg"
        - pounds → "lbs"
        - meters → "m"
        - feet → "ft"
        - boxes → "box"
        - sets → "set"
    3. If no unit found, return empty string ("")
    4. Maintain case sensitivity as shown in examples

    Document:
    {structured_markdown}
    
    Return ONLY the JSON object with no additional text, explanations, or markdown formatting.
    """
        else:
            schema_prompt = f"""
    You are a document data extraction expert.
    
    Extract structured data from the following document into JSON.
    The JSON must EXACTLY follow this schema with these exact field names:
    {json.dumps(schema, indent=2)}
    
    Expected output format:
    {json.dumps(sample_json, indent=2)}

    Pay special attention to the Language field. It should be the primary language 
    used in the document content. Use ISO language codes (e.g., 'en' for English, 
    'es' for Spanish, etc.) if possible.

    Special Instructions for OrderDetailNotes field:
    1. Extract Order Information such as:
       - Order Information
       - Order type
       - Special handling instructions
       - Priority level
       - Order status
       - Customer requirements
       - Urgent
    2. Format as key-value pairs
    3. If no order information found, return empty string ("")

    Special Instructions for DeliveryDate field:
    1. First, look for explicit delivery date in the document
    2. If delivery date not found, use Cargo Ready Date
    3. If cargo ready date not found, use preparation date
    4. If no date is found, return null
    5. Maintain date format as found in document

    Special Instructions for OrderDetailNotes field:
    1. DO NOT provide a summary of the document
    2. ONLY extract urgent or important notes (e.g., "urgent delivery", "priority shipment", "handle with care")
    3. If no urgent/important notes are found, return empty string ("")
    4. Focus on actionable or critical information only

    Special Instructions for UnitOfMeasure field:
    1. Look for standard units of measurement (e.g., "pcs", "kg", "lbs", "m", "ft", "each", "box", "set")
    2. Convert common variations to standard format:
        - pieces/piece → "pcs"
        - kilograms/kilo → "kg"
        - pounds → "lbs"
        - meters → "m"
        - feet → "ft"
        - boxes → "box"
        - sets → "set"
    3. If no unit found, return empty string ("")
    4. Maintain case sensitivity as shown in examples

    Document:
    {structured_markdown}
    
    Return ONLY the JSON object with no additional text, explanations, or markdown formatting.
    If you cannot find a value for a field, leave it as an empty string.
    """

        raw_json, output_tokens = self._call_oci_llm(schema_prompt)

        try:
            # Clean the response to ensure it's valid JSON
            cleaned_json = raw_json.strip()
            # Remove any markdown code block indicators
            cleaned_json = re.sub(r'^```json\s*', '', cleaned_json)
            cleaned_json = re.sub(r'\s*```$', '', cleaned_json)
            
            parsed_json = json.loads(cleaned_json)
            
            # Ensure all schema keys are present
            for key in schema:
                if key not in parsed_json:
                    parsed_json[key] = ""
                    
            return parsed_json, output_tokens
        except Exception as e:
            return {"error": f"Failed to parse JSON: {str(e)}", "raw": raw_json}, output_tokens

    def find_suggested_prompt(self, current_client: str, current_layout: str, cursor) -> str:
        """
        Find suggested prompt by:
        1. First checking for exact client name match
        2. Then using LLM to compare layouts for similarity
        """
        # Step 1: Check for exact client name match first
        cursor.execute(
            "SELECT user_prompt FROM documents WHERE client_name = ? AND user_prompt IS NOT NULL LIMIT 1",
            (current_client,)
        )
        row = cursor.fetchone()
        if row:
            return row[0]
        
        # Step 2: Get all documents with saved prompts for layout comparison
        cursor.execute(
            "SELECT client_name, layout, user_prompt FROM documents WHERE user_prompt IS NOT NULL"
        )
        candidates = cursor.fetchall()
        
        if not candidates:
            return None
            
        # Step 3: Use LLM to find the most similar layout
        current_layout_parsed = json.loads(current_layout) if isinstance(current_layout, str) else current_layout
        
        best_prompt = None
        best_similarity_score = 0
        
        for candidate_client, candidate_layout, candidate_prompt in candidates:
            try:
                candidate_layout_parsed = json.loads(candidate_layout) if isinstance(candidate_layout, str) else candidate_layout
                
                # Use LLM to compare layouts
                comparison_prompt = f"""
                Compare these two document layouts and return a similarity score from 0 to 100.
                Consider column names, data types, and overall structure.
                Return ONLY a number between 0-100, no explanations.
                
                Layout 1: {json.dumps(current_layout_parsed)}
                Layout 2: {json.dumps(candidate_layout_parsed)}
                
                Similarity score (0-100):
                """
                
                score_text, _ = self._call_oci_llm(comparison_prompt)
                
                # Extract numeric score
                import re
                score_match = re.search(r'\b(\d+(?:\.\d+)?)\b', score_text)
                if score_match:
                    similarity_score = float(score_match.group(1))
                    if similarity_score > best_similarity_score and similarity_score >= 70:  # Threshold for similarity
                        best_similarity_score = similarity_score
                        best_prompt = candidate_prompt
                        
            except Exception as e:
                # Skip this candidate if there's an error
                continue
        return best_prompt

    def get_document_versions(self, document_id: int, cursor) -> list:
        """
        Get version history for a document.
        Returns a list of version objects with version number, type, prompt, and timestamp.
        
        Version logic:
        - Version 0: System prompt only (user_prompt is NULL)
        - Version 1+: User prompts stored as JSON array in user_prompt column
        """
        cursor.execute(
            "SELECT user_prompt, created_at FROM documents WHERE id = ?",
            (document_id,)
        )
        row = cursor.fetchone()
        
        if not row:
            return []
        
        user_prompt_data, created_at = row
        versions = []
        
        # Version 0: System prompt only
        versions.append({
            "version": 0,
            "type": "system",
            "prompt": None,  # System prompt is implicit
            "timestamp": created_at
        })
        
        # Parse user prompts if they exist
        if user_prompt_data:
            try:
                prompt_history = json.loads(user_prompt_data)
                if isinstance(prompt_history, list):
                    for idx, prompt_entry in enumerate(prompt_history):
                        versions.append({
                            "version": idx + 1,
                            "type": "user",
                            "prompt": prompt_entry.get("prompt", ""),
                            "timestamp": prompt_entry.get("timestamp", created_at)
                        })
                else:
                    # Legacy format: single prompt string
                    versions.append({
                        "version": 1,
                        "type": "user",
                        "prompt": user_prompt_data,
                        "timestamp": created_at
                    })
            except json.JSONDecodeError:
                # Legacy format: single prompt string
                versions.append({
                    "version": 1,
                    "type": "user",
                    "prompt": user_prompt_data,
                    "timestamp": created_at
                })
        
        return versions

    def get_latest_prompt_for_layout(self, layout: str, cursor) -> dict:
        """
        Get the latest user prompt for documents with the same layout.
        Returns the prompt history (as JSON) or None if no prompts exist.
        """
        cursor.execute(
            "SELECT user_prompt FROM documents WHERE layout = ? AND user_prompt IS NOT NULL ORDER BY created_at DESC LIMIT 1",
            (layout,)
        )
        row = cursor.fetchone()
        
        if row and row[0]:
            try:
                return json.loads(row[0])
            except json.JSONDecodeError:
                # Legacy format: return as single-item array
                return [{"prompt": row[0], "timestamp": None}]
        
        return None

    def update_prompt_for_layout(self, layout: str, new_prompt: str, cursor, conn) -> int:
        """
        Add a new version to all documents with the same layout.
        Returns the number of documents updated.
        """
        import datetime
        
        # Get all documents with this layout
        cursor.execute(
            "SELECT id, user_prompt FROM documents WHERE layout = ?",
            (layout,)
        )
        documents = cursor.fetchall()
        
        updated_count = 0
        timestamp = datetime.datetime.now().isoformat()
        
        for doc_id, current_prompt_data in documents:
            # Parse existing prompt history
            prompt_history = []
            if current_prompt_data:
                try:
                    parsed = json.loads(current_prompt_data)
                    if isinstance(parsed, list):
                        prompt_history = parsed
                    else:
                        # Legacy format: convert to new format
                        prompt_history = [{"prompt": current_prompt_data, "timestamp": None}]
                except json.JSONDecodeError:
                    # Legacy format: convert to new format
                    prompt_history = [{"prompt": current_prompt_data, "timestamp": None}]
            
            # Add new version
            prompt_history.append({
                "prompt": new_prompt,
                "timestamp": timestamp
            })
            
            # Update document
            cursor.execute(
                "UPDATE documents SET user_prompt = ? WHERE id = ?",
                (json.dumps(prompt_history), doc_id)
            )
            updated_count += 1
        
        conn.commit()
        return updated_count

    def update_specific_version(self, document_id: int, version: int, new_prompt: str, cursor, conn) -> bool:
        """
        Update a specific version's prompt text for a single document.
        Version 0 cannot be edited (system prompt).
        Returns True if successful, False otherwise.
        """
        if version == 0:
            return False  # Cannot edit system prompt
        
        cursor.execute(
            "SELECT user_prompt FROM documents WHERE id = ?",
            (document_id,)
        )
        row = cursor.fetchone()
        
        if not row:
            return False
        
        user_prompt_data = row[0]
        
        if not user_prompt_data:
            return False  # No user prompts to edit
        
        try:
            prompt_history = json.loads(user_prompt_data)
            if not isinstance(prompt_history, list):
                # Legacy format
                if version == 1:
                    prompt_history = [{"prompt": new_prompt, "timestamp": None}]
                else:
                    return False
            else:
                # Update the specific version (version 1 = index 0)
                version_index = version - 1
                if 0 <= version_index < len(prompt_history):
                    prompt_history[version_index]["prompt"] = new_prompt
                else:
                    return False
            
            # Save updated history
            cursor.execute(
                "UPDATE documents SET user_prompt = ? WHERE id = ?",
                (json.dumps(prompt_history), document_id)
            )
            conn.commit()
            return True
            
        except (json.JSONDecodeError, IndexError, KeyError):
            return False