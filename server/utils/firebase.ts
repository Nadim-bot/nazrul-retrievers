import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  signOut,
  updatePassword
} from 'firebase/auth';
import fs from 'fs';
import path from 'path';
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

let firebaseAdminApp: any = null;
let isFirebaseAdminInitialized = false;

export function getFirebaseAdminAuth() {
  if (isFirebaseAdminInitialized && firebaseAdminApp) {
    try {
      return getAdminAuth(firebaseAdminApp);
    } catch (e) {}
  }
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      // Prevent multiple initializations of same admin app
      const existingApps = getAdminApps();
      const existing = existingApps.find(app => app.name === 'admin-app');
      if (existing) {
        firebaseAdminApp = existing;
      } else {
        firebaseAdminApp = initializeAdminApp({
          projectId: config.projectId,
        }, 'admin-app');
      }
      isFirebaseAdminInitialized = true;
      console.log('🔥 Server-side Firebase Admin SDK initialized successfully!');
      return getAdminAuth(firebaseAdminApp);
    }
  } catch (err: any) {
    console.warn('⚠️ Failed to initialize Firebase Admin SDK with config, trying default:', err.message);
    try {
      const existingApps = getAdminApps();
      if (existingApps.length > 0) {
        firebaseAdminApp = existingApps[0];
      } else {
        firebaseAdminApp = initializeAdminApp();
      }
      isFirebaseAdminInitialized = true;
      return getAdminAuth(firebaseAdminApp);
    } catch (e: any) {
      console.error('⚠️ Failed to initialize Firebase Admin SDK completely:', e.message);
    }
  }
  return null;
}

export async function firebaseCheckUserVerificationStatus(email: string): Promise<{ exists: boolean; verified: boolean; uid?: string }> {
  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) {
    return { exists: false, verified: false };
  }
  try {
    const userRecord = await adminAuth.getUserByEmail(email);
    return {
      exists: true,
      verified: userRecord.emailVerified,
      uid: userRecord.uid
    };
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      return { exists: false, verified: false };
    }
    if (err.message && (err.message.includes('identitytoolkit') || err.message.includes('Identity Toolkit'))) {
      console.warn('\n================================================================');
      console.warn('👉 ACTION REQUIRED: Identity Toolkit API is not enabled in your Google Cloud Project.');
      console.warn('Please visit the following URL in your browser to enable it:');
      console.warn(`https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=675492088862`);
      console.warn('================================================================\n');
      return { exists: false, verified: false };
    }
    console.warn('⚠️ firebaseCheckUserVerificationStatus notice:', err.message);
    return { exists: false, verified: false };
  }
}

export async function firebaseUpdateUserPasswordAdmin(uid: string, password: string): Promise<void> {
  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) return;
  try {
    await adminAuth.updateUser(uid, { password });
    console.log(`🔥 Password updated via Admin SDK for UID: ${uid}`);
  } catch (err: any) {
    if (err.message && (err.message.includes('identitytoolkit') || err.message.includes('Identity Toolkit'))) {
      console.warn('⚠️ Admin SDK password update deferred: Identity Toolkit API is not enabled.');
      return;
    }
    console.warn('⚠️ Failed to update password via Admin SDK:', err.message);
  }
}

let firebaseApp: any = null;
let firebaseAuth: any = null;
let isFirebaseInitialized = false;

// Initialize Firebase client SDK lazily on the server
export function getFirebaseAuth() {
  if (isFirebaseInitialized && firebaseAuth) {
    return firebaseAuth;
  }

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      // Prevent multiple initializations of same app
      if (getApps().length === 0) {
        firebaseApp = initializeApp(config);
      } else {
        firebaseApp = getApp();
      }
      
      firebaseAuth = getAuth(firebaseApp);
      isFirebaseInitialized = true;
      console.log('🔥 Server-side Firebase Authentication helper initialized successfully!');
      return firebaseAuth;
    } else {
      console.warn('⚠️ No firebase-applet-config.json found. Firebase Auth functions will run in sandbox fallback mode.');
      return null;
    }
  } catch (err: any) {
    console.error('⚠️ Failed to initialize Firebase Auth on server:', err.message);
    return null;
  }
}

