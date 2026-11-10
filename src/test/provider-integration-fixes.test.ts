import { describe, expect, it, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import {
  callGeminiGenerateContent,
  callFreeFallbackTextProvider,
  buildDiagnosticSamplePdfBase64,
  DEFAULT_GEMINI_TEXT_MODEL,
  resolveSupportedGeminiModel,
} from "../../server/services/presentationAiClient";
import {
  testGeminiConnection,
  testFallbackTextConnection,
  getAdminSettings,
  updateAdminSettings,
} from "../../server/services/adminSettings.service";
import { imageProviderManager } from "../../server/services/imageProviders/imageProviderManager";
import { createPresentationSession, deletePresentationSession } from "../../server/services/presentationSession.service";
import {
  decryptSecretsPayload,
  encryptSecretsPayload,
  getServerSecret,
  redactSecrets,
  resetServerSecretsForTest,
  setServerSecret,
} from "../../server/services/serverSecretStore";
import { createApp } from "../../server/app";
import {
  fetchAdminImageProviders,
  fetchAdminSettings,
  purgeLegacyBrowserProviderSecrets,
  updateAdminImageProvider,
  updateAdminSettings as updateAdminSettingsClient,
} from "../lib/api-client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetServerSecretsForTest();
  vi.restoreAllMocks();
});

