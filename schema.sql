DROP TABLE IF EXISTS transactions;
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    merchant TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    account TEXT NOT NULL,
    tags TEXT NOT NULL,
    receipt INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, fingerprint)
);

DROP TABLE IF EXISTS tags;
CREATE TABLE tags (
    name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, name)
);

DROP TABLE IF EXISTS rules;
CREATE TABLE rules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    when_text TEXT NOT NULL,
    then_text TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

DROP TABLE IF EXISTS documents;
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    object_key TEXT NOT NULL,
    status TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL
);

DROP TABLE IF EXISTS settings;
CREATE TABLE settings (
    key TEXT NOT NULL,
    user_id TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
);
