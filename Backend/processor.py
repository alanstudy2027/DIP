import os
import re
import json
import math
from pathlib import Path
from typing import Dict, Any, Tuple

import oci
import numpy as np
from sentence_transformers import SentenceTransformer
from docling.document_converter import DocumentConverter


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


class DocumentProcessor:
    def __init__(self, config_file: str = "config.ini", profile: str = "DEFAULT"):
        """
        Initialize OCI Generative AI Client + Docling + Embeddings.
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
        self.converter = DocumentConverter()

        # Embedding model
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")

    def extract_with_docling(self, file_path: str) -> Tuple[str, Dict[str, Any]]:
        """
        Convert file → Markdown and extract basic metadata.
        """
        try:
            conv_result = self.converter.convert(file_path)
            markdown = conv_result.document.export_to_markdown()
            metadata = {
                "file_type": os.path.splitext(file_path)[-1].lstrip("."),
                "language": getattr(conv_result, "language", "Unknown"),
            }
            return markdown, metadata
        except Exception as e:
            raise RuntimeError(f"Docling extraction failed: {e}")

    def _call_oci_llm(self, prompt: str) -> str:
        """Helper to call OCI Generative AI with a text prompt."""
        content = oci.generative_ai_inference.models.TextContent()
        content.text = prompt
        message = oci.generative_ai_inference.models.Message()
        message.role = "USER"
        message.content = [content]

        chat_request = oci.generative_ai_inference.models.GenericChatRequest()
        chat_request.api_format = oci.generative_ai_inference.models.BaseChatRequest.API_FORMAT_GENERIC
        chat_request.messages = [message]
        chat_request.max_tokens = 4000
        chat_request.temperature = 0
        chat_request.top_p = 1
        chat_request.top_k = 0

        chat_detail = oci.generative_ai_inference.models.ChatDetails()
        chat_detail.serving_mode = oci.generative_ai_inference.models.OnDemandServingMode(
            model_id="ocid1.generativeaimodel.oc1.us-chicago-1.amaaaaaask7dceya3bsfz4ogiuv3yc7gcnlry7gi3zzx6tnikg6jltqszm2q"
        )
        chat_detail.chat_request = chat_request
        chat_detail.compartment_id = self.compartment_id

        response = self.client.chat(chat_detail)

        if hasattr(response.data, "chat_response") and response.data.chat_response.choices:
            choice = response.data.chat_response.choices[0]
            if choice.message.content:
                for item in choice.message.content:
                    if hasattr(item, "text") and item.text.strip():
                        return item.text.strip()
        raise RuntimeError("No valid response from OCI LLM")

    def process_document(self, file_path: str) -> Dict[str, Any]:
        """
        Full pipeline:
        1. Convert file → Markdown
        2. Structure Markdown with LLM
        3. Extract metadata (file_type, language, layout, client_name)
        4. Create embedding (layout + client_name)
        5. Return structured_markdown, metadata, embedding
        """
        # Step 1: Markdown
        markdown, doc_metadata = self.extract_with_docling(file_path)

        # Step 2: Structure Markdown
        struct_prompt = f"""
        You are a document formatter.
Your job is to rewrite the given Markdown content into a clean, standardized format.

Rules:
- Use GitHub-Flavored Markdown (GFM).
- Preserve ALL information (headings, tables, bullet points).
- Tables MUST be perfectly aligned with headers and separators.
- Always include a header row for tables.
- Do NOT invent new values, only clean formatting.
- Avoid wrapping tables inside code blocks (```).

Document content:
{markdown}

        """
        structured_markdown = self._call_oci_llm(struct_prompt)

        # Step 3: Metadata extraction (layout + client_name)
        filename = os.path.basename(file_path)

        meta_prompt = f"""
        You are a metadata extractor.

Given the document filename and Markdown content, return ONLY a JSON object with the following fields:

{{
  "file_type": "<file extension from filename, e.g. pdf, xlsx, docx>",
  "language": "<document language>",
  "client_name": "<company or client name>",
  "layout": ["<column1>", "<column2>", "<column3>", ...]
}}

Rules:
- file_type MUST be derived from the filename extension only (lowercase, no dot).
- Detect client_name from filename OR from document header (company name, client name, etc.).
- "layout" must be an array of column headers from the MAIN tabular section of the document. If no tables, return [].
- Return ONLY valid JSON, no explanations.

Filename: {filename}

Markdown:
{markdown}
        """
        raw_meta = self._call_oci_llm(meta_prompt)

        try:
            meta_json = json.loads(raw_meta)
        except:
            meta_json = {
                "file_type": doc_metadata.get("file_type", "NaN"),
                "language": doc_metadata.get("language", "NaN"),
                "layout": [],
                "client_name": re.sub(r"\..*$", "", filename),
            }

        # Normalize metadata
        normalized_meta = {
            "file_type": meta_json.get("file_type", doc_metadata.get("file_type", "NaN")),
            "language": meta_json.get("language", doc_metadata.get("language", "NaN")),
            # always store layout as JSON string
            "layout": json.dumps(meta_json.get("layout", [])),
            "customer_info": meta_json.get("client_name", re.sub(r"\..*$", "", filename)),
        }

        # Step 4: Embedding
        embed_text = f"Layout: {normalized_meta['layout']}, Client: {normalized_meta['customer_info']}"
        embedding = self.embedder.encode(embed_text)
        embedding = np.array(embedding, dtype="float32")

        # Step 5: Return
        return {
            "structured_markdown": structured_markdown,
            "metadata": normalized_meta,
            "embedding": embedding,
        }

    def extract_json_with_schema(self, structured_markdown: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Apply schema to structured markdown and return JSON.
        """
        schema_prompt = f"""
        Extract structured data from the following document into JSON.
        The JSON must strictly follow this schema:

        Schema:
        {json.dumps(schema, indent=2)}

        Document:
        {structured_markdown}
        """
        raw_json = self._call_oci_llm(schema_prompt)

        try:
            return json.loads(raw_json)
        except:
            return {"error": "Failed to parse JSON", "raw": raw_json}
