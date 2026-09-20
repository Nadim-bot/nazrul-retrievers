import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { getFallbackData, performCascadeDeleteUser, createAdminNotification } from '../db';
import { isMongoDBActive, MUser, MItem, MOtp, MClaim } from '../db/mongodb';
import mongoose from 'mongoose';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { sendVerificationEmail, sendPasswordResetEmail, sendSupportContactEmail } from '../utils/email';
import { firebaseRegisterUser, firebaseLoginUser, isFirebaseActive, getFirebaseAuth, firebaseUpdateUserPassword, firebaseCheckUserVerificationStatus, firebaseUpdateUserPasswordAdmin, getFirebaseAdminAuth } from '../utils/firebase';
import { syncAndEvaluateUser, isValidFacultyDepartment, inferFacultyFromDepartment } from '../utils/profile';
import { 
  validateName, 
  validateEmail, 
  validatePassword, 
  validatePhone, 
  validateSession, 
  validateRegistrationNumber, 
  validateFacultyAndDepartment, 
  validateSupportContact,
  sanitizeInput 
} from '../../src/utils/validation';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'NazrulRetrievers_JKKNIU_2026_jwt_secret_@#%';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'NazrulRetrievers_JKKNIU_2026_refresh_secret_@#%';

/**
 * Fetch all users across MongoDB and fallback JSON storage seamlessly
 */
export async function getAllUsersList(): Promise<any[]> {
  const { store } = getFallbackData();
  const filterRealUsers = (list: any[]) => {
    return list.filter((u: any) => {
      if (!u) return false;
      const id = String(u.id || u.user_id || u._id || '');
      const email = String(u.email || '').trim().toLowerCase();
      const name = String(u.fullName || u.full_name || u.name || '').trim().toLowerCase();
      if (id.startsWith('sim-')) return false;
      if (email.startsWith('student_') && email.endsWith('@jkkniu.edu.bd')) return false;
      if (name === 'test student' || name === 'verified student') return false;
      if (!email) return false;
      return true;
    });
  };

  const localUsers = filterRealUsers(
    (store.users || []).map((u: any) => ({ ...u, id: String(u.id || u.user_id || u._id || '') }))
  );

  if (isMongoDBActive()) {
    try {
      const mongoUsers = await MUser.find({}).maxTimeMS(3000).lean();
      const mappedMongo = filterRealUsers(
        mongoUsers.map((u: any) => ({ ...u, id: String(u.id || u._id || '') }))
      );

      // Merge MongoDB users with localStore users so no user is ever lost or desynchronized
      const userMap = new Map<string, any>();
      for (const u of localUsers) {
        const key = (u.email ? u.email.trim().toLowerCase() : '') || String(u.id || '');
        if (key) userMap.set(key, u);
      }
      for (const u of mappedMongo) {
        const key = (u.email ? u.email.trim().toLowerCase() : '') || String(u.id || '');
        if (key) {
          const existing = userMap.get(key) || {};
          const merged = { ...existing, ...u };

          // Preserve the original/earliest creation timestamp
          const existingCreatedAt = existing.createdAt || existing.created_at;
          const uCreatedAt = u.createdAt || u.created_at;
          if (existingCreatedAt && uCreatedAt) {
            const t1 = new Date(existingCreatedAt).getTime();
            const t2 = new Date(uCreatedAt).getTime();
            merged.createdAt = (!isNaN(t1) && !isNaN(t2)) ? (t1 < t2 ? existingCreatedAt : uCreatedAt) : (existingCreatedAt || uCreatedAt);
          } else {
            merged.createdAt = existingCreatedAt || uCreatedAt;
          }
          merged.created_at = merged.createdAt;

          // If either record is verified, strictly preserve the verified status!
          if (existing.idVerificationStatus === 'verified' || u.idVerificationStatus === 'verified' || existing.isVerified || u.isVerified || existing.is_verified || u.is_verified) {
            merged.idVerificationStatus = 'verified';
            merged.isVerified = true;
            merged.is_verified = true;
            merged.verified = true;
          } else if (existing.idVerificationStatus === 'pending' || u.idVerificationStatus === 'pending' || (existing.verificationDocument && String(existing.verificationDocument).trim().length > 0) || (u.verificationDocument && String(u.verificationDocument).trim().length > 0)) {
            merged.idVerificationStatus = (existing.idVerificationStatus === 'rejected' || u.idVerificationStatus === 'rejected') ? 'rejected' : 'pending';
            merged.isVerified = false;
            merged.is_verified = false;
            merged.verified = false;
          } else {
            merged.idVerificationStatus = 'unverified';
            merged.isVerified = false;
            merged.is_verified = false;
            merged.verified = false;
          }
          if (existing.verificationDocument && !merged.verificationDocument) {
            merged.verificationDocument = existing.verificationDocument;
          }
          if (existing.idVerificationRemarks && !merged.idVerificationRemarks) {
            merged.idVerificationRemarks = existing.idVerificationRemarks;
          }
          if (existing.idVerificationSubmittedAt && !merged.idVerificationSubmittedAt) {
            merged.idVerificationSubmittedAt = existing.idVerificationSubmittedAt;
          }
          if (existing.verifiedAt && !merged.verifiedAt) {
            merged.verifiedAt = existing.verifiedAt;
          }

          // Ensure non-empty profile values are preserved so nothing gets wiped by empty strings
          const fieldsToPreserve = [
            'fullName', 'studentId', 'registrationNumber', 'rollNumber', 'classRoll',
            'academicSession', 'sessionYear', 'faculty', 'department', 'phone',
            'gender', 'dateOfBirth', 'bloodGroup', 'address', 'emergencyContact',
            'emergencyContactName', 'residentialHall', 'facebook', 'linkedin',
            'socialLink', 'bio', 'avatar', 'profilePhoto', 'profileImage'
          ];
          for (const f of fieldsToPreserve) {
            if ((merged[f] === undefined || merged[f] === null || merged[f] === '') && existing[f]) {
              merged[f] = existing[f];
            }
          }

          const mongoRoll = (u.classRoll && String(u.classRoll).trim()) || (u.rollNumber && String(u.rollNumber).trim()) || (u.roll && String(u.roll).trim()) || (u.class_roll && String(u.class_roll).trim()) || '';
          if (mongoRoll) {
            merged.classRoll = mongoRoll;
            merged.rollNumber = mongoRoll;
            merged.roll = mongoRoll;
            merged.class_roll = mongoRoll;
          }

          userMap.set(key, merged);
        }
      }

      return Array.from(userMap.values());
    } catch (err) {
      console.warn('MongoDB error in getAllUsersList, falling back to local storage:', err);
    }
  }

  return localUsers;
}

/**
 * Save or update a user securely, applying full validation, profile completion, 
 * and verification qualification calculations.
 */
export async function saveOrUpdateUser(user: any): Promise<any> {
  const allUsers = await getAllUsersList();
  const evaluated = syncAndEvaluateUser(user, allUsers);

  const normalizedEmail = evaluated.email ? evaluated.email.trim().toLowerCase() : '';
  const existingByEmail = allUsers.find((u: any) => 
    u.email && u.email.trim().toLowerCase() === normalizedEmail
  );

  const effectiveId = String(evaluated.id || (existingByEmail && existingByEmail.id) || `user-${Date.now()}`);
  evaluated.id = effectiveId;

  // Sync to MongoDB if active
  if (isMongoDBActive()) {
    try {
      const { _id, __v, ...updateData } = evaluated;
      updateData.id = effectiveId;
      updateData.user_id = effectiveId;
      if (normalizedEmail) {
        updateData.email = normalizedEmail;
      }

      const conditions: any[] = [{ id: effectiveId }];
      if (effectiveId && /^[0-9a-fA-F]{24}$/.test(effectiveId)) {
        conditions.push({ _id: effectiveId });
      }
      if (normalizedEmail) {
        conditions.push({ email: normalizedEmail });
      }

      await MUser.findOneAndUpdate(
        { $or: conditions },
        { $set: updateData },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (mongoErr: any) {
      console.warn('MongoDB sync notice in saveOrUpdateUser:', mongoErr.message);
      try {
        const { _id, __v, ...updateData } = evaluated;
        if (normalizedEmail) {
          await MUser.updateOne(
            { email: normalizedEmail },
            { $set: updateData },
            { upsert: true }
          );
        }
      } catch (retryErr: any) {
        console.warn('MongoDB retry notice:', retryErr.message);
      }
    }
  }

  // Sync to fallback local store
  const { store, save } = getFallbackData();
  if (!store.users) store.users = [];
  
  let foundMatch = false;
  store.users = store.users.map((u: any) => {
    const isMatch = (
      (u.id && String(u.id) === String(effectiveId)) ||
      (u.user_id && String(u.user_id) === String(effectiveId)) ||
      (u._id && String(u._id) === String(effectiveId)) ||
      (u.firebaseUid && String(u.firebaseUid) === String(effectiveId)) ||
      (u.email && normalizedEmail && u.email.trim().toLowerCase() === normalizedEmail)
    );
    if (isMatch) {
      foundMatch = true;
      return { ...u, ...evaluated, id: effectiveId };
    }
    return u;
  });

  if (!foundMatch) {
    store.users.push(evaluated);
  }
  save();

  // Async update items posted by user to keep their badge/names in sync
  try {
    if (isMongoDBActive()) {
      await MItem.updateMany(
        { 
          $or: [
            { userId: evaluated.id },
            { user_id: evaluated.id },
            { firebaseUid: evaluated.id },
            { ownerUid: evaluated.id },
            { 'postedBy.userId': evaluated.id },
            ...(normalizedEmail ? [{ email: normalizedEmail }, { 'postedBy.email': normalizedEmail }] : [])
          ]
        },
        {
          $set: {
            displayName: evaluated.fullName,
            photoURL: evaluated.profilePhoto,
            'postedBy.name': evaluated.fullName,
            'postedBy.department': evaluated.department || 'N/A',
            'postedBy.avatar': evaluated.profilePhoto,
            'postedBy.verified': evaluated.isVerified,
            'postedBy.initials': evaluated.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 3)
          }
        }
      );
    }
    if (store.items) {
      store.items = store.items.map((item: any) => {
        const isUserItem = 
          (item.userId && String(item.userId) === String(evaluated.id)) ||
          ((item as any).user_id && String((item as any).user_id) === String(evaluated.id)) ||
          (item.email && evaluated.email && String(item.email).toLowerCase() === String(evaluated.email).toLowerCase()) ||
          (item.postedBy && item.postedBy.userId && String(item.postedBy.userId) === String(evaluated.id));

        if (isUserItem) {
          return {
            ...item,
            userId: evaluated.id,
            displayName: evaluated.fullName,
            photoURL: evaluated.profilePhoto,
            postedBy: {
              ...item.postedBy,
              name: evaluated.fullName,
              department: evaluated.department || 'N/A',
              avatar: evaluated.profilePhoto,
              verified: evaluated.isVerified,
              initials: evaluated.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 3),
              email: evaluated.email,
              userId: evaluated.id
            }
          };
        }
        return item;
      });
      save();
    }
  } catch (syncErr) {
    console.warn('Error propagating user update to items listing:', syncErr);
  }
  return evaluated;
}

