/**
 * JKKNIU Lost & Found - Cloud Firestore Backend Adapter
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Error Handler definitions as per Firebase Skill guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path
  };
  console.error('🔥 Firestore Adapter Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let firestoreDb: any = null;
let isFirestoreInitialized = false;

export function getFirestoreDB() {
  if (isFirestoreInitialized && firestoreDb) {
    return firestoreDb;
  }

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      let app;
      if (getApps().length === 0) {
        app = initializeApp(config);
      } else {
        app = getApp();
      }
      firestoreDb = getFirestore(app, config.firestoreDatabaseId);
      isFirestoreInitialized = true;
      console.log('🔥 Server-side Firestore Adapter initialized successfully!');
      return firestoreDb;
    } else {
      console.warn('⚠️ No firebase-applet-config.json found on server for Firestore Adapter.');
      return null;
    }
  } catch (err: any) {
    console.error('⚠️ Failed to initialize Firestore Adapter on server:', err.message);
    return null;
  }
}

/**
 * Fetch all documents from a Firestore collection
 */
export async function getFirestoreCollection(collectionName: string): Promise<any[]> {
  const db = getFirestoreDB();
  if (!db) return [];

  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const items: any[] = [];
    snapshot.forEach((docSnap) => {
      items.push({ ...docSnap.data(), id: docSnap.id });
    });
    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, collectionName);
    return [];
  }
}

/**
 * Save/update a document in a Firestore collection
 */
export async function setFirestoreDocument(collectionName: string, docId: string, data: any): Promise<void> {
  const db = getFirestoreDB();
  if (!db) return;

  try {
    const docRef = doc(db, collectionName, docId);
    // Ensure nested objects don't contain undefined fields which Firestore rejects
    const cleanData = JSON.parse(JSON.stringify(data, (key, value) => value === undefined ? null : value));
    await setDoc(docRef, cleanData);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${docId}`);
  }
}

/**
 * Delete a document from a Firestore collection
 */
export async function deleteFirestoreDocument(collectionName: string, docId: string): Promise<void> {
  const db = getFirestoreDB();
  if (!db) return;

  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${docId}`);
  }
}
