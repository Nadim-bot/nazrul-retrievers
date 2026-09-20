import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Import Mongoose models and Mongo connection helper
import { 
  connectMongoDB, 
  isMongoDBActive, 
  MUser, 
  MItem, 
  MNotification, 
  MAdminNotification, 
  MConversationReport, 
  MAdminActivityLog, 
  MChatThread, 
  MSearchKeyword,
  MSearchLog,
  MClaim,
  MListingRevision,
  MFaculty,
  MDepartment,
  MItemView,
  MOtp
} from './db/mongodb';

import { Item, NotificationItem, ChatThread } from '../src/types';
import { mapOldCategory } from '../src/data';

// Fallback JSON-based in-memory data store for performance caching
interface LocalStore {
  users: any[];
  items: Item[];
  notifications: NotificationItem[];
  threads: ChatThread[];
  searchKeywords: { keyword: string; count: number; category: string; subcategory?: string }[];
  searchLogs?: any[];
  otps?: any[];
  claims?: any[];
  admin_notifications?: any[];
  conversation_reports?: any[];
  admin_activity_logs?: any[];
  listing_revisions?: any[];
  faculties?: any[];
  departments?: any[];
  system_settings?: {
    autoApprovePosts: boolean;
    autoSpamFilter: boolean;
    maxImageSize: string;
    archiveDuration: string;
  };
}

const STORE_FILE = path.join(process.cwd(), 'server-data-store.json');

let fallbackStore: LocalStore = {
  users: [
    {
      id: '2',
      student_id: 'ADMIN-009',
      full_name: 'Admin',
      email: 'nazrulretrievers@gmail.com',
      password_hash: '$2a$10$7R0Z4eWp.9kX7E2fGsmFvO.07i92G1m8bT62K43rD7h02vC9p8vZy', // password is 'Admin123@'
      department: 'ICT Administration',
      is_verified: 1,
      role: 'admin',
      phone: '+880 1712-999999',
      session_year: 'Staff',
      avatar: 'SA'
    }
  ],
  items: [],
  notifications: [],
  threads: [],
  searchKeywords: [],
  searchLogs: [],
  claims: [],
  otps: [],
  listing_revisions: [],
  faculties: [],
  departments: [],
  system_settings: {
    autoApprovePosts: true,
    autoSpamFilter: true,
    maxImageSize: '5 MB per image',
    archiveDuration: '30 Days Active'
  }
};

// Save fallback store to MongoDB to persist changes
let pendingSyncPromise: Promise<any> | null = null;
let syncDebounceTimer: NodeJS.Timeout | null = null;
let isSyncing = false;
let syncQueued = false;

export function getPendingSyncPromise() {
  return pendingSyncPromise;
}

async function triggerMongoSync(): Promise<void> {
  if (isSyncing) {
    syncQueued = true;
    return;
  }
  isSyncing = true;
  syncQueued = false;
  try {
    pendingSyncPromise = syncToMongo();
    await pendingSyncPromise;
  } catch (err: any) {
    console.error('MongoDB async sync failed:', err?.message || err);
  } finally {
    isSyncing = false;
    pendingSyncPromise = null;
    if (syncQueued) {
      triggerMongoSync();
    }
  }
}

function saveFallbackStore() {
  try {
    // Write changes locally as a backup
    fs.writeFileSync(STORE_FILE, JSON.stringify(fallbackStore, null, 2), 'utf-8');
    
    // Write changes asynchronously to MongoDB with debounce
    if (isMongoDBActive()) {
      if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
      }
      syncDebounceTimer = setTimeout(() => {
        syncDebounceTimer = null;
        triggerMongoSync();
      }, 500);
    }
  } catch (err) {
    console.error('Failed to write local backup file:', err);
  }
}

async function syncToMongo() {
  try {
    const promises: Promise<any>[] = [];

    // 1. Save users
    for (const u of fallbackStore.users) {
      const uData = { ...u };
      delete (uData as any)._id;
      delete (uData as any).__v;
      if (!uData.id && uData.user_id) uData.id = String(uData.user_id);
      
      const filterConditions: any[] = [];
      if (uData.id) filterConditions.push({ id: uData.id });
      if (uData.email) filterConditions.push({ email: uData.email.trim().toLowerCase() });

      if (filterConditions.length > 0) {
        promises.push(
          MUser.updateOne(
            { $or: filterConditions },
            { $set: uData },
            { upsert: true }
          ).catch((err: any) => {
            console.warn(`User update warning in syncToMongo for ${uData.email || uData.id}:`, err.message);
          })
        );
      }
    }
    // 2. Save items
    for (const i of fallbackStore.items) {
      const iData = { ...i };
      delete (iData as any)._id;
      if (!iData.id && (i as any).item_id) iData.id = String((i as any).item_id);
      promises.push(MItem.updateOne({ id: iData.id }, iData, { upsert: true }));
    }
    // 3. Save notifications
    for (const n of fallbackStore.notifications) {
      const cleanTitle = ((n as any).title || '').trim().replace(/^notification:?/i, '').trim();
      const cleanMsg = sanitizeNotificationText((n as any).message || n.text || '');
      const mData = {
        id: n.id,
        user_id: String(n.user_id || n.userId || ''),
        title: cleanTitle && cleanTitle.toLowerCase() !== 'notification' ? cleanTitle : 'Notification',
        message: cleanMsg || 'Campus alert notification',
        type: (n as any).type || 'info',
        is_read: n.unread !== undefined ? !n.unread : !!(n as any).is_read
      };
      delete (mData as any)._id;
      promises.push(MNotification.updateOne({ id: n.id }, mData, { upsert: true }));
    }
    // 4. Save admin_notifications
    if (fallbackStore.admin_notifications) {
      for (const an of fallbackStore.admin_notifications) {
        const anData = { ...an };
        delete (anData as any)._id;
        promises.push(MAdminNotification.updateOne({ id: anData.id }, anData, { upsert: true }));
      }
    }
    // 5. Save conversation_reports
    if (fallbackStore.conversation_reports) {
      for (const r of fallbackStore.conversation_reports) {
        const rData = { ...r };
        delete (rData as any)._id;
        promises.push(MConversationReport.updateOne({ reportId: rData.reportId }, rData, { upsert: true }));
      }
    }
    // 6. Save admin_activity_logs
    if (fallbackStore.admin_activity_logs) {
      for (const l of fallbackStore.admin_activity_logs) {
        const lData = { ...l };
        delete (lData as any)._id;
        promises.push(MAdminActivityLog.updateOne({ id: lData.id }, lData, { upsert: true }));
      }
    }
    // 7. Save threads
    for (const t of fallbackStore.threads) {
      const tData = { ...t };
      delete (tData as any)._id;
      if (!tData.id && (t as any).thread_id) tData.id = String((t as any).thread_id);
      promises.push(MChatThread.updateOne({ id: tData.id }, tData, { upsert: true }));
    }
    // 8. Save searchKeywords
    for (const k of fallbackStore.searchKeywords) {
      const kData = { ...k };
      delete (kData as any)._id;
      promises.push(MSearchKeyword.updateOne({ keyword: kData.keyword }, kData, { upsert: true }));
    }
    // 8c. Save searchLogs
    if (fallbackStore.searchLogs) {
      for (const sl of fallbackStore.searchLogs) {
        const slData = { ...sl };
        delete (slData as any)._id;
        const slId = slData._id || slData.id || new mongoose.Types.ObjectId().toString();
        if (!slData.id) slData.id = String(slId);
        promises.push(MSearchLog.updateOne({ keyword: slData.keyword, timestamp: slData.timestamp, userId: slData.userId }, slData, { upsert: true }));
      }
    }
    // 9. Save claims
    if (fallbackStore.claims) {
      for (const c of fallbackStore.claims) {
        const cData = { ...c };
        delete (cData as any)._id;
        promises.push(MClaim.updateOne({ claim_id: cData.claim_id }, cData, { upsert: true }));
      }
    }
    // 10. Save listing revisions
    if (fallbackStore.listing_revisions) {
      for (const r of fallbackStore.listing_revisions) {
        const rData = { ...r };
        delete (rData as any)._id;
        promises.push(MListingRevision.updateOne({ revisionId: rData.revisionId }, rData, { upsert: true }));
      }
    }
    // 11. Save faculties
    if (fallbackStore.faculties) {
      for (const f of fallbackStore.faculties) {
        const fData = { ...f };
        delete (fData as any)._id;
        promises.push(MFaculty.updateOne({ id: fData.id }, fData, { upsert: true }));
      }
    }
    // 12. Save departments
    if (fallbackStore.departments) {
      for (const d of fallbackStore.departments) {
        const dData = { ...d };
        delete (dData as any)._id;
        promises.push(MDepartment.updateOne({ id: dData.id }, dData, { upsert: true }));
      }
    }

    await Promise.all(promises);
    console.log('💾 Synced cache changes to MongoDB successfully!');
  } catch (err: any) {
    console.warn('⚠️ Failed to sync changes to MongoDB:', err.message);
  }
}

