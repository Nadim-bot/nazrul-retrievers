import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import { verifyTransporter } from './utils/email';
import { isMongoDBActive, connectMongoDB, getEffectiveMongoUri } from './db/mongodb';
import { reloadFallbackStoreFromMongoDB, getPendingSyncPromise, getFallbackData } from './db';

import authRoutes from './routes/auth';
import itemsRoutes from './routes/items';
import chatsRoutes from './routes/chats';
import notificationsRoutes from './routes/notifications';
import adminRoutes from './routes/admin';

const app = express();

// 1. SECURITY MIDDLEWARE
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000000,
  message: { error: 'Too many requests from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});
app.use('/api/', limiter);

// Serve uploaded files statically
app.use('/server-uploads', express.static(path.join(process.cwd(), 'server-uploads')));

// Ensure MongoDB is connected for API requests
app.use('/api', async (req, res, next) => {
  try {
    if (!isMongoDBActive()) {
      const connected = await connectMongoDB();
      if (connected) {
        await reloadFallbackStoreFromMongoDB(true);
      }
    }
  } catch (err) {
    console.warn('MongoDB lazy connection notice in API middleware:', err);
  }
  next();
});

// Non-blocking real-time MongoDB synchronization middleware
app.use('/api', (req, res, next) => {
  const originalJson = res.json;
  const originalSend = res.send;

  const waitForSync = async () => {
    const syncPromise = getPendingSyncPromise();
    if (syncPromise) {
      const timeout = new Promise(resolve => setTimeout(resolve, 1500));
      await Promise.race([syncPromise, timeout]);
    }
  };

  res.json = function (this: any, body?: any) {
    waitForSync().then(() => {
      originalJson.call(this, body);
    }).catch(() => {
      originalJson.call(this, body);
    });
    return this;
  };

  res.send = function (this: any, body?: any) {
    waitForSync().then(() => {
      originalSend.call(this, body);
    }).catch(() => {
      originalSend.call(this, body);
    });
    return this;
  };

  next();
});

// 2. MOUNT MODULAR REST API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/faculties', (req, res) => {
  const { store } = getFallbackData();
  res.json(store.faculties || []);
});

app.get('/api/faculties/:id/departments', (req, res) => {
  const { store } = getFallbackData();
  const facultyId = req.params.id;
  const depts = (store.departments || []).filter((d: any) => d.faculty_id === facultyId);
  res.json(depts);
});

app.get('/api/departments/search', (req, res) => {
  const { store } = getFallbackData();
  const q = String(req.query.q || '').toLowerCase();
  if (!q) {
    return res.json([]);
  }
  const matchingDepts = (store.departments || []).filter((d: any) => {
    const deptNameMatches = d.department_name.toLowerCase().includes(q);
    const faculty = (store.faculties || []).find((f: any) => f.id === d.faculty_id);
    const facultyNameMatches = faculty ? faculty.faculty_name.toLowerCase().includes(q) : false;
    return deptNameMatches || facultyNameMatches;
  });
  res.json(matchingDepts);
});

// Diagnostic endpoint to check MongoDB status
app.get('/api/db-status', async (req, res) => {
  try {
    let active = isMongoDBActive();
    if (!active) {
      active = await connectMongoDB();
      if (active) {
        await reloadFallbackStoreFromMongoDB(true);
      }
    }
    
    const uri = getEffectiveMongoUri();
    const maskedUri = uri ? uri.replace(/:([^@:]+)@/g, ':******@') : 'NOT_SET';
    
    res.json({
      connected: isMongoDBActive(),
      readyState: mongoose.connection ? mongoose.connection.readyState : 0,
      mongodb_uri: maskedUri,
      databaseName: mongoose.connection && mongoose.connection.db ? mongoose.connection.db.databaseName : 'N/A',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({
      connected: false,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Alias top-level routes to sub-routers
app.use('/api/my-items', (req, res, next) => {
  req.url = '/my-items';
  itemsRoutes(req, res, next);
});
app.use('/api/admin/items', (req, res, next) => {
  req.url = '/admin/items';
  itemsRoutes(req, res, next);
});

export { app };
export default app;
