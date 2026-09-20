import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Disable command buffering globally so queries fail fast when disconnected rather than hanging for 10000ms
mongoose.set('bufferCommands', false);

let isMongoConnected = false;
let lastConnectionAttempt = 0;
let lastAuthFailureTime = 0;
let connectingPromise: Promise<boolean> | null = null;
const RETRY_COOLDOWN_MS = 60000; // Wait 60s before retrying if auth failed

const CONFIGURED_MONGODB_URI = 'mongodb+srv://nadimahmedshuvo17_db_user:Campus_lost_Found@cluster0.y68wzpy.mongodb.net/nazrul_retrievers?retryWrites=true&w=majority&appName=Cluster0';

// Register Mongoose connection state event listeners
mongoose.connection.on('connected', () => {
  isMongoConnected = true;
});

mongoose.connection.on('disconnected', () => {
  isMongoConnected = false;
});

mongoose.connection.on('error', (err) => {
  isMongoConnected = false;
  // If it's an auth error or if we're in fallback mode, do not spam error logs
  if (err.message && (err.message.includes('auth') || err.message.includes('Authentication') || (err as any).code === 18)) {
    lastAuthFailureTime = Date.now();
    return;
  }
  if (isMongoConnected) {
    console.warn('ℹ️ Mongoose connection notice:', err.message);
  }
});

export function getEffectiveMongoUri(): string {
  const envUri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim() ? process.env.MONGODB_URI.trim() : '';
  if (envUri && !envUri.includes('<username>') && !envUri.includes('<password>') && !envUri.includes('your_mongodb_uri_here')) {
    return envUri;
  }
  return CONFIGURED_MONGODB_URI;
}

