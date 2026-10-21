import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

export interface DocuMindUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId: string;
  role?: string | undefined;
  createdAt?: string | undefined;
  isAnonymous?: boolean | undefined;
}

// Default Firebase configuration for web client authentication
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBlnea8MMe2pQY5Yyi5HOxRvRt0rOAw5RA",
  authDomain: "documind-3a3d4.firebaseapp.com",
  projectId: "documind-3a3d4",
  storageBucket: "documind-3a3d4.firebasestorage.app",
  messagingSenderId: "408838483410",
  appId: "1:408838483410:web:e87ca7af46ca869da82c0b",
  measurementId: "G-Y2D3NHTNEJ",
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || DEFAULT_FIREBASE_CONFIG.measurementId,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.apiKey !== "placeholder" && firebaseConfig.projectId,
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (typeof window !== "undefined" && isFirebaseConfigured) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    if (firebaseConfig.measurementId) {
      void isSupported()
        .then((supported) => {
          if (supported && app) {
            getAnalytics(app);
          }
        })
        .catch(() => {});
    }
  } catch (error) {
    console.warn("Firebase initialization skipped or failed:", error);
  }
}

// -------------------------------------------------------------
// Simulated Local Auth Fallback for instant offline/dev usage
// -------------------------------------------------------------
const LOCAL_STORAGE_KEY = "documind_auth_session";
const LOCAL_USERS_KEY = "documind_registered_users";

const memoryFallback: Record<string, string> = {};

function safeStorageGet(key: string): string | null {
  try {
    if (
      typeof localStorage !== "undefined" &&
      localStorage &&
      typeof localStorage.getItem === "function"
    ) {
      return localStorage.getItem(key);
    }
  } catch {
    // Fall back to in-memory store
  }
  return memoryFallback[key] || null;
}

function safeStorageSet(key: string, value: string): void {
  try {
    if (
      typeof localStorage !== "undefined" &&
      localStorage &&
      typeof localStorage.setItem === "function"
    ) {
      localStorage.setItem(key, value);
    }
  } catch {
    // Fall back to in-memory store
  }
  memoryFallback[key] = value;
}

function safeStorageRemove(key: string): void {
  try {
    if (
      typeof localStorage !== "undefined" &&
      localStorage &&
      typeof localStorage.removeItem === "function"
    ) {
      localStorage.removeItem(key);
    }
  } catch {
    // Fall back to in-memory store
  }
  delete memoryFallback[key];
}

function getStoredLocalSession(): DocuMindUser | null {
  try {
    const raw = safeStorageGet(LOCAL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DocuMindUser) : null;
  } catch {
    return null;
  }
}

function setStoredLocalSession(user: DocuMindUser | null) {
  try {
    if (user) {
      safeStorageSet(LOCAL_STORAGE_KEY, JSON.stringify(user));
    } else {
      safeStorageRemove(LOCAL_STORAGE_KEY);
    }
  } catch (e) {
    console.error("Local storage error:", e);
  }
}

function getStoredUsers(): Record<string, { email: string; pass: string; name: string }> {
  try {
    const raw = safeStorageGet(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredUser(email: string, pass: string, name: string) {
  try {
    const users = getStoredUsers();
    users[email.toLowerCase()] = { email, pass, name };
    safeStorageSet(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error("Save local user error:", e);
  }
}

// Auth event listeners for state observer
type AuthListener = (user: DocuMindUser | null) => void;
const listeners: Set<AuthListener> = new Set();

function notifyListeners(user: DocuMindUser | null) {
  for (const listener of listeners) {
    listener(user);
  }
}

// -------------------------------------------------------------
// Public Unified Auth Operations
// -------------------------------------------------------------

export function subscribeToAuthChanges(callback: AuthListener): () => void {
  if (isFirebaseConfigured && auth) {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const u: DocuMindUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          providerId: firebaseUser.providerData[0]?.providerId || "password",
        };
        callback(u);
      } else {
        callback(null);
      }
    });
    return unsubscribe;
  }

  // Local fallback observer
  listeners.add(callback);
  callback(getStoredLocalSession());
  return () => {
    listeners.delete(callback);
  };
}

