import { getAdminDb } from "../config/firebase";
import { TEMPLATES } from "../../src/data/templates";

export interface TemplateRecord {
  id: string;
  templateId?: string;
  name: string;
  category: string;
  kind: string;
  slidesCount: number;
  fonts: string;
  colors: {
    primary: string;
    accent: string;
    bg: string;
  };
  bestFor: string;
  description: string;
  tags: string[];
  slides: Array<{
    title: string;
    subtitle?: string;
    bullets?: string[];
    layout?: string;
  }>;
  isPublished?: boolean;
  isFree: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const COLLECTION_NAME = "templates";

export async function listTemplates(options: {
  category?: string;
  search?: string;
}): Promise<TemplateRecord[]> {
  const { category, search } = options;
  const db = getAdminDb();

  // Baseline templates map keyed by ID
  const templateMap = new Map<string, TemplateRecord>();
  for (const t of TEMPLATES) {
    templateMap.set(t.id, {
      ...(t as unknown as TemplateRecord),
      isPublished: true,
      isFree: true,
    });
  }

  // Overlay any customized or newly added templates from Firestore
  if (db) {
    try {
      const snap = await db.collection(COLLECTION_NAME).get();
      if (!snap.empty) {
        for (const doc of snap.docs) {
          const data = doc.data() as TemplateRecord;
          const id = data.id || data.templateId || doc.id;
          const existing = templateMap.get(id);
          templateMap.set(id, { ...existing, ...data, id });
        }
      }
    } catch (e) {
      console.warn("[Firestore] listTemplates overlay failed, using static:", (e as Error).message);
    }
  }

  let results = Array.from(templateMap.values()).filter((t) => t.isPublished !== false);

  if (category && category !== "All") {
    results = results.filter((t) => t.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }

  return results;
}

export async function getTemplateById(id: string): Promise<TemplateRecord | null> {
  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db.collection(COLLECTION_NAME).doc(id).get();
      if (snap.exists) {
        return snap.data() as TemplateRecord;
      }
    } catch (e) {
      console.warn(`[Firestore] getTemplateById(${id}) failed:`, (e as Error).message);
    }
  }

  const staticFound = TEMPLATES.find((t) => t.id === id);
  return (staticFound as unknown as TemplateRecord) || null;
}

export async function toggleTemplatePublish(
  id: string,
  isPublished: boolean,
): Promise<{ success: boolean; data?: Partial<TemplateRecord> }> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  if (db) {
    try {
      const docRef = db.collection(COLLECTION_NAME).doc(id);
      const snap = await docRef.get();
      if (snap.exists) {
        await docRef.update({ isPublished, updatedAt: now });
        return { success: true, data: { id, isPublished, updatedAt: now } };
      } else {
        const staticTemplate = TEMPLATES.find((t) => t.id === id);
        if (staticTemplate) {
          const newDoc: TemplateRecord = {
            ...(staticTemplate as unknown as TemplateRecord),
            isPublished,
            updatedAt: now,
            createdAt: now,
          };
          await docRef.set(newDoc);
          return { success: true, data: newDoc };
        }
      }
    } catch (e) {
      console.warn(`[Firestore] toggleTemplatePublish(${id}) failed:`, (e as Error).message);
    }
  }

  return { success: true, data: { id, isPublished } };
}