// Initialize lazy MongoDB connection
export async function connectMongoDB(): Promise<boolean> {
  if (mongoose.connection.readyState === 1) {
    isMongoConnected = true;
    return true;
  }

  // If a connection attempt is already in flight, reuse its promise
  if (connectingPromise) {
    return connectingPromise;
  }
  
  const primaryUri = getEffectiveMongoUri();

  // Don't spam retries if authentication failed very recently
  const now = Date.now();
  if (lastAuthFailureTime && now - lastAuthFailureTime < RETRY_COOLDOWN_MS) {
    return false;
  }

  lastConnectionAttempt = now;

  connectingPromise = (async () => {
    // 1. Try primary URI (env var if set)
    try {
      console.log('🔄 Attempting MongoDB connection to Atlas Database (nazrul_retrievers)...');
      await mongoose.connect(primaryUri, {
        dbName: 'nazrul_retrievers',
        serverSelectionTimeoutMS: 4000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 10000,
        bufferCommands: false,
        autoIndex: false,
      });
      isMongoConnected = true;
      lastAuthFailureTime = 0;
      console.log('✅ Connected to MongoDB Atlas Database (nazrul_retrievers) successfully!');
      return true;
    } catch (primaryErr: any) {
      // If primary URI failed with authentication error or timeout, and it's different from CONFIGURED_MONGODB_URI, try fallback CONFIGURED_MONGODB_URI
      if (primaryUri !== CONFIGURED_MONGODB_URI) {
        try {
          console.log('🔄 Attempting fallback to configured institutional MongoDB Atlas credentials...');
          await mongoose.disconnect().catch(() => {});
          await mongoose.connect(CONFIGURED_MONGODB_URI, {
            dbName: 'nazrul_retrievers',
            serverSelectionTimeoutMS: 4000,
            connectTimeoutMS: 5000,
            socketTimeoutMS: 10000,
            bufferCommands: false,
            autoIndex: false,
          });
          isMongoConnected = true;
          lastAuthFailureTime = 0;
          console.log('✅ Connected to configured MongoDB Atlas Database (nazrul_retrievers) successfully via institutional credentials!');
          return true;
        } catch (fallbackErr: any) {
          isMongoConnected = false;
          await mongoose.disconnect().catch(() => {});
          console.warn('ℹ️ MongoDB credentials did not authenticate on fallback. Operating on resilient JSON failover storage:', fallbackErr.message);
        }
      }

      isMongoConnected = false;
      await mongoose.disconnect().catch(() => {});
      if (primaryErr.message && (primaryErr.message.includes('auth') || primaryErr.message.includes('Authentication') || primaryErr.code === 18)) {
        lastAuthFailureTime = Date.now();
        console.log('ℹ️ Note: MongoDB Atlas credentials did not authenticate. Running seamlessly on resilient local JSON data store.');
      } else {
        console.log('ℹ️ MongoDB connection status: (' + (primaryErr.message || 'offline') + '). Operating on resilient local JSON data store.');
      }
      return false;
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
}

export function isMongoDBActive(): boolean {
  return mongoose.connection.readyState === 1;
}

// --------------------------------------------------------------------
// MONGOOSE SCHEMAS AND MODELS
// --------------------------------------------------------------------

// 1. User Schema
const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },

  // Authentication
  firebaseUid: { type: String, default: '' },
  provider: { type: String, default: 'email' },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, default: '' },
  refreshToken: { type: String, default: '' },

  // Basic
  fullName: { type: String, default: '' },
  studentId: { type: String, default: '' },
  registrationNumber: { type: String, default: '' },
  rollNumber: { type: String, default: '' },
  classRoll: { type: String, default: '' },
  roll: { type: String, default: '' },
  academicSession: { type: String, default: '' },
  faculty: { type: String, default: '' },
  department: { type: String, default: '' },
  phone: { type: String, default: '' },

  // Personal
  gender: { type: String, default: '' },
  dateOfBirth: { type: String, default: '' },
  bloodGroup: { type: String, default: '' },

  // Contact
  address: { type: String, default: '' },
  emergencyContact: { type: String, default: '' },
  emergencyContactName: { type: String, default: '' },

  // University
  residentialHall: { type: String, default: '' },

  // Social
  facebook: { type: String, default: '' },
  linkedin: { type: String, default: '' },

  // Profile
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },

  // Statistics
  totalLostPosts: { type: Number, default: 0 },
  totalFoundPosts: { type: Number, default: 0 },
  successfulReturns: { type: Number, default: 0 },
  reputationScore: { type: Number, default: 100 },

  // Status
  role: { type: String, enum: ['student', 'admin', 'moderator', 'coordinator', 'staff'], default: 'student' },
  status: { type: String, default: 'Pending' },
  emailVerified: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  profileCompleted: { type: Number, default: 0 },
  employeeCode: { type: String, default: '' },
  employee_code: { type: String, default: '' },

  // Dates
  lastLogin: { type: String, default: null },

  // Additional production/verification fields
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  profileImage: { type: String, default: '' },
  verificationCode: { type: String, default: null },
  verificationExpires: { type: Date, default: null },
  otpAttempts: { type: Number, default: 0 },
  lastOtpSentAt: { type: Date, default: null },
  accountStatus: { type: String, default: 'Pending' },
  verificationSentAt: { type: String, default: null },
  verificationExpiresAt: { type: String, default: null },
  verificationAttempts: { type: Number, default: 0 },
  registrationCompleted: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  verificationDocument: { type: String, default: '' },
  idVerificationStatus: { type: String, enum: ['unverified', 'pending', 'verified', 'rejected'], default: 'unverified' },
  idVerificationRemarks: { type: String, default: '' },
  idVerificationSubmittedAt: { type: String, default: null },
  verifiedAt: { type: String, default: null },
  profileVisibility: { type: String, enum: ['public', 'private'], default: 'public' },
  notificationSettings: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    matchAlerts: { type: Boolean, default: true }
  },
  language: { type: String, enum: ['EN', 'BN'], default: 'EN' },
  theme: { type: String, enum: ['light', 'dark'], default: 'light' },

  // Temporarily kept legacy fields for 100% backward compatibility during transition
  user_id: { type: String, default: '' },
  full_name: { type: String, default: '' },
  student_id: { type: String, default: '' },
  password_hash: { type: String, default: '' },
  profilePhoto: { type: String, default: '' },
  session_year: { type: String, default: '' },
  sessionYear: { type: String, default: '' },
  is_verified: { type: Boolean, default: false },
  profileCompletion: { type: Number, default: 0 }
}, { strict: false, timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

export const MUser = mongoose.model('User', UserSchema);

// 2. Item Schema
const ImageMetadataSchema = new mongoose.Schema({
  url: { type: String, required: true },
  storagePath: { type: String, default: '' },
  order: { type: Number, required: true },
  isCover: { type: Boolean, default: false },
  width: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  uploadedAt: { type: String, default: () => new Date().toISOString() },
  uploadedBy: { type: String, default: '' },
  fileSize: { type: Number, default: 0 }
}, { _id: false });

const ItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  emoji: { type: String, default: '📦' },
  title: { type: String, required: true },
  category: { type: String, required: true },
  subcategory: { type: String, default: '' },
  description: { type: String, required: true },
  type: { type: String, enum: ['lost', 'found'], required: true },
  location: { type: String, required: true },
  specificSpot: { type: String, default: '' },
  rewardOffered: { type: String, default: '' },
  image: { type: String, default: '' },
  images: { type: [ImageMetadataSchema], default: [] },
  coverImage: { type: String, default: '' },
  capturedViaCamera: { type: Boolean, default: false },
  capturedImage: { type: String, default: '' },
  views: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  approvalStatus: { type: String, default: 'pending' },
  userId: { type: String, default: '' },
  firebaseUid: { type: String, default: '' },
  email: { type: String, default: '' },
  displayName: { type: String, default: '' },
  photoURL: { type: String, default: '' },
  isApproved: { type: Boolean, default: false },
  isRejected: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  approvedBy: { type: String, default: null },
  approvedAt: { type: Date, default: null },
  rejectedBy: { type: String, default: null },
  rejectedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '' },
  deletedBy: { type: String, default: null },
  deletedAt: { type: Date, default: null },
  contactInfo: { type: String, default: '' },
  lastApprovedAt: { type: Date, default: null },
  editedBy: { type: String, default: null },
  revision: { type: Number, default: 1 },
  ownerUid: { type: String, default: '' },
  postedBy: {
    name: { type: String, required: true },
    department: { type: String, required: true },
    avatar: { type: String, default: '' },
    initials: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    email: { type: String, default: '' },
    userId: { type: String, default: '' },
    role: { type: String, default: 'student' }
  }
}, { timestamps: true });

