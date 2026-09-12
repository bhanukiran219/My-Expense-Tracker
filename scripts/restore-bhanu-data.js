import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://enulbpticdhrltphpedr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_8YAbex-jAKSaeqN-WuJIoQ_cMIk0seB';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function restore() {
  console.log('🔄 Restoring Bhanu full dataset from commit 9032c11...');
  const raw = execSync('git show 9032c11:data/db.json').toString();
  const original = JSON.parse(raw);
  const localSettings = original.settings['local-user'];

  // Add expectedMonthlyIncome and cashflow forecast parameters
  localSettings.expectedMonthlyIncome = 104959; // From Accenture Solutions salary
  localSettings.incomePayday = 1;
  localSettings.safetyBufferAmount = 15000;
  localSettings.forecastDays = 30;

  console.log('Restoring settings:');
  console.log('- Recurring items:', localSettings.recurring.length);
  console.log('- Subscriptions:', localSettings.subscriptions.length);
  console.log('- Budgets:', localSettings.budgets.length);
  console.log('- Goals:', localSettings.goals.length);
  console.log('- Loans & Debts:', localSettings.loans.length);
  console.log('- Assets:', localSettings.assets.length);
  console.log('- Expected Monthly Income:', localSettings.expectedMonthlyIncome);

  // 1. Restore settings in Supabase
  const settingRows = [];
  for (const [key, value] of Object.entries(localSettings)) {
    settingRows.push({
      user_id: 'local-user',
      key: key,
      value: JSON.stringify(value),
      updated_at: new Date().toISOString()
    });
  }

  const { error: setErr } = await supabase.from('settings').upsert(settingRows);
  if (setErr) {
    console.error('Error restoring settings to Supabase:', setErr);
  } else {
    console.log('✅ Settings restored to Supabase successfully.');
  }

  // 2. Ensure transactions in Supabase
  const txCount = await supabase.from('transactions').select('*', { count: 'exact', head: true });
  console.log('Current transactions in Supabase:', txCount.count);
  if (!txCount.count || txCount.count < 128) {
    console.log('Re-inserting 128 transactions...');
    for (let i = 0; i < original.transactions.length; i += 50) {
      const chunk = original.transactions.slice(i, i + 50);
      await supabase.from('transactions').upsert(chunk);
    }
    console.log('✅ Transactions re-inserted.');
  }

  // 3. Update local data/db.json as well
  const dbPath = path.join(process.cwd(), 'data', 'db.json');
  if (fs.existsSync(dbPath)) {
    const currentDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    if (!currentDb.settings) currentDb.settings = {};
    currentDb.settings['local-user'] = localSettings;
    if (!currentDb.transactions || currentDb.transactions.length === 0) {
      currentDb.transactions = original.transactions;
    }
    fs.writeFileSync(dbPath, JSON.stringify(currentDb, null, 2), 'utf8');
    console.log('✅ Local data/db.json updated.');
  }

  console.log('\n🎉 Verification completed!');
}

restore().catch(console.error);
