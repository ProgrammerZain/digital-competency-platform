import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { JWTPayload, JWTTokens } from '../types';
import { UserRole } from '../types';

// JWT Error types
export class JWTError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'JWTError';
  }
}

// Token generation utilities
export class JWTUtils {
  /**
   * Generate access token
   */
  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    try {
      return jwt.sign(
        payload,
        config.JWT_SECRET,
        {
          expiresIn: config.JWT_EXPIRE_TIME,
          issuer: 'digital-competency-platform',
          audience: 'digital-competency-users'
        } as jwt.SignOptions
      );
    } catch (error) {
      throw new JWTError('Failed to generate access token', 'TOKEN_GENERATION_FAILED');
    }
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    try {
      return jwt.sign(
        payload,
        config.JWT_REFRESH_SECRET,
        {
          expiresIn: config.JWT_REFRESH_EXPIRE_TIME,
          issuer: 'digital-competency-platform',
          audience: 'digital-competency-users'
        } as jwt.SignOptions
      );
    } catch (error) {
      throw new JWTError('Failed to generate refresh token', 'REFRESH_TOKEN_GENERATION_FAILED');
    }
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(
    userId: string, 
    email: string, 
    role: UserRole
  ): JWTTokens {
    const payload = { userId, email, role };
    
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    
    // Calculate expiration time in seconds
    const expiresIn = this.getTokenExpirationTime(config.JWT_EXPIRE_TIME);
    
    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET, {
        issuer: 'digital-competency-platform',
        audience: 'digital-competency-users'
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new JWTError('Access token has expired', 'TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new JWTError('Invalid access token', 'INVALID_TOKEN');
      } else if (error instanceof jwt.NotBeforeError) {
        throw new JWTError('Access token not active', 'TOKEN_NOT_ACTIVE');
      } else {
        throw new JWTError('Token verification failed', 'TOKEN_VERIFICATION_FAILED');
      }
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET, {
        issuer: 'digital-competency-platform',
        audience: 'digital-competency-users'
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new JWTError('Refresh token has expired', 'REFRESH_TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new JWTError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
      } else if (error instanceof jwt.NotBeforeError) {
        throw new JWTError('Refresh token not active', 'REFRESH_TOKEN_NOT_ACTIVE');
      } else {
        throw new JWTError('Refresh token verification failed', 'REFRESH_TOKEN_VERIFICATION_FAILED');
      }
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return true;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration time in seconds
   */
  static getTokenExpirationTime(timeString: string): number {
    // Parse time strings like '15m', '1h', '7d', etc.
    const unit = timeString.slice(-1);
    const value = parseInt(timeString.slice(0, -1));
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 15 * 60; // Default to 15 minutes
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  /**
   * Refresh access token using refresh token
   */
  static refreshAccessToken(refreshToken: string): JWTTokens {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      
      // Generate new token pair
      return this.generateTokenPair(
        decoded.userId,
        decoded.email,
        decoded.role
      );
    } catch (error) {
      throw new JWTError('Failed to refresh access token', 'TOKEN_REFRESH_FAILED');
    }
  }

  /**
   * Get remaining time until token expires
   */
  static getTokenRemainingTime(token: string): number {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return 0;
      
      const currentTime = Math.floor(Date.now() / 1000);
      const remainingTime = decoded.exp - currentTime;
      
      return Math.max(0, remainingTime);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Validate token structure without verification
   */
  static isValidTokenStructure(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Try to decode each part
      JSON.parse(Buffer.from(parts[0], 'base64').toString());
      JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a secure random token (for password reset, email verification, etc.)
   */
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Create a temporary token for specific actions (email verification, password reset)
   */
  static generateActionToken(
    userId: string,
    action: string,
    expiresIn: string = '1h'
  ): string {
    try {
      return jwt.sign(
        { 
          userId, 
          action,
          timestamp: Date.now()
        },
        config.JWT_SECRET,
        {
          expiresIn,
          issuer: 'digital-competency-platform',
          audience: 'digital-competency-actions'
        } as jwt.SignOptions
      );
    } catch (error) {
      throw new JWTError('Failed to generate action token', 'ACTION_TOKEN_GENERATION_FAILED');
    }
  }

  /**
   * Verify action token
   */
  static verifyActionToken(token: string, expectedAction: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET, {
        issuer: 'digital-competency-platform',
        audience: 'digital-competency-actions'
      }) as any;
      
      if (decoded.action !== expectedAction) {
        throw new JWTError('Invalid action token', 'INVALID_ACTION_TOKEN');
      }
      
      return { userId: decoded.userId };
    } catch (error) {
      if (error instanceof JWTError) {
        throw error;
      } else if (error instanceof jwt.TokenExpiredError) {
        throw new JWTError('Action token has expired', 'ACTION_TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new JWTError('Invalid action token', 'INVALID_ACTION_TOKEN');
      } else {
        throw new JWTError('Action token verification failed', 'ACTION_TOKEN_VERIFICATION_FAILED');
      }
    }
  }
}

export default JWTUtils;
