import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { DatabaseConnection } from '@foodtrack/backend-shared';

// Import routes
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';
import kitchenRouter from './routes/kitchen';
import websocketRouter from './routes/websocket';
import analyticsRouter from './routes/analytics';
import dashboardRouter from './routes/dashboard';

// Import middleware
import { tenantMiddleware } from './middleware/tenant';

// Import WebSocket services
import { WebSocketService } from './services/WebSocketService';
import { WebSocketHandlers } from './handlers/websocketHandlers';
import { websocketAuthMiddleware } from './middleware/websocketAuth';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Initialize WebSocket services
let webSocketService: WebSocketService;
let webSocketHandlers: WebSocketHandlers;

const PORT = process.env.PORT || 4001;

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
app.use('/api', (req, res, next) => {
  // For now, use a default tenant ID if not provided
  if (!req.headers['x-tenant-id']) {
    req.headers['x-tenant-id'] = '550e8400-e29b-41d4-a716-446655440000';
  }
  // Set tenantId on request object for easy access
  req.tenantId = req.headers['x-tenant-id'] as string;
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
      orders: '/api/orders',
      kitchen: '/api/kitchen',
      dashboard: '/api/dashboard',
      analytics: '/api/analytics',
      websocket: '/api/websocket',
      api: '/api'
    }
  });
});

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/kitchen', kitchenRouter);
app.use('/api/websocket', websocketRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/dashboard', dashboardRouter);

// WebSocket connection handling with authentication
io.use(websocketAuthMiddleware);

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Setup all WebSocket handlers for this socket
  if (webSocketHandlers) {
    webSocketHandlers.setupAllHandlers(socket);
  }
  
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id} - ${reason}`);
  });
  
  // Send welcome message
  socket.emit('connected', {
    message: 'Connected to FoodTrack WebSocket',
    socketId: socket.id,
    timestamp: new Date().toISOString()
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
      
      // Initialize WebSocket services after database connection
      webSocketService = new WebSocketService(io);
      webSocketHandlers = new WebSocketHandlers(webSocketService);
      
      server.listen(PORT, () => {
        console.log('🔌 WebSocket server initialized with authentication');
        console.log(`🚀 API Gateway running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log('🔌 WebSocket server ready for real-time communication');
        console.log('📡 WebSocket endpoints:');
        console.log('  - Kitchen: kitchen:subscribe, kitchen:get_orders, kitchen:update_order_status');
        console.log('  - Orders: order:subscribe, order:get_details, order:update_status');
        console.log('  - Tenant: tenant:subscribe, tenant:get_stats, tenant:get_kitchen_status');
        console.log('  - Customer: customer:subscribe, customer:track_order');
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

export { app, server, io, webSocketService };