export const MItem = mongoose.model('Item', ItemSchema);

// 3. Notification Schema
const NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true },
  is_read: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const MNotification = mongoose.model('Notification', NotificationSchema);

// 4. Admin Notification Schema
const AdminNotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true },
  category: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  relatedUserId: { type: String, default: '' },
  relatedItemId: { type: String, default: '' },
  relatedConversationId: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'createdAt' } });

export const MAdminNotification = mongoose.model('AdminNotification', AdminNotificationSchema);

// 5. Conversation Report Schema
const ConversationReportSchema = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true },
  conversationId: { type: String, required: true },
  reportedBy: { type: String, required: true },
  reportedByName: { type: String, default: '' },
  reportedUser: { type: String, required: true },
  reportedUserName: { type: String, default: '' },
  reason: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
  reviewedBy: { type: String, default: '' },
  reviewedAt: { type: Date, default: null },
}, { timestamps: { createdAt: 'createdAt' } });

export const MConversationReport = mongoose.model('ConversationReport', ConversationReportSchema);

// 6. Admin Activity Log Schema
const AdminActivityLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  adminId: { type: String, required: true },
  action: { type: String, required: true },
  targetType: { type: String, default: '' },
  targetId: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
}, { timestamps: { createdAt: 'createdAt' } });

export const MAdminActivityLog = mongoose.model('AdminActivityLog', AdminActivityLogSchema);

