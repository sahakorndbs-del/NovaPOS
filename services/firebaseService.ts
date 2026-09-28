
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  setDoc,
  FirestoreError
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

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
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively removes all undefined fields from objects and arrays.
 * Firestore client SDK strictly rejects any object with `undefined` values.
 */
export function cleanUndefined<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    if (data instanceof Date || typeof (data as any).toMillis === 'function') {
      return data;
    }
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        result[key] = cleanUndefined(value);
      }
    }
    return result as T;
  }
  return data;
}

export const firebaseService = {
  // Generic collection listener
  subscribeCollection: (path: string, callback: (data: any[]) => void) => {
    return onSnapshot(collection(db, path), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Generic document listener
  subscribeDoc: (path: string, docId: string, callback: (data: any) => void) => {
    return onSnapshot(doc(db, path, docId), (snapshot) => {
      if (snapshot.exists()) {
        callback({ ...snapshot.data(), id: snapshot.id });
      } else {
        callback(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `${path}/${docId}`);
    });
  },

  // Create or Update
  set: async (path: string, id: string, data: any) => {
    try {
      const sanitized = cleanUndefined({ ...data, id });
      await setDoc(doc(db, path, id), { ...sanitized, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
    }
  },

  // Add (auto ID)
  add: async (path: string, data: any) => {
    try {
      const sanitized = cleanUndefined(data);
      const docRef = await addDoc(collection(db, path), { ...sanitized, createdAt: new Date().toISOString() });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Delete
  delete: async (path: string, id: string) => {
    try {
      // 1. Delete by doc ID
      await deleteDoc(doc(db, path, id));

      // 2. Also check if any doc in this collection has field id == id (in case document ID differed)
      try {
        const q = query(collection(db, path), where('id', '==', id));
        const querySnap = await getDocs(q);
        for (const d of querySnap.docs) {
          if (d.id !== id) {
            await deleteDoc(doc(db, path, d.id));
          }
        }
      } catch (subErr) {
        // Fallback catch if index/rules for sub-query
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  },

  // Get All
  getAll: async (path: string) => {
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }
};
