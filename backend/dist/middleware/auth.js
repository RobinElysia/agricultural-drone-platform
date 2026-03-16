import { AuthUtil } from '../utils/auth';
import { ResponseUtil } from '../utils/response';
// JWT authentication middleware
export const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json(ResponseUtil.unauthorized('Missing authorization token'));
        }
        const token = AuthUtil.extractTokenFromHeader(authHeader);
        if (!token) {
            return res.status(401).json(ResponseUtil.unauthorized('Invalid authorization header format'));
        }
        const decoded = AuthUtil.verifyToken(token);
        if (!decoded) {
            return res.status(401).json(ResponseUtil.unauthorized('Invalid token'));
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        console.error('Authentication middleware error:', error);
        return res.status(401).json(ResponseUtil.unauthorized('Authentication failed'));
    }
};
// Role authorization middleware
export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json(ResponseUtil.unauthorized('Unauthorized'));
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json(ResponseUtil.forbidden('Forbidden'));
        }
        next();
    };
};
// Optional auth middleware (allows unauthenticated access)
export const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            req.user = null;
            return next();
        }
        const token = AuthUtil.extractTokenFromHeader(authHeader);
        if (!token) {
            req.user = null;
            return next();
        }
        const decoded = AuthUtil.verifyToken(token);
        if (decoded) {
            req.user = decoded;
        }
        else {
            req.user = null;
        }
        next();
    }
    catch (error) {
        req.user = null;
        next();
    }
};
// Request logger middleware
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    next();
};
// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    const bodyParserError = err;
    if (bodyParserError.type === 'entity.too.large' || bodyParserError.status === 413 || bodyParserError.statusCode === 413) {
        return res.status(413).json(ResponseUtil.badRequest('Request body too large. Reduce image size or increase BODY_LIMIT.'));
    }
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json(ResponseUtil.unauthorized('Unauthorized'));
    }
    if (err.name === 'ForbiddenError') {
        return res.status(403).json(ResponseUtil.forbidden('Forbidden'));
    }
    return res.status(500).json(ResponseUtil.internalError('Internal server error'));
};
