import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://enulbpticdhrltphpedr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_8YAbex-jAKSaeqN-WuJIoQ_cMIk0seB';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
  console.log('🚀 Starting migration of db.json to Supabase...');
  const dbPath = path.join(process.cwd(), 'data', 'db.json');
  if (!fs.existsSync(dbPath)) {
    console.error('db.json not found at', dbPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(dbPath, 'utf8');
  const data = JSON.parse(raw);

  // 1. Users
  if (data.users && data.users.length > 0) {
    console.log(`Migrating ${data.users.length} users...`);
    const { error: userErr } = await supabase.from('users').upsert(data.users);
    if (userErr) console.error('Error inserting users:', userErr);
    else console.log('✅ Users migrated successfully.');
  }

  // 2. Transactions
  if (data.transactions && data.transactions.length > 0) {
    console.log(`Migrating ${data.transactions.length} transactions...`);
    // Batch in chunks of 50 to avoid any payload limits
    for (let i = 0; i < data.transactions.length; i += 50) {
      const chunk = data.transactions.slice(i, i + 50);
      const { error: txErr } = await supabase.from('transactions').upsert(chunk);
      if (txErr) console.error(`Error inserting transactions chunk ${i}:`, txErr);
    }
    console.log('✅ Transactions migrated successfully.');
  }

  // 3. Tags
  if (data.tags && data.tags.length > 0) {
    console.log(`Migrating ${data.tags.length} tags...`);
    const { error: tagErr } = await supabase.from('tags').upsert(data.tags);
    if (tagErr) console.error('Error inserting tags:', tagErr);
    else console.log('✅ Tags migrated successfully.');
  }

  // 4. Rules
  if (data.rules && data.rules.length > 0) {
    console.log(`Migrating ${data.rules.length} rules...`);
    const { error: ruleErr } = await supabase.from('rules').upsert(data.rules);
    if (ruleErr) console.error('Error inserting rules:', ruleErr);
    else console.log('✅ Rules migrated successfully.');
  }

  // 5. Documents
  if (data.documents && data.documents.length > 0) {
    console.log(`Migrating ${data.documents.length} documents...`);
    const { error: docErr } = await supabase.from('documents').upsert(data.documents);
    if (docErr) console.error('Error inserting documents:', docErr);
    else console.log('✅ Documents migrated successfully.');
  }

  // 6. Settings
  if (data.settings) {
    const settingRows = [];
    for (const [userId, userSettings] of Object.entries(data.settings)) {
      for (const [key, value] of Object.entries(userSettings)) {
        settingRows.push({
          user_id: userId,
          key: key,
          value: JSON.stringify(value),
          updated_at: new Date().toISOString(),
        });
      }
    }
    if (settingRows.length > 0) {
      console.log(`Migrating ${settingRows.length} setting keys...`);
      for (let i = 0; i < settingRows.length; i += 50) {
        const chunk = settingRows.slice(i, i + 50);
        const { error: setErr } = await supabase.from('settings').upsert(chunk);
        if (setErr) console.error(`Error inserting settings chunk ${i}:`, setErr);
      }
      console.log('✅ Settings migrated successfully.');
    }
  }

  console.log('\n🎉 Migration complete! Verifying counts in Supabase:');
  const [usersCount, txCount, settingsCount] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('transactions').select('*', { count: 'exact', head: true }),
    supabase.from('settings').select('*', { count: 'exact', head: true }),
  ]);

  console.log(`Supabase Users: ${usersCount.count}`);
  console.log(`Supabase Transactions: ${txCount.count}`);
  console.log(`Supabase Settings: ${settingsCount.count}`);
}

migrate().catch(console.error);