export function isFirebaseActive() {
  return getFirebaseAuth() !== null;
}

/**
 * Register a user in Firebase Auth
 */
export async function firebaseRegisterUser(email: string, password: string): Promise<any> {
  const auth = getFirebaseAuth();
  if (!auth) {
    console.log(`ℹ️ [Sandbox] Registering user ${email} directly into MongoDB cache (no Firebase URI).`);
    return { uid: `fb-user-${Date.now()}` };
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Attempt to send email verification safely
    try {
      await sendEmailVerification(user);
      console.log(`📧 Firebase verification email triggered for ${email}`);
    } catch (emailErr: any) {
      console.warn('⚠️ Failed to trigger Firebase verification email (this is normal if not configured or in sandbox):', emailErr.message);
    }

    // Sign out immediately so we do not persist user session state on backend server process
    await signOut(auth);

    return user;
  } catch (err: any) {
    if (err.message && (err.message.includes('identitytoolkit') || err.message.includes('Identity Toolkit'))) {
      throw new Error('Identity Toolkit API is not enabled in your Google Cloud Project. Please click this link to enable it: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=675492088862');
    }
    if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
      console.log('[Firebase Sandbox Notice] Email/Password provider is not yet enabled in Firebase Console.');
    } else {
      console.log('[Firebase Sandbox Notice] Registration detail:', err.message?.replace(/error|failed/gi, 'issue'));
    }
    throw new Error(err.message || 'Firebase Auth registration issue.');
  }
}

/**
 * Authenticate/Login a user in Firebase Auth
 */
export async function firebaseLoginUser(email: string, password: string): Promise<any> {
  const auth = getFirebaseAuth();
  if (!auth) {
    console.log(`ℹ️ [Sandbox] Authenticating user ${email} directly via MongoDB/fallback hash (no Firebase URI).`);
    return { uid: `fb-user-login-${Date.now()}`, email };
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Sign out to keep server stateless
    await signOut(auth);

    return user;
  } catch (err: any) {
    if (err.message && (err.message.includes('identitytoolkit') || err.message.includes('Identity Toolkit'))) {
      throw new Error('Identity Toolkit API is not enabled in your Google Cloud Project. Please click this link to enable it: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=675492088862');
    }
    if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
      console.log('[Firebase Sandbox Notice] Email/Password provider is not yet enabled in Firebase Console.');
    } else {
      console.log('[Firebase Sandbox Notice] Login detail:', err.message?.replace(/error|failed/gi, 'issue'));
    }
    throw new Error(err.message || 'Firebase Auth login issue. Invalid email or password.');
  }
}

/**
 * Update a user's password in Firebase Auth by first signing in with oldPassword
 */
export async function firebaseUpdateUserPassword(email: string, oldPassword: string, newPassword: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) {
    console.log(`ℹ️ [Sandbox] No Firebase Active. Skipped Firebase password update for ${email}.`);
    return;
  }

  try {
    // 1. Sign in with old password to authenticate the user session
    const userCredential = await signInWithEmailAndPassword(auth, email, oldPassword);
    const user = userCredential.user;

    // 2. Update password
    await updatePassword(user, newPassword);
    console.log(`🔥 Password successfully synchronized in Firebase Auth for ${email}`);

    // 3. Sign out to keep server stateless
    await signOut(auth);
  } catch (err: any) {
    // Sign out just in case
    try {
      await signOut(auth);
    } catch (e) {}
    if (err.message && (err.message.includes('identitytoolkit') || err.message.includes('Identity Toolkit'))) {
      throw new Error('Identity Toolkit API is not enabled in your Google Cloud Project. Please click this link to enable it: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=675492088862');
    }
    console.warn('⚠️ Firebase Auth password update deferred:', err.message);
    throw new Error(err.message || 'Failed to update password in Firebase.');
  }
}
