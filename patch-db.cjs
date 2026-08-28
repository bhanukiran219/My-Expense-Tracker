const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'db.json');

try {
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  let updated = 0;
  
  data.transactions.forEach(tx => {
    // If it was imported as income and isn't clearly an Income category, flip it to expense
    if (tx.source === 'csv' && tx.type === 'income' && tx.category !== 'Income') {
      tx.type = 'expense';
      updated++;
    }
  });

  if (updated > 0) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    console.log(`Updated ${updated} transactions from income to expense.`);
  } else {
    console.log('No transactions needed updating.');
  }
} catch (err) {
  console.error('Error patching DB:', err);
}
