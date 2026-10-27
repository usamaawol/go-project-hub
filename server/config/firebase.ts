import { initializeApp, getApps, getApp, cert, applicationDefault, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { ENV } from "./env";

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;
let initializationAttempted = false;
let isConnected = false;

/**
 * Resolves Firebase service account credentials from supported sources:
 * 1. Discrete environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
 * 2. GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_PATH (file path)
 * 3. FIREBASE_SERVICE_ACCOUNT_KEY (JSON string)
 * 4. Application Default Credentials (ADC)
 */
function resolveCredential() {
  // Option 1: Local file path from GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_PATH
  const credPath =
    ENV.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(process.cwd(), "serviceAccountKey.json");

  if (credPath && fs.existsSync(credPath)) {
    try {
      const fileData = fs.readFileSync(credPath, "utf-8");
      const parsed = JSON.parse(fileData);
      return cert(parsed);
    } catch (e) {
      console.warn(`[Firebase Admin] Could not load service account from ${credPath}:`, e);
    }
  }

  // Option 2: Explicit environment variables (Vercel / Cloud hosted environment)
  const projectId = ENV.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = ENV.FIREBASE_CLIENT_EMAIL;
  let privateKey = ENV.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Handle escaped newlines from environment strings
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (projectId && clientEmail && privateKey) {
    return cert({
      projectId,
      clientEmail,
      privateKey,
    });
  }

  // Option 3: JSON string in environment variable
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      return cert(parsed);
    } catch (e) {
      console.warn("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:", e);
    }
  }

  // Option 4: Application Default Credentials (GCP / Firebase Hosting runtime)
  try {
    return applicationDefault();
  } catch {
    return undefined;
  }
}

/**
 * Initializes Firebase Admin SDK singleton
 */
export function initializeFirebaseAdmin(): {
  app: App | null;
  auth: Auth | null;
  db: Firestore | null;
} {
  if (adminApp) {
    return { app: adminApp, auth: adminAuth, db: adminDb };
  }

  if (initializationAttempted && !adminApp) {
    return { app: null, auth: null, db: null };
  }

  initializationAttempted = true;

  try {
    const existingApps = getApps();
    if (existingApps.length > 0 && existingApps[0]) {
      adminApp = existingApps[0];
    } else {
      const credential = resolveCredential();
      const projectId =
        ENV.FIREBASE_PROJECT_ID ||
        process.env.VITE_FIREBASE_PROJECT_ID ||
        "documind-3a3d4";

      if (credential) {
        adminApp = initializeApp({
          credential,
          projectId,
        });
      } else {
        adminApp = initializeApp({
          projectId,
        });
      }
    }

    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);
    // Ignore undefined properties to avoid Firestore write errors
    adminDb.settings({ ignoreUndefinedProperties: true });

    console.log(`[Firebase Admin] Initialized successfully for project: ${adminApp.options.projectId || "default"}`);
    return { app: adminApp, auth: adminAuth, db: adminDb };
  } catch (error) {
    console.warn(
      "[Firebase Admin] Could not initialize Firebase Admin SDK. Backend will operate in secure fallback mode:",
      (error as Error).message,
    );
    return { app: null, auth: null, db: null };
  }
}

/**
 * Checks if Firestore is accessible
 */
export async function isFirestoreConnected(): Promise<boolean> {
  if (isConnected) return true;
  if (!adminDb) {
    const initialized = initializeFirebaseAdmin();
    if (!initialized.db) return false;
  }

  try {
    if (!adminDb) return false;
    // Perform a lightweight probe to verify read capability
    await adminDb.collection("healthCheck").limit(1).get();
    isConnected = true;
    return true;
  } catch (err) {
    console.warn("[Firebase Admin] Firestore connectivity check warning:", (err as Error).message);
    return false;
  }
}

export function getAdminAuth(): Auth | null {
  if (!adminAuth) initializeFirebaseAdmin();
  return adminAuth;
}

export function getAdminDb(): Firestore | null {
  if (!adminDb) initializeFirebaseAdmin();
  return adminDb;
}

export { adminApp, adminAuth, adminDb };
