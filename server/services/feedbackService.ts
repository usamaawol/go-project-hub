import { getAdminDb } from "../config/firebase";

export interface FeedbackRecord {
  id: string;
  userId?: string | null;
  email: string;
  rating: number;
  category: "feature" | "bug" | "template_request" | "general" | "improvement";
  comment: string;
  status: "pending" | "reviewed" | "resolved" | "in_progress";
  createdAt: string;
}

const inMemoryFeedback: FeedbackRecord[] = [
  {
    id: "fb-101",
    userId: null,
    rating: 5,
    category: "improvement",
    comment:
      "The new in-browser PowerPoint preview is game-changing! Being able to inspect the slides before downloading saves so much time.",
    email: "elena.rostova@techcorp.io",
    status: "resolved",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "fb-102",
    userId: null,
    rating: 5,
    category: "feature",
    comment:
      "All 110 templates being 100% free with no hidden credit card paywalls is incredible. Highly recommended for university lectures.",
    email: "dr.marcus@berkeley.edu",
    status: "reviewed",
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    id: "fb-103",
    userId: null,
    rating: 4,
    category: "feature",
    comment:
      "Would love an export option directly to Google Slides in addition to PPTX! The presentation layout quality is top tier.",
    email: "sarah.jenkins@designstudio.co",
    status: "in_progress",
    createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
  },
  {
    id: "fb-104",
    userId: null,
    rating: 5,
    category: "general",
    comment:
      "The PDF compressor reduced my 38MB research paper down to 4.2MB without blurring any charts. Flawless work.",
    email: "alexander.k@quantumlab.org",
    status: "resolved",
    createdAt: new Date(Date.now() - 86400000 * 2.8).toISOString(),
  },
  {
    id: "fb-105",
    userId: null,
    rating: 4,
    category: "bug",
    comment:
      "In mobile view on iPhone 15 Pro, the slide thumbnail sidebar was slightly wide in portrait orientation, but landscape mode looks great.",
    email: "tariq.n@mobilefirst.dev",
    status: "reviewed",
    createdAt: new Date(Date.now() - 86400000 * 3.5).toISOString(),
  },
];

const COLLECTION_NAME = "feedback";

export async function createFeedback(input: {
  userId?: string | null;
  email?: string;
  rating: number;
  category?: string;
  comment: string;
}): Promise<FeedbackRecord> {
  const db = getAdminDb();
  const id = "fb-" + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();

  const record: FeedbackRecord = {
    id,
    userId: input.userId || null,
    email: input.email || "anonymous",
    rating: Number(input.rating),
    category: (input.category || "general") as FeedbackRecord["category"],
    comment: String(input.comment),
    status: "pending",
    createdAt: now,
  };

  if (db) {
    try {
      const docRef = db.collection(COLLECTION_NAME).doc(id);
      await docRef.set(record);
    } catch (e) {
      console.warn("[Firestore] createFeedback failed:", (e as Error).message);
    }
  }

  inMemoryFeedback.unshift(record);
  return record;
}

export async function listFeedback(limitCount = 50): Promise<FeedbackRecord[]> {
  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db
        .collection(COLLECTION_NAME)
        .orderBy("createdAt", "desc")
        .limit(limitCount)
        .get();

      if (!snap.empty) {
        return snap.docs.map((doc) => doc.data() as FeedbackRecord);
      }
    } catch (e) {
      console.warn("[Firestore] listFeedback failed, using fallback:", (e as Error).message);
    }
  }

  return inMemoryFeedback.slice(0, limitCount);
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: "pending" | "reviewed" | "resolved" | "in_progress",
): Promise<FeedbackRecord | null> {
  const db = getAdminDb();
  if (db) {
    try {
      const docRef = db.collection(COLLECTION_NAME).doc(feedbackId);
      const snap = await docRef.get();
      if (snap.exists) {
        await docRef.update({ status });
        const updated = (await docRef.get()).data() as FeedbackRecord;
        const index = inMemoryFeedback.findIndex((f) => f.id === feedbackId);
        if (index >= 0) inMemoryFeedback[index] = updated;
        return updated;
      }
    } catch (e) {
      console.warn(`[Firestore] updateFeedbackStatus(${feedbackId}) failed:`, (e as Error).message);
    }
  }

  const item = inMemoryFeedback.find((f) => f.id === feedbackId);
  if (item) {
    item.status = status;
    return item;
  }
  return null;
}

export async function countFeedback(): Promise<number> {
  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db.collection(COLLECTION_NAME).count().get();
      const count = snap.data().count;
      if (count > 0) return count;
    } catch (e) {
      console.warn("[Firestore] countFeedback failed:", (e as Error).message);
    }
  }
  return inMemoryFeedback.length;
}
