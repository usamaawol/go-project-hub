import { getAdminDb } from "../config/firebase";

export interface UserRecord {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: "user" | "admin";
  plan: "free" | "pro";
  preferences?: {
    defaultCompression?: string;
    presentationFormat?: string;
    theme?: "light" | "dark";
  };
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
}

// In-memory fallback registry for offline/mock development
const inMemoryUsers: Map<string, UserRecord> = new Map([
  [
    "usr_adm_99102",
    {
      uid: "usr_adm_99102",
      displayName: "Lead Administrator",
      email: "admin@documind.app",
      role: "admin",
      plan: "pro",
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      updatedAt: new Date().toISOString(),
      photoURL: "",
      lastActive: "Just now",
    },
  ],
  [
    "goog_8829104",
    {
      uid: "goog_8829104",
      displayName: "Dr. Marcus Vance",
      email: "dr.marcus@berkeley.edu",
      role: "user",
      plan: "pro",
      createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
      updatedAt: new Date().toISOString(),
      photoURL: "",
      lastActive: "18m ago",
    },
  ],
  [
    "goog_4472911",
    {
      uid: "goog_4472911",
      displayName: "Elena Rostova",
      email: "elena.rostova@techcorp.io",
      role: "user",
      plan: "pro",
      createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
      updatedAt: new Date().toISOString(),
      photoURL: "",
      lastActive: "42m ago",
    },
  ],
  [
    "usr_9912048",
    {
      uid: "usr_9912048",
      displayName: "Sarah Jenkins",
      email: "sarah.jenkins@designstudio.co",
      role: "user",
      plan: "free",
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date().toISOString(),
      photoURL: "",
      lastActive: "2h ago",
    },
  ],
  [
    "usr_3381920",
    {
      uid: "usr_3381920",
      displayName: "Alexander Klein",
      email: "alexander.k@quantumlab.org",
      role: "user",
      plan: "pro",
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date().toISOString(),
      photoURL: "",
      lastActive: "5h ago",
    },
  ],
  [
    "goog_1109483",
    {
      uid: "goog_1109483",
      displayName: "Tariq Nasser",
      email: "tariq.n@mobilefirst.dev",
      role: "user",
      plan: "free",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
      photoURL: "",
      lastActive: "Yesterday",
    },
  ],
]);

const COLLECTION_NAME = "users";

export async function getUser(uid: string): Promise<UserRecord | null> {
  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db.collection(COLLECTION_NAME).doc(uid).get();
      if (snap.exists) {
        return snap.data() as UserRecord;
      }
    } catch (e) {
      console.warn(`[Firestore] getUser(${uid}) failed, using fallback:`, (e as Error).message);
    }
  }
  return inMemoryUsers.get(uid) || null;
}

export async function upsertUser(
  uid: string,
  updates: Partial<Omit<UserRecord, "uid">>,
): Promise<UserRecord> {
  const now = new Date().toISOString();
  const db = getAdminDb();

  const existing = await getUser(uid);
  const userRecord: UserRecord = {
    uid,
    email: updates.email || existing?.email || "",
    displayName: updates.displayName !== undefined ? updates.displayName : existing?.displayName || "",
    photoURL: updates.photoURL !== undefined ? updates.photoURL : existing?.photoURL || "",
    role: updates.role || existing?.role || "user",
    plan: updates.plan || existing?.plan || "free",
    preferences: {
      defaultCompression: "Balanced",
      presentationFormat: "16:9",
      theme: "light",
      ...(existing?.preferences || {}),
      ...(updates.preferences || {}),
    },
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    lastActive: updates.lastActive || "Just now",
  };

  if (db) {
    try {
      await db.collection(COLLECTION_NAME).doc(uid).set(userRecord, { merge: true });
    } catch (e) {
      console.warn(`[Firestore] upsertUser(${uid}) failed:`, (e as Error).message);
    }
  }

  inMemoryUsers.set(uid, userRecord);
  return userRecord;
}

export async function listUsers(limitCount = 100): Promise<UserRecord[]> {
  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db
        .collection(COLLECTION_NAME)
        .orderBy("createdAt", "desc")
        .limit(limitCount)
        .get();

      if (!snap.empty) {
        return snap.docs.map((doc) => doc.data() as UserRecord);
      }
    } catch (e) {
      console.warn("[Firestore] listUsers failed, using fallback:", (e as Error).message);
    }
  }

  return Array.from(inMemoryUsers.values()).slice(0, limitCount);
}

export async function updateUserPlan(
  uid: string,
  plan: "free" | "pro",
): Promise<UserRecord | null> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  if (db) {
    try {
      const userRef = db.collection(COLLECTION_NAME).doc(uid);
      const snap = await userRef.get();
      if (snap.exists) {
        await userRef.update({ plan, updatedAt: now });
        const updated = (await userRef.get()).data() as UserRecord;
        inMemoryUsers.set(uid, updated);
        return updated;
      }
    } catch (e) {
      console.warn(`[Firestore] updateUserPlan(${uid}) failed:`, (e as Error).message);
    }
  }

  const inMem = inMemoryUsers.get(uid);
  if (inMem) {
    inMem.plan = plan;
    inMem.updatedAt = now;
    inMemoryUsers.set(uid, inMem);
    return inMem;
  }

  return null;
}

export async function countUsers(): Promise<{ totalUsers: number; proPlanUsers: number }> {
  const db = getAdminDb();
  if (db) {
    try {
      const usersSnap = await db.collection(COLLECTION_NAME).count().get();
      const proSnap = await db
        .collection(COLLECTION_NAME)
        .where("plan", "==", "pro")
        .count()
        .get();

      const total = usersSnap.data().count;
      if (total > 0) {
        return {
          totalUsers: total,
          proPlanUsers: proSnap.data().count,
        };
      }
    } catch (e) {
      console.warn("[Firestore] countUsers query failed, using fallback:", (e as Error).message);
    }
  }

  const all = Array.from(inMemoryUsers.values());
  return {
    totalUsers: all.length,
    proPlanUsers: all.filter((u) => u.plan === "pro").length,
  };
}
