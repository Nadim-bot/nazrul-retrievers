import 'dotenv/config';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { verifyTransporter } from './server/utils/email';
import { connectMongoDB } from './server/db/mongodb';
import { reloadFallbackStoreFromMongoDB } from './server/db';
import app from './server/app';

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

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

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

  // VITE MIDDLEWARE SETUP
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
