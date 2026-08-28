const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, 'data', 'db.json');
const sqlFile = path.join(__dirname, 'seed.sql');

if (!fs.existsSync(dbFile)) {
  console.log('No db.json found. Skipping migration.');
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));

let sql = '';

// Transactions
if (data.transactions && data.transactions.length > 0) {
  for (const t of data.transactions) {
    sql += `INSERT INTO transactions (id, date, merchant, category, amount, type, account, tags, receipt, source, fingerprint, created_at) VALUES ('${t.id}', '${t.date}', '${t.merchant.replace(/'/g, "''")}', '${t.category.replace(/'/g, "''")}', ${t.amount}, '${t.type}', '${t.account.replace(/'/g, "''")}', '${t.tags.replace(/'/g, "''")}', ${t.receipt}, '${t.source}', '${t.fingerprint.replace(/'/g, "''")}', '${t.created_at}');\n`;
  }
}

// Tags
if (data.tags && data.tags.length > 0) {
  for (const t of data.tags) {
    sql += `INSERT INTO tags (name, created_at) VALUES ('${t.name.replace(/'/g, "''")}', '${t.created_at}');\n`;
  }
}

// Rules
if (data.rules && data.rules.length > 0) {
  for (const r of data.rules) {
    sql += `INSERT INTO rules (id, when_text, then_text, enabled, created_at) VALUES ('${r.id}', '${r.when_text.replace(/'/g, "''")}', '${r.then_text.replace(/'/g, "''")}', ${r.enabled}, '${r.created_at}');\n`;
  }
}

// Documents
if (data.documents && data.documents.length > 0) {
  for (const d of data.documents) {
    sql += `INSERT INTO documents (id, filename, mime_type, size, object_key, status, source, created_at) VALUES ('${d.id}', '${d.filename.replace(/'/g, "''")}', '${d.mime_type}', ${d.size}, '${d.object_key.replace(/'/g, "''")}', '${d.status}', '${d.source}', '${d.created_at}');\n`;
  }
}

// Settings
if (data.settings && Object.keys(data.settings).length > 0) {
  for (const [k, v] of Object.entries(data.settings)) {
    sql += `INSERT INTO settings (key, value, updated_at) VALUES ('${k}', '${JSON.stringify(v).replace(/'/g, "''")}', '${new Date().toISOString()}');\n`;
  }
}

fs.writeFileSync(sqlFile, sql, 'utf8');
console.log(`Generated ${sqlFile} with ${sql.split('\n').length - 1} statements.`);
