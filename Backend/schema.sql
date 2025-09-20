-- Table for processed documents
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    file_type TEXT,
    client_name TEXT,
    language TEXT,
    layout TEXT, -- JSON array of column names
    embedding TEXT, -- JSON string of embedding vector
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for prompts tied to embeddings
CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER,
    layout TEXT,
    client_name TEXT,
    user_prompt TEXT,
    embedding TEXT, -- JSON string of embedding vector
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents (id)
);
