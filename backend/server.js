const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

const evidenceRoutes = require('./routes/evidenceRoutes');
const caseRoutes = require('./routes/caseRoutes');
const timelineRoutes = require('./routes/timelineRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const userRoutes = require('./routes/userRoutes');

const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000';
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '2mb';
const URLENCODED_BODY_LIMIT = process.env.URLENCODED_BODY_LIMIT || '2mb';

if (!MONGO_URI) {
  console.error('MONGO_URI is missing. Add it to your .env file.');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Add it to your .env file.');
  process.exit(1);
}

app.disable('x-powered-by');

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const allowed = CORS_ORIGIN.split(',').map((item) => item.trim()).filter(Boolean);
      if (allowed.includes(origin) || (process.env.NODE_ENV !== 'production' && allowed.length === 0)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: URLENCODED_BODY_LIMIT }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'EvidenceSystem Backend',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/users', userRoutes);

app.use(notFound);
app.use(errorHandler);

async function connectDatabase() {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function startServer() {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`EvidenceSystem backend running on port ${PORT}`);
    console.log(`API available at: http://localhost:${PORT}/api`);
  });
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

module.exports = app;
