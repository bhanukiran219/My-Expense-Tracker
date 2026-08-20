import express, { Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { db } from './db.js';

export const router = express.Router();

const upload = multer({
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max
  },
  storage: multer.memoryStorage(),
});

// Helper to decode tags in transaction
function formatTransaction(tx: any) {
  let tags: string[] = [];
  try {
    tags = typeof tx.tags === 'string' ? JSON.parse(tx.tags) : tx.tags;
  } catch {
    tags = [];
  }
  return {
    ...tx,
    tags,
  };
}

// 1. GET /api/state
router.get('/state', (req: Request, res: Response) => {
  try {
    const rawTxs = db.getTransactions(5000);
    const transactions = rawTxs.map(formatTransaction);
    const tags = db.getTags();
    const rules = db.getRules();
    const settings = db.getSettings();
    const documents = db.getDocuments(100);

    res.json({
      success: true,
      transactions,
      tags,
      rules,
      settings,
      documents,
    });
  } catch (error: any) {
    console.error('Error fetching state:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. POST /api/transactions
router.post('/transactions', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const items = Array.isArray(body) ? body : Array.isArray(body.transactions) ? body.transactions : [body];

    let inserted = 0;
    let duplicates = 0;
    let skipped = 0;
    let needsReview = 0;
    const savedList: any[] = [];

    for (const raw of items) {
      if (!raw || !raw.merchant || !raw.date || raw.amount === undefined || isNaN(Number(raw.amount))) {
        skipped++;
        continue;
      }

      const amount = Math.abs(Number(raw.amount));
      if (amount <= 0 || !isFinite(amount)) {
        skipped++;
        continue;
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      let date = String(raw.date).trim();
      if (!dateRegex.test(date)) {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
          skipped++;
          continue;
        }
        date = d.toISOString().split('T')[0];
      }

      const type = raw.type === 'income' ? 'income' : 'expense';
      const category = raw.category ? String(raw.category).trim() : 'Needs review';
      if (category === 'Needs review') {
        needsReview++;
      }

      let tagsArr: string[] = [];
      if (Array.isArray(raw.tags)) {
        tagsArr = raw.tags;
      } else if (typeof raw.tags === 'string') {
        try {
          const parsed = JSON.parse(raw.tags);
          if (Array.isArray(parsed)) tagsArr = parsed;
          else tagsArr = raw.tags.split(',').map((s: string) => s.trim());
        } catch {
          tagsArr = raw.tags.split(',').map((s: string) => s.trim());
        }
      }
      tagsArr = Array.from(new Set(tagsArr.map((t) => String(t).trim()).filter(Boolean)));

      // Save global tags if new
      for (const t of tagsArr) {
        db.insertTag(t);
      }

      const resInsert = db.insertTransaction({
        date,
        merchant: String(raw.merchant),
        category,
        amount,
        type,
        account: raw.account ? String(raw.account) : 'Imported account',
        tags: JSON.stringify(tagsArr),
        receipt: raw.receipt ? 1 : 0,
        source: raw.source || 'manual',
      });

      if (resInsert.success && resInsert.transaction) {
        inserted++;
        savedList.push(formatTransaction(resInsert.transaction));
      } else if (resInsert.isDuplicate) {
        duplicates++;
      } else {
        skipped++;
      }
    }

    res.json({
      success: true,
      inserted,
      duplicates,
      skipped,
      needsReview,
      items: savedList,
    });
  } catch (error: any) {
    console.error('Error inserting transactions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. PATCH /api/transactions
router.patch('/transactions', (req: Request, res: Response) => {
  try {
    const { id, date, merchant, category, amount, type, account, tags } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Transaction ID is required' });
    }

    const updated = db.updateTransaction(id, { date, merchant, category, amount, type, account, tags });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    res.json({
      success: true,
      transaction: formatTransaction(updated),
    });
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. DELETE /api/transactions/:id or query / body
router.delete('/transactions/:id?', (req: Request, res: Response) => {
  try {
    const id = req.params.id || req.query.id || req.body.id;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Transaction ID is required' });
    }

    const deleted = db.deleteTransaction(String(id));
    res.json({
      success: deleted,
      message: deleted ? 'Transaction deleted' : 'Transaction not found',
    });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. PUT /api/preferences
router.put('/preferences', (req: Request, res: Response) => {
  try {
    const preferences = req.body;
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid preferences payload' });
    }

    db.updatePreferences(preferences);
    const updatedSettings = db.getSettings();

    res.json({
      success: true,
      settings: updatedSettings,
    });
  } catch (error: any) {
    console.error('Error saving preferences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. POST /api/documents (Multipart Upload)
router.post('/documents', upload.array('files'), (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided' });
    }

    const savedDocs: any[] = [];
    const extractedTxs: any[] = [];

    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          error: `File ${file.originalname} exceeds the 20MB size limit.`,
        });
      }

      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const objectKey = `uploads/${crypto.randomUUID()}-${safeName}`;

      // Store in R2 bucket
      db.saveR2Object(objectKey, file.buffer);

      // Insert metadata into D1
      const doc = db.insertDocument({
        filename: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        objectKey,
        status: 'stored',
        source: 'upload',
      });

      savedDocs.push(doc);

      // If this file is an invoice or receipt image/PDF/text and user requested immediate extraction
      const isReceiptLike = file.mimetype.includes('image') || file.mimetype.includes('pdf') || file.originalname.toLowerCase().includes('receipt') || file.originalname.toLowerCase().includes('invoice');
      if (req.body.extractTransaction === 'true' && isReceiptLike) {
        // Grounded merchant estimation if provided in form
        if (req.body.merchant && req.body.amount) {
          const resTx = db.insertTransaction({
            date: req.body.date || new Date().toISOString().split('T')[0],
            merchant: String(req.body.merchant),
            category: req.body.category || 'Needs review',
            amount: Number(req.body.amount),
            type: 'expense',
            account: req.body.account || 'Everyday Visa',
            tags: JSON.stringify(['Receipt-backed']),
            receipt: 1,
            source: 'document',
          });
          if (resTx.success && resTx.transaction) {
            extractedTxs.push(formatTransaction(resTx.transaction));
          }
        }
      }
    }

    res.json({
      success: true,
      documents: savedDocs,
      extractedTransactions: extractedTxs,
    });
  } catch (error: any) {
    console.error('Error uploading documents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. GET /api/documents/:id/download
router.get('/documents/:id/download', (req: Request, res: Response) => {
  try {
    const doc = db.getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const { buffer, exists } = db.getR2Object(doc.objectKey);
    if (!exists) {
      return res.status(404).json({ success: false, error: 'File object not found in R2 storage' });
    }

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.filename)}"`);
    res.send(buffer);
  } catch (error: any) {
    console.error('Error downloading document:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. DELETE /api/documents/:id
router.delete('/documents/:id', (req: Request, res: Response) => {
  try {
    const deleted = db.deleteDocument(req.params.id);
    res.json({
      success: deleted,
      message: deleted ? 'Document removed' : 'Document not found',
    });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. DELETE /api/state (Data Wipe)
router.delete('/state', (req: Request, res: Response) => {
  try {
    const { confirmation } = req.body;
    if (confirmation !== 'DELETE ALL LEDGERLY DATA') {
      return res.status(400).json({
        success: false,
        error: 'Invalid confirmation phrase. Must be exactly "DELETE ALL LEDGERLY DATA"',
      });
    }

    db.wipeAllData();

    res.json({
      success: true,
      message: 'All Ledgerly data has been safely erased. Fresh start initialized.',
      driveResetAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error wiping state:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. Rules Routes
router.post('/rules', (req: Request, res: Response) => {
  try {
    const { whenText, thenText, enabled } = req.body;
    if (!whenText || !thenText) {
      return res.status(400).json({ success: false, error: 'whenText and thenText are required' });
    }
    const rule = db.insertRule(whenText, thenText, enabled !== undefined ? enabled : 1);
    res.json({ success: true, rule });
  } catch (error: any) {
    console.error('Error inserting rule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/rules/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { whenText, thenText, enabled } = req.body;
    const rule = db.updateRule(id, { whenText, thenText, enabled });
    if (!rule) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }
    res.json({ success: true, rule });
  } catch (error: any) {
    console.error('Error updating rule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/rules/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteRule(id);
    res.json({ success: deleted, message: deleted ? 'Rule deleted' : 'Rule not found' });
  } catch (error: any) {
    console.error('Error deleting rule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. Tags Routes
router.post('/tags', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Tag name is required' });
    }
    const created = db.insertTag(name);
    res.json({ success: true, tag: { name: name.trim(), createdAt: new Date().toISOString() } });
  } catch (error: any) {
    console.error('Error inserting tag:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/tags/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const deleted = db.deleteTag(name);
    res.json({ success: deleted, message: deleted ? 'Tag deleted' : 'Tag not found' });
  } catch (error: any) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
