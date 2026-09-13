import express, { Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { db, verifyPassword } from './db.js';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export const router = express.Router();

const upload = multer({
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max
  },
  storage: multer.memoryStorage(),
});

// ==========================================
// Authentication Endpoints
// ==========================================

// GET /api/auth/config (Public auth client config)
router.get('/auth/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  });
});

// GET /api/auth/status
router.get('/auth/status', async (req: Request, res: Response) => {
  try {
    const userCount = await db.getUsersCount();
    const hasAppPassword = !!process.env.APP_PASSWORD;
    const isSetupRequired = userCount === 0 && !hasAppPassword;

    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.substring(7)
      : (req.query.token as string) || null;

    const getUserHint = async () => {
      try {
        if (userCount === 1) {
          const first = await db.getFirstUser();
          if (first) {
            return {
              username: first.username,
              email: first.email,
              picture: first.picture,
            };
          }
        }
      } catch {}
      return null;
    };

    if (!token) {
      return res.json({
        success: true,
        initialized: !isSetupRequired,
        authenticated: false,
        userHint: await getUserHint(),
      });
    }

    const session = await db.getSession(token);
    if (!session) {
      return res.json({
        success: true,
        initialized: !isSetupRequired,
        authenticated: false,
        userHint: await getUserHint(),
      });
    }

    const user = await db.getUserById(session.user_id);
    return res.json({
      success: true,
      initialized: !isSetupRequired,
      authenticated: true,
      user: {
        id: session.user_id,
        username: user?.username || 'Admin',
        email: user?.email,
        picture: user?.picture,
      },
    });
  } catch (err: any) {
    console.error('Error checking auth status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/setup
router.post('/auth/setup', async (req: Request, res: Response) => {
  try {
    const userCount = await db.getUsersCount();
    const hasAppPassword = !!process.env.APP_PASSWORD;

    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Initial setup has already been completed. Please log in.',
      });
    }

    const { username, password } = req.body;
    if (!password || password.trim().length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 4 characters long.',
      });
    }

    const finalUsername = (username && username.trim()) || 'Admin';
    const newUser = await db.createUser(finalUsername, password);
    const token = await db.createSession(newUser.id);

    res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
      },
    });
  } catch (err: any) {
    console.error('Error in auth setup:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/register (For new users/friends to create their own account)
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, error: 'Please choose a username.' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, error: 'Password must be at least 4 characters long.' });
    }

    const trimmed = username.trim();
    const existing = await db.getUserByUsername(trimmed);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Username "${trimmed}" is already taken. Please choose another username.`,
      });
    }

    const newUser = await db.createUser(trimmed, password);
    const token = await db.createSession(newUser.id);

    res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
      },
    });
  } catch (err: any) {
    console.error('Error in auth register:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required.' });
    }

    // 1. Check if environment master password is set
    if (process.env.APP_PASSWORD && password === process.env.APP_PASSWORD) {
      const token = await db.createSession('local-user');
      return res.json({
        success: true,
        token,
        user: {
          id: 'local-user',
          username: (username && username.trim()) || 'Admin',
        },
      });
    }

    // 2. Check local database users
    const userCount = await db.getUsersCount();
    if (userCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'No account created yet. Please complete initial setup first.',
        setupRequired: true,
      });
    }

    let user = null;
    if (username && username.trim()) {
      const identifier = username.trim();
      user = await db.getUserByUsername(identifier);
      if (!user) {
        user = await db.getUserByEmail(identifier);
      }
    } else {
      // If only one user exists, allow password-only unlock
      user = await db.getFirstUser();
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password.',
      });
    }

    const isMatch = verifyPassword(password, user.password_hash, user.salt);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect password.',
      });
    }

    const token = await db.createSession(user.id);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (err: any) {
    console.error('Error logging in:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/logout
router.post('/auth/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.substring(7)
      : (req.query.token as string) || (req.body && req.body.token) || null;

    if (token) {
      await db.deleteSession(token);
    }

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    console.error('Error logging out:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/google (Verify Google ID Token from Google Identity Services)
router.post('/auth/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, error: 'Google credential token is required.' });
    }

    // Verify token using Google's tokeninfo endpoint
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
    const googleRes = await fetch(verifyUrl);

    if (!googleRes.ok) {
      const errText = await googleRes.text();
      return res.status(401).json({
        success: false,
        error: 'Failed to verify Google credential with Google Identity Services: ' + errText,
      });
    }

    const payload: any = await googleRes.json();
    const { sub: googleId, email, name, picture } = payload;

    if (!googleId || !email) {
      return res.status(400).json({ success: false, error: 'Invalid Google token payload.' });
    }

    // Check if user exists by google_id or by email
    let user = await db.getUserByGoogleId(googleId);
    if (!user && email) {
      user = await db.getUserByEmail(email);
      if (user) {
        user = await db.linkGoogleAccount(user.id, googleId, email, picture, name);
      }
    }

    // If no existing user matched, create a brand-new user for them with their own name & email
    if (!user) {
      user = await db.createGoogleUser(googleId, email, name || email.split('@')[0], picture);
    }

    if (!user) {
      return res.status(500).json({ success: false, error: 'Failed to create or link user account.' });
    }

    const token = await db.createSession(user.id);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        picture: user.picture,
      },
    });
  } catch (err: any) {
    console.error('Error in Google auth:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/google/demo (Instant Google Sign-In for local testing)
router.post('/auth/google/demo', async (req: Request, res: Response) => {
  try {
    const demoGoogleId = 'demo-google-user-123';
    const demoEmail = 'demo.user@gmail.com';
    const demoName = 'Bhanu (Google)';
    const demoPicture = 'https://lh3.googleusercontent.com/a/default-user';

    let user = await db.getUserByGoogleId(demoGoogleId);
    if (!user) {
      const allUsers = await db.getUsersCount();
      const firstUser = await db.getFirstUser();
      if (allUsers === 1 && firstUser && firstUser.id === 'local-user') {
        user = await db.linkGoogleAccount('local-user', demoGoogleId, demoEmail, demoPicture);
      } else {
        user = await db.createGoogleUser(demoGoogleId, demoEmail, demoName, demoPicture);
      }
    }

    if (!user) {
      return res.status(500).json({ success: false, error: 'Failed to initialize demo Google user.' });
    }

    const token = await db.createSession(user.id);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        picture: user.picture,
      },
    });
  } catch (err: any) {
    console.error('Error in demo Google auth:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// Authentication & Authorization Middleware
// ==========================================
router.use(async (req: Request, res: Response, next) => {
  // Pass through public auth endpoints & health check
  if (req.path.startsWith('/auth') || req.path === '/health') {
    return next();
  }

  const userCount = await db.getUsersCount();
  const hasAppPassword = !!process.env.APP_PASSWORD;
  const isSetupRequired = userCount === 0 && !hasAppPassword;

  // Extract token from Bearer header or query parameter (helpful for download links)
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.substring(7)
    : (req.query.token as string) || null;

  if (isSetupRequired) {
    return res.status(401).json({
      success: false,
      error: 'Initial setup required. Please create your master password.',
      setupRequired: true,
    });
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.',
    });
  }

  const session = await db.getSession(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalid. Please log in again.',
    });
  }

  (req as any).userId = session.user_id;
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

import { extractTransactionsFromDocument } from './documentExtractor.js';

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
    const userSettings = await db.getSettings(userId);
    const userAccounts = (userSettings && userSettings.accounts) || ['ICICI Savings', 'Main Checking'];

    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          error: `File ${file.originalname} exceeds the 20MB size limit.`,
        });
      }

      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const objectKey = `uploads/${crypto.randomUUID()}-${safeName}`;

      // Store in storage
      await db.saveR2Object(userId, objectKey, file.buffer);

      // Insert metadata into DB
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

      // Check if automatic extraction is requested (default true unless explicitly set to 'false')
      const shouldExtract = req.body.extractTransaction !== 'false';
      if (shouldExtract) {
        try {
          const extractedList = await extractTransactionsFromDocument(
            file.buffer,
            file.originalname,
            file.mimetype || 'application/octet-stream',
            userAccounts
          );

          for (const rawTx of extractedList) {
            const finalMerchant = req.body.merchant || rawTx.merchant;
            const finalAmount = req.body.amount ? Number(req.body.amount) : rawTx.amount;
            const finalCategory = req.body.category || rawTx.category || 'Needs review';
            const finalDate = req.body.date || rawTx.date || new Date().toISOString().split('T')[0];
            const finalAccount = req.body.account || rawTx.account || userAccounts[0] || 'ICICI Savings';

            const resTx = await db.insertTransaction(userId, {
              date: finalDate,
              merchant: finalMerchant,
              category: finalCategory,
              amount: finalAmount,
              type: rawTx.type || 'expense',
              account: finalAccount,
              tags: JSON.stringify(rawTx.tags || ['Receipt-backed']),
              receipt: 1,
              source: 'document',
            });

            if (resTx.success && resTx.transaction) {
              extractedTxs.push(formatTransaction(resTx.transaction));
            }
          }
        } catch (extractErr) {
          console.warn('Extraction during upload failed:', extractErr);
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

// 6b. POST /api/documents/:id/extract (Extract transactions from existing document)
router.post('/documents/:id/extract', async (req: Request, res: Response) => {
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

    const userSettings = await db.getSettings(userId);
    const userAccounts = (userSettings && userSettings.accounts) || ['ICICI Savings', 'Main Checking'];

    const extractedList = await extractTransactionsFromDocument(
      buffer,
      doc.filename,
      doc.mimeType,
      userAccounts
    );

    if (extractedList.length === 0) {
      return res.json({
        success: false,
        transactions: [],
        message: 'No transactions could be detected from this document.',
      });
    }

    const savedList: any[] = [];
    let duplicates = 0;

    for (const rawTx of extractedList) {
      const resTx = await db.insertTransaction(userId, {
        date: rawTx.date || new Date().toISOString().split('T')[0],
        merchant: rawTx.merchant,
        category: rawTx.category || 'Needs review',
        amount: rawTx.amount,
        type: rawTx.type || 'expense',
        account: rawTx.account || userAccounts[0] || 'ICICI Savings',
        tags: JSON.stringify(rawTx.tags || ['Receipt-backed']),
        receipt: 1,
        source: 'document',
      });

      if (resTx.success && resTx.transaction) {
        savedList.push(formatTransaction(resTx.transaction));
      } else if (resTx.isDuplicate) {
        duplicates++;
      }
    }

    res.json({
      success: true,
      transactions: savedList,
      duplicates,
      message: savedList.length > 0
        ? `Successfully extracted and added ${savedList.length} transaction(s)!`
        : `Transaction already exists (duplicate detected).`,
    });
  } catch (error: any) {
    console.error('Error extracting from document:', error);
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

// Helper for fallback text parsing when AI is not configured or fails
function parseExpenseFallback(text: string) {
  const today = new Date();
  let dateStr = today.toISOString().split('T')[0];
  const lower = text.toLowerCase();

  // Date detection
  if (lower.includes('yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    dateStr = d.toISOString().split('T')[0];
  } else if (lower.includes('today')) {
    dateStr = today.toISOString().split('T')[0];
  } else {
    const dateMatch = text.match(/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/) || text.match(/\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/);
    if (dateMatch) {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d.getTime())) {
        dateStr = d.toISOString().split('T')[0];
      }
    }
  }

  // Type detection
  const isIncome = /income|salary|received|credit|deposit|freelance|cashback/i.test(text);
  const type = isIncome ? 'income' : 'expense';

  // Amount detection
  let amount = 0;
  const amountMatch = text.match(/(?:rs\.?|inr|\$|€|£|₹)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i);
  if (amountMatch) {
    const rawNum = amountMatch[1].replace(/,/g, '');
    amount = parseFloat(rawNum);
  }

  // Category detection heuristic
  let category = 'Other';
  if (/saloon|salon|hair|spa|barber|grooming|beauty|cosmetic/i.test(text)) {
    category = 'Personal Care';
  } else if (/food|coffee|restaurant|cafe|dinner|lunch|breakfast|swiggy|zomato|burger|pizza|tea|snacks|drinks/i.test(text)) {
    category = 'Food & Dining';
  } else if (/uber|ola|cab|auto|taxi|metro|bus|train|petrol|fuel|diesel|flight/i.test(text)) {
    category = 'Transportation';
  } else if (/rent|groceries|electricity|water|wifi|bill|maintenance|maid/i.test(text)) {
    category = 'Housing & Utilities';
  } else if (/netflix|spotify|prime|movie|cinema|game|concert/i.test(text)) {
    category = 'Entertainment';
  } else if (/amazon|flipkart|myntra|clothes|shoes|shopping/i.test(text)) {
    category = 'Shopping';
  } else if (/salary|paycheck|bonus|dividend|interest/i.test(text)) {
    category = 'Salary & Income';
  }

  // Merchant detection
  let merchant = text
    .replace(/(?:rs\.?|inr|\$|€|£|₹)\s*\d+(?:,\d+)*(?:\.\d{1,2})?/gi, '')
    .replace(/\b\d+(?:,\d+)*(?:\.\d{1,2})?\b/g, '')
    .replace(/\b(yesterday|today|tomorrow)\b/gi, '')
    .replace(/\b(paid|spent|bought|at|for|to|from|on|in|rs|inr|rupees)\b/gi, '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!merchant) {
    merchant = 'Expense';
  }

  return {
    amount: amount || 0,
    merchant: merchant.charAt(0).toUpperCase() + merchant.slice(1),
    category,
    date: dateStr,
    type,
  };
}

// 12. Parse Expense with AI
router.post('/parse-expense', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, error: 'Text is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.startsWith('AIzaSy')) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      
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
        model: 'gemini-2.5-flash',
        contents: `Extract the transaction details from this text: "${text}". If a date is not mentioned, use today's date: ${new Date().toISOString().split('T')[0]}.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return res.json({ success: true, data: parsed });
      }
    } catch (error: any) {
      console.warn('Gemini API call failed, using heuristic fallback parser:', error.message);
    }
  }

  // Fallback heuristic parser
  const fallbackData = parseExpenseFallback(text);
  return res.json({ success: true, data: fallbackData, fallback: true });
});
