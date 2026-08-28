import express, { Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { db } from './db.js';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export const router = express.Router();

const upload = multer({
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max
  },
  storage: multer.memoryStorage(),
});

// Middleware to set a default user
router.use((req: Request, res: Response, next) => {
  (req as any).userId = 'local-user';
  next();
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
router.get('/state', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const rawTxs = await db.getTransactions(userId, 5000);
    const transactions = rawTxs.map(formatTransaction);
    const tags = await db.getTags(userId);
    const rules = await db.getRules(userId);
    const settings = await db.getSettings(userId);
    const documents = await db.getDocuments(userId, 100);

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
router.post('/transactions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
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
        await db.insertTag(userId, t);
      }

      const resInsert = await db.insertTransaction(userId, {
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
router.patch('/transactions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id, date, merchant, category, amount, type, account, tags } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Transaction ID is required' });
    }

    const updated = await db.updateTransaction(userId, id, { date, merchant, category, amount, type, account, tags });
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
router.delete('/transactions/:id?', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const id = req.params.id || req.query.id || req.body.id;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Transaction ID is required' });
    }

    const deleted = await db.deleteTransaction(userId, String(id));
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
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const preferences = req.body;
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid preferences payload' });
    }

    await db.updatePreferences(userId, preferences);
    const updatedSettings = await db.getSettings(userId);

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
router.post('/documents', upload.array('files'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
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

      // Store in Supabase Storage
      await db.saveR2Object(userId, objectKey, file.buffer);

      // Insert metadata into Supabase DB
      const doc = await db.insertDocument(userId, {
        filename: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        objectKey,
        status: 'stored',
        source: 'upload',
      });

      if (doc) {
        savedDocs.push(doc);
      }

      // If this file is an invoice or receipt image/PDF/text and user requested immediate extraction
      const isReceiptLike = file.mimetype.includes('image') || file.mimetype.includes('pdf') || file.originalname.toLowerCase().includes('receipt') || file.originalname.toLowerCase().includes('invoice');
      if (req.body.extractTransaction === 'true' && isReceiptLike) {
        // Grounded merchant estimation if provided in form
        if (req.body.merchant && req.body.amount) {
          const resTx = await db.insertTransaction(userId, {
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
router.get('/documents/:id/download', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const doc = await db.getDocumentById(userId, req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const { buffer, exists } = await db.getR2Object(userId, doc.objectKey);
    if (!exists) {
      return res.status(404).json({ success: false, error: 'File object not found in storage' });
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
router.delete('/documents/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const deleted = await db.deleteDocument(userId, req.params.id);
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
router.delete('/state', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { confirmation } = req.body;
    if (confirmation !== 'DELETE ALL LEDGERLY DATA') {
      return res.status(400).json({
        success: false,
        error: 'Invalid confirmation phrase. Must be exactly "DELETE ALL LEDGERLY DATA"',
      });
    }

    await db.wipeAllData(userId);

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
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { whenText, thenText, enabled } = req.body;
    if (!whenText || !thenText) {
      return res.status(400).json({ success: false, error: 'whenText and thenText are required' });
    }
    const rule = await db.insertRule(userId, whenText, thenText, enabled !== undefined ? enabled : 1);
    res.json({ success: true, rule });
  } catch (error: any) {
    console.error('Error inserting rule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/rules/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { whenText, thenText, enabled } = req.body;
    const rule = await db.updateRule(userId, id, { whenText, thenText, enabled });
    if (!rule) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }
    res.json({ success: true, rule });
  } catch (error: any) {
    console.error('Error updating rule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const deleted = await db.deleteRule(userId, id);
    res.json({ success: deleted, message: deleted ? 'Rule deleted' : 'Rule not found' });
  } catch (error: any) {
    console.error('Error deleting rule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. Tags Routes
router.post('/tags', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Tag name is required' });
    }
    const created = await db.insertTag(userId, name);
    res.json({ success: true, tag: { name: name.trim(), createdAt: new Date().toISOString() } });
  } catch (error: any) {
    console.error('Error inserting tag:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/tags/:name', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name } = req.params;
    const deleted = await db.deleteTag(userId, name);
    res.json({ success: deleted, message: deleted ? 'Tag deleted' : 'Tag not found' });
  } catch (error: any) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 12. Parse Expense with AI
router.post('/parse-expense', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        amount: {
          type: Type.NUMBER,
          description: "The amount of the transaction",
        },
        merchant: {
          type: Type.STRING,
          description: "The name of the merchant",
        },
        category: {
          type: Type.STRING,
          description: "A short category for the expense, e.g. Food, Transportation",
        },
        date: {
          type: Type.STRING,
          description: "The date of the transaction in YYYY-MM-DD format",
        },
        type: {
          type: Type.STRING,
          description: "Either 'income' or 'expense'",
        }
      },
      required: ["amount", "merchant", "category", "date", "type"],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Extract the transaction details from this text: "${text}". If a date is not mentioned, use today's date: ${new Date().toISOString().split('T')[0]}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      res.json({ success: true, data: parsed });
    } else {
      res.status(500).json({ success: false, error: 'Failed to generate response' });
    }

  } catch (error: any) {
    console.error('Error parsing expense with AI:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