// 7. Chat Thread Schema
const ChatThreadSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, default: '' },
  initials: { type: String, default: '' },
  color: { type: String, default: '' },
  preview: { type: String, default: '' },
  time: { type: String, default: '' },
  unreadCount: { type: Number, default: 0 },
  itemTitle: { type: String, default: '' },
  online: { type: Boolean, default: true },
  messages: [{
    id: { type: String },
    senderId: { type: String },
    senderName: { type: String },
    senderInitials: { type: String },
    text: { type: String },
    time: { type: String },
    imageUrl: { type: String },
    fileUrl: { type: String },
    fileName: { type: String },
    fileType: { type: String },
    fileSize: { type: String },
    attachment: { type: Object },
    isDeleted: { type: Boolean, default: false },
    deletedForEveryone: { type: Boolean, default: false },
    deletedForUsers: [{ type: String }],
    readBy: [{ type: String }],
    isRead: { type: Boolean, default: false },
    createdAt: { type: String }
  }]
}, { timestamps: { createdAt: 'createdAt' }, strict: false });

export const MChatThread = mongoose.model('ChatThread', ChatThreadSchema);

// 8. Search Keyword Schema
const SearchKeywordSchema = new mongoose.Schema({
  keyword: { type: String, required: true, unique: true },
  count: { type: Number, default: 1 },
  category: { type: String, default: 'General' },
  subcategory: { type: String, default: '' }
});

export const MSearchKeyword = mongoose.model('SearchKeyword', SearchKeywordSchema);

// 8b. Search Log Schema for detailed search tracking
const SearchLogSchema = new mongoose.Schema({
  keyword: { type: String, required: true },
  department: { type: String, default: '' },
  category: { type: String, default: '' },
  subcategory: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
  userId: { type: String, default: '' }
}, { timestamps: true });

export const MSearchLog = mongoose.model('SearchLog', SearchLogSchema);

// 9. Claim Schema
const ClaimSchema = new mongoose.Schema({
  claim_id: { type: String, required: true, unique: true },
  id: { type: String },
  item_id: { type: String, required: true },
  user_id: { type: String, required: true },
  proof_description: { type: String, required: true },
  contact_details: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  admin_notes: { type: String, default: '' },
  created_at: { type: String },
  updated_at: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const MClaim = mongoose.model('Claim', ClaimSchema);

// 10. Listing Revision Schema
const ListingRevisionSchema = new mongoose.Schema({
  revisionId: { type: String, required: true, unique: true },
  postId: { type: String, required: true },
  ownerUid: { type: String, required: true },
  previousData: { type: mongoose.Schema.Types.Mixed, required: true },
  newData: { type: mongoose.Schema.Types.Mixed, required: true },
  editedImages: { type: [ImageMetadataSchema], default: [] },
  editedAt: { type: String, default: () => new Date().toISOString() },
  status: { type: String, enum: ['pending_review', 'approved', 'rejected'], default: 'pending_review' },
  approvedBy: { type: String, default: null },
  reviewComment: { type: String, default: '' },
  reviewedAt: { type: String, default: null },
  revisionNumber: { type: Number, default: 1 }
}, { timestamps: true });

export const MListingRevision = mongoose.model('ListingRevision', ListingRevisionSchema);

// 11. Faculty Schema
const FacultySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  faculty_name: { type: String, required: true }
}, { timestamps: true });

export const MFaculty = mongoose.model('Faculty', FacultySchema);

// 12. Department Schema
const DepartmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  faculty_id: { type: String, required: true },
  department_name: { type: String, required: true }
}, { timestamps: true });

export const MDepartment = mongoose.model('Department', DepartmentSchema);

// 13. Item View Schema
const ItemViewSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  userId: { type: String, required: true },
  viewedAt: { type: Date, default: Date.now },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' }
}, { timestamps: true });

ItemViewSchema.index({ itemId: 1 });
ItemViewSchema.index({ userId: 1 });
ItemViewSchema.index({ itemId: 1, userId: 1 }, { unique: true });

export const MItemView = mongoose.model('ItemView', ItemViewSchema);

// 14. OTP Schema
const OtpSchema = new mongoose.Schema({
  id: { type: String, default: () => `otp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` },
  user_id: { type: String, default: '' },
  email: { type: String, required: true, index: true },
  verification_code: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true },
  verified: { type: Number, default: 0 },
  used: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 }
}, { timestamps: true });

export const MOtp = mongoose.model('Otp', OtpSchema);



