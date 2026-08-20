import * as functions from 'firebase-functions';
import express from 'express';
import { router as apiRouter } from './routes.js';

const app = express();

// JSON and URL-encoded body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount API routes
app.use('/', apiRouter);

export const api = functions.https.onRequest(app);
