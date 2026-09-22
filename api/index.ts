import 'dotenv/config';
import app from '../server/app';
import { connectMongoDB, isMongoDBActive } from '../server/db/mongodb';
import { reloadFallbackStoreFromMongoDB } from '../server/db';

export default async function handler(req: any, res: any) {
  if (!isMongoDBActive()) {
    try {
      const connected = await connectMongoDB();
      if (connected) {
        await reloadFallbackStoreFromMongoDB(true);
      }
    } catch (e) {
      console.warn('Vercel serverless MongoDB initialization note:', e);
    }
  }
  return app(req, res);
}