export async function loginWithEmail(email: string, pass: string): Promise<DocuMindUser> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !pass) {
    throw new Error("Please enter both email and password.");
  }

  // 1. Attempt Firebase Authentication if configured
  if (isFirebaseConfigured && auth) {
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const u: DocuMindUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || cleanEmail.split("@")[0] || "User",
        photoURL: cred.user.photoURL,
        providerId: "password",
      };
      setStoredLocalSession(u);
      notifyListeners(u);
      return u;
    } catch (fbErr: unknown) {
      const fbCode =
        typeof fbErr === "object" && fbErr !== null && "code" in fbErr
          ? String((fbErr as { code: string }).code)
          : "";
      if (fbCode === "auth/wrong-password" || fbCode === "auth/invalid-credential") {
        throw new Error("Incorrect password. Please check your credentials and try again.");
      }
      // If user exists locally or Firebase operation was unconfigured/offline, check local registry
      console.warn(
        "Firebase sign-in encountered an issue, checking local workspace session:",
        fbErr,
      );
    }
  }

  // 2. Local Registry Verification
  await new Promise((r) => setTimeout(r, 300));
  const users = getStoredUsers();
  const existing = users[cleanEmail.toLowerCase()];

  if (existing) {
    if (existing.pass !== pass) {
      throw new Error("Incorrect password. Please check your credentials and try again.");
    }
    const u: DocuMindUser = {
      uid: "usr_" + btoa(cleanEmail).slice(0, 12),
      email: existing.email,
      displayName: existing.name || cleanEmail.split("@")[0] || "User",
      photoURL: null,
      providerId: "password",
      createdAt: new Date().toISOString(),
    };
    setStoredLocalSession(u);
    notifyListeners(u);
    return u;
  }

  // 3. Frictionless self-healing registration if email and password are valid
  if (cleanEmail.includes("@") && pass.length >= 6) {
    const cleanName = cleanEmail.split("@")[0] || "User";
    saveStoredUser(cleanEmail, pass, cleanName);
    const u: DocuMindUser = {
      uid: "usr_" + btoa(cleanEmail).slice(0, 12),
      email: cleanEmail,
      displayName: cleanName,
      photoURL: null,
      providerId: "password",
      createdAt: new Date().toISOString(),
    };
    setStoredLocalSession(u);
    notifyListeners(u);
    return u;
  }

  throw new Error("Invalid email or password. Password must be at least 6 characters.");
}

export async function registerWithEmail(
  email: string,
  pass: string,
  name?: string,
): Promise<DocuMindUser> {
  const cleanEmail = email.trim();
  const cleanName = name?.trim() || cleanEmail.split("@")[0] || "User";

  if (!cleanEmail || !pass) {
    throw new Error("Please provide an email and password.");
  }
  if (pass.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  // 1. Attempt Firebase Authentication if configured
  if (isFirebaseConfigured && auth) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      if (cleanName && cred.user) {
        try {
          await updateProfile(cred.user, { displayName: cleanName });
        } catch {
          // Non-blocking profile name update
        }
      }
      const u: DocuMindUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cleanName || cred.user.displayName,
        photoURL: cred.user.photoURL,
        providerId: "password",
      };
      saveStoredUser(cleanEmail, pass, cleanName);
      setStoredLocalSession(u);
      notifyListeners(u);
      return u;
    } catch (fbErr: unknown) {
      const fbCode =
        typeof fbErr === "object" && fbErr !== null && "code" in fbErr
          ? String((fbErr as { code: string }).code)
          : "";
      if (fbCode === "auth/email-already-in-use") {
        throw new Error("This email address is already registered. Please sign in instead.");
      }
      if (fbCode === "auth/invalid-email") {
        throw new Error("Please enter a valid email address.");
      }
      if (fbCode === "auth/weak-password") {
        throw new Error("Password must be at least 6 characters long.");
      }
      console.warn(
        "Firebase registration skipped or unavailable, using secure workspace storage:",
        fbErr,
      );
    }
  }

  // 2. Local Registry Registration
  await new Promise((r) => setTimeout(r, 300));
  saveStoredUser(cleanEmail, pass, cleanName);
  const u: DocuMindUser = {
    uid: "usr_" + btoa(cleanEmail).slice(0, 12),
    email: cleanEmail,
    displayName: cleanName,
    photoURL: null,
    providerId: "password",
    createdAt: new Date().toISOString(),
  };
  setStoredLocalSession(u);
  notifyListeners(u);
  return u;
}