export async function normalizeItemCategories(items: any[]) {
  let changed = false;
  for (const item of items) {
    const originalCategory = item.category;
    const originalSubcategory = item.subcategory;
    
    const { category, subcategory } = mapOldCategory(originalCategory, originalSubcategory);
    
    if (item.category !== category || item.subcategory !== subcategory) {
      item.category = category;
      item.subcategory = subcategory;
      changed = true;
      
      // Update in MongoDB if active
      if (isMongoDBActive()) {
        try {
          await MItem.updateOne(
            { id: item.id },
            { $set: { category, subcategory } }
          );
        } catch (err: any) {
          console.warn(`⚠️ Failed to update item ${item.id} category in MongoDB:`, err.message);
        }
      }
    }
  }
  return changed;
}

let lastReloadTime = 0;
const RELOAD_THROTTLE_MS = 10000; // Minimum 10s between full collection reloads

export async function reloadFallbackStoreFromMongoDB(force = false) {
  if (!isMongoDBActive()) {
    return;
  }

  const now = Date.now();
  if (!force && now - lastReloadTime < RELOAD_THROTTLE_MS) {
    return;
  }
  lastReloadTime = now;

  try {
    const fetchWithTimeout = async () => {
      return await Promise.all([
        MUser.find().maxTimeMS(3000).lean().catch(() => []),
        MItem.find().maxTimeMS(3000).lean().catch(() => []),
        MNotification.find().maxTimeMS(3000).lean().catch(() => []),
        MAdminNotification.find().maxTimeMS(3000).lean().catch(() => []),
        MConversationReport.find().maxTimeMS(3000).lean().catch(() => []),
        MAdminActivityLog.find().maxTimeMS(3000).lean().catch(() => []),
        MChatThread.find().maxTimeMS(3000).lean().catch(() => []),
        MSearchKeyword.find().maxTimeMS(3000).lean().catch(() => []),
        MSearchLog.find().maxTimeMS(3000).lean().catch(() => []),
        MClaim.find().maxTimeMS(3000).lean().catch(() => []),
        MListingRevision.find().maxTimeMS(3000).lean().catch(() => []),
        MFaculty.find().maxTimeMS(3000).lean().catch(() => []),
        MDepartment.find().maxTimeMS(3000).lean().catch(() => [])
      ]);
    };

    // Cap total execution time at 4 seconds
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('MongoDB reload timeout')), 4000)
    );

    const [
      users,
      items,
      notifications,
      admin_notifications,
      conversation_reports,
      admin_activity_logs,
      threads,
      searchKeywords,
      searchLogs,
      claims,
      listing_revisions,
      faculties,
      departments
    ] = await Promise.race([fetchWithTimeout(), timeoutPromise]) as any[];

    // Normalize category/subcategory for retrieved items
    if (items && items.length > 0) {
      await normalizeItemCategories(items);
    }

    // Normalize any accidentally closed items to active and sanitize IDs & approvalStatus
    if (items && items.length > 0) {
      for (const it of items as any[]) {
        it.id = String(it.id || it._id || it.item_id || '');
        if (it.status === 'closed') {
          it.status = 'active';
          if (isMongoDBActive()) {
            MItem.updateOne({ id: it.id }, { $set: { status: 'active' } }).catch(() => {});
          }
        }
        if (it.approvalStatus === 'approved' || it.approval_status === 'approved' || it.isApproved === true || it.status === 'active') {
          if (it.approvalStatus !== 'rejected' && it.status !== 'rejected') {
            it.approvalStatus = 'approved';
            it.isApproved = true;
          }
        }
      }
    }

    // Update fallbackStore properties safely
    if (users && users.length > 0) fallbackStore.users = users as any[];
    if (items && items.length > 0) fallbackStore.items = items as any[];
    if (notifications) {
      fallbackStore.notifications = (notifications as any[]).map((n: any) => ({
        id: String(n.id || n._id),
        user_id: String(n.user_id || n.userId || ''),
        userId: String(n.user_id || n.userId || ''),
        text: n.message || n.text || '',
        time: n.created_at || n.createdAt ? new Date(n.created_at || n.createdAt).toLocaleDateString() : 'Just now',
        unread: n.is_read !== undefined ? !n.is_read : (n.unread !== undefined ? !!n.unread : true)
      }));
    }
    if (admin_notifications && admin_notifications.length > 0) {
      fallbackStore.admin_notifications = (admin_notifications as any[]).map((an: any) => ({
        id: String(an.id || an._id || generateUniqueId('an')),
        title: an.title || (an.text ? an.text.replace(/<[^>]*>?/gm, '').split(':')[0] : 'Campus Activity Alert'),
        message: an.message || (an.text ? an.text.replace(/<[^>]*>?/gm, '') : 'New moderation or activity update on campus.'),
        type: an.type || 'system',
        category: an.category || 'System',
        priority: an.priority || 'medium',
        isRead: an.isRead === true || an.isRead === 1,
        relatedUserId: an.relatedUserId ? String(an.relatedUserId) : '',
        relatedItemId: an.relatedItemId ? String(an.relatedItemId) : '',
        relatedConversationId: an.relatedConversationId ? String(an.relatedConversationId) : '',
        createdAt: an.createdAt || an.created_at || new Date().toISOString()
      }));
    }
    if (conversation_reports && conversation_reports.length > 0) fallbackStore.conversation_reports = conversation_reports as any[];
    if (admin_activity_logs && admin_activity_logs.length > 0) fallbackStore.admin_activity_logs = admin_activity_logs as any[];
    if (threads && threads.length > 0) fallbackStore.threads = threads as any[];
    if (searchKeywords && searchKeywords.length > 0) fallbackStore.searchKeywords = searchKeywords as any[];
    if (searchLogs && searchLogs.length > 0) fallbackStore.searchLogs = searchLogs as any[];
    if (claims && claims.length > 0) fallbackStore.claims = claims as any[];
    if (listing_revisions && listing_revisions.length > 0) fallbackStore.listing_revisions = listing_revisions as any[];
    if (faculties && faculties.length > 0) fallbackStore.faculties = faculties as any[];
    if (departments && departments.length > 0) fallbackStore.departments = departments as any[];

    console.log('🔄 Reloaded data models from MongoDB successfully!');
  } catch (err: any) {
    console.warn('⚠️ Notice: MongoDB reload deferred, using cached store:', err.message);
  }
}

function seedFacultiesAndDepartments() {
  const seededFaculties = [
    { id: 'faculty-arts', faculty_name: 'Faculty of Arts' },
    { id: 'faculty-science-engineering', faculty_name: 'Faculty of Science and Engineering' },
    { id: 'faculty-social-science', faculty_name: 'Faculty of Social Science' },
    { id: 'faculty-business-admin', faculty_name: 'Faculty of Business Administration' },
    { id: 'faculty-law', faculty_name: 'Faculty of Law' },
    { id: 'faculty-fine-arts', faculty_name: 'Faculty of Fine Arts' }
  ];

  const seededDepartments = [
    // Faculty of Arts
    { id: 'dept-bangla', faculty_id: 'faculty-arts', department_name: 'Bangla Language and Literature' },
    { id: 'dept-english', faculty_id: 'faculty-arts', department_name: 'English Language and Literature' },
    { id: 'dept-music', faculty_id: 'faculty-arts', department_name: 'Music' },
    { id: 'dept-theatre', faculty_id: 'faculty-arts', department_name: 'Theatre and Performance Studies' },
    { id: 'dept-film', faculty_id: 'faculty-arts', department_name: 'Film and Media Studies' },
    { id: 'dept-philosophy', faculty_id: 'faculty-arts', department_name: 'Philosophy' },
    { id: 'dept-history', faculty_id: 'faculty-arts', department_name: 'History' },

    // Faculty of Science and Engineering
    { id: 'dept-cse', faculty_id: 'faculty-science-engineering', department_name: 'Computer Science and Engineering (CSE)' },
    { id: 'dept-eee', faculty_id: 'faculty-science-engineering', department_name: 'Electrical and Electronic Engineering (EEE)' },
    { id: 'dept-ese', faculty_id: 'faculty-science-engineering', department_name: 'Environmental Science and Engineering (ESE)' },
    { id: 'dept-statistics', faculty_id: 'faculty-science-engineering', department_name: 'Statistics' },

    // Faculty of Social Science
    { id: 'dept-economics', faculty_id: 'faculty-social-science', department_name: 'Economics' },
    { id: 'dept-public-admin', faculty_id: 'faculty-social-science', department_name: 'Public Administration and Governance Studies' },
    { id: 'dept-folklore', faculty_id: 'faculty-social-science', department_name: 'Folklore' },
    { id: 'dept-anthropology', faculty_id: 'faculty-social-science', department_name: 'Anthropology' },
    { id: 'dept-population-science', faculty_id: 'faculty-social-science', department_name: 'Population Science' },
    { id: 'dept-local-govt', faculty_id: 'faculty-social-science', department_name: 'Local Government and Urban Development' },
    { id: 'dept-sociology', faculty_id: 'faculty-social-science', department_name: 'Sociology' },

    // Faculty of Business Administration
    { id: 'dept-ais', faculty_id: 'faculty-business-admin', department_name: 'Accounting and Information Systems' },
    { id: 'dept-finance', faculty_id: 'faculty-business-admin', department_name: 'Finance and Banking' },
    { id: 'dept-hrm', faculty_id: 'faculty-business-admin', department_name: 'Human Resource Management' },
    { id: 'dept-management', faculty_id: 'faculty-business-admin', department_name: 'Management' },
    { id: 'dept-marketing', faculty_id: 'faculty-business-admin', department_name: 'Marketing' },

    // Faculty of Law
    { id: 'dept-law', faculty_id: 'faculty-law', department_name: 'Law and Justice' },

    // Faculty of Fine Arts
    { id: 'dept-fine-arts', faculty_id: 'faculty-fine-arts', department_name: 'Fine Arts' }
  ];

  if (!fallbackStore.faculties || fallbackStore.faculties.length === 0) {
    fallbackStore.faculties = seededFaculties;
  }
  if (!fallbackStore.departments || fallbackStore.departments.length === 0) {
    fallbackStore.departments = seededDepartments;
  }
}

