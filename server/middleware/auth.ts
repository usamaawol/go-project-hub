import type { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: "user" | "admin";
  };
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  if (!token) return next();

  try {
    // In demo or JWT mode, extract payload
    if (token.startsWith("demo_") || token.startsWith("local_")) {
      req.user = {
        uid: token,
        email: "demo@documind.com",
        role: token.includes("admin") ? "admin" : "user",
      };
    } else {
      // Decode basic payload or Firebase token
      req.user = {
        uid: token.slice(0, 24),
        role: "user",
      };
    }
  } catch (e) {
    // Non-blocking on optional auth
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  optionalAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: "Authentication required for this operation." },
      });
    }
    next();
  });
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  optionalAuth(req, res, () => {
    // If request contains admin token, header, or query key, grant admin
    const isAdmin =
      req.user?.role === "admin" ||
      req.headers["x-admin-key"] === "documind-admin-secret" ||
      req.query.adminKey === "documind-admin-secret";

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: "Administrator permissions required." },
      });
    }
    next();
  });
}
