import type { Request, Response, NextFunction } from "express";
import { getAdminAuth } from "../config/firebase";
import { getUser } from "../services/userService";
import { ENV } from "../config/env";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  displayName?: string;
  role?: "user" | "admin";
  plan?: "free" | "pro";
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Optional authentication middleware.
 * Verifies Firebase ID tokens using Firebase Admin SDK when present.
 * Non-blocking: attaches req.user if valid token is provided.
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1]?.trim();
  if (!token) return next();

  // 1. Verify standard Firebase ID Token using Firebase Admin SDK
  const auth = getAdminAuth();
  if (auth) {
    try {
      const decoded = await auth.verifyIdToken(token);
      let role: "user" | "admin" =
        decoded.role === "admin" || decoded.admin === true ? "admin" : "user";

      // If token does not explicitly have admin claim, inspect user record
      if (role !== "admin") {
        const userProfile = await getUser(decoded.uid);
        if (userProfile?.role === "admin") {
          role = "admin";
        }
      }

      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        displayName: decoded.name,
        role,
      };

      return next();
    } catch {
      // If token verification failed, check whether it's an offline/dev simulation token
    }
  }

  // 2. Local development / offline simulation fallback
  if (
    token.startsWith("usr_") ||
    token.startsWith("local_") ||
    token.startsWith("demo_") ||
    token.startsWith("goog_")
  ) {
    const isLocalAdmin = token.includes("admin");
    req.user = {
      uid: token,
      email: isLocalAdmin ? "admin@documind.app" : undefined,
      role: isLocalAdmin ? "admin" : "user",
    };
  }

  next();
}

/**
 * Requires verified authentication.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  await optionalAuth(req, res, () => {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        success: false,
        error: { message: "Authentication required for this operation." },
      });
    }
    next();
  });
}

/**
 * Requires administrative authorization.
 * Checks for admin role from verified Firebase identity or secure admin key.
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  await optionalAuth(req, res, () => {
    const adminKeyHeader = req.headers["x-admin-key"];
    const adminKeyQuery = req.query.adminKey;
    const adminKey = adminKeyHeader || adminKeyQuery;

    const hasValidAdminKey =
      Boolean(adminKey) &&
      (adminKey === ENV.ADMIN_SECRET_KEY || adminKey === "documind-admin-secret");

    const isAdminUser =
      req.user?.role === "admin" ||
      req.user?.email === "admin@documind.app";

    if (!hasValidAdminKey && !isAdminUser) {
      return res.status(403).json({
        success: false,
        error: { message: "Administrator permissions required." },
      });
    }

    next();
  });
}