describe("Presentation Maker AI Provider Integration & Admin Security Verification", () => {
  describe("1. Gemini 3.8 Flash Connection, Text, JSON & PDF Understanding", () => {
    it("migrates legacy gemini-2.5-flash references cleanly to gemini-3.8-flash", () => {
      expect(DEFAULT_GEMINI_TEXT_MODEL).toBe("gemini-3.8-flash");
      expect(resolveSupportedGeminiModel("gemini-2.5-flash")).toBe("gemini-3.8-flash");
      expect(resolveSupportedGeminiModel(undefined)).toBe("gemini-3.8-flash");
      const settings = getAdminSettings(true);
      expect(settings.geminiModel).toBe("gemini-3.8-flash");
    });

    it("tests Gemini text + structured JSON output using x-goog-api-key header (never query string)", async () => {
      const captured: Array<{ url: string; headers: Record<string, string>; body: any }> = [];
      globalThis.fetch = (async (url: any, init?: any) => {
        captured.push({
          url: String(url),
          headers: (init?.headers || {}) as Record<string, string>,
          body: JSON.parse(String(init?.body || "{}")),
        });
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify({ status: "ready", modelEcho: "gemini-3.8-flash", ok: true }) }],
                },
              },
            ],
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "x-ratelimit-remaining-requests": "14",
            },
          },
        );
      }) as any;

      const res = await testGeminiConnection("AIzaSy_ValidSecretTestKey_0001", "gemini-3.8-flash");
      expect(res.success).toBe(true);
      expect(res.model).toBe("gemini-3.8-flash");
      expect(res.capabilities?.text).toBe(true);
      expect(res.capabilities?.json).toBe(true);

      expect(captured.length).toBe(1);
      expect(captured[0]!.url).toBe(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      );
      expect(captured[0]!.url).not.toContain("AIzaSy");
      expect(captured[0]!.headers["x-goog-api-key"]).toBe("AIzaSy_ValidSecretTestKey_0001");
      expect(captured[0]!.body.generationConfig?.responseMimeType).toBe("application/json");
      expect(captured[0]!.body.generationConfig?.responseSchema).toBeDefined();
      expect(res.rateLimitHeaders?.["x-ratelimit-remaining-requests"]).toBe("14");
    });

    it("verifies Gemini multimodal PDF document understanding with structured JSON response", async () => {
      const capturedBodies: any[] = [];
      globalThis.fetch = (async (_url: any, init?: any) => {
        const body = JSON.parse(String(init?.body || "{}"));
        capturedBodies.push(body);
        const hasPdf = Boolean(body?.contents?.[0]?.parts?.some((p: any) => p?.inlineData?.mimeType === "application/pdf"));
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify(
                        hasPdf
                          ? { documentTitle: "DocuMind PDF Diagnostic", topic: "Quantum Annealing Overview" }
                          : { status: "ready", ok: true },
                      ),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }) as any;

      const pdfRes = await testGeminiConnection("AIzaSy_ValidPdfTestKey_0002", "gemini-3.8-flash", {
        testPdf: true,
      });

      expect(pdfRes.success).toBe(true);
      expect(pdfRes.capabilities?.pdf).toBe(true);
      expect(capturedBodies.length).toBe(2);
      const pdfParts = capturedBodies[1].contents[0].parts;
      expect(pdfParts[0].inlineData.mimeType).toBe("application/pdf");
      expect(pdfParts[0].inlineData.data).toBe(buildDiagnosticSamplePdfBase64());
    });

    it("surfaces Gemini model-unavailable error clearly and redacts secret tokens", async () => {
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({
            error: {
              message:
                "This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash.",
            },
          }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        )) as any;

      const direct = await callGeminiGenerateContent({
        apiKey: "AIzaSy_ExposedTokenInLog_9999",
        model: "gemini-3.8-flash",
        prompt: "hi",
      });
      expect(direct.success).toBe(false);
      expect(direct.errorKind).toBe("model_unavailable");
      expect(direct.errorMessage).not.toContain("AIzaSy_ExposedTokenInLog_9999");

      const legacyTest = await testGeminiConnection("AIzaSy_SecretKey_8888", "gemini-2.5-flash");
      expect(legacyTest.success).toBe(false);
      expect(legacyTest.message).toContain("no longer available");
      expect(legacyTest.message).toContain("gemini-3.8-flash");
    });
  });

  describe("2. Independent Hugging Face & FLUX.1-schnell Verification (Zero Gemini Cross-Contamination)", () => {
    it("tests Hugging Face FLUX.1-schnell independently via router.huggingface.co and never invokes Gemini", async () => {
      const urlsCalled: string[] = [];
      const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(160).fill(1)]);

      globalThis.fetch = (async (url: any) => {
        const u = String(url);
        urlsCalled.push(u);
        if (u.includes("huggingface.co/api/whoami-v2")) {
          return new Response(JSON.stringify({ name: "documind-tester", type: "user" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (u.startsWith("https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell")) {
          return new Response(pngBytes, {
            status: 200,
            headers: { "Content-Type": "image/png" },
          });
        }
        throw new Error(`Unexpected URL called during Hugging Face test: ${u}`);
      }) as any;

      imageProviderManager.updateProvider("huggingface", {
        apiKey: "hf_IndependentTestToken_12345",
        selectedModel: "black-forest-labs/FLUX.1-schnell",
        enabled: true,
      });

      const conn = await imageProviderManager.testProviderConnection(
        "huggingface",
        undefined,
        "black-forest-labs/FLUX.1-schnell",
      );

      expect(conn.success).toBe(true);
      expect(conn.provider).toBe("huggingface");
      expect(conn.testedModel).toBe("black-forest-labs/FLUX.1-schnell");
      expect(conn.message).toContain("documind-tester");
      expect(urlsCalled.some((u) => u.includes("generativelanguage.googleapis.com"))).toBe(false);
      expect(urlsCalled.some((u) => u.includes("api-inference.huggingface.co"))).toBe(false);

      // Now test standalone FLUX.1-schnell generation targeting Hugging Face specifically
      const imgRes = await imageProviderManager.generateImage({
        source: "admin_test",
        providerId: "huggingface",
        prompt: "Architectural diagram of microservices",
      });
      expect(imgRes.success).toBe(true);
      expect(imgRes.provider).toBe("huggingface");
      expect(imgRes.model).toBe("black-forest-labs/FLUX.1-schnell");
      expect(imgRes.imageUrl.startsWith("data:image/png;base64,")).toBe(true);
    });

    it("returns Hugging Face-specific error messages (402 credits / 403 permissions) without touching Gemini", async () => {
      globalThis.fetch = (async (url: any) => {
        const u = String(url);
        if (u.includes("whoami-v2")) {
          return new Response(JSON.stringify({ name: "free-user", type: "user" }), { status: 200 });
        }
        if (u.includes("router.huggingface.co")) {
          return new Response(JSON.stringify({ error: "Monthly credit limit reached" }), {
            status: 402,
          });
        }
        throw new Error(`Unexpected endpoint: ${u}`);
      }) as any;

      const res = await imageProviderManager.testProviderConnection(
        "huggingface",
        "hf_ExhaustedToken_12345",
        "black-forest-labs/FLUX.1-schnell",
      );
      expect(res.success).toBe(false);
      expect(res.message).toContain("Hugging Face");
      expect(res.message).toContain("402");
      expect(res.message).not.toContain("Google AI Studio");
      expect(res.message).not.toContain("gemini");

      const card = imageProviderManager.getProvidersForClient().find((p) => p.id === "huggingface");
      expect(card?.status).toBe("error");
      expect(card?.lastTestSuccess).toBe(false);
    });
  });

  describe("3. Imagen 3 Paid Gating, Quota Honesty & Free-First Text Fallback", () => {
    it("blocks Imagen 3 execution and connection tests unless paid billing is explicitly approved", async () => {
      imageProviderManager.updateSettings({ allowPaidProviders: false });
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy as any;

      try {
        imageProviderManager.updateProvider("gemini", {
          apiKey: "AIzaSy_TestFreeKey_7777",
          selectedModel: "imagen-3.0-generate-002",
          enabled: true,
        });

        const testRes = await imageProviderManager.testProviderConnection(
          "gemini",
          undefined,
          "imagen-3.0-generate-002",
        );
        expect(testRes.success).toBe(false);
        expect(testRes.message).toContain("Cloud Billing");
        expect(testRes.message).toContain("Free-First");
        expect(fetchSpy).not.toHaveBeenCalled();

        const genRes = await imageProviderManager.generateImage({
          source: "admin_test",
          providerId: "gemini",
          prompt: "A futuristic laboratory",
        });
        expect(genRes.success).toBe(false);
        expect(genRes.error).toContain("Free-First");
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        imageProviderManager.updateProvider("gemini", { selectedModel: "gemini-3.8-flash" });
      }
    });

    it("separates official provider limits from local application tracking counters (never invents 15/15 or 1000/1000)", () => {
      const providers = imageProviderManager.getProvidersForClient();
      const gem = providers.find((p) => p.id === "gemini")!;
      const hf = providers.find((p) => p.id === "huggingface")!;

      expect(gem.quotaInfo?.officialSource).toBe("unavailable");
      expect(gem.quotaInfo?.officialLimitText).toContain("Google AI Studio");
      expect(gem.quotaInfo?.unit).toBe("App Tracked Calls");
      expect(hf.quotaInfo?.officialLimit).toBeNull();
      expect(hf.quotaInfo?.officialLimitText).toMatch(/\$0\.10\/mo/i);
      expect(hf.quotaInfo?.unit).not.toBe("Monthly Requests");
    });

    it("refuses OpenAI paid activation while Free-First lock is active and supports explicit Groq free fallback", async () => {
      updateAdminSettings({ allowPaidProviders: false });
      expect(() => updateAdminSettings({ activeProvider: "openai" })).toThrow(/paid billing/i);

      globalThis.fetch = (async (url: any) => {
        if (String(url).includes("api.groq.com")) {
          return new Response(
            JSON.stringify({
              choices: [{ message: { content: JSON.stringify({ status: "ready", provider: "groq" }) } }],
            }),
            { status: 200, headers: { "x-ratelimit-remaining-requests": "29" } },
          );
        }
        throw new Error(`Unexpected URL: ${url}`);
      }) as any;

      const groqTest = await testFallbackTextConnection({
        provider: "groq",
        apiKey: "gsk_FreeGroqTestKey_123456",
        model: "llama-3.3-70b-versatile",
      });
      expect(groqTest.success).toBe(true);
      expect(groqTest.rateLimitHeaders?.["x-ratelimit-remaining-requests"]).toBe("29");

      // OpenRouter non-:free model must be blocked under Free-First lock
      const paidOr = await callFreeFallbackTextProvider(
        {
          provider: "openrouter",
          apiKey: "sk-or-testkey123",
          model: "openai/gpt-4o",
          prompt: "hello",
        },
        false,
      );
      expect(paidOr.success).toBe(false);
      expect(paidOr.errorKind).toBe("paid_required");
    });

    it("handles Gemini free quota exhaustion (429) without paid fallback and surfaces honest notice", async () => {
      await setServerSecret("gemini", "AIzaSy_LiveSessionQuotaTest_9999");
      updateAdminSettings({
        activeProvider: "gemini",
        fallbackTextProvider: "none",
        allowPaidProviders: false,
      });

      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ error: { message: "Quota exceeded for free tier (429)." } }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        })) as any;

      const session = await createPresentationSession({
        title: "Database Indexing Overview",
        content:
          "B-Tree and Hash indexes speed up database lookups by reducing page scans across disk blocks and memory buffers.",
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
      });

      expect(session.aiProviderUsed).toBe("local-deterministic");
      expect(session.aiNotice).toMatch(/quota|429/i);
      expect(session.aiNotice).not.toContain("AIzaSy_LiveSessionQuotaTest_9999");
      deletePresentationSession(session.id);
    });
  });

  describe("4. Server-Side Secret Protection & Browser Storage Purge", () => {
    it("redacts API keys, masks stored secrets, keeps disk config clean, and purges browser localStorage", () => {
      const redacted = redactSecrets(
        "Error calling https://api.example.com?key=AIzaSy1234567890ABCDEFGHIJKL with token hf_SecretTokenValue12345",
      );
      expect(redacted).not.toContain("AIzaSy1234567890ABCDEFGHIJKL");
      expect(redacted).not.toContain("hf_SecretTokenValue12345");

      // Verify tracked config files on disk contain zero embedded keys
      const adminJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "server", "config", "runtime-admin-settings.json"), "utf-8"),
      );
      expect(adminJson.settings.geminiApiKey).toBe("");

      const provJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "server", "config", "runtime-image-providers.json"), "utf-8"),
      );
      for (const p of provJson.providers) {
        expect(p.apiKey).toBe("");
      }

      // Simulate legacy browser-stored keys in localStorage and verify immediate purge
      const mockStorage: Record<string, string> = {
        documind_presentation_ai_keys: JSON.stringify({
          gemini: "AIzaSy_LeakedBrowserKey_0001",
          huggingface: "hf_LeakedBrowserToken_0002",
        }),
        documind_provider_alerts: "[]",
        documind_provider_quotas: "{}",
      };
      (globalThis as any).window = {
        localStorage: {
          getItem: (k: string) => mockStorage[k] ?? null,
          setItem: (k: string, v: string) => {
            mockStorage[k] = v;
          },
          removeItem: (k: string) => {
            delete mockStorage[k];
          },
        },
      };

      const purged = purgeLegacyBrowserProviderSecrets();
      expect(purged).toEqual(["gemini", "huggingface"]);
      expect(mockStorage["documind_presentation_ai_keys"]).toBeUndefined();
      expect(mockStorage["documind_provider_alerts"]).toBeUndefined();
      expect(mockStorage["documind_provider_quotas"]).toBeUndefined();
    });
  });

  describe("5. Fail-Closed API Client & Awaited Server Secret Persistence", () => {
    it("returns success: false (never fake success) when /api returns HTML 404 or fails", async () => {
      globalThis.fetch = vi.fn(async () => {
        return new Response("<!doctype html><html><body>404</body></html>", {
          status: 404,
          headers: { "Content-Type": "text/html" },
        });
      }) as any;

      const provUpdate = await updateAdminImageProvider("huggingface", { apiKey: "hf_dummy_123" });
      expect(provUpdate.success).toBe(false);
      expect((provUpdate as any).backendUnavailable).toBe(true);

      const sysUpdate = await updateAdminSettingsClient({ geminiApiKey: "AIzaSy_dummy_123" });
      expect(sysUpdate.success).toBe(false);
      expect((sysUpdate as any).backendUnavailable).toBe(true);

      const provFetch = await fetchAdminImageProviders();
      expect(provFetch.success).toBe(false);
      expect((provFetch as any).backendUnavailable).toBe(true);

      const sysFetch = await fetchAdminSettings();
      expect(sysFetch.success).toBe(false);
      expect((sysFetch as any).backendUnavailable).toBe(true);
    });

    it("encrypts and decrypts multiple provider secrets without plaintext leakage", () => {
      const secrets = {
        gemini: "AIzaSy_Roundtrip_Test_Key_0001",
        huggingface: "hf_Roundtrip_Test_Token_0002",
      };
      const encrypted = encryptSecretsPayload(secrets);
      const serialized = JSON.stringify(encrypted);
      expect(serialized).not.toContain("AIzaSy_Roundtrip_Test_Key_0001");
      expect(serialized).not.toContain("hf_Roundtrip_Test_Token_0002");

      const decrypted = decryptSecretsPayload(encrypted);
      expect(decrypted).toEqual(secrets);
    });

    it("awaits persistence on Express PATCH /api/admin/providers/:id before returning 200 and masks returned keys", async () => {
      const providersConfigPath = path.join(
        process.cwd(),
        "server",
        "config",
        "runtime-image-providers.json",
      );
      const originalProvidersJson = fs.existsSync(providersConfigPath)
        ? fs.readFileSync(providersConfigPath, "utf-8")
        : null;

      const app = createApp();
      const server = await new Promise<import("http").Server>((resolve) => {
        const s = app.listen(0, "127.0.0.1", () => resolve(s));
      });

      try {
        const addr = server.address();
        const port = typeof addr === "object" && addr ? addr.port : 0;
        expect(port).toBeGreaterThan(0);

        const patchRes = await originalFetch(
          `http://127.0.0.1:${port}/api/admin/providers/huggingface?adminKey=documind-admin-secret`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              apiKey: "hf_ExpressRoutePersistence_998877",
              selectedModel: "black-forest-labs/FLUX.1-schnell",
              enabled: true,
            }),
          },
        );
        expect(patchRes.status).toBe(200);
        const patchJson: any = await patchRes.json();
        expect(patchJson.success).toBe(true);
        expect(patchJson.data.isConfigured).toBe(true);
        expect(JSON.stringify(patchJson)).not.toContain("hf_ExpressRoutePersistence_998877");

        // Secret must already be persisted in-memory right after HTTP response
        expect(getServerSecret("huggingface")).toBe("hf_ExpressRoutePersistence_998877");

        const listRes = await originalFetch(
          `http://127.0.0.1:${port}/api/admin/providers?adminKey=documind-admin-secret`,
        );
        expect(listRes.status).toBe(200);
        const listJson: any = await listRes.json();
        const hf = listJson.data.find((p: any) => p.id === "huggingface");
        expect(hf.isConfigured).toBe(true);
        expect(hf.apiKey).not.toContain("998877");
        expect(hf.maskedKey).not.toContain("998877");
        expect(JSON.stringify(listJson)).not.toContain("hf_ExpressRoutePersistence_998877");
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
        if (originalProvidersJson !== null) {
          fs.writeFileSync(providersConfigPath, originalProvidersJson, "utf-8");
        }
      }
    });
  });
});