// Load fallback store from MongoDB on startup
async function loadFallbackStore() {
  try {
    // Connect to MongoDB
    const mongoConnected = await connectMongoDB();

    if (mongoConnected) {
      try {
        // Purge dummy/mock user emails if present
        const mockUserEmails = ['rahul@jkkniu.edu', 'rahul.cse@jkkniu.edu', 'tania.eee@jkkniu.edu', 'sifat.bba@jkkniu.edu', 'mim.ais@jkkniu.edu', 'fahim.econ@jkkniu.edu'];
        await MUser.deleteMany({ email: { $in: mockUserEmails } });

        const users = await MUser.find().maxTimeMS(4000).lean().catch(() => []);
        const items = await MItem.find().maxTimeMS(4000).lean().catch(() => []);
        const notifications = await MNotification.find().maxTimeMS(4000).lean().catch(() => []);
        const admin_notifications = await MAdminNotification.find().maxTimeMS(4000).lean().catch(() => []);
        const conversation_reports = await MConversationReport.find().maxTimeMS(4000).lean().catch(() => []);
        const admin_activity_logs = await MAdminActivityLog.find().maxTimeMS(4000).lean().catch(() => []);
        const threads = await MChatThread.find().maxTimeMS(4000).lean().catch(() => []);
        const searchKeywords = await MSearchKeyword.find().maxTimeMS(4000).lean().catch(() => []);

        if (users.length > 0) {
          fallbackStore.users = users as any[];
        } else {
          for (const u of fallbackStore.users) {
            await MUser.updateOne({ id: String(u.id) }, u, { upsert: true });
          }
        }

        if (items.length > 0) {
          await normalizeItemCategories(items);
          for (const it of items as any[]) {
            it.id = String(it.id || it._id || it.item_id || '');
            if (it.approvalStatus === 'approved' || it.approval_status === 'approved' || it.isApproved === true || it.status === 'active') {
              if (it.approvalStatus !== 'rejected' && it.status !== 'rejected') {
                it.approvalStatus = 'approved';
                it.isApproved = true;
              }
            }
          }
          fallbackStore.items = items as any[];
        } else {
          for (const i of fallbackStore.items) {
            await MItem.updateOne({ id: String(i.id) }, i, { upsert: true });
          }
        }

        if (notifications.length > 0) {
          fallbackStore.notifications = notifications as any[];
        } else {
          for (const n of fallbackStore.notifications) {
            await MNotification.updateOne({ id: String(n.id) }, n, { upsert: true });
          }
        }

        if (threads.length > 0) {
          fallbackStore.threads = threads as any[];
        } else {
          for (const t of fallbackStore.threads) {
            await MChatThread.updateOne({ id: String(t.id) }, t, { upsert: true });
          }
        }

        if (admin_notifications.length > 0) {
          fallbackStore.admin_notifications = (admin_notifications as any[]).map((an: any) => ({
            id: String(an.id || an._id || generateUniqueId('an')),
            title: an.title || (an.text ? an.text.replace(/<[^>]*>?/gm, '').split(':')[0] : 'Campus Activity Alert'),
            message: an.message || (an.text ? an.text.replace(/<[^>]*>?/gm, '') : 'New moderation or activity update on campus.'),
            type: an.type || 'system',
            category: an.category || 'System',
            priority: an.priority || 'medium',
            isRead: an.isRead === true || an.isRead === 1,
            relatedUserId: an.relatedUserId ? String(an.relatedUserId) : '',
            relatedItemId: an.relatedItemId ? String(an.relatedItemId) : '',
            relatedConversationId: an.relatedConversationId ? String(an.relatedConversationId) : '',
            createdAt: an.createdAt || an.created_at || new Date().toISOString()
          }));
        }
        if (conversation_reports.length > 0) fallbackStore.conversation_reports = conversation_reports as any[];
        if (admin_activity_logs.length > 0) fallbackStore.admin_activity_logs = admin_activity_logs as any[];
        if (searchKeywords.length > 0) fallbackStore.searchKeywords = searchKeywords as any[];

        try {
          const claims = await MClaim.find().lean();
          if (claims.length > 0) {
            fallbackStore.claims = claims as any[];
          }
        } catch (claimsErr: any) {
          console.warn('⚠️ Failed to load claims from MongoDB:', claimsErr.message);
        }

        try {
          const revisions = await MListingRevision.find().lean();
          if (revisions.length > 0) {
            fallbackStore.listing_revisions = revisions as any[];
          }
        } catch (revErr: any) {
          console.warn('⚠️ Failed to load listing revisions from MongoDB:', revErr.message);
        }

        try {
          const faculties = await MFaculty.find().lean();
          const departments = await MDepartment.find().lean();
          if (faculties.length > 0) {
            fallbackStore.faculties = faculties as any[];
          }
          if (departments.length > 0) {
            fallbackStore.departments = departments as any[];
          }
        } catch (facErr: any) {
          console.warn('⚠️ Failed to load faculties/departments from MongoDB:', facErr.message);
        }

        console.log('📦 Successfully synchronized and preloaded all data models from MongoDB!');
      } catch (mongoLoadErr: any) {
        console.warn('⚠️ Failed to load models from MongoDB, using local file backup:', mongoLoadErr.message);
      }
    }

    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, 'utf-8');
      const localData = JSON.parse(content);
      if (!mongoConnected) {
        fallbackStore = localData;
      } else {
        if (localData.system_settings) {
          fallbackStore.system_settings = localData.system_settings;
        }
      }
    } else {
      saveFallbackStore();
    }

    seedFacultiesAndDepartments();
    
    await runUserMigration();
    applyCustomAdminCredentials();
    seedMockData();
  } catch (err) {
    console.error('Failed to read fallback data store file, using in-memory default:', err);
    await runUserMigration();
    applyCustomAdminCredentials();
    seedMockData();
  }
}

async function runUserMigration() {
  console.log('🚀 Starting Automated Database Schema Migration...');
  try {
    let migratedCount = 0;
    if (fallbackStore.users && fallbackStore.users.length > 0) {
      const { syncAndEvaluateUser } = await import('./utils/profile');
      for (let i = 0; i < fallbackStore.users.length; i++) {
        const originalUser = fallbackStore.users[i];
        const migratedUser = syncAndEvaluateUser(originalUser, fallbackStore.users);
        
        fallbackStore.users[i] = migratedUser;
        
        if (isMongoDBActive()) {
          await MUser.updateOne({ id: migratedUser.id }, migratedUser, { upsert: true });
        }
        migratedCount++;
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(fallbackStore, null, 2), 'utf-8');
    }
    console.log(`✅ Automated User Migration completed! Migrated ${migratedCount} user records.`);
  } catch (migrationErr: any) {
    console.error('⚠️ User migration error:', migrationErr.message);
  }
}

function applyCustomAdminCredentials() {
  const adminEmail = 'nazrulretrievers@gmail.com';
  const adminPassword = 'Admin123@';
  const passwordHash = bcrypt.hashSync(adminPassword, 10);

  let adminUser = fallbackStore.users.find(u => u.role === 'admin');
  if (adminUser) {
    adminUser.email = adminEmail;
    adminUser.password_hash = passwordHash;
  } else {
    adminUser = {
      id: '2',
      student_id: 'ADMIN-009',
      studentId: 'ADMIN-009',
      full_name: 'Admin',
      fullName: 'Admin',
      email: adminEmail,
      password_hash: passwordHash,
      passwordHash: passwordHash,
      department: 'ICT Administration',
      is_verified: true,
      isVerified: true,
      emailVerified: true,
      role: 'admin',
      phone: '+880 1712-999999',
      session_year: 'Staff',
      sessionYear: 'Staff',
      avatar: 'SA',
      profilePhoto: 'SA',
      status: 'active',
      profileCompletion: 100,
      profileVisibility: 'public',
      reputationScore: 100,
      totalLostPosts: 0,
      totalFoundPosts: 0,
      successfulReturns: 0
    };
    fallbackStore.users.push(adminUser);
  }
  
  fallbackStore.users.forEach(u => {
    if (u.email.toLowerCase() === adminEmail.toLowerCase()) {
      u.role = 'admin';
    }
  });

  saveFallbackStore();
  console.log(`🔑 Admin fallback account configured: ${adminEmail}`);
}

