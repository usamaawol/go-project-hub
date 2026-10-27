import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { app } from "../../server/app";
import {
  initializeFirebaseAdmin,
  isFirestoreConnected,
  getAdminAuth,
  getAdminDb,
} from "../../server/config/firebase";
import {
  getUser,
  upsertUser,
  updateUserPlan,
  countUsers,
  listUsers,
} from "../../server/services/userService";
import {
  createFeedback,
  listFeedback,
  updateFeedbackStatus,
  countFeedback,
} from "../../server/services/feedbackService";
import {
  createDocumentJob,
  listRecentJobs,
  countJobs,
} from "../../server/services/documentJobService";
import {
  listTemplates,
  getTemplateById,
  toggleTemplatePublish,
} from "../../server/services/templateService";

let server: http.Server;
let baseUrl = "";

beforeAll(async () => {
  // Start server on an ephemeral port for testing
  await new Promise<void>((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const address = server.address();
      if (typeof address === "object" && address !== null) {
        baseUrl = `http://127.0.0.1:${address.port}`;
      }
      resolve();
    });
  });
}, 30000);

afterAll(async () => {
  await new Promise<void>((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}, 30000);

describe("DocuMind Firebase Backend Migration Acceptance Criteria", { timeout: 30000 }, () => {
  // 1. Firebase Admin Initialization & Connection
  it("initializes Firebase Admin SDK and connects to Cloud Firestore", async () => {
    const admin = initializeFirebaseAdmin();
    expect(admin.app).not.toBeNull();
    expect(admin.auth).not.toBeNull();
    expect(admin.db).not.toBeNull();

    expect(getAdminAuth()).not.toBeNull();
    expect(getAdminDb()).not.toBeNull();

    const connected = await isFirestoreConnected();
    expect(connected).toBe(true);
  });

  // 2. Health Endpoint Verification
  it("GET /api/health reports Cloud Firestore database connectivity", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.database).toBe("connected");
    expect(body.databaseType).toBe("Cloud Firestore");
    expect(body.freeAccessPolicy.freeTemplatesCount).toBe(110);
  });

  // 3. User Service & Firestore Storage
  it("reads, creates, and updates user profile records in Firestore", async () => {
    const testUid = "test_user_" + Math.random().toString(36).substring(2, 8);
    const created = await upsertUser(testUid, {
      email: `${testUid}@documind.test`,
      displayName: "Test User",
      role: "user",
      plan: "free",
      preferences: {
        theme: "light",
        defaultCompression: "Balanced",
      },
    });

    expect(created.uid).toBe(testUid);
    expect(created.email).toBe(`${testUid}@documind.test`);
    expect(created.plan).toBe("free");

    // Retrieve user
    const fetched = await getUser(testUid);
    expect(fetched).not.toBeNull();
    expect(fetched?.displayName).toBe("Test User");

    // Upgrade plan
    const upgraded = await updateUserPlan(testUid, "pro");
    expect(upgraded?.plan).toBe("pro");

    // List and count users
    const allUsers = await listUsers(50);
    expect(allUsers.length).toBeGreaterThan(0);

    const counts = await countUsers();
    expect(counts.totalUsers).toBeGreaterThan(0);
  });

  // 4. Feedback Service & Endpoints
  it("submits and lists feedback with input validation", async () => {
    // Missing required fields
    const invalidRes = await fetch(`${baseUrl}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 5 }), // missing comment
    });
    expect(invalidRes.status).toBe(400);

    // Valid feedback submission
    const validRes = await fetch(`${baseUrl}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: 5,
        category: "feature",
        comment: "Cloud Firestore migration verified with zero data loss.",
        email: "student@harvard.edu",
      }),
    });
    expect(validRes.status).toBe(201);
    const body = await validRes.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();

    // Update feedback status
    const updated = await updateFeedbackStatus(body.data.id, "reviewed");
    expect(updated?.status).toBe("reviewed");

    // Count feedback
    const count = await countFeedback();
    expect(count).toBeGreaterThan(0);
  });

  // 5. Document Job Ephemeral Telemetry (Zero File Storage)
  it("logs document job metadata without storing file contents", async () => {
    const jobId = "test_job_" + Math.random().toString(36).substring(2, 8);
    const job = await createDocumentJob({
      jobId,
      userId: "test_user_ephemeral",
      toolType: "convert",
      originalFilename: "Research_Paper.pdf",
      fileSize: 102400,
      mimeType: "application/pdf",
      status: "completed",
      metrics: {
        processingTimeMs: 145,
        outputSizeBytes: 89200,
        extractedWordCount: 450,
      },
    });

    expect(job.jobId).toBe(jobId);
    expect(job.status).toBe("completed");

    // Check count and recent list
    const recent = await listRecentJobs(10);
    expect(recent.length).toBeGreaterThan(0);
    expect(recent.some((j) => j.jobId === jobId)).toBe(true);

    const counts = await countJobs();
    expect(counts.totalJobs).toBeGreaterThan(0);
  });

  // 6. Template Service & Governance
  it("lists, fetches, and toggles template publication state", async () => {
    const templates = await listTemplates({ category: "Business" });
    expect(templates.length).toBeGreaterThanOrEqual(10);

    const first = templates[0];
    expect(first).toBeDefined();

    const fetched = await getTemplateById(first.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe(first.name);

    const toggled = await toggleTemplatePublish(first.id, false);
    expect(toggled.success).toBe(true);

    // Revert back to true to ensure 100% free access policy
    const reverted = await toggleTemplatePublish(first.id, true);
    expect(reverted.success).toBe(true);
  });

  // 7. Security: Administrative Authorization Enforcement
  it("rejects unauthorized access to admin endpoints and grants authorized access", async () => {
    // 1. Without credentials -> 403 Forbidden
    const unauthRes = await fetch(`${baseUrl}/api/admin/metrics`);
    expect(unauthRes.status).toBe(403);

    // 2. With valid Admin Key header -> 200 OK
    const authHeaderRes = await fetch(`${baseUrl}/api/admin/metrics`, {
      headers: { "x-admin-key": "documind-admin-secret" },
    });
    expect(authHeaderRes.status).toBe(200);
    const metrics = await authHeaderRes.json();
    expect(metrics.success).toBe(true);
    expect(metrics.data.databaseConnected).toBe(true);

    // 3. With adminKey query parameter -> 200 OK
    const authQueryRes = await fetch(`${baseUrl}/api/admin/metrics?adminKey=documind-admin-secret`);
    expect(authQueryRes.status).toBe(200);

    // 4. Test purge-temp administrative endpoint
    const purgeRes = await fetch(`${baseUrl}/api/admin/purge-temp`, {
      method: "POST",
      headers: { "x-admin-key": "documind-admin-secret" },
    });
    expect(purgeRes.status).toBe(200);
    const purgeBody = await purgeRes.json();
    expect(purgeBody.success).toBe(true);
  });

  // 8. Document Processing Validation & Privacy
  it("rejects invalid document extraction and conversion inputs", async () => {
    // Empty extract payload
    const extractRes = await fetch(`${baseUrl}/api/documents/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(extractRes.status).toBe(400);

    // AI guide missing text
    const guideRes = await fetch(`${baseUrl}/api/documents/guide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: "presentation" }),
    });
    expect(guideRes.status).toBe(400);
  });
});
