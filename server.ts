import 'dotenv/config';

// Validate required environment variables and log warnings if any are missing
const RECOMMENDED_ENV_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'NODE_ENV',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'IMGBB_API_KEY'
];

const missingVars = RECOMMENDED_ENV_VARS.filter(name => !process.env[name]);
if (missingVars.length > 0) {
  console.warn('\n================================================================');
  console.warn('⚠️  WARNING: Missing recommended environment variables:');
  missingVars.forEach(name => {
    console.warn(`   - ${name}`);
  });
  console.warn('   The application will boot using resilient local JSON database');
  console.warn('   storage and console OTP/email output fallback mechanisms.');
  console.warn('================================================================\n');
}

import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';

// Import our database initialization to log startup status
import { verifyTransporter } from './server/utils/email';
import { isMongoDBActive, connectMongoDB, getEffectiveMongoUri } from './server/db/mongodb';
import { reloadFallbackStoreFromMongoDB, getPendingSyncPromise, getFallbackData } from './server/db';
import mongoose from 'mongoose';

// Import modular API route handlers
import authRoutes from './server/routes/auth';
import itemsRoutes from './server/routes/items';
import chatsRoutes from './server/routes/chats';
import notificationsRoutes from './server/routes/notifications';
import adminRoutes from './server/routes/admin';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. SECURITY MIDDLEWARE (With lenient framing/cors policies for AI Studio iFrame compatibility)
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for preview iFrame sandbox embedding
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false
  }));

  app.use(cors({
    origin: '*', // Allow all origins for sandbox integration
    credentials: true
  }));

  // JSON and URL-encoded body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // 2. RATE LIMITER
  app.set('trust proxy', 1);

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000000, // Practically unlimited to prevent rate limit blocking on shared sandbox/proxy IPs
    message: { error: 'Too many requests from this IP. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }
  });
  app.use('/api/', limiter);

  // Serve uploaded listing image files statically
  app.use('/server-uploads', express.static(path.join(process.cwd(), 'server-uploads')));

  // Non-blocking real-time MongoDB synchronization middleware
  app.use('/api', (req, res, next) => {
    // 1. Post-request interceptor: Wait for pending sync with strict 1.5s timeout so responses are never delayed
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

  // 3. MOUNT MODULAR REST API ROUTES
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

  // Alias top-level routes to sub-routers for compliance with audit API endpoints
  app.use('/api/my-items', (req, res, next) => {
    req.url = '/my-items';
    itemsRoutes(req, res, next);
  });
  app.use('/api/admin/items', (req, res, next) => {
    req.url = '/admin/items';
    itemsRoutes(req, res, next);
  });

  // Debug SMTP environment variables on startup
  try {
    const logPath = path.join(process.cwd(), 'server-smtp-error.log');
    const envData = {
      SMTP_HOST: process.env.SMTP_HOST || 'NOT_SET',
      SMTP_PORT: process.env.SMTP_PORT || 'NOT_SET',
      SMTP_USER: process.env.SMTP_USER || 'NOT_SET',
      SMTP_PASS_LEN: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 'NOT_SET',
      SMTP_FROM: process.env.SMTP_FROM || 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET'
    };
    fs.writeFileSync(logPath, `=== SERVER STARTUP SMTP CHECK ===\n${JSON.stringify(envData, null, 2)}\n\n`);
  } catch (err) {
    console.error('Failed to write startup log:', err);
  }

  // Verify SMTP Transporter on startup
  try {
    await verifyTransporter();
  } catch (err: any) {
    console.warn('SMTP transporter verification check failed/deferred on startup:', err.message);
  }

  // Connect to MongoDB on boot and synchronize data
  try {
    const mongoConnected = await connectMongoDB();
    if (mongoConnected) {
      await reloadFallbackStoreFromMongoDB(true);
    }
  } catch (err: any) {
    console.warn('Initial MongoDB connection attempt deferred:', err.message);
  }

  // 4. VITE MIDDLEWARE SETUP
  if (process.env.NODE_ENV !== 'production') {
    console.log('🚀 Running in DEVELOPMENT mode. Initializing Vite middleware...');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            '**/server-data-store*.json',
            '**/server-*.log',
            '**/server-uploads/**',
            '**/.data/**',
            '**/data/**',
            '**/*.log'
          ]
        }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('📦 Running in PRODUCTION mode. Serving static assets...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`================================================================`);
    console.log(` Nazrul Retrievers Full-Stack Backend Live!                      `);
    console.log(` Server running on: http://localhost:${PORT}                      `);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}            `);
    console.log(`================================================================`);
  });
}

startServer().catch(err => {
  console.error('CRITICAL: Server crashed during initialization:', err);
});