// Helper: Generate Access and Refresh Token Pair
function generateTokenPair(user: any) {
  const payload = {
    id: String(user.id),
    fullName: user.fullName || user.full_name || '',
    email: user.email || '',
    role: user.role || 'student',
    studentId: user.studentId || user.student_id || user.registrationNumber || '',
    registrationNumber: user.registrationNumber || user.studentId || user.student_id || '',
    classRoll: user.classRoll || user.rollNumber || user.roll || user.class_roll || '',
    rollNumber: user.rollNumber || user.classRoll || user.roll || user.class_roll || '',
    roll: user.roll || user.classRoll || user.rollNumber || user.class_roll || '',
    phone: user.phone || user.phoneNumber || user.phone_number || '',
    department: user.department || '',
    faculty: user.faculty || '',
    faculty_id: user.faculty_id || '',
    department_id: user.department_id || '',
    academicSession: user.academicSession || user.session_year || user.sessionYear || '',
    sessionYear: user.academicSession || user.session_year || user.sessionYear || '',
    avatar: user.avatar || user.profilePhoto || user.profile_photo || user.profileImage || '',
    profilePhoto: user.profilePhoto || user.avatar || user.profile_photo || user.profileImage || '',
    isVerified: !!(user.isVerified || user.is_verified),
    profileCompletion: Number(user.profileCompletion || 0),
    emailVerified: !!(user.emailVerified || user.email_verified)
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
  const refreshToken = jwt.sign({ id: String(user.id) }, REFRESH_SECRET, { expiresIn: '90d' });

  return { accessToken, refreshToken, payload };
}

// --------------------------------------------------------------------
// REST ENDPOINTS
// --------------------------------------------------------------------

// Helper: Determine if an account is genuinely registered (excluding incomplete/pending/unverified attempts)
function isAccountRegistered(user: any): boolean {
  if (!user) return false;
  if (user.fullName === 'Verified Student') return false;
  if (user.role === 'admin' || user.role === 'moderator') return true;
  const isPending = String(user.status || '').toLowerCase() === 'pending' || String(user.accountStatus || '').toLowerCase() === 'pending';
  if (isPending) return false;
  return user.emailVerified === true || user.email_verified === true || user.registrationCompleted === true;
}

// 1. REGISTER USER
router.post('/register', async (req: any, res: Response) => {
  const { 
    fullName, 
    email, 
    password, 
    agreeTerms, 
    registrationNumber, 
    academicSession, 
    phoneNumber, 
    department,
    faculty,
    faculty_id,
    department_id
  } = req.body;

  if (!fullName || !email || !password || !registrationNumber || !academicSession || !phoneNumber) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  let finalFaculty = faculty || '';
  let finalDepartment = department || '';
  let finalFacultyId = faculty_id || '';
  let finalDepartmentId = department_id || '';

  if (faculty_id && department_id) {
    const { store } = getFallbackData();
    const matchedFaculty = (store.faculties || []).find((f: any) => f.id === faculty_id);
    const matchedDept = (store.departments || []).find((d: any) => d.id === department_id && d.faculty_id === faculty_id);
    
    if (!matchedFaculty) {
      return res.status(400).json({ error: 'Selected Faculty is invalid.' });
    }
    if (!matchedDept) {
      return res.status(400).json({ error: 'Selected Department is invalid for the chosen Faculty.' });
    }
    
    finalFaculty = matchedFaculty.faculty_name;
    finalDepartment = matchedDept.department_name;
  } else {
    if (!department) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }
    finalDepartment = department;

    const { store } = getFallbackData();
    const matchedDept = (store.departments || []).find((d: any) => 
      d.department_name.toLowerCase() === finalDepartment.toLowerCase() ||
      d.id.toLowerCase() === finalDepartment.toLowerCase()
    );
    if (matchedDept) {
      finalFacultyId = matchedDept.faculty_id;
      finalDepartmentId = matchedDept.id;
      const matchedFaculty = (store.faculties || []).find((f: any) => f.id === finalFacultyId);
      if (matchedFaculty) {
        finalFaculty = matchedFaculty.faculty_name;
      }
    }
  }

  if (!agreeTerms) {
    return res.status(400).json({ error: 'You must accept the Terms of Service to register.' });
  }

  const sanitizedName = sanitizeInput(fullName);
  const nameError = validateName(sanitizedName);
  if (nameError) {
    return res.status(400).json({ error: nameError });
  }

  const sanitizedEmail = sanitizeInput(email);
  const emailError = validateEmail(sanitizedEmail);
  if (emailError) {
    return res.status(400).json({ error: emailError });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const phoneError = validatePhone(phoneNumber);
  if (phoneError) {
    return res.status(400).json({ error: phoneError });
  }

  const regError = validateRegistrationNumber(registrationNumber);
  if (regError) {
    return res.status(400).json({ error: regError });
  }

  if (academicSession) {
    const sessionError = validateSession(academicSession);
    if (sessionError) {
      return res.status(400).json({ error: sessionError });
    }
  }

  if (finalFaculty || finalDepartment) {
    const facultyDeptError = validateFacultyAndDepartment(finalFaculty, finalDepartment);
    if (facultyDeptError) {
      return res.status(400).json({ error: facultyDeptError });
    }
  }

  try {
    const allUsers = await getAllUsersList();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedReg = registrationNumber.trim().toLowerCase();

    // 1. Check existing users in DB
    const existingReg = allUsers.find(u => {
      const uReg = String(u.studentId || u.student_id || u.registrationNumber || '').trim().toLowerCase();
      return uReg === normalizedReg;
    });

    const existingUser = allUsers.find(u => 
      u.email.toLowerCase() === normalizedEmail
    );

    let isFbExists = false;
    let isFbVerified = false;
    let fbUid = '';

    if (isFirebaseActive()) {
      try {
        const fbStatus = await firebaseCheckUserVerificationStatus(normalizedEmail);
        isFbExists = fbStatus.exists;
        isFbVerified = fbStatus.verified;
        if (fbStatus.uid) {
          fbUid = fbStatus.uid;
        }
      } catch (fbErr: any) {
        console.warn('⚠️ Firebase status check failed:', fbErr.message);
      }
    }

    // A. If Registration Number belongs to an already REGISTERED / VERIFIED student account
    if (existingReg && isAccountRegistered(existingReg)) {
      if (existingReg.email.toLowerCase() !== normalizedEmail) {
        return res.status(400).json({ 
          error: `Registration Number "${registrationNumber.trim()}" is already registered to another account. Each student may only register one account.`,
          code: 'REGISTRATION_NUMBER_ALREADY_EXISTS',
          field: 'registrationNumber'
        });
      }

      return res.status(400).json({ 
        error: 'An active and verified account with this Registration Number already exists. Please sign in instead.',
        code: 'ACCOUNT_ALREADY_EXISTS',
        field: 'registrationNumber'
      });
    }

    // B. If Email belongs to an already REGISTERED / VERIFIED student account
    const isEmailFullyRegistered = (existingUser && isAccountRegistered(existingUser)) || (isFbExists && isFbVerified);

    if (isEmailFullyRegistered) {
      return res.status(400).json({ 
        error: 'An account with this email address already exists. Please sign in or reset your password.',
        code: 'EMAIL_ALREADY_EXISTS',
        field: 'email'
      });
    }

    // Unverified / new registration state -> Proceed with 6-digit OTP code generation and dispatch
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
    const localHash = bcrypt.hashSync(password, 10);

    let firebaseUid = fbUid || existingUser?.id || `fb-user-${Date.now()}`;

    if (isFirebaseActive()) {
      if (isFbExists) {
        // If they already exist in Firebase but not verified, update their password so they can use their new one
        await firebaseUpdateUserPasswordAdmin(firebaseUid, password);
      } else {
        // Create the user in Firebase Auth
        try {
          const fbUser = await firebaseRegisterUser(normalizedEmail, password);
          if (fbUser && fbUser.uid) {
            firebaseUid = fbUser.uid;
          }
        } catch (fbErr: any) {
          if (fbErr.message?.includes('already-in-use') || fbErr.code === 'auth/email-already-in-use') {
            const fbStatus = await firebaseCheckUserVerificationStatus(normalizedEmail);
            if (fbStatus.exists) {
              firebaseUid = fbStatus.uid || firebaseUid;
              await firebaseUpdateUserPasswordAdmin(firebaseUid, password);
            }
          } else {
            return res.status(400).json({ error: 'Firebase Auth registration failed: ' + fbErr.message });
          }
        }
      }
    }

    // Build or update the user object (Pending email verification)
    const rawUser = {
      id: firebaseUid,
      firebaseUid,
      provider: 'email',
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash: localHash,
      role: 'student',
      status: 'Pending',
      accountStatus: 'Pending',
      emailVerified: false,
      email_verified: false,
      isVerified: false,
      is_verified: false,
      verificationCode: code,
      verificationCodeExpires: expiresAt,
      
      // Student specific fields
      studentId: registrationNumber.trim(),
      registrationNumber: registrationNumber.trim(),
      academicSession,
      phone: phoneNumber.trim(),
      department: finalDepartment,
      faculty: finalFaculty,
      faculty_id: finalFacultyId,
      department_id: finalDepartmentId,

      // Tracking fields
      verificationSentAt: new Date().toISOString(),
      verificationExpiresAt: expiresAt,
      verificationAttempts: 0,
      registrationCompleted: false,

      createdAt: existingUser?.createdAt || new Date().toISOString()
    };

    await saveOrUpdateUser(rawUser);

    // Send verification code email via Nodemailer / SMTP
    try {
      await sendVerificationEmail(normalizedEmail, code, fullName.trim());
    } catch (mailErr: any) {
      console.error('❌ Verification email dispatch error:', mailErr.message);
    }

    return res.status(200).json({
      message: 'Verification code sent to your email address.',
      email: normalizedEmail,
      requiresVerification: true
    });

  } catch (err: any) {
    console.error('Error in registration route:', err);
    return res.status(500).json({ error: 'Internal server error during registration: ' + err.message });
  }
});

// 2. LIVE UNIQUE CHECK FOR EMAIL / STUDENT ID / REGISTRATION NUMBER
router.post('/check-unique', async (req: any, res: Response) => {
  const { email, studentId, registrationNumber, currentUserId } = req.body;
  try {
    const allUsers = await getAllUsersList();

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const foundUser = allUsers.find(u => 
        u.email.toLowerCase() === normalizedEmail && 
        String(u.id) !== String(currentUserId || '')
      );

      let isFbExists = false;
      let isFbVerified = false;
      if (isFirebaseActive()) {
        try {
          const fbStatus = await firebaseCheckUserVerificationStatus(normalizedEmail);
          isFbExists = fbStatus.exists;
          isFbVerified = fbStatus.verified;
        } catch (e) {}
      }

      // ONLY mark as taken if the account is truly registered/verified
      const isRegistered = (foundUser && isAccountRegistered(foundUser)) || (isFbExists && isFbVerified);

      return res.json({ 
        unique: !isRegistered,
        isVerified: isRegistered,
        field: 'email',
        message: isRegistered 
          ? 'This email address is already registered. Please sign in instead.' 
          : 'Email address is available.'
      });
    }

    const regNum = String(registrationNumber || studentId || '').trim().toLowerCase();
    if (regNum) {
      const foundReg = allUsers.find(u => {
        const uReg = String(u.studentId || u.student_id || u.registrationNumber || '').trim().toLowerCase();
        return uReg === regNum && String(u.id) !== String(currentUserId || '');
      });

      // ONLY mark as taken if the account is truly registered/verified
      const isRegistered = !!(foundReg && isAccountRegistered(foundReg));

      return res.json({ 
        unique: !isRegistered,
        isVerified: isRegistered,
        field: 'registrationNumber',
        message: isRegistered 
          ? `Registration number "${registrationNumber || studentId}" is already registered to an account.` 
          : 'Registration number is available.'
      });
    }

    return res.status(400).json({ error: 'Please provide email or registrationNumber to evaluate.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. VERIFY EMAIL (OTP verification route)
router.post('/verify-email', async (req: any, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedCode = String(code).trim();

  try {
    const allUsers = await getAllUsersList();
    let dbUser = allUsers.find(u => u.email && u.email.trim().toLowerCase() === normalizedEmail);

    // Fallback directly to local fallback store if not in allUsers
    if (!dbUser) {
      const { store } = getFallbackData();
      dbUser = (store.users || []).find((u: any) => u.email && u.email.trim().toLowerCase() === normalizedEmail);
    }

    // Fallback directly to MongoDB if active
    if (!dbUser && isMongoDBActive()) {
      try {
        const mFound = await MUser.findOne({
          email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        }).lean();
        if (mFound) {
          dbUser = { ...mFound, id: String(mFound.id || mFound._id) };
        }
      } catch (e) {}
    }

    // Restore unverified/missing MongoDB record if Firebase exists (Requirement 4 & 6)
    if (!dbUser) {
      if (isFirebaseActive()) {
        try {
          const fbStatus = await firebaseCheckUserVerificationStatus(normalizedEmail);
          if (fbStatus.exists) {
            const emailPrefix = normalizedEmail.split('@')[0];
            const readableName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
            const rawUser = {
              id: fbStatus.uid || `fb-user-${Date.now()}`,
              firebaseUid: fbStatus.uid || '',
              provider: 'email',
              fullName: readableName,
              email: normalizedEmail,
              passwordHash: '',
              role: 'student',
              status: fbStatus.verified ? 'active' : 'Pending',
              accountStatus: fbStatus.verified ? 'Active' : 'Pending',
              emailVerified: fbStatus.verified,
              isVerified: false,
              createdAt: new Date().toISOString(),
              registrationCompleted: fbStatus.verified
            };
            dbUser = await saveOrUpdateUser(rawUser);
          }
        } catch (fbErr: any) {
          console.error('⚠️ Failed to restore user profile during email verification:', fbErr.message);
        }
      }
    }

    if (!dbUser) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // Increment verification attempts (Requirement 11)
    dbUser.verificationAttempts = (dbUser.verificationAttempts || 0) + 1;
    await saveOrUpdateUser(dbUser);

    if (dbUser.emailVerified || dbUser.email_verified) {
      const { accessToken, refreshToken } = generateTokenPair(dbUser);
      dbUser.refreshToken = refreshToken;
      dbUser.registrationCompleted = true;
      const updatedUser = await saveOrUpdateUser(dbUser);
      const { passwordHash, password_hash, refreshToken: _rt, ...sanitizedUser } = updatedUser;
      return res.json({
        message: 'Email is already verified.',
        token: accessToken,
        refreshToken,
        user: sanitizedUser
      });
    }

    const storedCode = String(dbUser.verificationCode || '').trim();
    if (!storedCode || storedCode !== normalizedCode) {
      return res.status(400).json({ error: 'Invalid verification code. Please check the code and try again.' });
    }

    // Handle expiry with both verificationCodeExpires and verificationExpiresAt
    const expiresVal = dbUser.verificationExpiresAt || dbUser.verificationCodeExpires || dbUser.verificationExpires;
    if (expiresVal && new Date() > new Date(expiresVal)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    // Mark user as verified
    dbUser.emailVerified = true;
    dbUser.email_verified = true;
    dbUser.registrationCompleted = true;
    dbUser.status = 'active';
    dbUser.accountStatus = 'Active';
    
    // Sync with Firebase Admin Auth if active
    if (isFirebaseActive()) {
      const targetUid = dbUser.firebaseUid || dbUser.id;
      const adminAuth = getFirebaseAdminAuth();
      if (adminAuth && targetUid) {
        try {
          await adminAuth.updateUser(targetUid, { emailVerified: true });
        } catch (fbErr: any) {
          console.warn('Firebase emailVerified update note:', fbErr.message);
        }
      }
    }

    // Clean up OTP code fields
    delete dbUser.verificationCode;
    delete dbUser.verificationCodeExpires;
    delete dbUser.verificationExpires;
    delete dbUser.verificationExpiresAt;

    const verifiedUser = await saveOrUpdateUser(dbUser);

    const { accessToken, refreshToken } = generateTokenPair(verifiedUser);
    verifiedUser.refreshToken = refreshToken;
    await saveOrUpdateUser(verifiedUser);

    const { passwordHash, password_hash, refreshToken: _rt2, ...sanitizedVerifiedUser } = verifiedUser;

    return res.json({
      message: 'Email verified successfully! Your account is now active.',
      token: accessToken,
      refreshToken,
      user: sanitizedVerifiedUser
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/verify-email', async (req: any, res: Response) => {
  const { email, code } = req.query;
  if (!email || !code) {
    return res.status(400).send('<h3>Email and verification code are required.</h3>');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedCode = String(code).trim();

  try {
    const allUsers = await getAllUsersList();
    let dbUser = allUsers.find(u => u.email && u.email.trim().toLowerCase() === normalizedEmail);

    if (!dbUser) {
      const { store } = getFallbackData();
      dbUser = (store.users || []).find((u: any) => u.email && u.email.trim().toLowerCase() === normalizedEmail);
    }

    if (!dbUser && isFirebaseActive()) {
      try {
        const fbStatus = await firebaseCheckUserVerificationStatus(normalizedEmail);
        const emailPrefix = normalizedEmail.split('@')[0];
        const readableName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
        if (fbStatus.exists) {
          const rawUser = {
            id: fbStatus.uid || `fb-user-${Date.now()}`,
            firebaseUid: fbStatus.uid || '',
            provider: 'email',
            fullName: readableName,
            email: normalizedEmail,
            passwordHash: '',
            role: 'student',
            status: fbStatus.verified ? 'active' : 'Pending',
            accountStatus: fbStatus.verified ? 'Active' : 'Pending',
            emailVerified: fbStatus.verified,
            isVerified: false,
            createdAt: new Date().toISOString(),
            registrationCompleted: fbStatus.verified
          };
          dbUser = await saveOrUpdateUser(rawUser);
        }
      } catch (fbErr: any) {
        console.error('⚠️ Failed to restore user profile during email verification (GET):', fbErr.message);
      }
    }

    if (!dbUser) {
      return res.status(404).send('<h3>User account not found.</h3>');
    }

    if (dbUser.emailVerified || dbUser.email_verified) {
      return res.send('<h3>Your email is already verified. You can log in now.</h3>');
    }

    const storedCode = String(dbUser.verificationCode || '').trim();
    if (!storedCode || storedCode !== normalizedCode) {
      return res.status(400).send('<h3>Invalid verification code.</h3>');
    }

    const expiresVal = dbUser.verificationExpiresAt || dbUser.verificationCodeExpires || dbUser.verificationExpires;
    if (expiresVal && new Date() > new Date(expiresVal)) {
      return res.status(400).send('<h3>Verification code has expired.</h3>');
    }

    dbUser.emailVerified = true;
    dbUser.email_verified = true;
    dbUser.registrationCompleted = true;
    dbUser.status = 'active';
    dbUser.accountStatus = 'Active';
    delete dbUser.verificationCode;
    delete dbUser.verificationCodeExpires;
    delete dbUser.verificationExpires;
    delete dbUser.verificationExpiresAt;

    await saveOrUpdateUser(dbUser);

    return res.send('<h3>Email verified successfully! Your account is now active. You can close this tab and sign in now.</h3>');
  } catch (err: any) {
    return res.status(500).send(`<h3>Error verifying email: ${err.message}</h3>`);
  }
});

// 4. RESEND VERIFICATION CODE (Resend registration OTP code securely with 60s cooldown, Requirement 10)
router.post('/resend-verification', async (req: any, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const allUsers = await getAllUsersList();
    let dbUser = allUsers.find(u => u.email && u.email.trim().toLowerCase() === normalizedEmail);

    if (!dbUser) {
      const { store } = getFallbackData();
      dbUser = (store.users || []).find((u: any) => u.email && u.email.trim().toLowerCase() === normalizedEmail);
    }

    if (!dbUser) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (dbUser.emailVerified || dbUser.email_verified) {
      return res.status(400).json({ error: 'This email is already verified.' });
    }

    // Cooldown verification (Requirement 10)
    const now = new Date();
    if (dbUser.verificationSentAt) {
      const lastSent = new Date(dbUser.verificationSentAt);
      const diffMs = now.getTime() - lastSent.getTime();
      const diffSec = diffMs / 1000;
      if (diffSec < 60) {
        const remaining = Math.ceil(60 - diffSec);
        return res.status(429).json({ error: `Please wait ${remaining} seconds before requesting a new verification email.` });
      }
    }

    // Generate fresh 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    dbUser.verificationCode = code;
    dbUser.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins
    
    // Set tracking fields (Requirement 12)
    dbUser.verificationSentAt = new Date().toISOString();
    dbUser.verificationExpiresAt = dbUser.verificationCodeExpires;
    dbUser.verificationExpires = dbUser.verificationCodeExpires;
    dbUser.verificationAttempts = 0;

    await saveOrUpdateUser(dbUser);

    // Send verification email
    await sendVerificationEmail(dbUser.email, code, dbUser.fullName || dbUser.full_name || 'Student');

    return res.json({ 
      message: 'A fresh secure activation code has been successfully sent to your registered mail.'
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/resend-code', async (req: any, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const allUsers = await getAllUsersList();
    let dbUser = allUsers.find(u => u.email && u.email.trim().toLowerCase() === normalizedEmail);

    if (!dbUser) {
      const { store } = getFallbackData();
      dbUser = (store.users || []).find((u: any) => u.email && u.email.trim().toLowerCase() === normalizedEmail);
    }

    if (!dbUser) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (dbUser.emailVerified || dbUser.email_verified) {
      return res.status(400).json({ error: 'This email is already verified.' });
    }

    // Cooldown verification (Requirement 10)
    const now = new Date();
    if (dbUser.verificationSentAt) {
      const lastSent = new Date(dbUser.verificationSentAt);
      const diffMs = now.getTime() - lastSent.getTime();
      const diffSec = diffMs / 1000;
      if (diffSec < 60) {
        const remaining = Math.ceil(60 - diffSec);
        return res.status(429).json({ error: `Please wait ${remaining} seconds before requesting a new verification email.` });
      }
    }

    // Generate fresh 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    dbUser.verificationCode = code;
    dbUser.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins
    
    // Set tracking fields (Requirement 12)
    dbUser.verificationSentAt = new Date().toISOString();
    dbUser.verificationExpiresAt = dbUser.verificationCodeExpires;
    dbUser.verificationExpires = dbUser.verificationCodeExpires;
    dbUser.verificationAttempts = 0;

    await saveOrUpdateUser(dbUser);

    // Send verification email
    await sendVerificationEmail(dbUser.email, code, dbUser.fullName || dbUser.full_name || 'Student');

    return res.json({ 
      message: 'A fresh secure activation code has been successfully sent to your registered mail.'
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// 5. LOGIN USER
router.post('/login', async (req: any, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const allUsers = await getAllUsersList();
    let loginEmail = email.trim().toLowerCase();

    if (!loginEmail.includes('@')) {
      const userByReg = allUsers.find(u => 
        String(u.studentId || u.student_id || '').trim().toLowerCase() === loginEmail
      );
      if (!userByReg) {
        return res.status(404).json({ error: 'No account found with this Registration Number / Student ID.' });
      }
      loginEmail = userByReg.email.trim().toLowerCase();
    }

    // 1. Authenticate using database credentials or Firebase
    let fbUser: any = null;
    let isAuthenticated = false;

    let dbUser = allUsers.find(u => u.email.toLowerCase() === loginEmail);

    if (dbUser) {
      const storedHash = dbUser.passwordHash || dbUser.password_hash;
      if (storedHash && bcrypt.compareSync(password, storedHash)) {
        isAuthenticated = true;
        // Attempt to login to Firebase to keep session alive and retrieve fbUser if possible
        if (isFirebaseActive()) {
          try {
            fbUser = await firebaseLoginUser(loginEmail, password);
          } catch (fbErr: any) {
            console.log('ℹ️ Firebase session sync deferred for locally verified user.');
            // Attempt to auto-repair the Firebase password using the Admin SDK
            const targetUid = dbUser.firebaseUid || dbUser.id;
            if (targetUid) {
              try {
                await firebaseUpdateUserPasswordAdmin(targetUid, password);
                console.log(`🔥 Auto-repaired Firebase password for UID: ${targetUid}`);
              } catch (repairErr: any) {
                // Silent catch to prevent console error pollution
              }
            }
          }
        }
      }
    }

    if (!isAuthenticated) {
      // Fallback to direct Firebase Authentication
      if (isFirebaseActive()) {
        try {
          fbUser = await firebaseLoginUser(loginEmail, password);
          isAuthenticated = true;
        } catch (fbErr: any) {
          const isCredentialError = fbErr.message?.includes('credential') || 
                                    fbErr.message?.includes('user-not-found') || 
                                    fbErr.message?.includes('wrong-password') ||
                                    fbErr.message?.includes('invalid-email');
          const errorMsg = isCredentialError 
            ? 'Invalid email, registration number, or password.' 
            : (fbErr.message || 'Invalid email, registration number, or password.');
          return res.status(401).json({ error: errorMsg });
        }
      } else {
        return res.status(401).json({ error: 'Invalid email, registration number, or password.' });
      }
    }

    if (!dbUser) {
      if (fbUser) {
        // Auto-register in DB if they exist in Firebase but not in MongoDB
        const loginPrefix = loginEmail.split('@')[0];
        const readableLoginName = loginPrefix.charAt(0).toUpperCase() + loginPrefix.slice(1);
        const rawUser = {
          id: fbUser.uid,
          firebaseUid: fbUser.uid,
          provider: 'email',
          fullName: fbUser.displayName || readableLoginName,
          email: loginEmail,
          passwordHash: bcrypt.hashSync(password, 10),
          role: 'student',
          status: fbUser.emailVerified ? 'active' : 'Pending',
          accountStatus: fbUser.emailVerified ? 'Active' : 'Pending',
          emailVerified: fbUser.emailVerified,
          isVerified: false,
          createdAt: new Date().toISOString()
        };
        dbUser = await saveOrUpdateUser(rawUser);
      } else {
        return res.status(401).json({ error: 'Invalid email, registration number, or password.' });
      }
    }

    // Check account status: suspended, banned, locked, or disabled
    const currentStatus = (dbUser.status || '').trim().toLowerCase();
    const currentAccountStatus = (dbUser.accountStatus || '').trim().toLowerCase();
    const isSuspendedFlag = dbUser.is_suspended || dbUser.isSuspended;

    if (currentStatus === 'suspended' || currentAccountStatus === 'suspended' || isSuspendedFlag) {
      return res.status(403).json({ error: 'This account is suspended. Please contact university administrators.' });
    }
    if (currentStatus === 'disabled' || currentAccountStatus === 'disabled') {
      return res.status(403).json({ error: 'This account has been disabled. Please contact university administrators.' });
    }
    if (currentStatus === 'banned' || currentAccountStatus === 'banned') {
      return res.status(403).json({ error: 'This account has been permanently banned from Nazrul Retrievers.' });
    }
    if (currentStatus === 'locked' || currentAccountStatus === 'locked') {
      return res.status(403).json({ error: 'This account is locked for security reasons. Please contact university administrators.' });
    }

    // 2. Check and Sync email verification status natively via Firebase (only promote, never demote if already verified in DB)
    if (fbUser && fbUser.emailVerified && !dbUser.emailVerified) {
      dbUser.emailVerified = true;
      dbUser.email_verified = true;
      dbUser.status = 'active';
      dbUser.accountStatus = 'Active';
      await saveOrUpdateUser(dbUser);
    }

    // Admin & Moderator bypass & unverified student check
    const isStaffOrAdmin = dbUser.role === 'admin' || dbUser.role === 'moderator' || (dbUser as any)?.role === 'coordinator' || dbUser.email.toLowerCase() === 'nazrulretrievers@gmail.com';

    if (isStaffOrAdmin) {
      // Ensure moderator and admin accounts are always marked verified and active
      if (!dbUser.emailVerified || !dbUser.email_verified || dbUser.status === 'Pending' || dbUser.accountStatus === 'Pending') {
        dbUser.emailVerified = true;
        dbUser.email_verified = true;
        dbUser.registrationCompleted = true;
        dbUser.status = 'active';
        dbUser.accountStatus = 'Active';
        delete dbUser.verificationCode;
        delete dbUser.verificationCodeExpires;
        delete dbUser.verificationExpires;
        delete dbUser.verificationExpiresAt;
        await saveOrUpdateUser(dbUser);
      }
    } else if (!dbUser.emailVerified && !dbUser.email_verified) {
      // Generate fresh OTP code and dispatch email for unverified student accounts
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      dbUser.verificationCode = code;
      dbUser.verificationCodeExpires = expiresAt;
      dbUser.verificationSentAt = new Date().toISOString();
      await saveOrUpdateUser(dbUser);

      try {
        await sendVerificationEmail(dbUser.email, code, dbUser.fullName || dbUser.full_name || 'Student');
      } catch (mailErr: any) {
        console.warn('Login verification mail dispatch error:', mailErr.message);
      }

      return res.status(403).json({
        error: 'Your email address is not verified yet. A 6-digit verification code has been sent to your email address.',
        requiresVerification: true,
        email: dbUser.email
      });
    }

    // Update lastLogin timestamp
    dbUser.lastLogin = new Date().toISOString();
    dbUser.last_login = dbUser.lastLogin;
    
    const { accessToken, refreshToken, payload } = generateTokenPair(dbUser);
    dbUser.refreshToken = refreshToken;
    const finalUser = await saveOrUpdateUser(dbUser);

    const { passwordHash, password_hash, refreshToken: _, ...sanitizedUser } = finalUser;

    return res.json({
      message: 'Login successful!',
      token: accessToken,
      refreshToken,
      user: sanitizedUser
    });

  } catch (err: any) {
    console.error('Error in login endpoint:', err);
    return res.status(500).json({ error: 'Internal server error during login: ' + err.message });
  }
});

// 6. GOOGLE SIGN-IN OR AUTOMATIC SIGN-UP
router.post('/google-login', async (req: any, res: Response) => {
  const { email, fullName, avatar, googleUid } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required for Google Sign-In.' });
  }

  try {
    const allUsers = await getAllUsersList();
    let dbUser = allUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!dbUser) {
      // Automatically register them as an active, verified user!
      const generatedId = googleUid || String(Date.now() + Math.floor(Math.random() * 1000));
      const isNewAdmin = email.trim().toLowerCase() === 'nazrulretrievers@gmail.com';
      const role = isNewAdmin ? 'admin' : 'student';

      const rawUser = {
        id: generatedId,
        firebaseUid: googleUid || `fb-google-${generatedId}`,
        provider: 'google',
        fullName: fullName || 'Google Student',
        email: email.trim().toLowerCase(),
        passwordHash: '',
        role: role,
        status: 'active',
        emailVerified: true, // Google accounts are auto-verified
        isVerified: false,   // verified badge is false until complete profile conditions are met
        profilePhoto: avatar || '',
        createdAt: new Date().toISOString()
      };

      dbUser = await saveOrUpdateUser(rawUser);
    } else {
      // Exist, update credentials and last login
      dbUser.lastLogin = new Date().toISOString();
      dbUser.last_login = dbUser.lastLogin;
      if (googleUid) {
        dbUser.firebaseUid = googleUid;
      }
      dbUser = await saveOrUpdateUser(dbUser);
    }

    // Check account status: suspended, banned, locked, or disabled
    const currentStatus = (dbUser.status || '').trim().toLowerCase();
    const currentAccountStatus = (dbUser.accountStatus || '').trim().toLowerCase();
    const isSuspendedFlag = dbUser.is_suspended || dbUser.isSuspended;

    if (currentStatus === 'suspended' || currentAccountStatus === 'suspended' || isSuspendedFlag) {
      return res.status(403).json({ error: 'This account is suspended. Please contact university administrators.' });
    }
    if (currentStatus === 'disabled' || currentAccountStatus === 'disabled') {
      return res.status(403).json({ error: 'This account has been disabled. Please contact university administrators.' });
    }
    if (currentStatus === 'banned' || currentAccountStatus === 'banned') {
      return res.status(403).json({ error: 'This account is permanently banned.' });
    }
    if (currentStatus === 'locked' || currentAccountStatus === 'locked') {
      return res.status(403).json({ error: 'This account is locked for security reasons. Please contact university administrators.' });
    }

    const { accessToken, refreshToken, payload } = generateTokenPair(dbUser);
    dbUser.refreshToken = refreshToken;
    const finalUser = await saveOrUpdateUser(dbUser);

    const { passwordHash, password_hash, refreshToken: _, ...sanitizedUser } = finalUser;

    return res.json({
      message: 'Google Sign-In successful!',
      token: accessToken,
      refreshToken,
      user: sanitizedUser
    });

  } catch (err: any) {
    console.error('Error in google-login endpoint:', err);
    return res.status(500).json({ error: 'Internal server error during Google Sign-In: ' + err.message });
  }
});

// 7. REFRESH JWT ACCESS TOKEN
router.post('/refresh-token', async (req: any, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
    const allUsers = await getAllUsersList();
    const dbUser = allUsers.find(u => String(u.id) === String(decoded.id));

    if (!dbUser || dbUser.refreshToken !== refreshToken) {
      return res.status(403).json({ error: 'Invalid or expired refresh token.' });
    }

    const { accessToken } = generateTokenPair(dbUser);
    return res.json({ token: accessToken });

  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired refresh token.' });
  }
});

// 8. LOGOUT
router.post('/logout', async (req: any, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      const allUsers = await getAllUsersList();
      const dbUser = allUsers.find(u => u.refreshToken === refreshToken);
      if (dbUser) {
        dbUser.refreshToken = '';
        await saveOrUpdateUser(dbUser);
      }
    } catch (err) {
      console.error('Logout refresh token update error:', err);
    }
  }
  return res.json({ message: 'Successfully logged out.' });
});

// 9. CURRENT USER ME (Returns fully hydrated payload with evaluation stats)
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const userEmail = req.user?.email;
  try {
    const allUsers = await getAllUsersList();
    let dbUser = allUsers.find(u => 
      String(u.id) === String(userId) ||
      String((u as any)._id) === String(userId) ||
      String((u as any).firebaseUid) === String(userId) ||
      String((u as any).user_id) === String(userId) ||
      (userEmail && u.email && u.email.trim().toLowerCase() === userEmail.trim().toLowerCase())
    );

    if (!dbUser && userEmail) {
      if (isFirebaseActive()) {
        try {
          const fbStatus = await firebaseCheckUserVerificationStatus(userEmail);
          if (fbStatus.exists) {
            const emailP = userEmail.trim().split('@')[0];
            const readableEmailName = emailP.charAt(0).toUpperCase() + emailP.slice(1);
            const rawUser = {
              id: userId,
              firebaseUid: userId,
              provider: 'email',
              fullName: req.user?.fullName || readableEmailName,
              email: userEmail.trim().toLowerCase(),
              passwordHash: '',
              role: req.user?.role || 'student',
              status: fbStatus.verified ? 'active' : 'Pending',
              accountStatus: fbStatus.verified ? 'Active' : 'Pending',
              emailVerified: fbStatus.verified,
              isVerified: false,
              createdAt: new Date().toISOString(),
              registrationCompleted: fbStatus.verified
            };
            dbUser = await saveOrUpdateUser(rawUser);
          }
        } catch (fbErr: any) {
          console.error('⚠️ Failed to restore user profile in /me:', fbErr.message);
        }
      }
    }

    if (!dbUser) {
      return res.status(404).json({ error: 'Active user session not found.' });
    }

    // Re-evaluate to make sure statistics are perfectly accurate
    const evaluated = await saveOrUpdateUser(dbUser);

    return res.json({ user: evaluated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 10. GET PROFILE BY USER ID
router.get('/profile', async (req: any, res: Response) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'User ID is required to fetch profile.' });
  }

  try {
    const allUsers = await getAllUsersList();
    const queryKey = String(id).trim().toLowerCase();
    const rawUser = allUsers.find(u => 
      String(u.id) === String(id) ||
      (u.email && u.email.trim().toLowerCase() === queryKey) ||
      (u.fullName && u.fullName.trim().toLowerCase() === queryKey) ||
      (u.full_name && u.full_name.trim().toLowerCase() === queryKey)
    );

    if (!rawUser) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const dbUser = syncAndEvaluateUser(rawUser, allUsers);

    // Hide confidential fields for general users if private
    const resultProfile = { ...dbUser };
    delete resultProfile.passwordHash;
    delete resultProfile.password_hash;
    delete resultProfile.refreshToken;

    // Sanitize personal information for admin, moderator, or staff accounts to protect privacy
    const roleLower = (resultProfile.role || '').toLowerCase();
    const isStaffOrAdmin = roleLower === 'admin' || roleLower === 'moderator' || roleLower === 'staff' || roleLower === 'coordinator' || (resultProfile.fullName && resultProfile.fullName.toLowerCase().includes('admin'));
    
    if (isStaffOrAdmin) {
      resultProfile.department = roleLower === 'admin' ? 'ICT Administration' : roleLower === 'moderator' ? 'Campus Community Moderation' : 'University Staff';
      resultProfile.studentId = 'ADMIN-OFFICIAL';
      resultProfile.employeeId = 'ADMIN-OFFICIAL';
      resultProfile.staffId = 'ADMIN-OFFICIAL';
      resultProfile.rollNumber = 'ADMIN-OFFICIAL';
      resultProfile.classRoll = 'ADMIN-OFFICIAL';
      resultProfile.phone = 'Protected Official Contact';
      resultProfile.address = 'JKKNIU Administration Office';
      delete resultProfile.bloodGroup;
    }

    const isPrivate = resultProfile.profileVisibility === 'private' || resultProfile.hidePhone === true || resultProfile.isPhonePrivate === true;

    if (isPrivate) {
      delete resultProfile.phone;
      delete resultProfile.phoneNumber;
      delete resultProfile.phone_number;
      delete resultProfile.emergencyContact;
      delete resultProfile.emergencyContactName;
      resultProfile.profileVisibility = 'private';
      resultProfile.hidePhone = true;
      resultProfile.isPhonePrivate = true;
    }

    return res.json({ user: resultProfile });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 11. UPDATE OR COMPLETE PROFILE (Calculates and syncs fields, guards student ID uniqueness)
const handleProfileUpdate = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const userEmail = req.user?.email;
  const fields = req.body;

  try {
    const allUsers = await getAllUsersList();
    const dbUser = allUsers.find(u => 
      String(u.id) === String(userId) ||
      String((u as any)._id) === String(userId) ||
      String((u as any).firebaseUid) === String(userId) ||
      String((u as any).user_id) === String(userId) ||
      (userEmail && u.email && u.email.trim().toLowerCase() === userEmail.trim().toLowerCase())
    );

    if (!dbUser) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    // Input Sanitization
    if (fields.fullName) fields.fullName = sanitizeInput(fields.fullName);
    if (fields.full_name) fields.full_name = sanitizeInput(fields.full_name);
    if (fields.bio) fields.bio = sanitizeInput(fields.bio);
    if (fields.address) fields.address = sanitizeInput(fields.address);

    const isStaff = dbUser?.role === 'admin' || dbUser?.role === 'moderator' || (dbUser as any)?.role === 'coordinator' || req.user?.role === 'admin' || req.user?.role === 'moderator';

    // Centralized server-side validation
    if (fields.fullName || fields.full_name) {
      const nameErr = validateName(fields.fullName || fields.full_name);
      if (nameErr) return res.status(400).json({ error: nameErr });
    }

    if (fields.phone) {
      const phoneErr = validatePhone(fields.phone);
      if (phoneErr) return res.status(400).json({ error: phoneErr });
    }

    if (!isStaff) {
      const checkSession = fields.academicSession || fields.sessionYear || fields.session_year;
      if (checkSession) {
        const sessionErr = validateSession(checkSession);
        if (sessionErr) return res.status(400).json({ error: sessionErr });
      }

      const checkStudentId = fields.studentId || fields.student_id;
      if (checkStudentId) {
        const regDigits = String(checkStudentId).replace(/\D/g, '');
        if (regDigits.length !== String(checkStudentId).trim().length || regDigits.length !== 5) {
          return res.status(400).json({ error: 'Registration Number must be exactly 5 numeric digits.' });
        }
      }

      const checkClassRoll = fields.classRoll !== undefined ? fields.classRoll : (fields.rollNumber !== undefined ? fields.rollNumber : (fields.roll !== undefined ? fields.roll : fields.class_roll));
      if (checkClassRoll && String(checkClassRoll).trim() !== '') {
        const activeSession = fields.academicSession || fields.sessionYear || fields.session_year || dbUser.academicSession || dbUser.sessionYear || '';
        const rollErr = validateRollNumber(String(checkClassRoll).trim(), activeSession);
        if (rollErr) return res.status(400).json({ error: rollErr });
      }

      if (fields.faculty !== undefined || fields.department !== undefined) {
        let checkFaculty = fields.faculty !== undefined ? fields.faculty : dbUser.faculty;
        let checkDept = fields.department !== undefined ? fields.department : dbUser.department;
        if (checkDept && !checkFaculty) {
          const inferred = inferFacultyFromDepartment(checkDept);
          if (inferred) checkFaculty = inferred;
        }
        if (checkFaculty && checkDept) {
          const facultyDeptErr = validateFacultyAndDepartment(checkFaculty, checkDept);
          if (facultyDeptErr) return res.status(400).json({ error: facultyDeptErr });
        }
      }
    }

    // Validate Student ID uniqueness if they are attempting to update or set it
    const newStudentId = fields.studentId !== undefined ? String(fields.studentId).trim() : (fields.student_id !== undefined ? String(fields.student_id).trim() : null);
    if (newStudentId !== null && newStudentId !== '') {
      const normalizedId = newStudentId.toLowerCase();
      const duplicateUser = allUsers.find(u => 
        String(u.id) !== String(userId) && (
          String(u.studentId || u.student_id || '').trim().toLowerCase() === normalizedId ||
          u.email.toLowerCase() === normalizedId
        )
      );
      if (duplicateUser) {
        return res.status(400).json({ error: 'This Student ID or Email is already registered to another account.' });
      }
    }

    // Process secure password update if provided
    if (fields.password && fields.password.trim() !== '') {
      const oldPassword = fields.oldPassword;
      if (!oldPassword) {
        return res.status(400).json({ error: 'Current password is required to change your password.' });
      }

      // Verify old password against stored hash if available
      const storedHash = dbUser.passwordHash || dbUser.password_hash;
      if (storedHash) {
        const isMatch = await bcrypt.compare(oldPassword, storedHash);
        if (!isMatch) {
          return res.status(400).json({ error: 'Incorrect current password.' });
        }
      }

      const hasMinLength = fields.password.length >= 8;
      const hasLowercase = /[a-z]/.test(fields.password);
      const hasUppercase = /[A-Z]/.test(fields.password);
      const hasNumber = /\d/.test(fields.password);
      const hasSpecialChar = /[^A-Za-z0-9]/.test(fields.password);
      if (!hasMinLength || !hasLowercase || !hasUppercase || !hasNumber || !hasSpecialChar) {
        return res.status(400).json({ 
          error: 'New password does not meet security requirements: Minimum 8 characters, at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character.' 
        });
      }

      // If Firebase Auth is active, update user's password in Firebase first
      if (isFirebaseActive()) {
        try {
          await firebaseUpdateUserPassword(dbUser.email, oldPassword, fields.password);
        } catch (fbErr: any) {
          return res.status(400).json({ error: 'Firebase Auth password update failed: ' + fbErr.message });
        }
      }

      dbUser.passwordHash = await bcrypt.hash(fields.password, 10);
      dbUser.password_hash = dbUser.passwordHash;
    }

    // Validate Faculty and Department combination on the backend for students
    let targetFaculty = fields.faculty !== undefined ? fields.faculty : dbUser.faculty;
    let targetDepartment = fields.department !== undefined ? fields.department : dbUser.department;

    if (!isStaff) {
      if (fields.faculty !== undefined && fields.faculty !== dbUser.faculty) {
        // Faculty is changing! If the department is not explicitly passed as a new value, reset it.
        if (fields.department === undefined) {
          targetDepartment = '';
        }
      }

      if (targetDepartment && !targetFaculty) {
        const inferred = inferFacultyFromDepartment(targetDepartment);
        if (inferred) {
          targetFaculty = inferred;
        } else if (fields.faculty !== undefined || fields.department !== undefined) {
          return res.status(400).json({ error: 'Faculty must be selected before selecting a Department.' });
        }
      }

      if (targetFaculty && targetDepartment && (fields.faculty !== undefined || fields.department !== undefined)) {
        if (!isValidFacultyDepartment(targetFaculty, targetDepartment)) {
          return res.status(400).json({ error: 'The selected Department does not belong to the selected Faculty.' });
        }
      }
    }

    // Update allowable editable fields safely
    if (fields.fullName !== undefined) dbUser.fullName = fields.fullName;
    if (fields.full_name !== undefined) dbUser.fullName = fields.full_name;
    if (fields.phone !== undefined) dbUser.phone = fields.phone;
    if (fields.phoneNumber !== undefined) dbUser.phone = fields.phoneNumber;
    if (fields.phone_number !== undefined) dbUser.phone = fields.phone_number;
    
    dbUser.faculty = targetFaculty || '';
    dbUser.department = targetDepartment || '';
    if (fields.faculty_id !== undefined) dbUser.faculty_id = fields.faculty_id;
    if (fields.department_id !== undefined) dbUser.department_id = fields.department_id;
    
    if (fields.academicSession !== undefined) dbUser.academicSession = fields.academicSession;
    if (fields.sessionYear !== undefined) dbUser.academicSession = fields.sessionYear;
    if (fields.session_year !== undefined) dbUser.academicSession = fields.session_year;
    if (fields.designation !== undefined) dbUser.designation = fields.designation;
    
    if (fields.semester !== undefined) dbUser.semester = fields.semester;
    if (fields.dateOfBirth !== undefined) dbUser.dateOfBirth = fields.dateOfBirth;
    if (fields.gender !== undefined) dbUser.gender = fields.gender;
    if (fields.address !== undefined) dbUser.address = fields.address;
    if (fields.emergencyContact !== undefined) dbUser.emergencyContact = fields.emergencyContact;
    if (fields.emergencyContactName !== undefined) dbUser.emergencyContactName = fields.emergencyContactName;
    if (fields.bloodGroup !== undefined) dbUser.bloodGroup = fields.bloodGroup;
    if (fields.residentialHall !== undefined) dbUser.residentialHall = fields.residentialHall;
    else if (fields.residential_hall !== undefined) dbUser.residentialHall = fields.residential_hall;
    else if (fields.hall !== undefined) dbUser.residentialHall = fields.hall;
    if (fields.socialLink !== undefined) dbUser.socialLink = fields.socialLink;
    if (fields.bio !== undefined) dbUser.bio = fields.bio;
    if (fields.classRoll !== undefined || fields.rollNumber !== undefined || fields.roll !== undefined || fields.class_roll !== undefined) {
      const targetRoll = fields.classRoll !== undefined 
        ? fields.classRoll 
        : (fields.rollNumber !== undefined 
          ? fields.rollNumber 
          : (fields.roll !== undefined ? fields.roll : fields.class_roll));
      dbUser.classRoll = targetRoll;
      dbUser.rollNumber = targetRoll;
      dbUser.roll = targetRoll;
      dbUser.class_roll = targetRoll;
    }
    if (fields.profileVisibility !== undefined) {
      dbUser.profileVisibility = fields.profileVisibility;
      dbUser.hidePhone = fields.profileVisibility === 'private' || !!fields.hidePhone;
      dbUser.isPhonePrivate = dbUser.hidePhone;
    }
    if (fields.hidePhone !== undefined) {
      dbUser.hidePhone = !!fields.hidePhone;
      dbUser.isPhonePrivate = !!fields.hidePhone;
      if (fields.hidePhone) {
        dbUser.profileVisibility = 'private';
      }
    }
    if (fields.isPhonePrivate !== undefined) {
      dbUser.hidePhone = !!fields.isPhonePrivate;
      dbUser.isPhonePrivate = !!fields.isPhonePrivate;
    }
    if (fields.accountSettings !== undefined) dbUser.accountSettings = fields.accountSettings;
    if (fields.preferredContactMethod !== undefined) {
      dbUser.preferredContactMethod = fields.preferredContactMethod;
      if (!dbUser.accountSettings) dbUser.accountSettings = {};
      dbUser.accountSettings.preferredContactMethod = fields.preferredContactMethod;
    }
    if (fields.autoFillDetails !== undefined) {
      if (!dbUser.accountSettings) dbUser.accountSettings = {};
      dbUser.accountSettings.autoFillDetails = !!fields.autoFillDetails;
    }
    if (fields.notificationSettings !== undefined) dbUser.notificationSettings = fields.notificationSettings;
    if (fields.language !== undefined) dbUser.language = fields.language;
    if (fields.theme !== undefined) dbUser.theme = fields.theme;
    
    if (newStudentId !== null) {
      dbUser.studentId = newStudentId;
      dbUser.registrationNumber = newStudentId;
    } else if (fields.registrationNumber !== undefined) {
      dbUser.studentId = fields.registrationNumber;
      dbUser.registrationNumber = fields.registrationNumber;
    } else if (fields.studentId !== undefined) {
      dbUser.studentId = fields.studentId;
      dbUser.registrationNumber = fields.studentId;
    }

    if (fields.profilePhoto !== undefined) {
      dbUser.profilePhoto = fields.profilePhoto;
      dbUser.avatar = fields.profilePhoto;
      dbUser.profile_photo = fields.profilePhoto;
      dbUser.profileImage = fields.profilePhoto;
    } else if (fields.avatar !== undefined) {
      dbUser.profilePhoto = fields.avatar;
      dbUser.avatar = fields.avatar;
      dbUser.profile_photo = fields.avatar;
      dbUser.profileImage = fields.avatar;
    }

    // Recalculates everything and updates database caches
    const updated = await saveOrUpdateUser(dbUser);

    return res.json({
      message: 'Profile updated successfully!',
      user: updated
    });

  } catch (err: any) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
};

router.put('/profile', authenticateToken, handleProfileUpdate);
router.patch('/profile', authenticateToken, handleProfileUpdate);

// GET LOGGED-IN USER'S CLAIMS LIST
router.get('/profile/claims', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = String(req.user?.id || (req.user as any)?._id || '');
  try {
    if (isMongoDBActive()) {
      const claims = await MClaim.find({
        $or: [{ user_id: userId }, { userId: userId }]
      }).lean();
      const itemIds = claims.map((c: any) => String(c.item_id || c.itemId));
      const dbItems = await MItem.find({
        $or: [{ id: { $in: itemIds } }, { _id: { $in: itemIds.filter(id => mongoose.Types.ObjectId.isValid(id)) } }]
      }).lean();

      const claimsWithDetails = [];
      for (const c of claims) {
        const item = dbItems.find(i => String(i.id) === String(c.item_id || c.itemId) || String((i as any)._id) === String(c.item_id || c.itemId));
        if (!item || item.isDeleted || item.status === 'deleted') continue;

        claimsWithDetails.push({
          claim_id: c.claim_id,
          item_id: c.item_id,
          user_id: c.user_id,
          proof_description: c.proof_description,
          contact_details: c.contact_details,
          status: c.status,
          admin_notes: c.admin_notes || '',
          created_at: c.created_at || c.createdAt,
          item_title: item.title || 'Untitled Item',
          item_type: item.type || 'lost',
          item_status: item.status || 'active',
          image_url: item.image || ''
        });
      }
      return res.json({ claims: claimsWithDetails });
    } else {
      const { store } = getFallbackData();
      const claims = (store.claims || []).filter((c: any) => String(c.user_id || c.userId) === userId);
      const claimsWithDetails = [];
      for (const c of claims) {
        const item = (store.items || []).find(i => String(i.id) === String(c.item_id || c.itemId));
        if (!item || item.isDeleted || item.status === 'deleted') continue;

        claimsWithDetails.push({
          claim_id: c.claim_id,
          item_id: c.item_id,
          user_id: c.user_id,
          proof_description: c.proof_description,
          contact_details: c.contact_details,
          status: c.status,
          admin_notes: c.admin_notes || '',
          created_at: c.created_at,
          item_title: item.title || 'Untitled Item',
          item_type: item.type || 'lost',
          item_status: item.status || 'active',
          image_url: item.image || '',
          location: item.location || '',
          category: item.category || ''
        });
      }
      return res.json({ claims: claimsWithDetails });
    }
  } catch (err: any) {
    console.error('Error fetching user claims:', err);
    return res.status(500).json({ error: 'Failed to fetch claims: ' + err.message });
  }
});

// CANCEL / WITHDRAW PENDING CLAIM BY CLAIMANT
router.delete('/profile/claims/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = String(req.user?.id || (req.user as any)?._id || '');
  const { id } = req.params;

  try {
    if (isMongoDBActive()) {
      const claim = await MClaim.findOne({
        $and: [
          { $or: [{ claim_id: id }, { id: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : undefined }] },
          { $or: [{ user_id: userId }, { userId: userId }] }
        ]
      });

      if (!claim) {
        return res.status(404).json({ error: 'Claim request not found or unauthorized.' });
      }

      const itemId = claim.item_id;
      await MClaim.deleteOne({ _id: claim._id });

      // Update remaining claim count on item
      const remainingClaims = await (MClaim as any).countDocuments({ item_id: itemId, status: 'pending' });
      if (remainingClaims === 0) {
        await (MItem as any).updateOne({ id: String(itemId), status: 'under_verification' }, { $set: { status: 'active' } });
      }

      return res.json({ success: true, message: 'Claim withdrawn successfully.' });
    } else {
      const { store, save } = getFallbackData();
      if (!store.claims) store.claims = [];
      
      const claimIndex = store.claims.findIndex((c: any) => 
        (String(c.claim_id) === String(id) || String(c.id) === String(id)) && 
        (String(c.user_id) === userId || String(c.userId) === userId)
      );

      if (claimIndex === -1) {
        return res.status(404).json({ error: 'Claim request not found or unauthorized.' });
      }

      const removedClaim = store.claims.splice(claimIndex, 1)[0];
      const remainingClaims = store.claims.filter((c: any) => String(c.item_id) === String(removedClaim.item_id) && c.status === 'pending');
      
      if (remainingClaims.length === 0) {
        const item = (store.items || []).find(i => String(i.id) === String(removedClaim.item_id));
        if (item && item.status === 'under_verification') {
          item.status = 'active';
        }
      }

      save();
      return res.json({ success: true, message: 'Claim withdrawn successfully.' });
    }
  } catch (err: any) {
    console.error('Error canceling claim:', err);
    return res.status(500).json({ error: 'Failed to cancel claim: ' + err.message });
  }
});

// GET COMPLETE USER DATA EXPORT (JSON BACKUP)
router.get('/profile/export-data', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = String(req.user?.id || (req.user as any)?._id || '');
  const userEmail = String(req.user?.email || '').toLowerCase();
  try {
    const allUsers = await getAllUsersList();
    const rawUser = allUsers.find(u => String(u.id) === userId || (userEmail && String(u.email).toLowerCase() === userEmail));
    if (!rawUser) {
      return res.status(404).json({ error: 'User account not found' });
    }
    const synced = syncAndEvaluateUser(rawUser, allUsers);
    
    // Sanitize sensitive secrets
    const exportProfile = { ...synced };
    delete exportProfile.passwordHash;
    delete exportProfile.password_hash;
    delete exportProfile.refreshToken;
    delete exportProfile.verificationToken;
    delete exportProfile.verificationOtp;

    // Get user's items
    let userItems: any[] = [];
    if (isMongoDBActive()) {
      userItems = await MItem.find({
        $or: [
          { userId: userId },
          { firebaseUid: userId },
          { email: userEmail },
          { 'postedBy.userId': userId },
          { 'postedBy.email': userEmail }
        ],
        isDeleted: { $ne: true }
      }).lean();
    } else {
      const { store } = getFallbackData();
      userItems = (store.items || []).filter((i: any) => 
        (String(i.userId || i.firebaseUid || (i.postedBy && i.postedBy.userId)) === userId) ||
        (i.email && String(i.email).toLowerCase() === userEmail)
      );
    }

    // Get user's claims
    let userClaims: any[] = [];
    if (isMongoDBActive()) {
      userClaims = await MClaim.find({
        $or: [{ user_id: userId }, { userId: userId }]
      }).lean();
    } else {
      const { store } = getFallbackData();
      userClaims = (store.claims || []).filter((c: any) => String(c.user_id || c.userId) === userId);
    }

    return res.json({
      exportDate: new Date().toISOString(),
      platform: 'JKKNIU Lost & Found Portal (Nazrul Retrievers)',
      user: {
        id: synced.id,
        fullName: synced.fullName,
        email: synced.email,
        department: synced.department,
        faculty: synced.faculty,
        studentId: synced.studentId,
        sessionYear: synced.sessionYear || synced.academicSession,
        role: synced.role,
        isVerified: synced.isVerified,
        reputationScore: synced.reputationScore,
        joinedDate: synced.createdAt || synced.created_at
      },
      profile: exportProfile,
      summary: {
        totalItemsPosted: userItems.length,
        totalClaimsSubmitted: userClaims.length
      },
      items: userItems,
      claims: userClaims
    });
  } catch (err: any) {
    console.error('Error exporting user data:', err);
    return res.status(500).json({ error: 'Failed to export account data: ' + err.message });
  }
});

// 12. FORGOT PASSWORD (OTP generation and mailing)
router.post('/forgot-password', async (req: any, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const allUsers = await getAllUsersList();
    const dbUser = allUsers.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!dbUser) {
      // Generic security response to prevent user enumeration
      return res.json({ 
        message: 'If this email address is registered, a 6-digit password reset verification code has been sent to your email.' 
      });
    }

    // OTP Cooldown check (at least 60 seconds)
    if (isMongoDBActive()) {
      try {
        const mongoOtp = await MOtp.findOne({ email: normalizedEmail, verified: 0, used: false }).sort({ createdAt: -1 });
        if (mongoOtp) {
          const createdAtTime = new Date(mongoOtp.created_at || (mongoOtp as any).createdAt).getTime();
          if (Date.now() - createdAtTime < 60 * 1000) {
            return res.status(429).json({ error: 'Please wait at least 60 seconds before requesting a new code.' });
          }
        }
      } catch (mErr) {}
    }

    const { store, save } = getFallbackData();
    const existingOtp = store.otps?.find((o: any) => o.email.toLowerCase() === normalizedEmail);
    if (existingOtp) {
      const elapsed = Date.now() - new Date(existingOtp.created_at).getTime();
      if (elapsed < 60 * 1000) {
        return res.status(429).json({ error: 'Please wait at least 60 seconds before requesting a new code.' });
      }
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    const hashedCode = await bcrypt.hash(newCode, 10);

    // Persist OTP in MongoDB
    if (isMongoDBActive()) {
      try {
        await MOtp.deleteMany({ email: normalizedEmail });
        await MOtp.create({
          user_id: String(dbUser.id),
          email: normalizedEmail,
          verification_code: hashedCode,
          created_at: new Date(),
          expires_at: expiresAt,
          verified: 0,
          used: false,
          attempts: 0
        });
      } catch (mongoErr) {
        console.error('Error saving OTP to MongoDB:', mongoErr);
      }
    }

    // Persist OTP in fallback local JSON store
    if (!store.otps) store.otps = [];
    store.otps = store.otps.filter((o: any) => o.email.toLowerCase() !== normalizedEmail);
    store.otps.push({
      user_id: String(dbUser.id),
      email: normalizedEmail,
      verification_code: hashedCode,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      verified: 0,
      used: false,
      attempts: 0
    });
    save();

    // Send reset instructions email via Nodemailer
    try {
      await sendPasswordResetEmail(normalizedEmail, newCode, dbUser.fullName || dbUser.full_name || 'Student');
    } catch (mailErr: any) {
      console.error('Failed to send password reset email via Nodemailer:', mailErr);
    }

    return res.json({ 
      message: 'A 6-digit password reset verification code has been successfully sent to your email.'
    });

  } catch (err: any) {
    console.error('Error initiating password reset:', err);
    return res.status(500).json({ error: 'Failed to initiate password reset: ' + err.message });
  }
});

// 13. RESET PASSWORD
router.post('/reset-password', async (req: any, res: Response) => {
  const { email, code, otpCode, newPassword } = req.body;
  const targetEmail = String(email || '').trim().toLowerCase();
  const targetCode = String(code || otpCode || '').trim();

  if (!targetEmail || !targetCode || !newPassword) {
    return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
  }

  try {
    const allUsers = await getAllUsersList();
    const dbUser = allUsers.find(u => u.email.toLowerCase() === targetEmail);

    if (!dbUser) {
      return res.status(404).json({ error: 'Associated user account not found.' });
    }

    let mongoOtpRecord: any = null;
    if (isMongoDBActive()) {
      try {
        mongoOtpRecord = await MOtp.findOne({
          email: targetEmail,
          verified: 0,
          used: false,
          expires_at: { $gt: new Date() }
        }).sort({ createdAt: -1 });
      } catch (mErr) {
        console.error('Error fetching OTP from MongoDB:', mErr);
      }
    }

    const { store, save } = getFallbackData();
    const fallbackOtpIndex = store.otps?.findIndex((o: any) => 
      o.email.toLowerCase() === targetEmail && 
      (o.verified === 0 || o.used === false) && 
      new Date(o.expires_at).getTime() > Date.now()
    );

    if (!mongoOtpRecord && (fallbackOtpIndex === undefined || fallbackOtpIndex === -1)) {
      return res.status(400).json({ error: 'Invalid or expired password reset verification code.' });
    }

    const attempts = mongoOtpRecord ? (mongoOtpRecord.attempts || 0) : store.otps[fallbackOtpIndex].attempts;
    if (attempts >= 5) {
      return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new verification code.' });
    }

    const storedVerificationCode = mongoOtpRecord ? mongoOtpRecord.verification_code : store.otps[fallbackOtpIndex].verification_code;
    const isMatch = await bcrypt.compare(targetCode, storedVerificationCode);

    if (!isMatch) {
      if (isMongoDBActive() && mongoOtpRecord) {
        await MOtp.updateOne({ _id: mongoOtpRecord._id }, { $inc: { attempts: 1 } });
      }
      if (fallbackOtpIndex !== undefined && fallbackOtpIndex !== -1 && store.otps[fallbackOtpIndex]) {
        store.otps[fallbackOtpIndex].attempts = (store.otps[fallbackOtpIndex].attempts || 0) + 1;
        save();
      }
      return res.status(400).json({ error: 'Incorrect verification code. Please try again.' });
    }

    // Code is correct, validate password requirements
    const hasMinLength = newPassword.length >= 8;
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
    if (!hasMinLength || !hasLowercase || !hasUppercase || !hasNumber || !hasSpecialChar) {
      return res.status(400).json({ 
        error: 'New password does not meet security requirements: Minimum 8 characters, at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character.' 
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    dbUser.passwordHash = hashedNewPassword;
    dbUser.password_hash = hashedNewPassword;

    // Mark OTP record as verified/used
    if (isMongoDBActive() && mongoOtpRecord) {
      await MOtp.updateOne({ _id: mongoOtpRecord._id }, { $set: { verified: 1, used: true } });
    }
    if (store.otps) {
      store.otps = store.otps.filter((o: any) => o.email.toLowerCase() !== targetEmail);
      save();
    }

    // Sync to Firebase if active
    if (isFirebaseActive()) {
      const targetUid = dbUser.firebaseUid || dbUser.id;
      if (targetUid) {
        try {
          await firebaseUpdateUserPasswordAdmin(targetUid, newPassword);
        } catch (repairErr: any) {
          console.warn('Firebase Admin password sync note:', repairErr.message);
        }
      }
    }

    await saveOrUpdateUser(dbUser);

    return res.json({ message: 'Your password has been successfully reset! You can now log in with your new credentials.' });

  } catch (err: any) {
    console.error('Error resetting password:', err);
    return res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
});

// 14. SECURE PROXY UPLOAD-PROFILE-PHOTO (Authenticated profile picture upload)
router.post('/upload-profile-photo', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { image } = req.body;
  const userId = req.user?.id;

  if (!image) {
    return res.status(400).json({ error: 'Image base64 content is required.' });
  }

  try {
    // Proxy call to ImgBB
    const imgbbApiKey = process.env.IMGBB_API_KEY || process.env.VITE_IMGBB_API_KEY || 'eeae5ac8abaf61efd5cadc10b0fd0922';
    let cleanBase64 = image;
    if (image.startsWith('data:')) {
      cleanBase64 = image.split(',')[1];
    }
    cleanBase64 = cleanBase64.replace(/\s/g, '');

    let uploadedUrl = '';
    let success = false;

    try {
      const multipartForm = new FormData();
      multipartForm.append('image', cleanBase64);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: multipartForm
      });
      const data: any = await response.json();
      if (data && data.success) {
        uploadedUrl = data.data.url;
        success = true;
      }
    } catch (multipartErr) {
      console.warn('ImgBB multipart upload in profile photo failed, trying fallback...', multipartErr);
    }

    if (!success) {
      // Fallback urlencoded
      try {
        const formParams = new URLSearchParams();
        formParams.append('image', cleanBase64);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formParams.toString()
        });
        const data: any = await response.json();
        if (data && data.success) {
          uploadedUrl = data.data.url;
          success = true;
        }
      } catch (e) {
        console.error('All ImgBB uploads failed, saving locally:', e);
      }
    }

    // Save locally if ImgBB failed completely
    if (!success) {
      try {
        const UPLOADS_DIR = path.join(process.cwd(), 'server-uploads');
        if (!fs.existsSync(UPLOADS_DIR)) {
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
        const matches = image.match(/^data:image\/([A-Za-z-+0-9]+);base64,(.+)$/) || [null, 'png', cleanBase64];
        const ext = matches[1] || 'png';
        const rawBase64 = matches[2] || cleanBase64;
        const buffer = Buffer.from(rawBase64, 'base64');
        const filename = `avatar-${userId}-${Date.now()}.${ext}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
        uploadedUrl = `/server-uploads/${filename}`;
      } catch (localErr: any) {
        return res.status(500).json({ error: 'Failed to upload photo locally: ' + localErr.message });
      }
    }

    // Hydrate user profilePhoto
    const allUsers = await getAllUsersList();
    const dbUser = allUsers.find(u => String(u.id) === String(userId));
    if (!dbUser) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    dbUser.profilePhoto = uploadedUrl;
    dbUser.profile_photo = uploadedUrl;
    dbUser.avatar = uploadedUrl;

    const updatedUser = await saveOrUpdateUser(dbUser);

    return res.json({
      message: 'Profile photo uploaded successfully!',
      profilePhoto: uploadedUrl,
      user: updatedUser
    });

  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to process photo upload: ' + err.message });
  }
});

// 14b. SUBMIT INSTITUTIONAL VERIFICATION DOCUMENT
router.post('/submit-verification', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { verificationDocument } = req.body;
  const userId = req.user?.id;

  if (!verificationDocument) {
    return res.status(400).json({ error: 'Both front and back side photos of your student ID card are required.' });
  }

  // Strictly enforce 2-sided document upload
  const docUrls = String(verificationDocument).split(',').map((s: string) => s.trim()).filter(Boolean);
  if (docUrls.length < 2) {
    return res.status(400).json({ 
      error: 'Incomplete ID submission: Both front and back side photos of your physical student ID card are strictly mandatory.' 
    });
  }

  try {
    const allUsers = await getAllUsersList();
    const dbUser = allUsers.find(u => String(u.id) === String(userId));
    if (!dbUser) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    dbUser.verificationDocument = docUrls.join(',');
    dbUser.idVerificationStatus = 'pending';
    dbUser.idVerificationSubmittedAt = new Date().toISOString();

    const updatedUser = await saveOrUpdateUser(dbUser);

    // Also trigger an admin notification for the pending request
    try {
      await createAdminNotification({
        title: `🧑‍🎓 Student ID Verification Submitted`,
        message: `${dbUser.fullName || dbUser.email} (ID: ${dbUser.studentId || dbUser.student_id || 'N/A'}, Dept: ${dbUser.department || 'N/A'}) submitted ID card verification documents for review.`,
        type: 'id_verification_submitted',
        category: 'User',
        priority: 'medium',
        relatedUserId: dbUser.id
      });
    } catch (notifErr) {
      console.warn('Failed to create admin notification for verification:', notifErr);
    }

    return res.json({
      message: 'Student ID verification request submitted successfully! An administrator will review your ID shortly.',
      user: updatedUser
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to submit verification request: ' + err.message });
  }
});

// 15. DELETE USER ACCOUNT (Cascades and deletes everything securely)
router.delete(['/account', '/delete-account'], authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const userEmail = req.user?.email;
  const { password } = req.body;

  try {
    const allUsers = await getAllUsersList();
    const dbUser = allUsers.find(u => 
      String(u.id) === String(userId) ||
      String((u as any)._id) === String(userId) ||
      String((u as any).firebaseUid) === String(userId) ||
      String((u as any).user_id) === String(userId) ||
      (userEmail && u.email && u.email.trim().toLowerCase() === userEmail.trim().toLowerCase())
    );

    if (!dbUser) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (dbUser.role === 'admin' && String(dbUser.email || '').toLowerCase() === 'nazrulretrievers@gmail.com') {
      return res.status(403).json({ error: 'Root administrative account cannot be deleted.' });
    }

    // Verify password hash if account has a password
    const passHash = dbUser.passwordHash || dbUser.password_hash || '';
    if (passHash) {
      if (!password) {
        return res.status(400).json({ error: 'Password confirmation is required to delete your account.' });
      }
      const isPasswordCorrect = bcrypt.compareSync(password, passHash);
      if (!isPasswordCorrect) {
        return res.status(401).json({ error: 'Incorrect password. Account deletion aborted.' });
      }
    }

    // Perform cascade delete of everything across MongoDB, fallback storage, claims, items, images, chats, and notifications
    await performCascadeDeleteUser(dbUser.id || userId, dbUser);

    // Invalidate refresh tokens and cookies if present
    res.clearCookie('token');
    res.clearCookie('refreshToken');

    return res.json({ message: 'Your JKKNIU student account, listings, claims, and all associated registry records have been permanently deleted.' });

  } catch (err: any) {
    console.error('Error in account deletion:', err);
    return res.status(500).json({ error: 'Failed to delete account: ' + err.message });
  }
});

// Retain general Proxy Endpoint for compatibility
router.post('/upload-imgbb', async (req: any, res: Response) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'Image content is required.' });

  try {
    const imgbbApiKey = process.env.IMGBB_API_KEY || process.env.VITE_IMGBB_API_KEY || 'eeae5ac8abaf61efd5cadc10b0fd0922';
    let cleanBase64 = image;
    if (image.startsWith('data:')) {
      cleanBase64 = image.split(',')[1];
    }
    cleanBase64 = cleanBase64.replace(/\s/g, '');

    const form = new URLSearchParams();
    form.append('image', cleanBase64);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    const data: any = await response.json();
    if (data && data.success) {
      return res.json({
        url: data.data.url,
        display_url: data.data.display_url,
        thumb_url: data.data.thumb?.url
      });
    }

    // Fallback save locally
    const UPLOADS_DIR = path.join(process.cwd(), 'server-uploads');
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const filename = `img-${Date.now()}.png`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(cleanBase64, 'base64'));
    const localUrl = `/server-uploads/${filename}`;

    return res.json({
      url: localUrl,
      display_url: localUrl
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/contact', async (req: any, res: Response) => {
  try {
    let { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Please provide name, email, and message.' });
    }

    name = sanitizeInput(name);
    email = sanitizeInput(email);
    message = sanitizeInput(message);

    const validationErr = validateSupportContact({ name, email, message });
    if (validationErr) {
      return res.status(400).json({ error: validationErr });
    }

    const success = await sendSupportContactEmail(name, email, message);
    if (success) {
      return res.json({ success: true, message: 'Your support contact request was sent successfully.' });
    } else {
      return res.status(500).json({ error: 'Failed to transmit your message. Please try again later.' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