function seedMockData() {
  console.log('ℹ️ Seeding of mock data has been disabled.');
  return;
  if (fallbackStore.items && fallbackStore.items.length > 0) {
    console.log('ℹ️ DB already populated with items. Skipping seeding.');
    return;
  }

  console.log('🌱 Seeding fallbackStore with rich, realistic lost & found database logs...');

  // 1. Seed High-quality users (password is \'Password123@\')
  const passwordHash = bcrypt.hashSync('Password123@', 10);
  const seededUsers = [
    {
      id: 'user-1',
      student_id: 'STU-2023-001',
      studentId: 'STU-2023-001',
      full_name: 'Rahul Chowdhury',
      fullName: 'Rahul Chowdhury',
      email: 'rahul.cse@jkkniu.edu',
      password_hash: passwordHash,
      passwordHash: passwordHash,
      department: 'Computer Science and Engineering (CSE)',
      is_verified: true,
      isVerified: true,
      emailVerified: true,
      role: 'student',
      phone: '+880 1711-111111',
      session_year: '2023-24',
      sessionYear: '2023-24',
      avatar: 'RC',
      profilePhoto: 'RC',
      status: 'active',
      profileCompletion: 100,
      profileVisibility: 'public',
      reputationScore: 100,
      totalLostPosts: 3,
      totalFoundPosts: 1,
      successfulReturns: 0
    },
    {
      id: 'user-2',
      student_id: 'STU-2023-002',
      studentId: 'STU-2023-002',
      full_name: 'Tania Sultana',
      fullName: 'Tania Sultana',
      email: 'tania.eee@jkkniu.edu',
      password_hash: passwordHash,
      passwordHash: passwordHash,
      department: 'Electrical and Electronic Engineering (EEE)',
      is_verified: true,
      isVerified: true,
      emailVerified: true,
      role: 'student',
      phone: '+880 1722-222222',
      session_year: '2023-24',
      sessionYear: '2023-24',
      avatar: 'TS',
      profilePhoto: 'TS',
      status: 'active',
      profileCompletion: 100,
      profileVisibility: 'public',
      reputationScore: 100,
      totalLostPosts: 1,
      totalFoundPosts: 2,
      successfulReturns: 1
    },
    {
      id: 'user-3',
      student_id: 'STU-2024-005',
      studentId: 'STU-2024-005',
      full_name: 'Sifat Ahmed',
      fullName: 'Sifat Ahmed',
      email: 'sifat.bba@jkkniu.edu',
      password_hash: passwordHash,
      passwordHash: passwordHash,
      department: 'Management',
      is_verified: true,
      isVerified: true,
      emailVerified: true,
      role: 'student',
      phone: '+880 1733-333333',
      session_year: '2024-25',
      sessionYear: '2024-25',
      avatar: 'SA',
      profilePhoto: 'SA',
      status: 'active',
      profileCompletion: 100,
      profileVisibility: 'public',
      reputationScore: 100,
      totalLostPosts: 0,
      totalFoundPosts: 2,
      successfulReturns: 1
    },
    {
      id: 'user-4',
      student_id: 'STU-2022-019',
      studentId: 'STU-2022-019',
      full_name: 'Tasmia Mim',
      fullName: 'Tasmia Mim',
      email: 'mim.ais@jkkniu.edu',
      password_hash: passwordHash,
      passwordHash: passwordHash,
      department: 'Accounting and Information Systems',
      is_verified: true,
      isVerified: true,
      emailVerified: true,
      role: 'student',
      phone: '+880 1744-444444',
      session_year: '2022-23',
      sessionYear: '2022-23',
      avatar: 'TM',
      profilePhoto: 'TM',
      status: 'active',
      profileCompletion: 100,
      profileVisibility: 'public',
      reputationScore: 100,
      totalLostPosts: 1,
      totalFoundPosts: 2,
      successfulReturns: 2
    },
    {
      id: 'user-5',
      student_id: 'STU-2021-042',
      studentId: 'STU-2021-042',
      full_name: 'Fahim Rahman',
      fullName: 'Fahim Rahman',
      email: 'fahim.econ@jkkniu.edu',
      password_hash: passwordHash,
      passwordHash: passwordHash,
      department: 'Economics',
      is_verified: true,
      isVerified: true,
      emailVerified: true,
      role: 'student',
      phone: '+880 1755-555555',
      session_year: '2021-22',
      sessionYear: '2021-22',
      avatar: 'FR',
      profilePhoto: 'FR',
      status: 'active',
      profileCompletion: 100,
      profileVisibility: 'public',
      reputationScore: 100,
      totalLostPosts: 2,
      totalFoundPosts: 0,
      successfulReturns: 0
    }
  ];

  // Merge seeded users, keeping admin
  const admin = fallbackStore.users.find(u => u.role === 'admin') || fallbackStore.users[0];
  fallbackStore.users = admin ? [admin, ...seededUsers] : seededUsers;

  // 2. Seed Items / Posts
  const dateBase = new Date();
  const getPastDateString = (daysAgo: number) => {
    const d = new Date(dateBase);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  };

  const seededItems: any[] = [
    {
      id: 'item-1',
      emoji: '🧮',
      title: 'TI-84 Plus CE Graphing Calculator',
      category: 'Electronics',
      description: 'Lost my black TI-84 Plus CE graphing calculator during the mid-term exam. It has a small silver scratch on the back side.',
      type: 'lost',
      location: 'Central Library',
      specificSpot: '3rd floor reading desk, north side',
      rewardOffered: '',
      image: 'https://images.unsplash.com/photo-1543269664-76bc3997d9ea?auto=format&fit=crop&w=300&q=80',
      views: 45,
      status: 'active',
      approvalStatus: 'approved',
      userId: 'user-1',
      firebaseUid: 'user-1',
      email: 'rahul.cse@jkkniu.edu',
      isApproved: true,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: 'Rahul Chowdhury',
        department: 'Computer Science and Engineering (CSE)',
        avatar: 'RC',
        initials: 'RC'
      },
      createdAt: getPastDateString(4),
      updatedAt: getPastDateString(4)
    },
    {
      id: 'item-2',
      emoji: '🎧',
      title: 'AirPods Pro with MagSafe Case',
      category: 'Electronics',
      description: 'Found a set of AirPods Pro in their wireless charging case. Describe the case/engraving or show proof of bluetooth connection to claim.',
      type: 'found',
      location: 'BBA Building',
      specificSpot: 'Cafeteria second row table, left corner',
      rewardOffered: '',
      image: 'https://images.unsplash.com/photo-1588449668338-d1516882e471?auto=format&fit=crop&w=300&q=80',
      views: 18,
      status: 'active',
      approvalStatus: 'approved',
      userId: 'user-2',
      firebaseUid: 'user-2',
      email: 'tania.eee@jkkniu.edu',
      isApproved: true,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: 'Tania Sultana',
        department: 'Electrical and Electronic Engineering (EEE)',
        avatar: 'TS',
        initials: 'TS'
      },
      createdAt: getPastDateString(3),
      updatedAt: getPastDateString(3)
    },
    {
      id: 'item-3',
      emoji: '💼',
      title: 'Black Leather Wallet containing ID Cards',
      category: 'Other',
      description: 'Lost a genuine leather black bi-fold wallet containing National ID, JKKNIU Student Card and some emergency cash.',
      type: 'lost',
      location: 'Social Science Building',
      specificSpot: 'Room 402 corner seat on the left',
      rewardOffered: '',
      image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=300&q=80',
      views: 29,
      status: 'active',
      approvalStatus: 'approved',
      userId: 'user-5',
      firebaseUid: 'user-5',
      email: 'fahim.econ@jkkniu.edu',
      isApproved: true,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: 'Fahim Rahman',
        department: 'Economics',
        avatar: 'FR',
        initials: 'FR'
      },
      createdAt: getPastDateString(2),
      updatedAt: getPastDateString(2)
    },
    {
      id: 'item-4',
      emoji: '💻',
      title: 'HP Pavilion 15-inch Blue Laptop',
      category: 'Electronics',
      description: 'Found a blue HP Pavilion laptop in a black sleeve case. Handed over to the department office but claiming online is preferred with correct password confirmation.',
      type: 'found',
      location: 'Old Administration Building',
      specificSpot: 'Awaiting Coordinator Verification',
      rewardOffered: '',
      image: 'https://images.unsplash.com/photo-1496181130204-755241524eab?auto=format&fit=crop&w=300&q=80',
      views: 98,
      status: 'returned',
      approvalStatus: 'approved',
      userId: 'user-4',
      firebaseUid: 'user-4',
      email: 'mim.ais@jkkniu.edu',
      isApproved: true,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: 'Tasmia Mim',
        department: 'Accounting and Information Systems',
        avatar: 'TM',
        initials: 'TM'
      },
      createdAt: getPastDateString(6),
      updatedAt: getPastDateString(1)
    },
    {
      id: 'item-5',
      emoji: '📚',
      title: 'Standard Calculus: Early Transcendentals Book',
      category: 'Books & Stationery',
      description: 'Lost a heavy printed copy of Calculus: Early Transcendentals by James Stewart. Left it in the classroom, has "Rahul-CSE" written on page 10.',
      type: 'lost',
      location: 'New Science Building',
      specificSpot: 'Room 312 near the whiteboard',
      rewardOffered: '',
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80',
      views: 14,
      status: 'active',
      approvalStatus: 'approved',
      userId: 'user-1',
      firebaseUid: 'user-1',
      email: 'rahul.cse@jkkniu.edu',
      isApproved: true,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: 'Rahul Chowdhury',
        department: 'Computer Science and Engineering (CSE)',
        avatar: 'RC',
        initials: 'RC'
      },
      createdAt: getPastDateString(1),
      updatedAt: getPastDateString(1)
    },
    {
      id: 'item-6',
      emoji: '📱',
      title: 'Redmi Note 12 Smartphone (Green Case)',
      category: 'Electronics',
      description: 'Found a green Redmi Note 12 smartphone on the stairs. Battery is dead. Bring your charger and enter the screen lock pattern to claim.',
      type: 'found',
      location: 'Bidrohi Hall',
      specificSpot: 'East block stairs 2nd floor',
      rewardOffered: '',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=300&q=80',
      views: 37,
      status: 'active',
      approvalStatus: 'approved',
      userId: 'user-3',
      firebaseUid: 'user-3',
      email: 'sifat.bba@jkkniu.edu',
      isApproved: true,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: 'Sifat Ahmed',
        department: 'Management',
        avatar: 'SA',
        initials: 'SA'
      },
      createdAt: getPastDateString(1),
      updatedAt: getPastDateString(1)
    },
    {
      id: 'item-7',
      emoji: '🔑',
      title: 'Bunch of Keys with Golden Heart Keychain',
      category: 'Keys & Access Cards',
      description: 'Found keys containing a golden heart keychain and 3 brass keys near the volleyball field.',
      type: 'found',
      location: 'Agnibina Hall',
      specificSpot: 'Grass field near volleyball court',
      rewardOffered: '',
      image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=300&q=80',
      views: 22,
      status: 'returned',
      approvalStatus: 'approved',
      userId: 'user-4',
      firebaseUid: 'user-4',
      email: 'mim.ais@jkkniu.edu',
      isApproved: true,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: 'Tasmia Mim',
        department: 'Accounting and Information Systems',
        avatar: 'TM',
        initials: 'TM'
      },
      createdAt: getPastDateString(5),
      updatedAt: getPastDateString(2)
    },
    {
      id: 'item-8',
      emoji: '💻',
      title: 'iPad Air 5th Generation with Pink Folio',
      category: 'Electronics',
      description: 'URGENT: Lost my pink iPad Air 5th Gen with all my lecture notes. Left on a desk in library reading area.',
      type: 'lost',
      location: 'Central Library',
      specificSpot: '2nd floor quiet study zone',
      rewardOffered: '',
      image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=300&q=80',
      views: 5,
      status: 'pending',
      approvalStatus: 'pending',
      userId: 'user-4',
      firebaseUid: 'user-4',
      email: 'mim.ais@jkkniu.edu',
      isApproved: false,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: 'Tasmia Mim',
        department: 'Accounting and Information Systems',
        avatar: 'TM',
        initials: 'TM'
      },
      createdAt: getPastDateString(0),
      updatedAt: getPastDateString(0)
    },
    {
      id: 'item-9',
      emoji: '⌚',
      title: 'Silver Seiko Chronograph Men\'s Watch',
      category: 'Accessories',
      description: 'Found a heavy stainless steel Seiko quartz watch on the sink in the washroom.',
      type: 'found',
      location: 'Dhulonchapa Hall',
      specificSpot: 'Common washroom basin mirror stand',
      rewardOffered: '',
      image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=300&q=80',
      views: 3,
      status: 'pending',
      approvalStatus: 'pending',
      userId: 'user-2',
      firebaseUid: 'user-2',
      email: 'tania.eee@jkkniu.edu',
      isApproved: false,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: 'Tania Sultana',
        department: 'Electrical and Electronic Engineering (EEE)',
        avatar: 'TS',
        initials: 'TS'
      },
      createdAt: getPastDateString(0),
      updatedAt: getPastDateString(0)
    },
    {
      id: 'item-10',
      emoji: '🧮',
      title: 'Scientific Calculator fx-991EX ClassWiz',
      category: 'Electronics',
      description: 'Lost my pink fx-991EX Classwiz scientific calculator with engineering department stickers on the lid.',
      type: 'lost',
      location: 'New Kola Bhaban',
      specificSpot: 'Room 205 bench 3',
      rewardOffered: '',
      image: 'https://images.unsplash.com/photo-1543269664-76bc3997d9ea?auto=format&fit=crop&w=300&q=80',
      views: 1,
      status: 'pending',
      approvalStatus: 'pending',
      userId: 'user-1',
      firebaseUid: 'user-1',
      email: 'rahul.cse@jkkniu.edu',
      isApproved: false,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: 'Rahul Chowdhury',
        department: 'Computer Science and Engineering (CSE)',
        avatar: 'RC',
        initials: 'RC'
      },
      createdAt: getPastDateString(0),
      updatedAt: getPastDateString(0)
    }
  ];

  fallbackStore.items = seededItems;

  // 3. Search keywords initialized to empty array (dynamically logged by user searches)
  fallbackStore.searchKeywords = [];

  // 4. Claims initialized to empty array (dynamically logged by student claims)
  fallbackStore.claims = [];

  // 5. Seed admin notifications
  fallbackStore.admin_notifications = [
    {
      id: 'an-1',
      title: 'New Awaiting Listing Approval',
      message: 'Tasmia Mim posted a new lost listing: "iPad Air 5th Generation with Pink Folio" awaiting coordinator approval.',
      type: 'Listing',
      category: 'Lost Items',
      priority: 'high',
      relatedUserId: 'user-4',
      relatedItemId: 'item-8',
      isRead: false,
      createdAt: getPastDateString(0)
    },
    {
      id: 'an-2',
      title: 'New Verification Claim Submitted',
      message: 'Sifat Ahmed submitted a validation claim on "AirPods Pro with MagSafe Case" stating high-proof indicators.',
      type: 'Claim',
      category: 'Claims',
      priority: 'medium',
      relatedUserId: 'user-3',
      relatedItemId: 'item-2',
      isRead: false,
      createdAt: getPastDateString(1)
    }
  ];

  saveFallbackStore();
  console.log('🎉 Seeding fallbackStore completed successfully!');
}

