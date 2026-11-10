import crypto from "crypto";
import fs from "fs";
import path from "path";
import { ENV } from "../config/env";
import { getAdminDb, initializeFirebaseAdmin } from "../config/firebase";

export type SecretSlot =
  | "gemini"
  | "huggingface"
  | "cloudflare"
  | "cloudflare_account_id"
  | "fal"
  | "replicate"
  | "openai"
  | "groq"
  | "openrouter"
  | "ollama_base_url"
  | "exaone";

const VAULT_FILE = path.join(process.cwd(), "server", "config", ".runtime-secrets.enc.json");
const FIRESTORE_COLLECTION = "serverSecrets";
const FIRESTORE_DOC = "presentationAiProviders";

const inMemorySecrets = new Map<SecretSlot, string>();
let firestoreHydrated = false;
let hydrationInFlight: Promise<void> | null = null;

function isTestRuntime(): boolean {
  return process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
}

function deriveEncryptionKey(): Buffer {
  const seed = `${ENV.ADMIN_SECRET_KEY || "documind-server-secret"}::${ENV.FIREBASE_PROJECT_ID || "documind"}`;
  return crypto.scryptSync(seed, "documind-secret-vault-salt-v1", 32);
}

export function encryptSecretsPayload(payload: Record<string, string>): {
  v: 1;
  iv: string;
  tag: string;
  data: string;
  updatedAt: string;
} {
  const key = deriveEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
    updatedAt: new Date().toISOString(),
  };
}

