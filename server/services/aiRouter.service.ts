/**
 * DocuMind Centralized AI Router & Module Authorization Service
 *
 * Enforces strict module isolation for LG AI Research's EXAONE engine.
 * EXAONE is ONLY authorized to serve:
 *  1. presentation_maker (Presentation Maker)
 *  2. documentation_studio (Documentation Studio)
 *  3. file_converter (File Converter — assistance and fidelity validation only)
 *  4. text_extractor (Text Extractor — assistance, OCR uncertainty, and quality validation only)
 *
 * Any other module (or unauthorized caller) is strictly rejected.
 * All other DocuMind modules continue to route through their existing AI configurations.
 */

export type AuthorizedExaoneModule =
  | "presentation_maker"
  | "documentation_studio"
  | "file_converter"
  | "text_extractor";

export const AUTHORIZED_EXAONE_MODULES: readonly AuthorizedExaoneModule[] = [
  "presentation_maker",
  "documentation_studio",
  "file_converter",
  "text_extractor",
] as const;

export interface ModuleRoutingDecision {
  module: string;
  isExaoneAuthorized: boolean;
  isExaoneActive: boolean;
  status: "coming_soon" | "active" | "unauthorized";
  primaryEngine: "legacy_global" | "exaone";
  futureEngine?: "exaone";
  operationalRole: "full_creative" | "assistance_and_validation" | "standard_pipeline";
  reason: string;
}

/**
 * Global flag indicating whether EXAONE is currently active.
 * Currently postponed pending regional availability (Ethiopia).
 * When active, the administrator can activate it manually via EXAONE_API_KEY.
 */
export const IS_EXAONE_ACTIVE = false;

/**
 * Checks whether a module identifier is explicitly authorized to access EXAONE
 */
export function isExaoneAuthorizedModule(
  moduleName?: string | null,
): moduleName is AuthorizedExaoneModule {
  if (!moduleName || typeof moduleName !== "string") return false;
  const normalized = moduleName.trim().toLowerCase();
  return (AUTHORIZED_EXAONE_MODULES as readonly string[]).includes(normalized);
}

/**
 * Validates module authorization for an EXAONE request.
 * Throws a descriptive authorization error if the module is unauthorized.
 */
export function enforceExaoneModuleAuthorization(
  moduleName?: string | null,
): AuthorizedExaoneModule {
  if (!moduleName || typeof moduleName !== "string") {
    const error: any = new Error(
      "Authorization Error: Missing module identifier. Requests to EXAONE AI must explicitly identify an authorized DocuMind module.",
    );
    error.statusCode = 403;
    throw error;
  }

  const normalized = moduleName.trim().toLowerCase();
  if (!isExaoneAuthorizedModule(normalized)) {
    const error: any = new Error(
      `Access Denied: Module '${moduleName}' is not authorized to invoke EXAONE AI. EXAONE is strictly restricted to Presentation Maker, Documentation Studio, File Converter, and Text Extractor.`,
    );
    error.statusCode = 403;
    throw error;
  }

  return normalized;
}

/**
 * Resolves the AI routing decision for any DocuMind module
 */
export function resolveModuleAiRouting(moduleName: string): ModuleRoutingDecision {
  const normalized = (moduleName || "").trim().toLowerCase();

  switch (normalized) {
    case "presentation_maker":
      return {
        module: normalized,
        isExaoneAuthorized: true,
        isExaoneActive: IS_EXAONE_ACTIVE,
        status: IS_EXAONE_ACTIVE ? "active" : "coming_soon",
        primaryEngine: "legacy_global",
        futureEngine: "exaone",
        operationalRole: "full_creative",
        reason: "EXAONE is a planned upcoming AI engine for Presentation Maker (Coming Soon). Active presentation planning is powered by DocuMind's existing primary AI engine.",
      };
    case "documentation_studio":
      return {
        module: normalized,
        isExaoneAuthorized: true,
        isExaoneActive: IS_EXAONE_ACTIVE,
        status: IS_EXAONE_ACTIVE ? "active" : "coming_soon",
        primaryEngine: "legacy_global",
        futureEngine: "exaone",
        operationalRole: "full_creative",
        reason: "EXAONE is a planned upcoming AI engine for Documentation Studio (Coming Soon). Active document synthesis is powered by DocuMind's existing primary AI engine.",
      };
    case "file_converter":
      return {
        module: normalized,
        isExaoneAuthorized: true,
        isExaoneActive: IS_EXAONE_ACTIVE,
        status: IS_EXAONE_ACTIVE ? "active" : "coming_soon",
        primaryEngine: "legacy_global",
        futureEngine: "exaone",
        operationalRole: "assistance_and_validation",
        reason: "EXAONE conversion assistance is a planned upcoming integration (Coming Soon). Document conversion runs with 100% deterministic fidelity.",
      };
    case "text_extractor":
      return {
        module: normalized,
        isExaoneAuthorized: true,
        isExaoneActive: IS_EXAONE_ACTIVE,
        status: IS_EXAONE_ACTIVE ? "active" : "coming_soon",
        primaryEngine: "legacy_global",
        futureEngine: "exaone",
        operationalRole: "assistance_and_validation",
        reason: "EXAONE text extraction auditing is a planned upcoming integration (Coming Soon). Text is extracted verbatim by DocuMind's existing high-accuracy OCR engine.",
      };
    default:
      return {
        module: normalized,
        isExaoneAuthorized: false,
        isExaoneActive: false,
        status: "unauthorized",
        primaryEngine: "legacy_global",
        operationalRole: "standard_pipeline",
        reason: `Module '${moduleName}' uses the standard DocuMind AI configuration. EXAONE is restricted to the four authorized modules.`,
      };
  }
}
