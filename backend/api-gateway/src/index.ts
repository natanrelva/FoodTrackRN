import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { DatabaseConnection } from '@foodtrack/backend-shared';

// Import routes
import productsRouter from './routes/products';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add tenant middleware (simplified for now)
app.use((req, res, next) => {
  // For now, use a default tenant ID if not provided
  if (!req.headers['x-tenant-id']) {
    req.headers['x-tenant-id'] = '550e8400-e29b-41d4-a716-446655440000';
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API routes
app.get('/api', (req, res) => {
  res.json({ 
    message: 'FoodTrack API Gateway',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      products: '/api/products',
      api: '/api'
    }
  });
});

// API Routes
app.use('/api/products', productsRouter);

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
  
  // Kitchen subscriptions
  socket.on('kitchen:subscribe', (tenantId: string) => {
    socket.join(`kitchen:${tenantId}`);
    console.log(`Kitchen subscribed to tenant: ${tenantId}`);
  });
  
  // Order subscriptions
  socket.on('order:subscribe', (orderId: string) => {
    socket.join(`order:${orderId}`);
    console.log(`Subscribed to order: ${orderId}`);
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`
    }
  });
});

// Start server
DatabaseConnection.testConnection()
  .then((connected) => {
    if (connected) {
      console.log('✅ Database connection successful');
      
      server.listen(PORT, () => {
        console.log('🔌 WebSocket server initialized');
        console.log(`🚀 API Gateway running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log('🔌 WebSocket server ready for kitchen connections');
      });
    } else {
      console.error('❌ Database connection failed');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, server, io };