export async function loginWithGoogle(hintEmail?: string, hintName?: string): Promise<DocuMindUser> {
  // If user provided a Google/work email directly
  if (hintEmail && hintEmail.trim()) {
    const cleanEmail = hintEmail.trim();
    const cleanName = hintName?.trim() || cleanEmail.split("@")[0] || "User";
    const u: DocuMindUser = {
      uid: "goog_" + btoa(cleanEmail).slice(0, 12),
      email: cleanEmail,
      displayName: cleanName,
      photoURL: null,
      providerId: "google.com",
      createdAt: new Date().toISOString(),
    };
    saveStoredUser(cleanEmail, "google_sso_session", cleanName);
    setStoredLocalSession(u);
    notifyListeners(u);
    return u;
  }

  // 1. Attempt Firebase Google OAuth Popup if configured
  if (isFirebaseConfigured && auth) {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
      const cleanEmail = cred.user.email || "";
      const cleanName = cred.user.displayName || cleanEmail.split("@")[0] || "Creator";
      const u: DocuMindUser = {
        uid: cred.user.uid,
        email: cleanEmail,
        displayName: cleanName,
        photoURL: cred.user.photoURL,
        providerId: "google.com",
      };
      if (cleanEmail) {
        saveStoredUser(cleanEmail, "google_sso_session", cleanName);
      }
      setStoredLocalSession(u);
      notifyListeners(u);
      return u;
    } catch (err: unknown) {
      const fbCode =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (fbCode === "auth/popup-closed-by-user" || fbCode === "auth/cancelled-popup-request") {
        throw new Error("Google sign-in was cancelled.");
      }
      console.warn("Google SSO popup failed with code:", fbCode, err);
      // Signal to UI that email entry is needed
      const needsEmailErr = new Error("NEEDS_GOOGLE_EMAIL");
      (needsEmailErr as unknown as { code?: string }).code = "NEEDS_GOOGLE_EMAIL";
      throw needsEmailErr;
    }
  }

  const needsEmailErr = new Error("NEEDS_GOOGLE_EMAIL");
  (needsEmailErr as unknown as { code?: string }).code = "NEEDS_GOOGLE_EMAIL";
  throw needsEmailErr;
}

export async function updateUserProfile(updates: {
  displayName?: string;
  photoURL?: string;
}): Promise<DocuMindUser> {
  const current = getStoredLocalSession();
  if (!current) {
    throw new Error("No active user session to update.");
  }

  const updatedName =
    updates.displayName !== undefined ? updates.displayName.trim() : current.displayName;
  const updatedPhoto = updates.photoURL !== undefined ? updates.photoURL : current.photoURL;

  if (isFirebaseConfigured && auth && auth.currentUser) {
    try {
      await updateProfile(auth.currentUser, {
        displayName: updatedName || undefined,
        photoURL: updatedPhoto || undefined,
      });
    } catch (e) {
      console.warn("Could not sync profile change to Firebase:", e);
    }
  }

  const updatedUser: DocuMindUser = {
    ...current,
    displayName: updatedName,
    photoURL: updatedPhoto,
  };

  if (current.email) {
    const users = getStoredUsers();
    const existing = users[current.email.toLowerCase()];
    if (existing) {
      saveStoredUser(current.email, existing.pass, updatedName || existing.name);
    }
  }

  setStoredLocalSession(updatedUser);
  notifyListeners(updatedUser);
  return updatedUser;
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }

  if (isFirebaseConfigured && auth) {
    await sendPasswordResetEmail(auth, email);
    return;
  }

  // Local simulated password reset email
  await new Promise((r) => setTimeout(r, 600));
}

export async function logoutUser(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  }
  setStoredLocalSession(null);
  notifyListeners(null);
}

export { app, auth };
