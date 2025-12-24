import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';

export interface AuthenticatedSocket extends Socket {
  tenantId?: string;
  userId?: string;
  userType?: 'customer' | 'kitchen' | 'tenant' | 'admin';
}

export const websocketAuthMiddleware = (socket: Socket, next: (err?: ExtendedError) => void) => {
  try {
    // Extract auth data from handshake
    const { tenantId, userId, userType, token } = socket.handshake.auth;

    // For now, we'll do basic validation
    // In production, you'd validate JWT tokens here
    if (token) {
      // TODO: Implement JWT validation
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // socket.tenantId = decoded.tenantId;
      // socket.userId = decoded.userId;
      // socket.userType = decoded.userType;
    }

    // Allow connection with provided auth data
    if (tenantId) {
      (socket as AuthenticatedSocket).tenantId = tenantId;
    }
    
    if (userId) {
      (socket as AuthenticatedSocket).userId = userId;
    }
    
    if (userType) {
      (socket as AuthenticatedSocket).userType = userType;
    }

    console.log(`🔐 WebSocket auth: ${socket.id} - tenant: ${tenantId}, user: ${userId}, type: ${userType}`);
    
    next();
  } catch (error) {
    console.error('🔐 WebSocket auth error:', error);
    next(new Error('Authentication failed'));
  }
};

export const requireTenantAuth = (socket: AuthenticatedSocket, next: (err?: ExtendedError) => void) => {
  if (!socket.tenantId) {
    return next(new Error('Tenant authentication required'));
  }
  next();
};

export const requireUserAuth = (socket: AuthenticatedSocket, next: (err?: ExtendedError) => void) => {
  if (!socket.userId) {
    return next(new Error('User authentication required'));
  }
  next();
};

export const requireUserType = (allowedTypes: string[]) => {
  return (socket: AuthenticatedSocket, next: (err?: ExtendedError) => void) => {
    if (!socket.userType || !allowedTypes.includes(socket.userType)) {
      return next(new Error(`User type must be one of: ${allowedTypes.join(', ')}`));
    }
    next();
  };
};