// Compatibility Helper: Always return true because MongoDB is our active database
export function isFallback() {
  return true;
}

// Preload store on module initialization
export function sanitizeNotificationText(raw?: string | null): string {
  if (!raw) return '';
  let str = String(raw).trim();
  let prev = '';
  while (prev !== str) {
    prev = str;
    str = str
      .replace(/^(?:<strong[^>]*>)?\s*notification\s*(?:<\/strong>)?\s*:\s*/i, '')
      .replace(/^notification\s*:\s*/i, '')
      .replace(/^(?:<strong[^>]*>)?\s*alert\s*(?:<\/strong>)?\s*:\s*/i, '')
      .replace(/^alert\s*:\s*/i, '')
      .trim();
  }
  return str;
}

loadFallbackStore();

export function getFallbackData() {
  if (!fallbackStore.claims) {
    fallbackStore.claims = [];
  }
  if (!fallbackStore.notifications) {
    fallbackStore.notifications = [];
  } else {
    fallbackStore.notifications = fallbackStore.notifications.map((n: any) => {
      const cleanTitle = (n.title || '').trim().replace(/^notification:?/i, '').trim();
      const rawText = sanitizeNotificationText(n.text || '');
      const rawMsg = sanitizeNotificationText(n.message || '');

      let text = rawText || rawMsg;
      if (!text || text.trim().length === 0) {
        if (cleanTitle && cleanTitle.toLowerCase() !== 'notification' && rawMsg) {
          text = `<strong>${cleanTitle}</strong>: ${rawMsg}`;
        } else if (rawMsg) {
          text = rawMsg;
        } else if (cleanTitle && cleanTitle.toLowerCase() !== 'notification') {
          text = `<strong>${cleanTitle}</strong>`;
        } else {
          text = 'Campus alert notification';
        }
      }
      text = sanitizeNotificationText(text);

      const isUnread = n.unread !== false && n.is_read !== true && n.isRead !== true && n.read !== true;

      return {
        id: String(n.id || n._id || generateUniqueId('notif')),
        userId: String(n.userId || n.user_id || ''),
        user_id: String(n.user_id || n.userId || ''),
        text,
        title: cleanTitle && cleanTitle.toLowerCase() !== 'notification' ? cleanTitle : 'Notification',
        message: rawMsg || text,
        time: n.time || (n.createdAt || n.created_at ? new Date(n.createdAt || n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'),
        unread: isUnread,
        isRead: !isUnread,
        is_read: !isUnread,
        type: n.type || 'general',
        createdAt: n.createdAt || n.created_at || new Date().toISOString()
      };
    });
  }
  if (!fallbackStore.admin_notifications) {
    fallbackStore.admin_notifications = [];
  } else {
    // Sanitize any malformed notifications in memory
    fallbackStore.admin_notifications = fallbackStore.admin_notifications.map((an: any) => ({
      id: String(an.id || an._id || generateUniqueId('an')),
      title: an.title || (an.text ? an.text.replace(/<[^>]*>?/gm, '').split(':')[0] : 'Campus Activity Alert'),
      message: an.message || (an.text ? an.text.replace(/<[^>]*>?/gm, '') : 'New moderation or activity update on campus.'),
      type: an.type || 'system',
      category: an.category || 'System',
      priority: an.priority || 'medium',
      isRead: an.isRead === true || an.isRead === 1,
      relatedUserId: an.relatedUserId ? String(an.relatedUserId) : '',
      relatedItemId: an.relatedItemId ? String(an.relatedItemId) : '',
      relatedConversationId: an.relatedConversationId ? String(an.relatedConversationId) : '',
      createdAt: an.createdAt || an.created_at || new Date().toISOString()
    }));
  }
  if (!fallbackStore.conversation_reports) {
    fallbackStore.conversation_reports = [];
  }
  if (!fallbackStore.admin_activity_logs) {
    fallbackStore.admin_activity_logs = [];
  }
  if (!fallbackStore.listing_revisions) {
    fallbackStore.listing_revisions = [];
  }
  return {
    store: fallbackStore,
    save: saveFallbackStore
  };
}

export function generateUniqueId(prefix = 'notif'): string {
  const rand = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
  return `${prefix}-${Date.now()}-${rand}`;
}

export async function createUserNotification(notif: {
  userId: string | number;
  title?: string;
  message?: string;
  text?: string;
  type?: string;
}) {
  try {
    const { store, save } = getFallbackData();
    const notifId = generateUniqueId('notif');
    const uId = String(notif.userId || '');
    if (!uId) return null;

    const cleanTitle = (notif.title || '').trim().replace(/^notification:?/i, '').trim();
    const cleanMsg = sanitizeNotificationText(notif.message || '');
    const cleanTxt = sanitizeNotificationText(notif.text || '');

    let text = cleanTxt;
    if (!text) {
      if (cleanTitle && cleanTitle.toLowerCase() !== 'notification' && cleanMsg) {
        text = `<strong>${cleanTitle}</strong>: ${cleanMsg}`;
      } else if (cleanMsg) {
        text = cleanMsg;
      } else if (cleanTitle && cleanTitle.toLowerCase() !== 'notification') {
        text = `<strong>${cleanTitle}</strong>`;
      } else {
        text = 'Campus alert notification';
      }
    }
    text = sanitizeNotificationText(text);

    const newNotifItem = {
      id: notifId,
      user_id: uId,
      userId: uId,
      title: cleanTitle && cleanTitle.toLowerCase() !== 'notification' ? cleanTitle : 'Notification',
      message: cleanMsg || text,
      text,
      time: 'Just now',
      unread: true,
      isRead: false,
      is_read: false,
      type: notif.type || 'general',
      createdAt: new Date().toISOString()
    };

    if (!store.notifications) store.notifications = [];
    store.notifications.unshift(newNotifItem as any);
    save();

    if (isMongoDBActive()) {
      try {
        await MNotification.updateOne(
          { id: notifId },
          {
            $set: {
              id: notifId,
              user_id: uId,
              title: newNotifItem.title,
              message: newNotifItem.text,
              type: notif.type || 'general',
              is_read: false
            }
          },
          { upsert: true }
        );
      } catch (mErr: any) {
        console.warn('MongoDB MNotification update note:', mErr.message);
      }
    }

    return newNotifItem;
  } catch (err) {
    console.error('Failed to create user notification:', err);
    return null;
  }
}

export async function createAdminNotification(notif: {
  title: string;
  message: string;
  type: string;
  category: 'User' | 'Lost Items' | 'Found Items' | 'Claims' | 'Messages' | 'Security' | 'System';
  priority?: 'low' | 'medium' | 'high';
  relatedUserId?: string | number;
  relatedItemId?: string | number;
  relatedConversationId?: string | number;
}) {
  const priority = notif.priority || 'medium';
  try {
    const { store, save } = getFallbackData();
    const newNotif = {
      id: generateUniqueId('an'),
      title: notif.title || 'Campus Activity Alert',
      message: notif.message || '',
      type: notif.type || 'system',
      category: notif.category || 'System',
      priority,
      relatedUserId: notif.relatedUserId ? String(notif.relatedUserId) : '',
      relatedItemId: notif.relatedItemId ? String(notif.relatedItemId) : '',
      relatedConversationId: notif.relatedConversationId ? String(notif.relatedConversationId) : '',
      isRead: false,
      createdAt: new Date().toISOString()
    };

    store.admin_notifications.unshift(newNotif);
    save();

    if (isMongoDBActive()) {
      try {
        await MAdminNotification.updateOne(
          { id: newNotif.id },
          { $set: newNotif },
          { upsert: true }
        );
      } catch (mErr: any) {
        console.warn('MongoDB AdminNotification update note:', mErr.message);
      }
    }

    try {
      const { setFirestoreDocument, getFirestoreDB } = await import('./db/firestore');
      if (getFirestoreDB()) {
        await setFirestoreDocument('admin_notifications', newNotif.id, newNotif);
      }
    } catch (fsErr: any) {
      // ignore firestore if not provisioned
    }

    return newNotif;
  } catch (err) {
    console.error('Failed to create admin notification:', err);
  }
}

export async function logAdminActivity(
  adminId: string | number,
  action: string,
  targetType?: string,
  targetId?: string | number,
  ipAddress?: string
) {
  try {
    const { store, save } = getFallbackData();
    const newLog = {
      id: `aal-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      adminId,
      action,
      targetType,
      targetId,
      ipAddress,
      createdAt: new Date().toISOString()
    };
    store.admin_activity_logs.unshift(newLog);
    save();
    return newLog;
  } catch (err) {
    console.error('Failed to log admin activity:', err);
  }
}

export function deleteLocalFileSafely(fileUrlOrPath: string) {
  if (!fileUrlOrPath || typeof fileUrlOrPath !== 'string') return;
  try {
    let filename = '';
    if (fileUrlOrPath.includes('/server-uploads/')) {
      filename = fileUrlOrPath.split('/server-uploads/')[1];
    } else if (fileUrlOrPath.includes('server-uploads/')) {
      filename = fileUrlOrPath.split('server-uploads/')[1];
    } else if (!fileUrlOrPath.includes('/') && !fileUrlOrPath.includes('\\') && fileUrlOrPath.includes('-')) {
      filename = fileUrlOrPath;
    }
    
    if (filename) {
      filename = filename.split('?')[0];
      const filePath = path.join(process.cwd(), 'server-uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Successfully deleted file: ${filePath}`);
      }
    }
  } catch (err) {
    console.error('Error deleting local file:', fileUrlOrPath, err);
  }
}

