/**
 * Cloud Firestore Modular Service (v9+)
 * Provides clean, type-safe, production-ready operations for Cloud Firestore.
 */

import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type Firestore,
  type DocumentData,
  type QueryConstraint,
  type FirestoreDataConverter,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Generic Firestore Data Converter for TypeScript Type Safety
 */
export function createConverter<T extends DocumentData>(): FirestoreDataConverter<T> {
  return {
    toFirestore(modelObject: T): DocumentData {
      return {
        ...modelObject,
        updatedAt: serverTimestamp(),
      };
    },
    fromFirestore(snapshot, options): T {
      const data = snapshot.data(options);
      return {
        id: snapshot.id,
        ...data,
      } as unknown as T;
    },
  };
}

/**
 * 1. Create or Update a document with a specific ID (setDoc)
 */
export async function setDocument<T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: Partial<T>,
  merge: boolean = true
): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const docRef = doc(db, collectionName, docId);
  await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge });
}

/**
 * 2. Create a document with an auto-generated ID (addDoc)
 */
export async function addDocument<T extends DocumentData>(
  collectionName: string,
  data: Omit<T, "id">
): Promise<string> {
  if (!db) throw new Error("Firestore is not initialized.");
  const colRef = collection(db, collectionName);
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * 3. Read a single document by ID (getDoc)
 */
export async function getDocument<T extends DocumentData>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  const docRef = doc(db, collectionName, docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as unknown as T;
}

/**
 * 4. Query multiple documents (getDocs with queries)
 */
export async function queryDocuments<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const colRef = collection(db, collectionName);
  const q = query(colRef, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as T));
}

/**
 * 5. Listen to real-time updates (onSnapshot)
 */
export function subscribeToDocument<T extends DocumentData>(
  collectionName: string,
  docId: string,
  onUpdate: (data: T | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) throw new Error("Firestore is not initialized.");
  const docRef = doc(db, collectionName, docId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
      } else {
        onUpdate({ id: snap.id, ...snap.data() } as unknown as T);
      }
    },
    (error) => {
      if (onError) onError(error);
      else console.error(`Firestore subscription error on ${collectionName}/${docId}:`, error);
    }
  );
}

/**
 * 6. Listen to real-time query updates (onSnapshot)
 */
export function subscribeToQuery<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[],
  onUpdate: (data: T[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) throw new Error("Firestore is not initialized.");
  const colRef = collection(db, collectionName);
  const q = query(colRef, ...constraints);
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as T));
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      else console.error(`Firestore query subscription error on ${collectionName}:`, error);
    }
  );
}