export function decryptSecretsPayload(record: {
  iv?: string;
  tag?: string;
  data?: string;
}): Record<string, string> | null {
  if (!record?.iv || !record?.tag || !record?.data) return null;
  try {
    const key = deriveEncryptionKey();
    const iv = Buffer.from(record.iv, "base64");
    const tag = Buffer.from(record.tag, "base64");
    const data = Buffer.from(record.data, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(decrypted);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function loadLocalEncryptedVaultSync(): void {
  if (isTestRuntime()) return;
  try {
    if (!fs.existsSync(VAULT_FILE)) return;
    const raw = fs.readFileSync(VAULT_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const decoded = decryptSecretsPayload(parsed);
    if (decoded) {
      for (const [slot, val] of Object.entries(decoded)) {
        if (typeof val === "string" && val.trim() && !val.includes("••••")) {
          inMemorySecrets.set(slot as SecretSlot, val.trim());
        }
      }
    }
  } catch {
    // Ignore unreadable local vault
  }
}

loadLocalEncryptedVaultSync();

async function persistEncryptedVault(): Promise<{
  savedToVaultFile: boolean;
  savedToFirestore: boolean;
}> {
  if (isTestRuntime()) {
    return { savedToVaultFile: false, savedToFirestore: false };
  }

  const plainMap: Record<string, string> = {};
  for (const [slot, val] of inMemorySecrets.entries()) {
    if (val && val.trim()) {
      plainMap[slot] = val.trim();
    }
  }
  const encryptedRecord = encryptSecretsPayload(plainMap);
  let savedToVaultFile = false;
  let savedToFirestore = false;

  try {
    const dir = path.dirname(VAULT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(VAULT_FILE, JSON.stringify(encryptedRecord, null, 2), {
      encoding: "utf-8",
      mode: 0o600,
    });
    savedToVaultFile = true;
  } catch (err) {
    console.warn("[SecretVault] Failed persisting local encrypted vault:", redactSecrets(String(err)));
  }

  try {
    let db = getAdminDb();
    if (!db) {
      db = initializeFirebaseAdmin().db;
    }
    if (db) {
      await db.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC).set(encryptedRecord);
      savedToFirestore = true;
    }
  } catch (err) {
    console.warn(
      "[SecretVault] Failed persisting encrypted secrets to Firestore:",
      redactSecrets(String(err)),
    );
  }

  if (!savedToVaultFile && !savedToFirestore) {
    throw new Error(
      "Could not persist encrypted provider credentials to Cloud Firestore or local server vault.",
    );
  }

  return { savedToVaultFile, savedToFirestore };
}

/**
 * Hydrates secrets from Cloud Firestore's server-only `serverSecrets` collection (blocked to all client SDK reads).
 */
export async function hydrateServerSecrets(forceRefresh = false): Promise<void> {
  if ((firestoreHydrated && !forceRefresh) || isTestRuntime()) return;
  if (hydrationInFlight && !forceRefresh) return hydrationInFlight;

  hydrationInFlight = (async () => {
    try {
      let db = getAdminDb();
      if (!db) {
        db = initializeFirebaseAdmin().db;
      }
      if (!db) return;

      const snap = await db.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC).get();
      if (snap.exists) {
        const decoded = decryptSecretsPayload(snap.data() as any);
        if (decoded) {
          for (const [slot, val] of Object.entries(decoded)) {
            if (typeof val === "string" && val.trim() && !val.includes("••••")) {
              if (!inMemorySecrets.has(slot as SecretSlot)) {
                inMemorySecrets.set(slot as SecretSlot, val.trim());
              }
            }
          }
        }
      }
      firestoreHydrated = true;
    } catch (err) {
      console.warn("[SecretVault] Firestore hydration warning:", redactSecrets(String(err)));
    } finally {
      hydrationInFlight = null;
    }
  })();

  return hydrationInFlight;
}

export function getEnvFallbackForSlot(slot: SecretSlot): string {
  switch (slot) {
    case "gemini":
      return (ENV.GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || "").trim();
    case "huggingface":
      return (process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || "").trim();
    case "cloudflare":
      return (process.env.CLOUDFLARE_API_TOKEN || "").trim();
    case "cloudflare_account_id":
      return (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
    case "fal":
      return (process.env.FAL_KEY || "").trim();
    case "replicate":
      return (process.env.REPLICATE_API_TOKEN || "").trim();
    case "openai":
      return (process.env.OPENAI_API_KEY || "").trim();
    case "groq":
      return (process.env.GROQ_API_KEY || "").trim();
    case "openrouter":
      return (process.env.OPENROUTER_API_KEY || "").trim();
    case "ollama_base_url":
      return (process.env.OLLAMA_BASE_URL || "").trim();
    case "exaone":
      return (ENV.EXAONE_API_KEY || process.env.EXAONE_API_KEY || "").trim();
    default:
      return "";
  }
}

export function resolveServerSecret(slot: SecretSlot): {
  value: string;
  source: "env" | "firestore" | "server_vault" | "none";
} {
  const stored = inMemorySecrets.get(slot);
  if (stored && stored.trim().length > 0) {
    return {
      value: stored.trim(),
      source: getAdminDb() ? "firestore" : "server_vault",
    };
  }
  const envVal = getEnvFallbackForSlot(slot);
  if (envVal) {
    return { value: envVal, source: "env" };
  }
  return { value: "", source: "none" };
}

export function getServerSecret(slot: SecretSlot): string {
  return resolveServerSecret(slot).value;
}

export function isPlaceholderTestSecret(key?: string): boolean {
  if (!key) return false;
  const lower = key.trim().toLowerCase();
  return (
    lower.includes("mock") ||
    lower.includes("testkey") ||
    lower.includes("test_invalid") ||
    lower.includes("custompresentationtest")
  );
}

/**
 * Hydrates existing vault first so saving one key never clobbers another, then awaits encrypted persistence.
 */
export async function setServerSecret(slot: SecretSlot, rawValue: string): Promise<void> {
  const trimmed = (rawValue || "").trim();
  if (trimmed.includes("••••")) {
    return;
  }
  await hydrateServerSecrets();
  if (!trimmed) {
    inMemorySecrets.delete(slot);
  } else {
    inMemorySecrets.set(slot, trimmed);
  }
  await persistEncryptedVault();
}

export function setServerSecretSync(slot: SecretSlot, rawValue: string): void {
  const trimmed = (rawValue || "").trim();
  if (trimmed.includes("••••")) {
    return;
  }
  if (!trimmed) {
    inMemorySecrets.delete(slot);
  } else {
    inMemorySecrets.set(slot, trimmed);
  }
  void persistEncryptedVault();
}

export function maskSecretValue(key: string): string {
  const trimmed = (key || "").trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "••••••••";
  return `••••${trimmed.slice(-4)}`;
}

export function getMaskedSecretInfo(slot: SecretSlot): {
  isConfigured: boolean;
  maskedKey: string;
  keySource: "env" | "firestore" | "server_vault" | "none";
} {
  const { value, source } = resolveServerSecret(slot);
  const configured = value.trim().length > 0;
  return {
    isConfigured: configured,
    maskedKey: configured ? maskSecretValue(value) : "",
    keySource: configured ? source : "none",
  };
}

export function getSecretPersistenceDiagnostics(): {
  hydrated: boolean;
  vaultFileExists: boolean;
  firestoreInitialized: boolean;
  configuredSlotCount: number;
} {
  return {
    hydrated: firestoreHydrated,
    vaultFileExists: fs.existsSync(VAULT_FILE),
    firestoreInitialized: Boolean(getAdminDb()),
    configuredSlotCount: inMemorySecrets.size,
  };
}

/**
 * Redacts API tokens and query-parameter keys from error messages and log lines.
 */
export function redactSecrets(input: string): string {
  if (!input) return "";
  return input
    .replace(/([?&](?:key|apiKey|token)=)[^&\s"']+/gi, "$1[REDACTED]")
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, "[REDACTED_GOOGLE_KEY]")
    .replace(/\bAQ\.[0-9A-Za-z_.-]{12,}\b/g, "[REDACTED_GOOGLE_TOKEN]")
    .replace(/\bhf_[0-9A-Za-z]{10,}\b/g, "[REDACTED_HF_TOKEN]")
    .replace(/\bsk-(?:proj-|or-v1-)?[0-9A-Za-z_-]{12,}\b/g, "[REDACTED_API_KEY]")
    .replace(/\bgsk_[0-9A-Za-z_-]{12,}\b/g, "[REDACTED_GROQ_KEY]")
    .replace(/\br8_[0-9A-Za-z_-]{10,}\b/g, "[REDACTED_REPLICATE_KEY]")
    .replace(/\b(Bearer|Key)\s+[A-Za-z0-9._:-]{12,}\b/gi, "$1 [REDACTED_TOKEN]");
}

/**
 * Resets in-memory secrets cache (for automated tests only).
 */
export function resetServerSecretsForTest(): void {
  if (isTestRuntime()) {
    inMemorySecrets.clear();
  }
}
