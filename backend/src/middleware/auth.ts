import { Request, Response, NextFunction } from 'express';
import { JWTUtils, JWTError } from '../utils/jwt';
import { UserRole } from '../types';
import User from '../models/User';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

// Authentication middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
        error: 'NO_TOKEN_PROVIDED',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
      return;
    }

    // Verify the token
    const decoded = JWTUtils.verifyAccessToken(token);

    // Check if user still exists and is active
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: 'User not found or inactive',
        error: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
      return;
    }

    // Check if user is locked
    if (user.isAccountLocked()) {
      res.status(423).json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.',
        error: 'ACCOUNT_LOCKED',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
      return;
    }

    // Attach user info to request
    if (user._id) {
      // <-- Add a check to ensure _id is not null
      req.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      };
    } else {
      // Handle the unexpected case where _id is null.
      // This is unlikely to happen with findById but is good practice.
      res.status(500).json({
        success: false,
        message: 'User ID is missing',
        error: 'USER_ID_MISSING',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
      return;
    }

    next();
  } catch (error) {
    if (error instanceof JWTError) {
      const statusCode = error.code === 'TOKEN_EXPIRED' ? 401 : 403;
      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: error.code,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
      return;
    }

    console.error('❌ Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: 'AUTHENTICATION_ERROR',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  }
};

// Optional authentication middleware (for public routes that can work with or without auth)
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (token) {
      try {
        const decoded = JWTUtils.verifyAccessToken(token);
        const user = await User.findById(decoded.userId);

        if (user && user.isActive && !user.isAccountLocked()) {
          if (user._id) {
            // <-- Add a check to ensure _id is not null
            req.user = {
              id: user._id.toString(),
              email: user.email,
              role: user.role,
            };
          } else {
            // Handle the unexpected case where _id is null.
            // This is unlikely to happen with findById but is good practice.
            throw new Error('User ID is missing');
          }
        }
      } catch (error) {
        // Ignore authentication errors for optional auth
        console.log('Optional authentication failed, continuing without auth');
      }
    }

    next();
  } catch (error) {
    // For optional auth, always continue even if there's an error
    next();
  }
};

// Role-based authorization middleware
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS',
        data: {
          requiredRoles: allowedRoles,
          userRole: req.user.role,
        },
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
      return;
    }

    next();
  };
};

// Admin only middleware
export const adminOnly = authorize(UserRole.ADMIN);

// Student or Supervisor middleware
export const studentOrSupervisor = authorize(UserRole.STUDENT, UserRole.SUPERVISOR);

// Admin or Supervisor middleware
export const adminOrSupervisor = authorize(UserRole.ADMIN, UserRole.SUPERVISOR);

// Check if user owns the resource or is admin/supervisor
export const ownerOrAuthorized = (resourceUserIdField: string = 'userId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
      return;
    }

    // Admin and supervisor can access any resource
    if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPERVISOR) {
      next();
      return;
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

    if (resourceUserId && resourceUserId === req.user.id) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.',
      error: 'ACCESS_DENIED',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  };
};

// Email verification required middleware
export const emailVerifiedOnly = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
    return;
  }

  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.isEmailVerified) {
      res.status(403).json({
        success: false,
        message: 'Email verification required',
        error: 'EMAIL_NOT_VERIFIED',
        data: {
          userId: req.user.id,
          email: req.user.email,
        },
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('❌ Email verification check error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification check failed',
      error: 'VERIFICATION_CHECK_ERROR',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  }
};

// Rate limiting for sensitive operations
export const sensitiveOperationLimit = (
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.ip + (req.user?.id || '');
    const now = Date.now();
    const userAttempts = attempts.get(identifier);

    // Clean up expired entries
    if (userAttempts && now > userAttempts.resetTime) {
      attempts.delete(identifier);
    }

    const currentAttempts = attempts.get(identifier);

    if (currentAttempts && currentAttempts.count >= maxAttempts) {
      res.status(429).json({
        success: false,
        message: 'Too many attempts. Please try again later.',
        error: 'RATE_LIMITED',
        data: {
          resetTime: new Date(currentAttempts.resetTime).toISOString(),
        },
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
      return;
    }

    // Increment attempts
    if (currentAttempts) {
      currentAttempts.count++;
    } else {
      attempts.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
    }

    next();
  };
};

// Middleware to log user activity
export const logUserActivity = (action: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Store the original res.json
    const originalJson = res.json;

    // Override res.json to capture response
    res.json = function (body: any) {
      // Log the activity if response was successful
      if (req.user && body.success) {
        console.log(`📊 User Activity: ${req.user.email} performed ${action}`, {
          userId: req.user.id,
          action,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString(),
        });
      }

      // Call the original res.json
      return originalJson.call(this, body);
    };

    next();
  };
};

// Middleware to check if user can take assessment
export const canTakeAssessment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
    return;
  }

  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.isEmailVerified) {
      res.status(403).json({
        success: false,
        message: 'Email verification required to take assessments',
        error: 'EMAIL_NOT_VERIFIED',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
      return;
    }

    // Additional assessment-specific checks can be added here
    // For example: checking if user has completed prerequisites, payment status, etc.

    next();
  } catch (error) {
    console.error('❌ Assessment eligibility check error:', error);
    res.status(500).json({
      success: false,
      message: 'Assessment eligibility check failed',
      error: 'ELIGIBILITY_CHECK_ERROR',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  }
};

export default {
  authenticate,
  optionalAuthenticate,
  authorize,
  adminOnly,
  studentOrSupervisor,
  adminOrSupervisor,
  ownerOrAuthorized,
  emailVerifiedOnly,
  sensitiveOperationLimit,
  logUserActivity,
  canTakeAssessment,
};
