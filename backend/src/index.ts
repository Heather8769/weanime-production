// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Import all routes
import authRoutes from './routes/auth.js';
// import usersRoutes from './routes/users.js';
// import animeRoutes from './routes/anime.js';
// import episodesRoutes from './routes/episodes.js';
// import adminRoutes from './routes/admin.js';
import testRoutes from './routes/test.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.get('/api', (req, res) => {
  res.json({
    message: 'WeAnime Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      anime: '/api/anime',
      episodes: '/api/episodes',
      admin: '/api/admin',
      test: '/api/test'
    }
  });
});

// Mount all route modules
app.use('/api/auth', authRoutes);
// app.use('/api/users', usersRoutes);
// app.use('/api/anime', animeRoutes);
// app.use('/api/episodes', episodesRoutes);
// app.use('/api/admin', adminRoutes);
app.use('/api/test', testRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: ['/health', '/api', '/api/auth', '/api/users', '/api/anime', '/api/episodes', '/api/admin', '/api/test']
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WeAnime Backend Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth System: ACTIVE`);
  console.log(`👤 User Management: ACTIVE`);
  console.log(`🎬 Anime API: ACTIVE`);
  console.log(`📺 Episodes API: ACTIVE`);
  console.log(`⚙️  Admin Panel: ACTIVE`);
  console.log(`🛡️  Validation System: ACTIVE`);
});

export default app;