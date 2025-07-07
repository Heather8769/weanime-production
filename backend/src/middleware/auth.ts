import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AuthContext, AuthenticationError, AuthorizationError } from '../types/auth.js';
import { verifyToken, getUserProfile, extractBearerToken, hasRole, isTokenExpired } from '../utils/auth.js';

/**
 * Authentication middleware - validates JWT tokens and provides user context
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    
    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No authentication token provided'
      });
      return;
    }

    // Check if token is expired before verification
    if (isTokenExpired(token)) {
      res.status(401).json({
        error: 'Token expired',
        message: 'Authentication token has expired'
      });
      return;
    }

    // Verify the JWT token
    const payload = await verifyToken(token);
    
    if (!payload) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Authentication token is invalid'
      });
      return;
    }

    // Get user profile from Supabase
    const userProfile = await getUserProfile(payload.sub);
    
    if (!userProfile) {
      res.status(401).json({
        error: 'User not found',
        message: 'User associated with token does not exist'
      });
      return;
    }

    // Check if user is active
    if (!userProfile.is_active) {
      res.status(403).json({
        error: 'Account deactivated',
        message: 'Your account has been deactivated'
      });
      return;
    }

    // Create auth context
    const authContext: AuthContext = {
      user: userProfile,
      token: payload,
      permissions: userProfile.permissions || [],
      roles: [userProfile.role]
    };

    // Attach auth context to request
    req.auth = authContext;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        error: 'Authentication failed',
        message: error.message
      });
      return;
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication service unavailable'
    });
  }
};

/**
 * Optional authentication middleware - adds user context if token is present but doesn't require it
 */
export const optionalAuthenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    
    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    // If token is provided, try to authenticate
    if (!isTokenExpired(token)) {
      const payload = await verifyToken(token);
      
      if (payload) {
        const userProfile = await getUserProfile(payload.sub);
        
        if (userProfile && userProfile.is_active) {
          const authContext: AuthContext = {
            user: userProfile,
            token: payload,
            permissions: userProfile.permissions || [],
            roles: [userProfile.role]
          };
          
          req.auth = authContext;
        }
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we continue even if there's an error
    console.warn('Optional authentication failed:', error);
    next();
  }
};

/**
 * Role-based authorization middleware factory
 */
export const requireRole = (requiredRole: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
      return;
    }

    if (!hasRole(req.auth, requiredRole)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `${requiredRole} role required`
      });
      return;
    }

    next();
  };
};

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRole('admin');

/**
 * Moderator-only middleware (includes admins)
 */
export const requireModerator = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.auth) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
    return;
  }

  const userRole = req.auth.user.role;
  if (userRole !== 'admin' && userRole !== 'moderator') {
    res.status(403).json({
      error: 'Insufficient permissions',
      message: 'Moderator or admin role required'
    });
    return;
  }

  next();
};

/**
 * Resource ownership middleware - ensures user owns the resource
 */
export const requireOwnership = (resourceUserIdField: string = 'user_id') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
      return;
    }

    // Admins can access any resource
    if (req.auth.user.role === 'admin') {
      next();
      return;
    }

    // Check ownership based on request body, params, or query
    const resourceUserId = req.body[resourceUserIdField] || 
                          req.params[resourceUserIdField] || 
                          req.query[resourceUserIdField];

    if (!resourceUserId) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Resource ownership cannot be determined'
      });
      return;
    }

    if (resourceUserId !== req.auth.user.id) {
      res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources'
      });
      return;
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
      return;
    }

    if (!req.auth.permissions.includes(permission)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Permission '${permission}' required`
      });
      return;
    }

    next();
  };
};