export async function performCascadeDeleteUser(userId: string | number, extraUserInfo?: any) {
  const sUserId = String(userId);
  console.log(`[CASCADE DELETE] Starting cascading delete for user: ${sUserId}`);

  let itemIds: string[] = [];
  let fUid = extraUserInfo?.firebaseUid || '';
  let userEmail = extraUserInfo?.email ? String(extraUserInfo.email).trim().toLowerCase() : '';
  const userEmailsSet = new Set<string>();
  if (userEmail) userEmailsSet.add(userEmail);

  // 1. Gather files and user info first before deleting from databases!
  if (isMongoDBActive()) {
    try {
      const queryConds: any[] = [{ id: sUserId }, { firebaseUid: sUserId }];
      if (mongoose.default.Types.ObjectId.isValid(sUserId)) {
        queryConds.push({ _id: sUserId });
      }
      if (userEmail) {
        queryConds.push({ email: userEmail }, { email: new RegExp(`^${userEmail}$`, 'i') });
      }

      const dbUser = await MUser.findOne({ $or: queryConds });
      if (dbUser) {
        if (dbUser.firebaseUid) fUid = dbUser.firebaseUid || fUid;
        if (dbUser.email) {
          const dbEmail = String(dbUser.email).trim().toLowerCase();
          userEmailsSet.add(dbEmail);
          userEmail = dbEmail;
        }
        if (dbUser.avatar) deleteLocalFileSafely(dbUser.avatar);
        if (dbUser.profileImage) deleteLocalFileSafely(dbUser.profileImage);
        if (dbUser.profilePhoto) deleteLocalFileSafely(dbUser.profilePhoto);
        if (dbUser.verificationDocument) deleteLocalFileSafely(dbUser.verificationDocument);
      }
    } catch (err) {
      console.error('Error fetching MongoDB user for files deletion:', err);
    }
  }

  // Also check local store for user info & emails
  const { store, save } = getFallbackData();
  const storeUser = (store.users || []).find((u: any) => 
    String(u.id) === sUserId || 
    String(u._id) === sUserId || 
    (u.firebaseUid && String(u.firebaseUid) === sUserId) ||
    (userEmail && String(u.email || '').trim().toLowerCase() === userEmail)
  );
  if (storeUser) {
    if (storeUser.firebaseUid) fUid = storeUser.firebaseUid || fUid;
    if (storeUser.email) {
      const stEmail = String(storeUser.email).trim().toLowerCase();
      userEmailsSet.add(stEmail);
      if (!userEmail) userEmail = stEmail;
    }
    if (storeUser.avatar) deleteLocalFileSafely(storeUser.avatar);
    if (storeUser.profileImage) deleteLocalFileSafely(storeUser.profileImage);
    if (storeUser.profilePhoto) deleteLocalFileSafely(storeUser.profilePhoto);
    if (storeUser.verificationDocument) deleteLocalFileSafely(storeUser.verificationDocument);
  }

  if (!fUid && sUserId.startsWith('fb-user-')) {
    fUid = sUserId;
  }

  // Build target match sets for queries
  const userIdsSet = [sUserId];
  if (fUid && !userIdsSet.includes(fUid)) userIdsSet.push(fUid);
  if (extraUserInfo?._id && !userIdsSet.includes(String(extraUserInfo._id))) {
    userIdsSet.push(String(extraUserInfo._id));
  }
  if (extraUserInfo?.id && !userIdsSet.includes(String(extraUserInfo.id))) {
    userIdsSet.push(String(extraUserInfo.id));
  }
  if (extraUserInfo?.firebaseUid && !userIdsSet.includes(String(extraUserInfo.firebaseUid))) {
    userIdsSet.push(String(extraUserInfo.firebaseUid));
  }

  const allEmailsArray = Array.from(userEmailsSet);

  // Gather all item IDs from MongoDB
  if (isMongoDBActive()) {
    try {
      const itemQueryConds: any[] = [
        { userId: { $in: userIdsSet } },
        { ownerUid: { $in: userIdsSet } },
        { firebaseUid: { $in: userIdsSet } },
        { 'postedBy.userId': { $in: userIdsSet } }
      ];
      if (allEmailsArray.length > 0) {
        for (const em of allEmailsArray) {
          const emailRegex = new RegExp(`^${em.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
          itemQueryConds.push(
            { email: emailRegex },
            { 'postedBy.email': emailRegex }
          );
        }
      }

      const dbItems = await MItem.find({ $or: itemQueryConds }).lean();
      
      for (const item of dbItems) {
        if (item.id) itemIds.push(String(item.id));
        if ((item as any)._id) itemIds.push(String((item as any)._id));
        if (item.image) deleteLocalFileSafely(item.image);
        if (item.coverImage) deleteLocalFileSafely(item.coverImage);
        if (item.capturedImage) deleteLocalFileSafely(item.capturedImage);
        if (Array.isArray(item.images)) {
          for (const img of item.images) {
            if (img && img.url) deleteLocalFileSafely(img.url);
          }
        }
      }
    } catch (err) {
      console.error('Error gathering MongoDB items for cascade delete:', err);
    }
  }

  // Gather items from fallback store
  const storeItems = (store.items || []).filter((item: any) => {
    const itemUserId = String(item.userId || '');
    const itemOwnerUid = String(item.ownerUid || '');
    const itemFbUid = String(item.firebaseUid || '');
    const itemPostedByUid = String(item.postedBy?.userId || '');
    const itemEmail = String(item.email || item.postedBy?.email || '').trim().toLowerCase();

    if (userIdsSet.includes(itemUserId) ||
        userIdsSet.includes(itemOwnerUid) ||
        userIdsSet.includes(itemFbUid) ||
        userIdsSet.includes(itemPostedByUid)) {
      return true;
    }
    if (itemEmail && allEmailsArray.includes(itemEmail)) {
      return true;
    }
    return false;
  });

  for (const item of storeItems) {
    if (item.id && !itemIds.includes(String(item.id))) {
      itemIds.push(String(item.id));
    }
    if ((item as any)._id && !itemIds.includes(String((item as any)._id))) {
      itemIds.push(String((item as any)._id));
    }
    if (item.image) deleteLocalFileSafely(item.image);
    if (item.coverImage) deleteLocalFileSafely(item.coverImage);
    if (item.capturedImage) deleteLocalFileSafely(item.capturedImage);
    if (Array.isArray(item.images)) {
      for (const img of item.images) {
        if (img && img.url) deleteLocalFileSafely(img.url);
      }
    }
  }

  // Deduplicate itemIds
  itemIds = Array.from(new Set(itemIds));

  // 2. Perform MongoDB cascading deletes
  if (isMongoDBActive()) {
    const executeDeletes = async (sess?: any) => {
      const opts = sess ? { session: sess } : {};

      // 1. User
      const userDelConds: any[] = [
        { id: { $in: userIdsSet } },
        { firebaseUid: { $in: userIdsSet } }
      ];
      if (mongoose.default.Types.ObjectId.isValid(sUserId)) {
        userDelConds.push({ _id: sUserId });
      }
      if (allEmailsArray.length > 0) {
        for (const em of allEmailsArray) {
          const emailRegex = new RegExp(`^${em.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
          userDelConds.push({ email: emailRegex });
        }
      }

      await MUser.deleteMany({ $or: userDelConds }, opts);

      // 2. Items
      const itemDelConds: any[] = [
        { userId: { $in: userIdsSet } },
        { ownerUid: { $in: userIdsSet } },
        { firebaseUid: { $in: userIdsSet } },
        { 'postedBy.userId': { $in: userIdsSet } }
      ];
      if (itemIds.length > 0) {
        itemDelConds.push({ id: { $in: itemIds } });
        const validObjIds = itemIds.filter(id => mongoose.default.Types.ObjectId.isValid(id));
        if (validObjIds.length > 0) {
          itemDelConds.push({ _id: { $in: validObjIds } });
        }
      }
      if (allEmailsArray.length > 0) {
        for (const em of allEmailsArray) {
          const emailRegex = new RegExp(`^${em.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
          itemDelConds.push({ email: emailRegex }, { 'postedBy.email': emailRegex });
        }
      }
      await MItem.deleteMany({ $or: itemDelConds }, opts);

      // 3. Claims
      const claimDelConds: any[] = [
        { user_id: { $in: userIdsSet } },
        { userId: { $in: userIdsSet } }
      ];
      if (itemIds.length > 0) {
        claimDelConds.push({ item_id: { $in: itemIds } }, { itemId: { $in: itemIds } });
      }
      if (allEmailsArray.length > 0) {
        for (const em of allEmailsArray) {
          const emailRegex = new RegExp(`^${em.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
          claimDelConds.push({ user_email: emailRegex }, { email: emailRegex });
        }
      }
      await MClaim.deleteMany({ $or: claimDelConds }, opts);

      // 4. Chat Threads
      await MChatThread.deleteMany({
        $or: [
          { participants: { $in: userIdsSet } },
          { 'messages.senderId': { $in: userIdsSet } }
        ]
      }, opts);

      // 5. Notifications
      const notifConds: any[] = [
        { userId: { $in: userIdsSet } },
        { user_id: { $in: userIdsSet } }
      ];
      if (itemIds.length > 0) {
        notifConds.push({ itemId: { $in: itemIds } }, { item_id: { $in: itemIds } });
      }
      await MNotification.deleteMany({ $or: notifConds }, opts);

      // 6. Admin Notifications
      const adminNotifConds: any[] = [{ relatedUserId: { $in: userIdsSet } }];
      if (itemIds.length > 0) adminNotifConds.push({ relatedItemId: { $in: itemIds } });
      await MAdminNotification.deleteMany({ $or: adminNotifConds }, opts);

      // 7. Conversation Reports
      await MConversationReport.deleteMany({
        $or: [
          { reportedBy: { $in: userIdsSet } },
          { reportedUser: { $in: userIdsSet } }
        ]
      }, opts);

      // 8. Listing Revisions
      const revConds: any[] = [{ ownerUid: { $in: userIdsSet } }];
      if (itemIds.length > 0) revConds.push({ postId: { $in: itemIds } });
      await MListingRevision.deleteMany({ $or: revConds }, opts);

      // 9. OTPs
      const otpConds: any[] = [{ user_id: { $in: userIdsSet } }, { userId: { $in: userIdsSet } }];
      if (allEmailsArray.length > 0) {
        for (const em of allEmailsArray) {
          const emailRegex = new RegExp(`^${em.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
          otpConds.push({ email: emailRegex });
        }
      }
      await MOtp.deleteMany({ $or: otpConds }, opts);

      // 10. Search Logs
      await MSearchLog.deleteMany({ userId: { $in: userIdsSet } }, opts);

      // 11. Item Views
      const viewConds: any[] = [{ userId: { $in: userIdsSet } }];
      if (itemIds.length > 0) viewConds.push({ itemId: { $in: itemIds } });
      await MItemView.deleteMany({ $or: viewConds }, opts);

      // 12. Admin Activity Logs (excluding ADMIN DELETE USER log)
      await MAdminActivityLog.deleteMany({
        $or: [
          { adminId: { $in: userIdsSet } },
          { targetId: { $in: userIdsSet } }
        ],
        action: { $not: /ADMIN DELETE USER/i }
      }, opts);

      // 13. All Raw Collections in MongoDB
      const db = mongoose.connection.db;
      if (db) {
        const collections = await db.collections();
        for (const col of collections) {
          const colName = col.collectionName;
          if (colName.startsWith('system.')) continue;
          
          await col.deleteMany({
            $or: [
              { userId: { $in: userIdsSet } },
              { user_id: { $in: userIdsSet } },
              { ownerUid: { $in: userIdsSet } },
              { firebaseUid: { $in: userIdsSet } },
              { adminId: { $in: userIdsSet } },
              { targetId: { $in: userIdsSet } },
              { reportedBy: { $in: userIdsSet } },
              { reportedUser: { $in: userIdsSet } },
              { relatedUserId: { $in: userIdsSet } },
              { participants: { $in: userIdsSet } },
              { senderId: { $in: userIdsSet } },
              ...(allEmailsArray.length > 0 ? [{ email: { $in: allEmailsArray } }] : [])
            ],
            ...(colName === 'adminactivitylogs' || colName === 'admin_activity_logs' ? { action: { $not: /ADMIN DELETE USER/i } } : {})
          }, opts);

          if (itemIds.length > 0) {
            await col.deleteMany({
              $or: [
                { itemId: { $in: itemIds } },
                { item_id: { $in: itemIds } },
                { postId: { $in: itemIds } },
                { id: { $in: itemIds } }
              ]
            }, opts);
          }
        }
      }
    };

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await executeDeletes(session);
      await session.commitTransaction();
      console.log(`[CASCADE DELETE] MongoDB transaction successfully committed for user: ${sUserId}`);
    } catch (transactionErr: any) {
      console.error('[CASCADE DELETE] Transaction failed or not supported. Rolling back...', transactionErr);
      await session.abortTransaction();

      // Standalone MongoDB server fallback (non-replica set / standalone instance)
      console.warn('⚠️ Executing non-transactional cascade delete...');
      await executeDeletes();
      console.log(`[CASCADE DELETE] Resilient non-transactional cascade completed successfully for user: ${sUserId}`);
    } finally {
      session.endSession();
    }
  }

  // 3. Delete user from Firebase Auth if Admin SDK is connected and active
  try {
    const { getFirebaseAdminAuth } = await import('./utils/firebase');
    const adminAuth = getFirebaseAdminAuth();
    if (adminAuth && fUid) {
      try {
        await adminAuth.deleteUser(fUid);
        console.log(`🔥 [CASCADE DELETE] Successfully deleted user from Firebase Auth: ${fUid}`);
      } catch (fbErr: any) {
        console.warn('⚠️ [CASCADE DELETE] Non-blocking issue deleting user from Firebase Auth:', fbErr.message);
      }
    }
  } catch (err: any) {
    console.warn('⚠️ [CASCADE DELETE] Admin auth SDK import or setup issue:', err.message);
  }

  // 3.1 Delete from Cloud Firestore collections if Firestore adapter is available
  try {
    const { deleteFirestoreDocument, getFirestoreDB } = await import('./db/firestore');
    const db = getFirestoreDB();
    if (db) {
      for (const uid of userIdsSet) {
        await deleteFirestoreDocument('users', uid).catch(() => {});
      }
      for (const iid of itemIds) {
        await deleteFirestoreDocument('items', iid).catch(() => {});
      }
      console.log(`🔥 [CASCADE DELETE] Firestore collections cleaned for user: ${sUserId}`);
    }
  } catch (fsErr: any) {
    console.warn('⚠️ [CASCADE DELETE] Non-blocking Firestore cleanup notice:', fsErr.message);
  }

  // 4. Perform Local/Fallback JSON store deletions
  try {
    if (store.users) {
      store.users = store.users.filter((u: any) => {
        const uId = String(u.id || '');
        const uObjId = String(u._id || '');
        const uFbUid = String(u.firebaseUid || '');
        const uEmail = String(u.email || '').trim().toLowerCase();

        if (userIdsSet.includes(uId) || userIdsSet.includes(uObjId) || userIdsSet.includes(uFbUid)) return false;
        if (uEmail && allEmailsArray.includes(uEmail)) return false;
        return true;
      });
    }
    store.items = (store.items || []).filter((item: any) => {
      const itemUserId = String(item.userId || '');
      const itemOwnerUid = String(item.ownerUid || '');
      const itemFbUid = String(item.firebaseUid || '');
      const itemPostedByUid = String(item.postedBy?.userId || '');
      const itemEmail = String(item.email || item.postedBy?.email || '').trim().toLowerCase();
      const itemId = String(item.id || '');
      const itemObjId = String((item as any)._id || '');

      if (itemIds.includes(itemId) || itemIds.includes(itemObjId)) return false;
      if (userIdsSet.includes(itemUserId) || userIdsSet.includes(itemOwnerUid) || userIdsSet.includes(itemFbUid) || userIdsSet.includes(itemPostedByUid)) return false;
      if (itemEmail && allEmailsArray.includes(itemEmail)) return false;
      return true;
    });
    if (store.claims) {
      store.claims = store.claims.filter((claim: any) => {
        const cUserId = String(claim.user_id || claim.userId || '');
        const cItemId = String(claim.item_id || claim.itemId || '');
        const cEmail = String(claim.user_email || claim.email || '').trim().toLowerCase();
        if (userIdsSet.includes(cUserId) || itemIds.includes(cItemId)) return false;
        if (cEmail && allEmailsArray.includes(cEmail)) return false;
        return true;
      });
    }
    if (store.threads) {
      store.threads = store.threads.filter(
        (t: any) => !Array.isArray(t.participants) || !t.participants.some((p: any) => userIdsSet.includes(String(p)))
      );
    }
    store.notifications = (store.notifications || []).filter((n: any) => {
      const nUserId = String(n.userId || n.user_id || '');
      const nItemId = String(n.itemId || n.item_id || '');
      if (userIdsSet.includes(nUserId) || (nItemId && itemIds.includes(nItemId))) return false;
      return true;
    });
    if (store.admin_notifications) {
      store.admin_notifications = store.admin_notifications.filter(
        (n: any) => !userIdsSet.includes(String(n.relatedUserId)) && (!n.relatedItemId || !itemIds.includes(String(n.relatedItemId)))
      );
    }
    if (store.conversation_reports) {
      store.conversation_reports = store.conversation_reports.filter(
        (r: any) => !userIdsSet.includes(String(r.reportedBy)) && !userIdsSet.includes(String(r.reportedUser))
      );
    }
    if (store.listing_revisions) {
      store.listing_revisions = store.listing_revisions.filter(
        (r: any) => !userIdsSet.includes(String(r.ownerUid)) && !itemIds.includes(String(r.postId))
      );
    }
    if (store.admin_activity_logs) {
      store.admin_activity_logs = store.admin_activity_logs.filter(
        (log: any) => 
          (log.action && log.action.includes('ADMIN DELETE USER')) ||
          (!userIdsSet.includes(String(log.adminId)) && !userIdsSet.includes(String(log.targetId)))
      );
    }
    if (store.otps) {
      store.otps = store.otps.filter((otp: any) => {
        const otpUserId = String(otp.user_id || otp.userId || '');
        const otpEmail = String(otp.email || '').trim().toLowerCase();
        if (userIdsSet.includes(otpUserId)) return false;
        if (otpEmail && allEmailsArray.includes(otpEmail)) return false;
        return true;
      });
    }
    if ((store as any).searchLogs) {
      (store as any).searchLogs = (store as any).searchLogs.filter(
        (s: any) => !userIdsSet.includes(String(s.userId))
      );
    }
    if ((store as any).itemViews) {
      (store as any).itemViews = (store as any).itemViews.filter(
        (v: any) => !userIdsSet.includes(String(v.userId)) && !itemIds.includes(String(v.itemId))
      );
    }
    save();
    console.log(`[CASCADE DELETE] Fallback store successfully saved for user: ${sUserId}`);
  } catch (err) {
    console.error('[CASCADE DELETE] Error in Fallback store cascade delete:', err);
  }
}
