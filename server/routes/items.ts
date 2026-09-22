import mongoose from 'mongoose';
import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { getFallbackData, createAdminNotification, createUserNotification, generateUniqueId } from '../db';
import { isMongoDBActive, MItemView, MItem, MClaim, MNotification } from '../db/mongodb';
import { authenticateToken, authorizeModOrAdmin, AuthenticatedRequest } from '../middleware/auth';
import { Item } from '../../src/types';
import { 
  validateItemPost, 
  validateClaim, 
  sanitizeInput 
} from '../../src/utils/validation';

const router = Router();

// Ensure uploads folder exists
const UPLOADS_DIR = path.join(process.cwd(), 'server-uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Set up disk storage for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Validate JPG, PNG, WEBP and limit size to 10MB
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG, PNG, and WEBP image files are allowed.'));
  }
});

// 1. GET ALL ITEMS (WITH SEARCH & FILTERS)
router.get('/', async (req: any, res: Response) => {
  const { q, category, subcategory, location, type, status, owner, department, date } = req.query;

  try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      let currentUserId: string | null = null;
      let currentUserEmail: string | null = null;
      let currentUserName: string | null = null;
      let currentUserStudentId: string | null = null;
      let currentUserRole: string | null = null;
      const JWT_SECRET = process.env.JWT_SECRET || 'NazrulRetrievers_JKKNIU_2026_jwt_secret_@#%';
      if (token) {
        try {
          const decoded: any = jwt.verify(token, JWT_SECRET);
          if (decoded) {
            if (decoded.id) currentUserId = String(decoded.id);
            if (decoded.email) currentUserEmail = String(decoded.email).toLowerCase().trim();
            if (decoded.fullName || decoded.full_name) currentUserName = String(decoded.fullName || decoded.full_name).toLowerCase().trim();
            if (decoded.studentId || decoded.student_id || decoded.rollNumber) currentUserStudentId = String(decoded.studentId || decoded.student_id || decoded.rollNumber).trim();
            if (decoded.role) currentUserRole = String(decoded.role).toLowerCase();
          }
        } catch (err) {
          // Ignore JWT decode errors
        }
      }

      const { store, save } = getFallbackData();
      const isAdminOrMod = currentUserRole === 'admin' || currentUserRole === 'moderator';

      let filtered = store.items.filter(i => {
        if (i.isDeleted || i.status === 'deleted') return false;
        
        // Admin or moderator can view all non-deleted items
        if (isAdminOrMod) return true;

        const isApproved = i.approvalStatus === 'approved' || i.status === 'active' || (i as any).isApproved === true || (i as any).approval_status === 'approved';
        
        const isMyItem = !!(
          (currentUserId && (
            String(i.userId || (i as any).firebaseUid || (i as any).ownerUid || '') === String(currentUserId) ||
            (i.postedBy && (i.postedBy as any).userId && String((i.postedBy as any).userId) === String(currentUserId))
          )) ||
          (currentUserEmail && (
            (i.email && String(i.email).toLowerCase().trim() === currentUserEmail) ||
            (i.postedBy && (i.postedBy as any).email && String((i.postedBy as any).email).toLowerCase().trim() === currentUserEmail)
          )) ||
          (currentUserStudentId && (
            ((i as any).studentId && String((i as any).studentId).trim() === currentUserStudentId) ||
            (i.postedBy && (i.postedBy as any).studentId && String((i.postedBy as any).studentId).trim() === currentUserStudentId)
          )) ||
          (currentUserName && (
            (i.displayName && String(i.displayName).toLowerCase().trim() === currentUserName) ||
            (i.postedBy && (i.postedBy as any).name && String((i.postedBy as any).name).toLowerCase().trim() === currentUserName)
          ))
        );

        return isApproved || isMyItem;
      });

      // Filter by type (lost / found)
      if (type) {
        filtered = filtered.filter(i => i.type === type);
      }

      // Filter by category
      if (category && category !== 'All Categories' && category !== 'All') {
        filtered = filtered.filter(i => i.category.toLowerCase() === category.toLowerCase());
      }

      // Filter by subcategory
      if (subcategory && subcategory !== 'All Subcategories' && subcategory !== 'All') {
        filtered = filtered.filter(i => i.subcategory && i.subcategory.toLowerCase() === subcategory.toLowerCase());
      }

      // Filter by status
      if (status) {
        if (status === 'active' || status === 'approved') {
          filtered = filtered.filter(i => i.status === 'active' || i.status === 'approved' || i.approvalStatus === 'approved');
        } else {
          filtered = filtered.filter(i => i.status === status || i.approvalStatus === status);
        }
      }

      // Filter by location
      if (location && location !== 'All Locations' && location !== 'All') {
        filtered = filtered.filter(i => i.location === location);
      }

      // Filter by owner query
      if (owner) {
        const ownerLower = String(owner).toLowerCase();
        filtered = filtered.filter(i => 
          i.userId?.toLowerCase() === ownerLower || 
          i.email?.toLowerCase() === ownerLower || 
          (i.postedBy && (i.postedBy as any).userId && String((i.postedBy as any).userId).toLowerCase() === ownerLower) ||
          (i.postedBy && (i.postedBy as any).email && String((i.postedBy as any).email).toLowerCase() === ownerLower) ||
          i.postedBy?.name?.toLowerCase().includes(ownerLower)
        );
      }

      // Filter by department
      if (department && department !== 'All Departments') {
        const deptLower = String(department).toLowerCase();
        filtered = filtered.filter(i => 
          i.postedBy?.department?.toLowerCase() === deptLower || 
          i.postedBy?.department?.toLowerCase().includes(deptLower)
        );
      }

      // Filter by date
      if (date) {
        const dateStr = String(date);
        filtered = filtered.filter(i => i.date && i.date.startsWith(dateStr));
      }

      // Filter by keyword query
      if (q) {
        const queryStr = String(q).toLowerCase();
        filtered = filtered.filter(i => 
          i.title.toLowerCase().includes(queryStr) || 
          i.description.toLowerCase().includes(queryStr) ||
          i.location.toLowerCase().includes(queryStr)
        );

        // Record search keyword query statistics
        const existingKeyword = store.searchKeywords.find(k => k.keyword.toLowerCase() === queryStr);
        if (existingKeyword) {
          existingKeyword.count += 1;
          if (category && category !== 'All Categories' && category !== 'All') {
            existingKeyword.category = String(category);
          }
          if (subcategory && subcategory !== 'All Subcategories' && subcategory !== 'All') {
            existingKeyword.subcategory = String(subcategory);
          }
        } else {
          store.searchKeywords.push({
            keyword: String(q),
            count: 1,
            category: String(category && category !== 'All Categories' && category !== 'All' ? category : 'General'),
            subcategory: String(subcategory && subcategory !== 'All Subcategories' && subcategory !== 'All' ? subcategory : '')
          });
        }

        // Record search log with user details
        let searchUserId = 'guest';
        let searchDepartment = 'General';
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        const JWT_SECRET = process.env.JWT_SECRET || 'NazrulRetrievers_JKKNIU_2026_jwt_secret_@#%';
        if (token) {
          try {
            const decoded: any = jwt.verify(token, JWT_SECRET);
            if (decoded && decoded.id) {
              searchUserId = String(decoded.id);
              const userObj = store.users.find(u => String(u.id) === searchUserId);
              if (userObj && userObj.department) {
                searchDepartment = userObj.department;
              }
            }
          } catch (err) {
            // Ignore JWT decode errors
          }
        }

        if (!store.searchLogs) {
          store.searchLogs = [];
        }
        store.searchLogs.push({
          keyword: String(q),
          department: searchDepartment,
          category: String(category && category !== 'All Categories' && category !== 'All' ? category : 'General'),
          subcategory: String(subcategory && subcategory !== 'All Subcategories' && subcategory !== 'All' ? subcategory : ''),
          timestamp: new Date().toISOString(),
          userId: searchUserId
        });

        save();
      }

      await syncLatestViews(filtered);

      return res.json({ items: filtered.map(item => mapItemResponse(item)) });
    
  } catch (err: any) {
    console.error('Error fetching items:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 2. GET ITEM BY ID (INCREMENT VIEWS)
router.get('/:id', async (req: any, res: Response) => {
  const { id } = req.params;

  try {
    const { store, save } = getFallbackData();
    const item = store.items.find(i => String(i.id) === String(id));
    if (!item) {
      return res.status(404).json({ error: 'Item listing not found.' });
    }

    // Try to decode JWT optionally to check if we have a logged-in user
    let loggedInUser: any = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const JWT_SECRET = process.env.JWT_SECRET || 'NazrulRetrievers_JKKNIU_2026_jwt_secret_@#%';

    if (token) {
      try {
        loggedInUser = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        // Token was invalid or expired, treat as guest
      }
    }

    // Determine if we should increment view count
    const viewerId = loggedInUser 
      ? String(loggedInUser.id)
      : 'guest-' + String(req.ip || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');

    const isOwner = loggedInUser && (String(item.userId) === viewerId || String(item.ownerUid) === viewerId);
    const isAdmin = loggedInUser && loggedInUser.role === 'admin';
    const isModerator = loggedInUser && loggedInUser.role === 'moderator';

    if (!isOwner && !isAdmin && !isModerator) {
      if (isMongoDBActive()) {
        try {
          const alreadyViewed = await MItemView.findOne({ itemId: id, userId: viewerId });
          if (!alreadyViewed) {
            await MItemView.create({
              itemId: id,
              userId: viewerId,
              ip: req.ip || '',
              userAgent: req.headers['user-agent'] || ''
            });

            // Increment views atomically in MongoDB
            await MItem.updateOne({ id: id }, { $inc: { views: 1 } });

            // Sync fallback/localStore in memory
            item.views = (item.views || 0) + 1;
            save();
          }
        } catch (mongoErr: any) {
          // Duplicate key error (code 11000) from compound unique index means it's already viewed, ignore safely
          if (mongoErr.code !== 11000) {
            console.error('Failed to register MongoDB item view:', mongoErr);
          }
        }
      } else {
        // Fallback memory store unique tracking
        if (!(store as any).itemViews) {
          (store as any).itemViews = [];
        }
        const alreadyViewed = (store as any).itemViews.some(
          (v: any) => String(v.itemId) === String(id) && String(v.userId) === String(viewerId)
        );
        if (!alreadyViewed) {
          (store as any).itemViews.push({
            itemId: id,
            userId: viewerId,
            viewedAt: new Date().toISOString()
          });
          item.views = (item.views || 0) + 1;
          save();
        }
      }
    }

    // Always fetch latest views count from MongoDB if active, to ensure 100% accuracy
    if (isMongoDBActive()) {
      const dbItem = await MItem.findOne({ id: id }).lean();
      if (dbItem) {
        item.views = dbItem.views || 0;
      }
    }

    return res.json({ item: mapItemResponse(item) });
  } catch (err: any) {
    console.error('Error fetching item detail:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 3. POST NEW ITEM LISTING (WITH OPTIONAL IMAGE UPLOAD)
router.post('/', authenticateToken, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
  let { emoji, title, location, specificSpot, type, category, subcategory, description, secretNotes, secret_notes, rewardOffered, rewardAmount, image, capturedViaCamera, capturedImage } = req.body;
  const userId = req.user?.id;

  if (!title || !location || !type || !category || !description) {
    return res.status(400).json({ error: 'Missing mandatory fields for post submission.' });
  }

  // Sanitize fields to prevent XSS/HTML injection
  title = sanitizeInput(title);
  location = sanitizeInput(location);
  if (specificSpot) specificSpot = sanitizeInput(specificSpot);
  description = sanitizeInput(description);

  const validationErr = validateItemPost({
    title,
    location,
    category,
    subcategory,
    type,
    description,
    specificSpot
  });

  if (validationErr) {
    return res.status(400).json({ error: validationErr });
  }

  // Get uploaded file url
  let imageUrl = req.file ? `/server-uploads/${req.file.filename}` : null;

  // If no file was uploaded, but a base64 image was submitted in req.body
  if (!imageUrl && image && image.startsWith('data:image/')) {
    try {
      const matches = image.match(/^data:image\/([A-Za-z-+0-9]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1];
        const dataBuffer = Buffer.from(matches[2], 'base64');
        const uniqueFilename = `img-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
        const filePath = path.join(UPLOADS_DIR, uniqueFilename);
        
        fs.writeFileSync(filePath, dataBuffer);
        imageUrl = `/server-uploads/${uniqueFilename}`;
      }
    } catch (err) {
      console.error('Error saving base64 image:', err);
    }
  } else if (!imageUrl && image) {
    imageUrl = image;
  }

  try {
    const posterName = req.user?.fullName || 'Student';
    const posterDept = req.user?.department || 'Computer Science & Engineering';
    const posterInitials = req.user?.avatar || 'ST';

    // Verify if poster has verified student ID card approved by admin
    const userRole = (req.user?.role as any) || '';
    const isStaffRole = userRole === 'admin' || userRole === 'moderator' || userRole === 'coordinator' || String(req.user?.email || '').toLowerCase().trim() === 'nazrulretrievers@gmail.com';
    const { store, save } = getFallbackData();
    
    let dbUser: any = null;
    if (isMongoDBActive()) {
      try {
        dbUser = await MUser.findOne({ 
          $or: [
            { id: String(userId) },
            ...(req.user?.studentId ? [{ studentId: String(req.user.studentId).trim() }] : []),
            ...(req.user?.email ? [{ email: String(req.user.email).toLowerCase().trim() }] : [])
          ]
        }).lean();
      } catch (err) {}
    }

    const targetUser = dbUser || store.users?.find(u => 
      String(u.id) === String(userId) || 
      (u.studentId && req.user?.studentId && String(u.studentId).trim() === String(req.user.studentId).trim()) ||
      (u.email && req.user?.email && u.email.toLowerCase().trim() === req.user.email.toLowerCase().trim())
    );

    const isUserVerifiedMember = Boolean(
      req.user?.isVerified === true ||
      req.user?.is_verified === true ||
      (req.user as any)?.idVerificationStatus === 'verified' ||
      (req.user as any)?.verified === true ||
      (targetUser && (
        targetUser.isVerified === true ||
        (targetUser as any).is_verified === true ||
        (targetUser as any).idVerificationStatus === 'verified' ||
        (targetUser as any).verified === true
      ))
    );

    // Dynamic administrative setting from Admin Panel (Default: true)
    const isAutoApproveSettingEnabled = store.system_settings?.autoApprovePosts !== false;

    // Staff are always auto-approved; verified student members are auto-approved if and only if autoApprovePosts is enabled
    const shouldAutoApprove = isStaffRole || (isAutoApproveSettingEnabled && isUserVerifiedMember);

    const existingIds = store.items.map(i => parseInt(String(i.id), 10)).filter(n => !isNaN(n));
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const newId = String(maxId + 1);
    const nowIso = new Date().toISOString();
    const newItem: Item = {
      id: newId,
      emoji: emoji || (type === 'lost' ? '🔍' : '🔑'),
      title,
      location,
      specificSpot,
      date: nowIso,
      type: type as 'lost' | 'found',
      category,
      subcategory: subcategory || 'Other',
      description,
      secretNotes: secretNotes || secret_notes || '',
      status: shouldAutoApprove ? 'active' : 'pending', // Auto-approved directly for Staff & Verified Community Members
      approvalStatus: shouldAutoApprove ? 'approved' : 'pending', // Instant approval when auto-approve rule applies
      views: 1,
      isDeleted: false,
      isResolved: false,
      resolvedAt: undefined,
      verified: isStaffRole ? true : !!isUserVerifiedMember,
      posterName: req.user?.fullName || req.body.posterName || 'Campus Member',
      user: {
        name: req.user?.fullName || req.body.posterName || 'Campus Member',
        phone: req.body.phone || req.user?.phone || 'Contact via message',
        email: req.user?.email || '',
        department: req.user?.department || '',
        studentId: req.user?.studentId || '',
        avatar: req.user?.avatar || '',
        verified: isStaffRole ? true : !!isUserVerifiedMember,
        idVerificationStatus: (req.user as any)?.idVerificationStatus || (isStaffRole ? 'verified' : (isUserVerifiedMember ? 'verified' : 'unverified'))
      },
      rewardOffered: (() => {
        if (type !== 'lost') return '';
        const text = (rewardAmount || (typeof rewardOffered === 'string' ? rewardOffered : '') || '').toString().trim();
        if (!text || text === 'true' || text === 'false' || text === 'null' || text === 'undefined') return '';
        return text;
      })(),
      rewardAmount: (() => {
        if (type !== 'lost') return '';
        const text = (rewardAmount || (typeof rewardOffered === 'string' ? rewardOffered : '') || '').toString().trim();
        if (!text || text === 'true' || text === 'false' || text === 'null' || text === 'undefined') return '';
        return text;
      })(),
      createdAt: nowIso
    };

    (newItem as any).created_at = nowIso;
    // Set audit fields for tracking & soft deletes
    (newItem as any).isApproved = shouldAutoApprove;
    (newItem as any).approval_status = shouldAutoApprove ? 'approved' : 'pending';
    (newItem as any).isRejected = false;
    (newItem as any).isDeleted = false;
    (newItem as any).approvedAt = shouldAutoApprove ? nowIso : undefined;
    (newItem as any).approvedBy = shouldAutoApprove ? (isStaffRole ? (req.user?.fullName || userRole || 'Staff Authority') : 'System (Verified Auto-Approve)') : undefined;
    (newItem as any).firebaseUid = userId || '';
    (newItem as any).userId = userId || '';
    (newItem as any).email = req.user?.email || '';
    (newItem as any).displayName = req.user?.fullName || '';
    (newItem as any).photoURL = req.user?.avatar || '';

    // Support multi-image arrays and coverImage from body
    let parsedImages = [];
    if (req.body.images) {
      try {
        parsedImages = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
      } catch (e) {
        parsedImages = [];
      }
    }

    // Add custom imageUrl and image if present and no parsedImages exist
    if (imageUrl && (!parsedImages || parsedImages.length === 0)) {
      parsedImages = [{
        url: imageUrl,
        storagePath: '',
        order: 1,
        isCover: true,
        width: 800,
        height: 600,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userId || 'anonymous',
        fileSize: 0
      }];
    }

    if (!parsedImages || parsedImages.length === 0) {
      return res.status(400).json({ error: 'At least one image is required.' });
    }

    if (parsedImages.length > 5) {
      return res.status(400).json({ error: 'You can upload a maximum of 5 images.' });
    }

    newItem.images = parsedImages;
    newItem.coverImage = req.body.coverImage || (parsedImages[0] ? parsedImages[0].url : imageUrl || '');
    newItem.image = newItem.coverImage;
    (newItem as any).imageUrl = newItem.coverImage;
    newItem.revision = 1;
    newItem.ownerUid = userId || '';

    if (capturedViaCamera === 'true' || capturedViaCamera === true) {
      newItem.capturedViaCamera = true;
      newItem.capturedImage = capturedImage || imageUrl || newItem.image;
    }

    store.items.unshift(newItem);

    if (isMongoDBActive()) {
      try {
        const mongoItem = { ...newItem };
        delete (mongoItem as any)._id;
        await MItem.create(mongoItem as any);
      } catch (mErr: any) {
        console.warn('⚠️ Direct MItem.create failed:', mErr.message);
      }
    }

    save();

    // Create notifications based on approval outcome
    if (shouldAutoApprove) {
      await createUserNotification({
        userId: userId || '1',
        type: 'item_approved',
        title: isStaffRole ? 'Listing Published Instantly' : 'Listing Auto-Approved & Published',
        message: isStaffRole 
          ? `Your official staff listing "${newItem.title}" has been verified and published live immediately.`
          : `Your verified student profile allowed your ${newItem.type === 'lost' ? 'Lost' : 'Found'} report "${newItem.title}" to be published live immediately on the campus feed!`,
        text: isStaffRole
          ? `Your official staff listing <strong>"${newItem.title}"</strong> has been verified and published live immediately.`
          : `Your verified student profile allowed your ${newItem.type === 'lost' ? 'Lost' : 'Found'} report <strong>"${newItem.title}"</strong> to be published live immediately on the campus feed!`,
        relatedItemId: newItem.id
      });

      await createAdminNotification({
        type: 'item_approved',
        title: isStaffRole ? 'Official Item Published' : 'Verified Member Post Auto-Approved',
        message: isStaffRole
          ? `Staff member ${req.user?.fullName || 'Admin'} published "${newItem.title}".`
          : `Verified member ${req.user?.fullName || 'Student'} posted "${newItem.title}" (Auto-Approved).`,
        relatedItemId: newItem.id
      });
    } else {
      await createUserNotification({
        userId: userId || '1',
        type: 'item_posted',
        title: 'Listing Submitted for Review',
        message: isUserVerifiedMember && !isAutoApproveSettingEnabled
          ? `Your ${newItem.type === 'lost' ? 'Lost' : 'Found'} report "${newItem.title}" was submitted and is in the review queue (Instant auto-approval is currently paused by administrator).`
          : `Your report "${newItem.title}" has been submitted successfully and is currently in the review queue awaiting administrator/moderator approval.`,
        text: isUserVerifiedMember && !isAutoApproveSettingEnabled
          ? `Your ${newItem.type === 'lost' ? 'Lost' : 'Found'} report <strong>"${newItem.title}"</strong> was submitted and is in the review queue (Instant auto-approval is currently paused by administrator).`
          : `Your report <strong>"${newItem.title}"</strong> has been submitted successfully and is currently in the review queue awaiting administrator/moderator approval.`,
        relatedItemId: newItem.id
      });

      await createAdminNotification({
        type: 'pending_item',
        title: 'New Item Awaiting Approval',
        message: `New item "${newItem.title}" posted by ${req.user?.fullName || 'a campus member'} is waiting in the review queue.`,
        relatedItemId: newItem.id
      });
    }

    return res.status(201).json({
      message: shouldAutoApprove 
        ? (isStaffRole ? 'Official campus listing published live.' : 'Listing auto-approved and published live.')
        : 'Item report submitted successfully. Awaiting coordinator review.',
      item: mapItemResponse(newItem),
      autoApproved: shouldAutoApprove
    });
  } catch (err: any) {
    console.error('Error submitting post:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 3.5. EDIT ITEM DETAILS (ALL FIELDS SUPPORTED)
router.put('/:id', authenticateToken, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { emoji, title, location, specificSpot, type, category, subcategory, description, rewardOffered, rewardAmount, image } = req.body;
  const userId = req.user?.id;

  if (!title || !location || !type || !category || !description) {
    return res.status(400).json({ error: 'Missing mandatory fields for post update.' });
  }

  const validationErr = validateItemPost({
    title,
    location,
    category,
    subcategory,
    type,
    description,
    specificSpot
  });

  if (validationErr) {
    return res.status(400).json({ error: validationErr });
  }

  // Get uploaded file url
  let imageUrl = req.file ? `/server-uploads/${req.file.filename}` : null;

  // If no file was uploaded, but a base64 image was submitted in req.body
  if (!imageUrl && image && image.startsWith('data:image/')) {
    try {
      const matches = image.match(/^data:image\/([A-Za-z-+0-9]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1];
        const dataBuffer = Buffer.from(matches[2], 'base64');
        const uniqueFilename = `img-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
        const filePath = path.join(UPLOADS_DIR, uniqueFilename);
        
        fs.writeFileSync(filePath, dataBuffer);
        imageUrl = `/server-uploads/${uniqueFilename}`;
      }
    } catch (err) {
      console.error('Error saving base64 image:', err);
    }
  } else if (!imageUrl && image) {
    imageUrl = image;
  }

  try {
    
      const { store, save } = getFallbackData();
      const item = store.items.find(i => String(i.id) === String(id));
      if (!item) {
        return res.status(404).json({ error: 'Listing not found.' });
      }

      const isOwner = 
        (item.userId && String(item.userId) === String(userId)) || 
        ((item as any).user_id && String((item as any).user_id) === String(userId)) ||
        ((item as any).firebaseUid && String((item as any).firebaseUid) === String(userId)) ||
        ((item as any).ownerUid && String((item as any).ownerUid) === String(userId)) ||
        (item.email && req.user?.email && String(item.email).toLowerCase() === String(req.user.email).toLowerCase()) ||
        (item.postedBy && (item.postedBy as any).email && req.user?.email && (item.postedBy as any).email.toLowerCase() === req.user.email.toLowerCase()) ||
        (item.postedBy && (item.postedBy as any).userId && String((item.postedBy as any).userId) === String(userId));

      if (!isOwner && req.user?.role !== 'admin' && req.user?.role !== 'moderator') {
        return res.status(403).json({ error: 'Access denied. You are not authorized to update this listing.' });
      }

      // Support multi-image arrays and coverImage from body
      let parsedImages = [];
      if (req.body.images) {
        try {
          parsedImages = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
        } catch (e) {
          parsedImages = [];
        }
      }

      // Add custom imageUrl and image if present and no parsedImages exist
      if (imageUrl && (!parsedImages || parsedImages.length === 0)) {
        parsedImages = [{
          url: imageUrl,
          storagePath: '',
          order: 1,
          isCover: true,
          width: 800,
          height: 600,
          uploadedAt: new Date().toISOString(),
          uploadedBy: userId || 'anonymous',
          fileSize: 0
        }];
      } else if ((!parsedImages || parsedImages.length === 0) && item.images && item.images.length > 0) {
        parsedImages = item.images;
      }

      if (!parsedImages || parsedImages.length === 0) {
        return res.status(400).json({ error: 'At least one image is required.' });
      }

      if (parsedImages.length > 5) {
        return res.status(400).json({ error: 'You can upload a maximum of 5 images.' });
      }

      // Direct edit for all items (approved or pending) to make edits instantly visible
      item.title = title;
      item.location = location;
      item.category = category;
      item.subcategory = subcategory || 'Other';
      item.description = description;
      item.emoji = emoji || item.emoji;
      item.specificSpot = specificSpot || '';
      item.type = type as 'lost' | 'found';
      const sanitizedReward = (() => {
        const targetType = type || item.type;
        if (targetType !== 'lost') return '';
        const candidate = (rewardAmount || (typeof rewardOffered === 'string' ? rewardOffered : '') || '').toString().trim();
        if (!candidate || candidate === 'true' || candidate === 'false' || candidate === 'null' || candidate === 'undefined') return '';
        return candidate;
      })();
      item.rewardOffered = sanitizedReward;
      item.rewardAmount = sanitizedReward;
      item.images = parsedImages;
      item.coverImage = req.body.coverImage || (parsedImages[0] ? parsedImages[0].url : imageUrl || item.coverImage || '');
      item.image = item.coverImage;
      (item as any).imageUrl = item.coverImage;

      if (req.body.date) {
        item.date = req.body.date;
      }
      if (req.body.contactPreference) {
        (item as any).contactPreference = req.body.contactPreference;
      }

      // If it was not approved yet, reset status to pending
      const isItemApproved = item.approvalStatus === 'approved' || (item as any).isApproved === true;
      if (!isItemApproved) {
        item.approvalStatus = 'pending';
        item.status = 'pending';
        (item as any).isApproved = false;
        (item as any).isRejected = false;
      }
      (item as any).hasPendingRevision = false;
      
      save();

      return res.json({ 
        message: 'Listing updated successfully!', 
        revisionCreated: false, 
        item: mapItemResponse(item) 
      });
    
  } catch (err: any) {
    console.error('Error updating post details:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 4. UPDATE ITEM STATUS (ACTIVE, CLAIM_REQUESTED, UNDER_VERIFICATION, HANDOVER_PENDING, CLAIMED, RETURNED, REUNITED, CLOSED)
const updateItemStatusHandler = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  let status = req.body?.status;
  if (!status && typeof req.body === 'string') {
    try { status = JSON.parse(req.body)?.status; } catch (_) {}
  }
  const userId = req.user?.id;

  const validStatuses = [
    'active', 
    'claim_requested', 
    'under_verification', 
    'handover_pending', 
    'claimed', 
    'returned', 
    'reunited', 
    'closed', 
    'resolved'
  ];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Please provide a valid item status parameter. Valid statuses: ${validStatuses.join(', ')}` });
  }

  try {
    const { store, save } = getFallbackData();
    const itemInStore = store.items.find(i => String(i.id) === String(id));

    let dbItem: any = null;
    if (isMongoDBActive()) {
      try {
        dbItem = await MItem.findOne({ id: String(id) });
      } catch (err: any) {
        console.warn('Failed to find item in MongoDB for status update:', err?.message);
      }
    }

    if (!itemInStore && !dbItem) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    const refItem = dbItem || itemInStore;

    // Check if current user is owner or admin/mod
    const isOwner = 
      (refItem.userId && String(refItem.userId) === String(userId)) || 
      ((refItem as any).user_id && String((refItem as any).user_id) === String(userId)) ||
      ((refItem as any).firebaseUid && String((refItem as any).firebaseUid) === String(userId)) ||
      ((refItem as any).ownerUid && String((refItem as any).ownerUid) === String(userId)) ||
      (refItem.email && req.user?.email && String(refItem.email).toLowerCase() === String(req.user.email).toLowerCase()) ||
      (refItem.postedBy && (refItem.postedBy as any).email && req.user?.email && (refItem.postedBy as any).email.toLowerCase() === req.user.email.toLowerCase()) ||
      (refItem.postedBy && (refItem.postedBy as any).userId && String((refItem.postedBy as any).userId) === String(userId));

    if (!isOwner && req.user?.role !== 'admin' && req.user?.role !== 'moderator') {
      return res.status(403).json({ error: 'Access denied. You are not authorized to update this listing.' });
    }

    const resolutionMethod = req.body?.resolutionMethod;
    const resolutionNotes = req.body?.resolutionNotes;

    const now = new Date();

    if (itemInStore) {
      itemInStore.status = status as any;
      if (status === 'returned' || status === 'reunited' || status === 'claimed' || status === 'resolved') {
        (itemInStore as any).returnedAt = now.toISOString();
        if (resolutionMethod) (itemInStore as any).resolutionMethod = resolutionMethod;
        if (resolutionNotes) (itemInStore as any).resolutionNotes = resolutionNotes;
        (itemInStore as any).resolvedBy = req.user?.fullName || req.user?.email || 'User';
      }
      save();
    }

    if (isMongoDBActive() && dbItem) {
      try {
        dbItem.status = status;
        if (status === 'returned' || status === 'reunited' || status === 'claimed' || status === 'resolved') {
          (dbItem as any).returnedAt = now;
          if (resolutionMethod) (dbItem as any).resolutionMethod = resolutionMethod;
          if (resolutionNotes) (dbItem as any).resolutionNotes = resolutionNotes;
          (dbItem as any).resolvedBy = req.user?.fullName || req.user?.email || 'User';
        }
        await dbItem.save();
      } catch (mErr: any) {
        console.warn('⚠️ Failed to save status update to MongoDB:', mErr.message);
      }
    }

    return res.json({ message: `Listing status updated to ${status}.`, item: mapItemResponse(itemInStore || dbItem) });
  } catch (err: any) {
    console.error('Error updating status:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
};

router.put('/:id/status', authenticateToken, updateItemStatusHandler);
router.patch('/:id/status', authenticateToken, updateItemStatusHandler);

// 5. POST ITEM CLAIM
router.post('/:id/claims', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  let { proofDescription, contactDetails } = req.body;
  const userId = req.user?.id;

  if (!proofDescription) {
    return res.status(400).json({ error: 'Please explain your claim proof clearly.' });
  }

  // Sanitize fields to prevent XSS/HTML injection
  proofDescription = sanitizeInput(proofDescription);
  if (contactDetails) contactDetails = sanitizeInput(contactDetails);

  const validationErr = validateClaim({ proofDescription, contactDetails: contactDetails || '' });
  if (validationErr) {
    return res.status(400).json({ error: validationErr });
  }

  try {
    let itemTitle = 'Unknown Item';
    let itemOwnerId = '';

    // Always fetch item details first (works for both mongo and memory)
    if (isMongoDBActive()) {
      const dbItem = await MItem.findOne({ id: String(id) });
      if (!dbItem) {
        return res.status(404).json({ error: 'Listing not found.' });
      }
      itemTitle = dbItem.title || 'Unknown Item';
      itemOwnerId = String((dbItem as any).userId || (dbItem as any).user_id || '');
      
      // Update item status to under_verification if active
      if (dbItem.status === 'active') {
        dbItem.status = 'under_verification';
        (dbItem as any).claimCount = ((dbItem as any).claimCount || 0) + 1;
        await dbItem.save();
      }
    } else {
      const { store } = getFallbackData();
      const item = store.items.find(i => String(i.id) === String(id));
      if (!item) {
        return res.status(404).json({ error: 'Listing not found.' });
      }
      itemTitle = item.title || 'Unknown Item';
      itemOwnerId = String(item.userId || (item as any).user_id || '');

      // Update item status to under_verification if active
      if (item.status === 'active') {
        item.status = 'under_verification';
        (item as any).claimCount = ((item as any).claimCount || 0) + 1;
      }
    }

    if (itemOwnerId && userId && String(itemOwnerId) === String(userId)) {
      return res.status(400).json({ error: 'You cannot submit a claim or match verification on your own post.' });
    }

    console.log(`Claim submitted for item "${itemTitle}" by user ID ${userId}`);

    const claimId = `CLM-${Date.now()}`;
    const claimData = {
      claim_id: claimId,
      id: claimId,
      item_id: id,
      user_id: userId,
      proof_description: proofDescription,
      contact_details: contactDetails || '',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 1. Memory Store Update (Always sync to memory store for absolute backward compatibility)
    const { store, save } = getFallbackData();
    if (!store.claims) {
      store.claims = [];
    }
    store.claims.push(claimData);

    // Save User Notification to both memory store and MongoDB
    if (itemOwnerId) {
      await createUserNotification({
        userId: itemOwnerId,
        title: 'New Claim Request',
        message: `New claim request submitted for your item "${itemTitle}". Click Chat to verify ownership.`,
        text: `New claim request submitted for your item <strong>"${itemTitle}"</strong>. Click Chat to verify ownership.`,
        type: 'claim'
      });
    }

    // 2. MongoDB Specific Saving
    if (isMongoDBActive()) {
      // Save Claim
      await MClaim.create({
        claim_id: claimId,
        id: claimId,
        item_id: id,
        user_id: userId,
        proof_description: proofDescription,
        contact_details: contactDetails || '',
        status: 'pending'
      } as any);
    }

    // 3. Admin Notification
    await createAdminNotification({
      title: `🔑 New Claim Submitted: ${itemTitle}`,
      message: `A new claim request was submitted for item "${itemTitle}" (ID: ${id}) by user ID ${userId}.`,
      type: 'claim_submitted',
      category: 'Claims',
      priority: 'medium',
      relatedUserId: userId,
      relatedItemId: id
    });

    save();

    return res.status(201).json({ message: 'Claim submitted successfully!' });
  } catch (err: any) {
    console.error('Error processing claim:', err);
    return res.status(500).json({ error: 'Internal server error processing claim: ' + err.message });
  }
});

// 6. DELETE ITEM LISTING (SOFT DELETE)
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role || 'student';
  const deletedBy = req.user?.fullName || req.user?.email || 'user';
  const deletedAt = new Date();

  try {
    const { store, save } = getFallbackData();
    let item = store.items.find(i => String(i.id) === String(id));

    let dbItem: any = null;
    if (isMongoDBActive()) {
      try {
        const queryConds: any[] = [{ id: String(id) }];
        if (mongoose.Types.ObjectId.isValid(String(id))) {
          queryConds.push({ _id: String(id) });
        }
        dbItem = await MItem.findOne({ $or: queryConds });
      } catch (dbErr: any) {
        console.warn('⚠️ Error finding item in MongoDB for deletion:', dbErr.message);
      }
    }

    if (!item && !dbItem) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    const refItem = item || dbItem;

    const isOwner = 
      (refItem.userId && String(refItem.userId) === String(userId)) || 
      ((refItem as any).user_id && String((refItem as any).user_id) === String(userId)) ||
      ((refItem as any).firebaseUid && String((refItem as any).firebaseUid) === String(userId)) ||
      ((refItem as any).ownerUid && String((refItem as any).ownerUid) === String(userId)) ||
      (refItem.email && req.user?.email && String(refItem.email).toLowerCase() === String(req.user.email).toLowerCase()) ||
      (refItem.postedBy && (refItem.postedBy as any).email && req.user?.email && (refItem.postedBy as any).email.toLowerCase() === req.user.email.toLowerCase()) ||
      (refItem.postedBy && (refItem.postedBy as any).userId && String((refItem.postedBy as any).userId) === String(userId));

    if (!isOwner && userRole !== 'admin' && userRole !== 'moderator') {
      return res.status(403).json({ error: 'Access denied. Unauthorized deletion request.' });
    }

    if (item) {
      item.status = 'deleted';
      (item as any).isDeleted = true;
      (item as any).deletedBy = deletedBy;
      (item as any).deletedAt = deletedAt;
    }

    // Update in MongoDB if active
    if (isMongoDBActive()) {
      try {
        const queryConds: any[] = [{ id: String(id) }];
        if (mongoose.Types.ObjectId.isValid(String(id))) {
          queryConds.push({ _id: String(id) });
        }
        await MItem.updateMany(
          { $or: queryConds },
          { 
            $set: { 
              status: 'deleted', 
              isDeleted: true, 
              deletedBy: deletedBy, 
              deletedAt: deletedAt 
            } 
          }
        );
        // Also cancel any pending claims associated with this deleted post
        await MClaim.updateMany(
          { $or: [{ itemId: String(id) }, { item_id: String(id) }], status: 'pending' },
          { $set: { status: 'cancelled' } }
        );
      } catch (mErr: any) {
        console.warn('⚠️ Failed to update MItem delete status in MongoDB:', mErr.message);
      }
    }

    // Add direct user notification if deleted by admin/moderator
    const postOwnerName = refItem.postedBy?.name || refItem.name || '';
    const postOwnerUid = refItem.userId || (refItem as any).user_id || (refItem as any).firebaseUid || (refItem as any).ownerUid;
    if (postOwnerName !== req.user?.fullName && (userRole === 'admin' || userRole === 'moderator')) {
      await createUserNotification({
        userId: postOwnerUid,
        title: 'Listing Removed',
        message: `Your listing "${refItem.title}" has been removed/moderated by the administration coordinators.`,
        text: `Your listing <strong>"${refItem.title}"</strong> has been removed/moderated by the administration coordinators.`,
        type: 'listing_removed'
      });
    }

    save();
    return res.json({ 
      message: 'Listing deleted successfully!', 
      item: mapItemResponse(item || dbItem) 
    });
  } catch (err: any) {
    console.error('Error deleting listing:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// --- HELPER TO SYNC LATEST VIEWS FROM MONGODB IF ACTIVE ---
const syncLatestViews = async (items: any[]) => {
  if (isMongoDBActive()) {
    try {
      const ids = items.map(i => String(i.id));
      const dbItems = await MItem.find({ id: { $in: ids } }).select('id views').lean();
      const viewsMap = new Map(dbItems.map(i => [String(i.id), i.views || 0]));
      for (const i of items) {
        if (viewsMap.has(String(i.id))) {
          i.views = viewsMap.get(String(i.id)) || 0;
        }
      }
    } catch (err) {
      console.error('Failed to sync latest views from MongoDB:', err);
    }
  }
};

// --- HELPER TO UNIFY AND NORMALIZE ITEM RESPONSES ---
const mapItemResponse = (r: any, defaultType: string = 'lost') => {
  const createdTime = r.createdAt || r.created_at || (r.date && r.date !== 'Just now' ? r.date : null) || r.date_posted || new Date().toISOString();
  const dateVal = (r.date && r.date !== 'Just now') ? r.date : (r.date_posted || createdTime);

  return {
    id: String(r.item_id || r.id),
    emoji: r.emoji || (r.item_type || defaultType === 'lost' ? '🎒' : '🔑'),
    title: r.title,
    location: r.location,
    specificSpot: r.specific_spot || r.specificSpot,
    date: dateVal,
    createdAt: createdTime,
    approvedAt: r.approvedAt || r.approved_at || null,
    approvedBy: r.approvedBy || r.approved_by || null,
    rejectedAt: r.rejectedAt || r.rejected_at || null,
    rejectedBy: r.rejectedBy || r.rejected_by || null,
    type: r.item_type || r.type || defaultType,
    category: r.category,
    subcategory: r.subcategory || 'Other',
    description: r.description,
    status: r.status || ((r.approvalStatus === 'approved' || r.approval_status === 'approved' || r.isApproved === true) ? 'active' : 'pending'),
    approvalStatus: (() => {
      if (r.approvalStatus === 'rejected' || r.approval_status === 'rejected' || r.status === 'rejected' || r.isRejected === true) {
        return 'rejected';
      }
      if (
        r.approvalStatus === 'approved' ||
        r.approval_status === 'approved' ||
        r.isApproved === true ||
        r.status === 'active' ||
        r.status === 'returned' ||
        r.status === 'reunited' ||
        r.status === 'claimed' ||
        r.status === 'handover_pending' ||
        r.status === 'under_verification' ||
        r.status === 'claim_requested'
      ) {
        return 'approved';
      }
      return r.approvalStatus || r.approval_status || 'pending';
    })(),
    isApproved: (() => {
      if (r.approvalStatus === 'rejected' || r.approval_status === 'rejected' || r.status === 'rejected' || r.isRejected === true) {
        return false;
      }
      return (
        r.isApproved === 1 ||
        r.isApproved === true ||
        r.approvalStatus === 'approved' ||
        r.approval_status === 'approved' ||
        r.status === 'active' ||
        r.status === 'returned' ||
        r.status === 'reunited' ||
        r.status === 'claimed'
      );
    })(),
    isRejected: r.isRejected === 1 || r.isRejected === true || r.approvalStatus === 'rejected' || r.status === 'rejected' || false,
    isDeleted: r.isDeleted === 1 || r.isDeleted === true || false,
    firebaseUid: r.firebaseUid || '',
    userId: r.user_id || r.userId || '',
    email: r.email || '',
    displayName: r.displayName || '',
    photoURL: r.photoURL || '',
    views: r.views || 0,
    postedBy: (() => {
      const { store } = getFallbackData();
      const pUserId = String(r.userId || r.user_id || (r.postedBy && (r.postedBy as any).userId) || '');
      const pEmail = String(r.email || (r.postedBy && (r.postedBy as any).email) || '').toLowerCase().trim();
      const pUser = (store.users || []).find((u: any) => 
        (pUserId && String(u.id || u.user_id || u._id) === pUserId) ||
        (pEmail && u.email && String(u.email).toLowerCase().trim() === pEmail)
      );

      const isStaffPoster = pUser 
        ? (pUser.role === 'admin' || pUser.role === 'moderator' || pUser.role === 'coordinator')
        : (r.postedBy?.role === 'admin' || r.postedBy?.role === 'moderator' || r.role === 'admin' || r.role === 'moderator');

      const isVerifiedStudent = pUser 
        ? (!isStaffPoster && pUser.idVerificationStatus === 'verified')
        : (!isStaffPoster && (r.postedBy?.verified === true || r.postedBy?.verified === 1) && (r.postedBy?.idVerificationStatus === 'verified' || (r as any).idVerificationStatus === 'verified'));

      if (r.postedBy) {
        return {
          name: r.postedBy.name || (pUser ? pUser.fullName : 'Anonymous Student'),
          department: r.postedBy.department || (pUser ? pUser.department : 'General'),
          verified: !!isVerifiedStudent,
          initials: r.postedBy.avatar || r.postedBy.profilePhoto || r.postedBy.profile_photo || r.postedBy.initials || (pUser ? pUser.avatar : 'U'),
          role: pUser ? pUser.role : (r.postedBy.role || 'student'),
          email: pEmail || (pUser ? pUser.email : ''),
          userId: pUserId || (pUser ? pUser.id : '')
        };
      } else {
        return {
          name: r.full_name || (pUser ? pUser.fullName : 'Anonymous Student'),
          department: r.department || (pUser ? pUser.department : 'General'),
          verified: !!isVerifiedStudent,
          initials: r.avatar || r.profilePhoto || r.profile_photo || (pUser ? pUser.avatar : (r.full_name || 'Anonymous Student').split(' ').map((n: string) => n[0]).join('').toUpperCase()),
          role: pUser ? pUser.role : (r.role || 'student'),
          email: pEmail || (pUser ? pUser.email : ''),
          userId: pUserId || (pUser ? pUser.id : '')
        };
      }
    })(),
    rewardOffered: (() => {
      if (r.type !== 'lost') return '';
      const amt = (r.rewardAmount || r.reward_amount || (typeof r.rewardOffered === 'string' ? r.rewardOffered : (typeof r.reward_offered === 'string' ? r.reward_offered : '')) || '').toString().trim();
      if (!amt || amt === 'true' || amt === 'false' || amt === '1' || amt === '0' || amt === 'null' || amt === 'undefined') return '';
      return amt;
    })(),
    rewardAmount: (() => {
      if (r.type !== 'lost') return '';
      const amt = (r.rewardAmount || r.reward_amount || (typeof r.rewardOffered === 'string' ? r.rewardOffered : (typeof r.reward_offered === 'string' ? r.reward_offered : '')) || '').toString().trim();
      if (!amt || amt === 'true' || amt === 'false' || amt === '1' || amt === '0' || amt === 'null' || amt === 'undefined') return '';
      return amt;
    })(),
    imageUrl: r.image_url || r.imageUrl || r.image || null,
    image: r.image_url || r.imageUrl || r.image || null,
    images: r.images ? (typeof r.images === 'string' ? JSON.parse(r.images) : r.images) : []
  };
};

// 7. GET PENDING ITEMS
router.get('/pending', async (req: any, res: Response) => {
  try {
      const { store } = getFallbackData();
      const filtered = store.items.filter(i => 
        !i.isDeleted && 
        i.status !== 'deleted' && 
        (i.approvalStatus === 'pending' || i.status === 'pending' || (i as any).approval_status === 'pending')
      );
      await syncLatestViews(filtered);
      return res.json({ items: filtered.map(item => mapItemResponse(item)) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. GET APPROVED ITEMS
router.get('/approved', async (req: any, res: Response) => {
  try {
    
      const { store } = getFallbackData();
      const filtered = store.items.filter(i => (i.approvalStatus === 'approved' || i.status === 'approved') && !i.isDeleted);
      await syncLatestViews(filtered);
      return res.json({ items: filtered.map(item => mapItemResponse(item)) });
    
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 9. GET REJECTED ITEMS
router.get('/rejected', authenticateToken, authorizeModOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    
      const { store } = getFallbackData();
      const filtered = store.items.filter(i => (i.approvalStatus === 'rejected' || i.status === 'rejected') && !i.isDeleted);
      await syncLatestViews(filtered);
      return res.json({ items: filtered.map(item => mapItemResponse(item)) });
    
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 10. PATCH APPROVE ITEM
router.patch('/:id/approve', authenticateToken, authorizeModOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const approvedBy = req.user?.fullName || req.user?.email || 'admin';
    const approvedAt = new Date();

    const { store, save } = getFallbackData();
    let item = store.items.find(i => String(i.id) === String(id) || String((i as any)._id) === String(id) || String((i as any).item_id) === String(id));

    if (!item && isMongoDBActive()) {
      try {
        const isObjectId = typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
        const mongoItem = await MItem.findOne(isObjectId ? { $or: [{ id: String(id) }, { _id: id }] } : { id: String(id) }).lean();
        if (mongoItem) {
          item = { ...(mongoItem as any), id: String((mongoItem as any).id || (mongoItem as any)._id) };
          store.items.unshift(item);
        }
      } catch (err: any) {
        console.warn('MongoDB item lookup error during patch approve:', err.message);
      }
    }

    if (!item) return res.status(404).json({ error: 'Listing not found.' });

    item.approvalStatus = 'approved';
    (item as any).approval_status = 'approved';
    item.status = 'active';
    (item as any).isApproved = true;
    (item as any).isRejected = false;
    (item as any).approvedBy = approvedBy;
    (item as any).approvedAt = approvedAt;
    save();

    if (isMongoDBActive()) {
      try {
        const isObjectId = typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
        const filter = isObjectId ? { $or: [{ id: String(id) }, { _id: id }] } : { id: String(id) };
        await MItem.updateOne(
          filter,
          { 
            $set: { 
              approvalStatus: 'approved', 
              status: 'active', 
              isApproved: true, 
              isRejected: false, 
              approvedBy, 
              approvedAt 
            } 
          }
        );
      } catch (mErr: any) {
        console.warn('⚠️ Failed to update MItem approve status in MongoDB:', mErr.message);
      }
    }

    return res.json({ message: 'Listing approved successfully!', item: mapItemResponse(item) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 11. PATCH REJECT ITEM
router.patch('/:id/reject', authenticateToken, authorizeModOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  try {
    const rejectedBy = req.user?.fullName || req.user?.email || 'admin';
    const rejectedAt = new Date();

    const { store, save } = getFallbackData();
    const item = store.items.find(i => String(i.id) === String(id));
    if (!item) return res.status(404).json({ error: 'Listing not found.' });

    item.approvalStatus = 'rejected';
    (item as any).approval_status = 'rejected';
    item.status = 'rejected';
    (item as any).isRejected = true;
    (item as any).isApproved = false;
    (item as any).rejectedBy = rejectedBy;
    (item as any).rejectedAt = rejectedAt;
    (item as any).rejectionReason = reason || 'Violation of campus community guidelines or incomplete details.';
    save();

    if (isMongoDBActive()) {
      try {
        await MItem.updateOne(
          { id: String(id) },
          { 
            $set: { 
              approvalStatus: 'rejected', 
              status: 'rejected', 
              isRejected: true, 
              isApproved: false, 
              rejectedBy, 
              rejectedAt,
              rejectionReason: reason || 'Violation of campus community guidelines or incomplete details.'
            } 
          }
        );
      } catch (mErr: any) {
        console.warn('⚠️ Failed to update MItem reject status in MongoDB:', mErr.message);
      }
    }

    return res.json({ message: 'Listing rejected successfully!', item: mapItemResponse(item) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 12. PATCH DELETE ITEM (SOFT DELETE)
router.patch('/:id/delete', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  try {
    const deletedBy = req.user?.fullName || req.user?.email || 'user';
    const deletedAt = new Date();

    
      const { store, save } = getFallbackData();
      const item = store.items.find(i => String(i.id) === String(id));
      if (!item) return res.status(404).json({ error: 'Listing not found.' });

      const isOwner = 
        (item.userId && String(item.userId) === String(userId)) || 
        ((item as any).user_id && String((item as any).user_id) === String(userId)) ||
        ((item as any).firebaseUid && String((item as any).firebaseUid) === String(userId)) ||
        ((item as any).ownerUid && String((item as any).ownerUid) === String(userId)) ||
        (item.email && req.user?.email && String(item.email).toLowerCase() === String(req.user.email).toLowerCase()) ||
        (item.postedBy && (item.postedBy as any).email && req.user?.email && (item.postedBy as any).email.toLowerCase() === req.user.email.toLowerCase()) ||
        (item.postedBy && (item.postedBy as any).userId && String((item.postedBy as any).userId) === String(userId));

      if (!isOwner && req.user?.role !== 'admin' && req.user?.role !== 'moderator') {
        return res.status(403).json({ error: 'Access denied. You are not authorized to delete this listing.' });
      }

      item.status = 'deleted';
      (item as any).isDeleted = true;
      (item as any).deletedBy = deletedBy;
      (item as any).deletedAt = deletedAt;
      save();
      return res.json({ message: 'Listing soft deleted successfully!', item: mapItemResponse(item) });
    
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 13. GET MY ITEMS
router.get('/my-items', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  try {
    
      const { store } = getFallbackData();
      const filtered = store.items.filter(i => {
        if (i.isDeleted) return false;
        const matchesUid = String(i.userId || (i as any).firebaseUid || (i as any).ownerUid || '') === String(userId);
        const matchesPostedByUid = i.postedBy && (i.postedBy as any).userId && String((i.postedBy as any).userId) === String(userId);
        const matchesEmail = i.email && req.user?.email && String(i.email).toLowerCase() === String(req.user.email).toLowerCase();
        const matchesPostedByEmail = i.postedBy && (i.postedBy as any).email && req.user?.email && String((i.postedBy as any).email).toLowerCase() === String(req.user.email).toLowerCase();
        return matchesUid || matchesPostedByUid || matchesEmail || matchesPostedByEmail;
      });
      await syncLatestViews(filtered);
      return res.json({ items: filtered.map(item => mapItemResponse(item)) });
    
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 14. GET ADMIN ITEMS (ALL ITEMS LIST FOR ADMIN / MODERATION)
router.get('/admin/items', authenticateToken, authorizeModOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.query;
  try {
    
      const { store } = getFallbackData();
      let filtered = [...store.items];
      if (status) {
        filtered = filtered.filter(i => i.status === status || i.approvalStatus === status);
      }
      await syncLatestViews(filtered);
      return res.json({ items: filtered.map(item => mapItemResponse(item)) });
    
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
