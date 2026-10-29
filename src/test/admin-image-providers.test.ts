import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import http from "http";
import { app } from "../../server/app";
import { imageProviderManager } from "../../server/services/imageProviders/imageProviderManager";
import {
  createPresentationSession,
  regenerateSlideVisual,
  deletePresentationSession,
} from "../../server/services/presentationSession.service";
import { detectProviderFromKey } from "../components/admin/tabs/AdminProvidersTab";
import { safeFetchJson, verifyProviderKeyDirectly } from "../lib/api-client";

let server: http.Server;
let baseUrl = "";
const adminKey = "documind-admin-secret";

beforeAll(async () => {
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
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    if (server) server.close(() => resolve());
    else resolve();
  });
});

beforeEach(() => {
  imageProviderManager.updateSettings({
    globallyEnabled: true,
    autoFallbackEnabled: true,
    maxGenerationsPerPresentation: 3,
  });
});

describe("Admin Dashboard & Multi-Provider AI Image Generation Suite", () => {
  describe("1. Security & Admin Authorization Safeguards", () => {
    it("rejects unauthenticated requests to /api/admin/providers with 403 Forbidden", async () => {
      const res = await fetch(`${baseUrl}/api/admin/providers`);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.message).toContain("Administrator permissions required");
    });

    it("rejects unauthenticated requests to /api/admin/image-generation/settings with 403 Forbidden", async () => {
      const res = await fetch(`${baseUrl}/api/admin/image-generation/settings`);
      expect(res.status).toBe(403);
    });

    it("allows authorized requests with valid X-Admin-Key header", async () => {
      const res = await fetch(`${baseUrl}/api/admin/providers`, {
        headers: { "X-Admin-Key": adminKey },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });
  });

  describe("2. Multi-Provider Management Center (5 Verified Providers)", () => {
    it("lists all 5 required providers with masked credentials and priority ordering", async () => {
      const res = await fetch(`${baseUrl}/api/admin/providers`, {
        headers: { "X-Admin-Key": adminKey },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      const providers = json.data;
      expect(providers.length).toBeGreaterThanOrEqual(5);

      const providerIds = providers.map((p: any) => p.id);
      expect(providerIds).toContain("gemini");
      expect(providerIds).toContain("huggingface");
      expect(providerIds).toContain("cloudflare");
      expect(providerIds).toContain("fal");
      expect(providerIds).toContain("replicate");

      // Verify secrets are masked (never return plaintext keys)
      for (const p of providers) {
        if (p.apiKey) {
          expect(p.apiKey).toContain("••••");
        }
      }
    });

    it("updates provider model, priority, and enabled toggle", async () => {
      const updateRes = await fetch(`${baseUrl}/api/admin/providers/huggingface`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          enabled: true,
          selectedModel: "black-forest-labs/FLUX.1-schnell",
          priority: 2,
        }),
      });

      expect(updateRes.status).toBe(200);
      const json = await updateRes.json();
      expect(json.success).toBe(true);
      expect(json.data.selectedModel).toBe("black-forest-labs/FLUX.1-schnell");

      const provider = imageProviderManager.getProvider("huggingface");
      expect(provider?.enabled).toBe(true);
    });

    it("executes provider connection test and returns latency and diagnostics", async () => {
      const res = await fetch(`${baseUrl}/api/admin/providers/gemini/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ apiKey: "test_invalid_gemini_key_for_diagnostic" }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(typeof json.data.latencyMs).toBe("number");
      expect(typeof json.data.message).toBe("string");
    });
  });

  describe("3. Strict Presentation Maker Exclusivity Enforcement", () => {
    it("strictly forbids image generation if source is not presentation_maker or admin_test", async () => {
      await expect(
        imageProviderManager.generateImage({
          source: "document_studio" as any,
          prompt: "Draw a corporate report header",
        }),
      ).rejects.toThrow("AI image generation is exclusively reserved for Presentation Maker");

      await expect(
        imageProviderManager.generateImage({
          source: "cover_designer" as any,
          prompt: "Draw an academic logo",
        }),
      ).rejects.toThrow("AI image generation is exclusively reserved for Presentation Maker");
    });

    it("permits image generation when source is presentation_maker or admin_test", async () => {
      const result = await imageProviderManager.generateImage({
        source: "admin_test",
        prompt: "Flowchart of distributed database consensus algorithm",
        concept: "Consensus Algorithm",
      });

      expect(result.success).toBe(true);
      expect(result.imageUrl).toBeDefined();
      expect(result.imageUrl.startsWith("data:image/")).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("4. Intelligent Fallback & Zero-Failure Synthesizer", () => {
    it("activates contextual vector synthesizer when external providers fail or are unconfigured", async () => {
      imageProviderManager.updateProvider("gemini", { enabled: false });
      imageProviderManager.updateProvider("huggingface", { enabled: false });

      const result = await imageProviderManager.generateImage({
        source: "presentation_maker",
        prompt: "Deep learning neural network layers and forward propagation",
        slideTitle: "Deep Neural Networks",
        concept: "Neural Topology",
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe("local-svg");
      expect(result.imageUrl).toContain("data:image/svg+xml;base64,");

      imageProviderManager.updateProvider("gemini", { enabled: true });
      imageProviderManager.updateProvider("huggingface", { enabled: true });
    });

    it("respects global image generation toggle and returns honest notice with fallback", async () => {
      imageProviderManager.updateSettings({ globallyEnabled: false });

      const result = await imageProviderManager.generateImage({
        source: "presentation_maker",
        prompt: "Photosynthesis chloroplast energy cycle",
        slideTitle: "Photosynthesis Process",
      });

      expect(result.success).toBe(true);
      expect(result.error).toContain("disabled by system administrator");

      imageProviderManager.updateSettings({ globallyEnabled: true });
    });
  });

  describe("5. Presentation Maker Visual Integration & Live Regeneration", () => {
    let createdSessionId = "";

    it("creates a presentation and guarantees at least one relevant visual is attached", async () => {
      const session = await createPresentationSession({
        title: "Microservices Architecture & Distributed Systems",
        content: `
          Microservices architecture divides a monolithic application into small autonomous services.
          Key pillars include API Gateways, event buses, distributed tracing, and independent databases.
          Resilience patterns like circuit breakers and bulkheads prevent cascading failures across services.
        `,
        slideCount: 4,
        purpose: "Technology & Engineering",
        theme: {
          id: "ocean-breeze",
          name: "Ocean Breeze",
          category: "Technology",
          kind: "technology",
          colors: { primary: "#0F172A", accent: "#2563EB", bg: "#FFFFFF" },
          fonts: "Inter / Roboto",
          tier: "free",
        },
      });

      expect(session).toBeDefined();
      createdSessionId = session.id;
      expect(session.slides.length).toBe(4);

      // Verify at least one slide has an attached visual
      const visualSlides = session.slides.filter((s) => s.visual?.imageUrl);
      expect(visualSlides.length).toBeGreaterThanOrEqual(1);

      const visualSlide = visualSlides[0]!;
      expect(visualSlide.visual?.imageUrl.startsWith("data:image/")).toBe(true);
      expect(visualSlide.visual?.concept).toBeDefined();
    });

    it("regenerates slide visual using multi-provider engine via API endpoint", async () => {
      expect(createdSessionId).not.toBe("");

      const res = await fetch(
        `${baseUrl}/api/presentations/session/${createdSessionId}/slide/1/regenerate-visual`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "Detailed container orchestration topology with Kubernetes pods and nodes",
          }),
        },
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.slides[1].visual).toBeDefined();
      expect(json.data.slides[1].visual.imageUrl).toBeDefined();

      deletePresentationSession(createdSessionId);
    });
  });

  describe("6. AI Provider Key Auto-Detection & Presentation Maker Manual Injection", () => {
    it("correctly auto-detects all 5 provider key signatures", () => {
      // Gemini / Imagen (both AIza and studio.ai AQ. format)
      const gemini = detectProviderFromKey("AIzaSyB3vY9_mockGeminiStudioKey12345");
      expect(gemini.id).toBe("gemini");
      expect(gemini.confidence).toBe("high");

      const geminiStudioPaid = detectProviderFromKey(
        "AQ.Ab8RN6IPKSuhHQLuwwTVZJ8tS2moPQGT6QLHgIhllG4ASbcQPQ",
      );
      expect(geminiStudioPaid.id).toBe("gemini");
      expect(geminiStudioPaid.confidence).toBe("high");

      // Hugging Face
      const hf = detectProviderFromKey("hf_mockUserAccessTokenSecret5678");
      expect(hf.id).toBe("huggingface");
      expect(hf.confidence).toBe("high");

      // Replicate
      const rep = detectProviderFromKey("r8_mockReplicateApiToken9999");
      expect(rep.id).toBe("replicate");
      expect(rep.confidence).toBe("high");

      // fal.ai (UUID:Secret or key_)
      const fal = detectProviderFromKey("key_mockFalAiClientKey98765");
      expect(fal.id).toBe("fal");
      expect(fal.confidence).toBe("high");

      const falColon = detectProviderFromKey("12345678-abcd-ef01-2345:mockFalSecretKey98765");
      expect(falColon.id).toBe("fal");
      expect(falColon.confidence).toBe("high");

      // Cloudflare (40-char token)
      const cf = detectProviderFromKey("a1b2c3d4e5f678901234567890abcdef12345678");
      expect(cf.id).toBe("cloudflare");
      expect(cf.confidence).toBe("medium");

      // Unknown / Empty
      const unknown = detectProviderFromKey("random_unrecognized_key");
      expect(unknown.id).toBeNull();
      expect(unknown.confidence).toBe("low");
    });

    it("ingests dynamic presentation AI provider keys when creating presentation session", async () => {
      const res = await fetch(`${baseUrl}/api/presentations/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Microservices Architecture",
          content: "Comprehensive overview of service mesh, API gateways, event-driven streaming, and Docker containers across cloud clusters.",
          slideCount: 4,
          theme: {
            id: "executive-brief",
            name: "Executive Brief",
            category: "Business",
            kind: "business",
            colors: { primary: "#0F172A", accent: "#2563EB", bg: "#FFFFFF" },
            fonts: "Inter",
            tier: "free",
          },
          providerKeys: {
            gemini: "AIzaSy_customPresentationTestKey_1234567",
            huggingface: "hf_customPresentationTestToken_987654",
          },
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.sessionId).toBeDefined();

      // Verify that imageProviderManager has the updated keys
      const allProviders = imageProviderManager.getProvidersForClient();
      const gemini = allProviders.find((p) => p.id === "gemini");
      expect(gemini?.isConfigured).toBe(true);

      const hf = allProviders.find((p) => p.id === "huggingface");
      expect(hf?.isConfigured).toBe(true);

      deletePresentationSession(json.data.sessionId);
    });

    it("safely handles HTML 404/SPA responses without throwing SyntaxError: Unexpected token '<'", async () => {
      // Mock fetch returning HTML to simulate Vercel SPA routing
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response("<!DOCTYPE html><html><body>Vercel SPA Fallback</body></html>", {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });

      try {
        const fallbackValue = { success: false, fallback: true };
        const result = await safeFetchJson(
          "https://mock-domain.com/api/admin/providers/gemini/test",
          {},
          fallbackValue,
        );

        expect(result).toEqual(fallbackValue);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("provides direct client-side verification probe without throwing on missing keys", async () => {
      const emptyResult = await verifyProviderKeyDirectly("gemini", "");
      expect(emptyResult.success).toBe(false);
      expect(emptyResult.data.message).toContain("No API key entered");

      const falResult = await verifyProviderKeyDirectly("fal", "key_test_12345");
      expect(falResult.success).toBe(true);
      expect(falResult.data.message).toContain("Key format accepted");
    });
  });
});
