import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { app } from "../../server/app";
import {
  isExaoneAuthorizedModule,
  enforceExaoneModuleAuthorization,
  resolveModuleAiRouting,
  AUTHORIZED_EXAONE_MODULES,
  IS_EXAONE_ACTIVE,
} from "../../server/services/aiRouter.service";
import {
  getExaoneApiKey,
  getExaoneModel,
  getExaoneBaseUrl,
  isExaoneConfigured,
  isExaoneActive,
  callExaoneChatCompletion,
  generatePresentationPlanWithExaone,
  redesignSlideWithExaone,
  generateDocumentWithExaone,
  analyzeConversionWithExaone,
  validateConversionWithExaone,
  validateExtractionWithExaone,
  enhanceExtractedTextWithExaone,
} from "../../server/services/exaone.service";

let server: http.Server;
let apiBaseUrl = "";

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const address = server.address();
      if (typeof address === "object" && address !== null) {
        apiBaseUrl = `http://127.0.0.1:${address.port}`;
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

describe("EXAONE AI Engine — Postponed Status (Coming Soon) & Future-Ready Architecture", () => {
  describe("1. Module Authorization & AI Router", () => {
    it("authorizes ONLY the four designated DocuMind modules for future integration", () => {
      expect(AUTHORIZED_EXAONE_MODULES).toEqual([
        "presentation_maker",
        "documentation_studio",
        "file_converter",
        "text_extractor",
      ]);

      expect(isExaoneAuthorizedModule("presentation_maker")).toBe(true);
      expect(isExaoneAuthorizedModule("documentation_studio")).toBe(true);
      expect(isExaoneAuthorizedModule("file_converter")).toBe(true);
      expect(isExaoneAuthorizedModule("text_extractor")).toBe(true);
    });

    it("rejects unauthorized modules with 403 access denied errors", () => {
      const unauthorizedModules = [
        "billing",
        "subscriptions",
        "analytics",
        "auth",
        "admin_settings",
        "landing_page",
        "unknown_module",
        "",
        null as any,
        undefined as any,
      ];

      for (const mod of unauthorizedModules) {
        expect(isExaoneAuthorizedModule(mod)).toBe(false);
        expect(() => enforceExaoneModuleAuthorization(mod)).toThrow(
          /Authorization Error|Access Denied/i,
        );
      }
    });

    it("confirms EXAONE is inactive (Coming Soon) and preserves existing primary AI engines", () => {
      expect(IS_EXAONE_ACTIVE).toBe(false);
      expect(isExaoneActive()).toBe(false);

      const presRouting = resolveModuleAiRouting("presentation_maker");
      expect(presRouting.isExaoneAuthorized).toBe(true);
      expect(presRouting.isExaoneActive).toBe(false);
      expect(presRouting.status).toBe("coming_soon");
      expect(presRouting.primaryEngine).toBe("legacy_global");
      expect(presRouting.futureEngine).toBe("exaone");

      const docRouting = resolveModuleAiRouting("documentation_studio");
      expect(docRouting.isExaoneAuthorized).toBe(true);
      expect(docRouting.isExaoneActive).toBe(false);
      expect(docRouting.status).toBe("coming_soon");
      expect(docRouting.primaryEngine).toBe("legacy_global");

      const convRouting = resolveModuleAiRouting("file_converter");
      expect(convRouting.isExaoneAuthorized).toBe(true);
      expect(convRouting.isExaoneActive).toBe(false);
      expect(convRouting.status).toBe("coming_soon");
      expect(convRouting.primaryEngine).toBe("legacy_global");

      const extractRouting = resolveModuleAiRouting("text_extractor");
      expect(extractRouting.isExaoneAuthorized).toBe(true);
      expect(extractRouting.isExaoneActive).toBe(false);
      expect(extractRouting.status).toBe("coming_soon");
      expect(extractRouting.primaryEngine).toBe("legacy_global");

      const billingRouting = resolveModuleAiRouting("billing");
      expect(billingRouting.isExaoneAuthorized).toBe(false);
      expect(billingRouting.status).toBe("unauthorized");
    });
  });

  describe("2. Security, Placeholder Configuration & Protection", () => {
    it("confirms EXAONE configuration placeholder is inactive and safe", () => {
      expect(isExaoneConfigured()).toBe(false);

      const model = getExaoneModel();
      expect(typeof model).toBe("string");
      expect(model.length).toBeGreaterThan(0);

      const baseUrl = getExaoneBaseUrl();
      expect(baseUrl).toMatch(/^https?:\/\//);
    });

    it("prevents any outbound network calls while EXAONE is postponed", async () => {
      await expect(
        callExaoneChatCompletion({
          module: "presentation_maker",
          messages: [{ role: "user", content: "Hello" }],
        }),
      ).rejects.toThrow(/Postponed \(Coming Soon\)/i);
    });
  });

  describe("3. Module 1: Presentation Maker (Preserved Engine)", () => {
    it("EXAONE generator returns null while postponed, preserving active primary AI engine", async () => {
      const plan = await generatePresentationPlanWithExaone({
        title: "Machine Learning Foundations in Healthcare",
        content: "Core principles of healthcare machine learning.",
        slideCount: 5,
        density: "balanced",
        purpose: "Academic Lecture",
      });

      expect(plan).toBeNull();
    });

    it("EXAONE slide redesign returns null while postponed, preserving active primary AI engine", async () => {
      const currentSlide = {
        id: "slide-3",
        slideNumber: 3,
        layout: "content",
        title: "Deep Learning Architectures",
        bullets: ["Feedforward Networks", "CNNs", "Transformers"],
        notes: "Notes",
      };

      const redesigned = await redesignSlideWithExaone(
        currentSlide,
        "Make it comparative",
        { title: "AI", slideCount: 5 },
      );

      expect(redesigned).toBeNull();
    });
  });

  describe("4. Module 2: Documentation Studio (Preserved Engine)", () => {
    it("EXAONE document generator returns null while postponed, preserving active primary AI engine", async () => {
      const doc = await generateDocumentWithExaone({
        content: "Renewable Energy Grid Integration Strategies",
        docType: "assignment",
      });

      expect(doc).toBeNull();
    });
  });

  describe("5. Module 3: File Converter (Preserved Deterministic Engine)", () => {
    it("provides technical format guidance with clear Coming Soon notification", async () => {
      const analysis = await analyzeConversionWithExaone({
        filename: "Research_Findings.pdf",
        sourceFormat: "PDF",
        targetFormat: "DOCX",
        fileSizeBytes: 245000,
      });

      expect(analysis).toBeDefined();
      expect(analysis.sourceFormat).toBe("PDF");
      expect(analysis.targetFormat).toBe("DOCX");
      expect(analysis.compatibilityScore).toBeGreaterThanOrEqual(90);
      expect(analysis.fidelitySummary).toMatch(/deterministic/i);
    });

    it("verifies 100% preservation with deterministic conversion pipeline", async () => {
      const validation = await validateConversionWithExaone({
        sourceText: "Test text",
        convertedText: "Test text",
        sourceFormat: "DOCX",
        targetFormat: "PDF",
        originalWordCount: 2,
        convertedWordCount: 2,
      });

      expect(validation).toBeDefined();
      expect(validation.preservedPercentage).toBe(100);
      expect(validation.isComplete).toBe(true);
      expect(validation.summary).toMatch(/preservation/i);
    });
  });

  describe("6. Module 4: Text Extractor (Preserved Verbatim Engine)", () => {
    it("validates 100% verbatim capture with clear Coming Soon notification", async () => {
      const validation = await validateExtractionWithExaone({
        extractedText: "Executive Summary: All deliverables completed on schedule.",
        sourceFormat: "IMAGE",
        filename: "receipt_scan.png",
        wordCount: 7,
      });

      expect(validation).toBeDefined();
      expect(validation.isVerbatim).toBe(true);
      expect(validation.fidelityConfidence).toBeGreaterThanOrEqual(95);
      expect(validation.summary).toMatch(/verbatim|preserved/i);
    });

    it("provides preview synthesis without altering original text", async () => {
      const text = "Key finding: 99.4% accuracy achieved.";
      const summarized = await enhanceExtractedTextWithExaone(text, "summarize");
      expect(summarized).toBeDefined();
      expect(summarized.enhancedText).toContain("Executive Summary");
      expect(summarized.actionApplied).toBe("summarize");
    });
  });

  describe("7. Backend API Endpoints & Module Authorization Guard", () => {
    it("POST /api/documents/convert/assist succeeds with valid module identifier", async () => {
      const res = await fetch(`${apiBaseUrl}/api/documents/convert/assist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DocuMind-Module": "file_converter",
        },
        body: JSON.stringify({
          filename: "sample.docx",
          sourceFormat: "DOCX",
          targetFormat: "PDF",
          fileSizeBytes: 10240,
        }),
      });

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.compatibilityScore).toBeGreaterThanOrEqual(90);
    });

    it("POST /api/documents/convert/assist rejects unauthorized module with 403", async () => {
      const res = await fetch(`${apiBaseUrl}/api/documents/convert/assist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DocuMind-Module": "billing_system",
        },
        body: JSON.stringify({
          filename: "sample.docx",
          sourceFormat: "DOCX",
          targetFormat: "PDF",
          fileSizeBytes: 10240,
        }),
      });

      const json = await res.json();
      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.message).toMatch(/Access Denied|Authorization Error/i);
    });

    it("POST /api/documents/convert/validate succeeds with valid module identifier", async () => {
      const res = await fetch(`${apiBaseUrl}/api/documents/convert/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DocuMind-Module": "file_converter",
        },
        body: JSON.stringify({
          sourceText: "Hello world testing DocuMind converter validation.",
          convertedText: "Hello world testing DocuMind converter validation.",
          sourceFormat: "TXT",
          targetFormat: "PDF",
          originalWordCount: 6,
          convertedWordCount: 6,
        }),
      });

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.preservedPercentage).toBe(100);
    });

    it("POST /api/documents/convert/validate rejects unauthorized module with 403", async () => {
      const res = await fetch(`${apiBaseUrl}/api/documents/convert/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DocuMind-Module": "analytics_module",
        },
        body: JSON.stringify({
          sourceText: "Test",
          convertedText: "Test",
          sourceFormat: "TXT",
          targetFormat: "PDF",
        }),
      });

      const json = await res.json();
      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
    });

    it("POST /api/documents/extract/validate succeeds with valid module identifier", async () => {
      const res = await fetch(`${apiBaseUrl}/api/documents/extract/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DocuMind-Module": "text_extractor",
        },
        body: JSON.stringify({
          extractedText: "DocuMind extracts high fidelity verbatim text.",
          sourceFormat: "IMAGE",
          filename: "scan.png",
          wordCount: 6,
        }),
      });

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.isVerbatim).toBe(true);
    });

    it("POST /api/documents/extract/validate rejects unauthorized module with 403", async () => {
      const res = await fetch(`${apiBaseUrl}/api/documents/extract/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DocuMind-Module": "subscriptions_service",
        },
        body: JSON.stringify({
          extractedText: "Test",
          sourceFormat: "IMAGE",
          filename: "scan.png",
          wordCount: 1,
        }),
      });

      const json = await res.json();
      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
    });

    it("POST /api/documents/extract/enhance succeeds with valid module identifier", async () => {
      const res = await fetch(`${apiBaseUrl}/api/documents/extract/enhance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DocuMind-Module": "text_extractor",
        },
        body: JSON.stringify({
          text: "Item 1: Complete testing.\nItem 2: Deploy.",
          action: "summarize",
        }),
      });

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.enhancedText).toBeDefined();
      expect(json.data.actionApplied).toBe("summarize");
    });

    it("POST /api/documents/extract/enhance rejects unauthorized module with 403", async () => {
      const res = await fetch(`${apiBaseUrl}/api/documents/extract/enhance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DocuMind-Module": "user_profile_module",
        },
        body: JSON.stringify({
          text: "Some text",
          action: "summarize",
        }),
      });

      const json = await res.json();
      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
    });
  });
});
