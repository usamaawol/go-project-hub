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

// Check for user-provided Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env["VITE_FIREBASE_API_KEY"],
  authDomain: import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"],
  projectId: import.meta.env["VITE_FIREBASE_PROJECT_ID"],
  storageBucket: import.meta.env["VITE_FIREBASE_STORAGE_BUCKET"],
  messagingSenderId: import.meta.env["VITE_FIREBASE_MESSAGING_SENDER_ID"],
  appId: import.meta.env["VITE_FIREBASE_APP_ID"],
  measurementId: import.meta.env["VITE_FIREBASE_MEASUREMENT_ID"],
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

function getStoredLocalSession(): DocuMindUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DocuMindUser) : null;
  } catch {
    return null;
  }
}

function setStoredLocalSession(user: DocuMindUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  } catch (e) {
    console.error("Local storage error:", e);
  }
}

function getStoredUsers(): Record<string, { email: string; pass: string; name: string }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredUser(email: string, pass: string, name: string) {
  if (typeof window === "undefined") return;
  try {
    const users = getStoredUsers();
    users[email.toLowerCase()] = { email, pass, name };
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
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
  if (!email || !pass) {
    throw new Error("Please enter both email and password.");
  }

  if (isFirebaseConfigured && auth) {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName,
      photoURL: cred.user.photoURL,
      providerId: "password",
    };
  }

  // Local simulated login
  await new Promise((r) => setTimeout(r, 600));
  const users = getStoredUsers();
  const found = users[email.toLowerCase()];
  if (!found || found.pass !== pass) {
    // If not found in registered, allow default demo access or report invalid
    if (email.includes("@") && pass.length >= 6) {
      const demoUser: DocuMindUser = {
        uid: "local_" + btoa(email).slice(0, 12),
        email,
        displayName: email.split("@")[0] || "User",
        photoURL: null,
        providerId: "password",
        createdAt: new Date().toISOString(),
      };
      setStoredLocalSession(demoUser);
      notifyListeners(demoUser);
      return demoUser;
    }
    throw new Error("Invalid email or password. Password must be at least 6 characters.");
  }

  const u: DocuMindUser = {
    uid: "local_" + btoa(email).slice(0, 12),
    email: found.email,
    displayName: found.name || found.email.split("@")[0] || "User",
    photoURL: null,
    providerId: "password",
    createdAt: new Date().toISOString(),
  };
  setStoredLocalSession(u);
  notifyListeners(u);
  return u;
}

export async function registerWithEmail(
  email: string,
  pass: string,
  name?: string,
): Promise<DocuMindUser> {
  if (!email || !pass) {
    throw new Error("Please provide an email and password.");
  }
  if (pass.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  if (isFirebaseConfigured && auth) {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name && cred.user) {
      await updateProfile(cred.user, { displayName: name });
    }
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: name || cred.user.displayName,
      photoURL: cred.user.photoURL,
      providerId: "password",
    };
  }

  // Local simulated registration
  await new Promise((r) => setTimeout(r, 600));
  saveStoredUser(email, pass, name || email.split("@")[0] || "User");
  const u: DocuMindUser = {
    uid: "local_" + btoa(email).slice(0, 12),
    email,
    displayName: name || email.split("@")[0] || "User",
    photoURL: null,
    providerId: "password",
    createdAt: new Date().toISOString(),
  };
  setStoredLocalSession(u);
  notifyListeners(u);
  return u;
}

export async function loginWithGoogle(): Promise<DocuMindUser> {
  if (isFirebaseConfigured && auth) {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName,
      photoURL: cred.user.photoURL,
      providerId: "google.com",
    };
  }

  // Local simulated Google popup login
  await new Promise((r) => setTimeout(r, 700));
  const u: DocuMindUser = {
    uid: "google_demo_" + Math.random().toString(36).substring(2, 9),
    email: "creator@google.com",
    displayName: "Google Demo User",
    photoURL:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
    providerId: "google.com",
    createdAt: new Date().toISOString(),
  };
  setStoredLocalSession(u);
  notifyListeners(u);
  return u;
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
