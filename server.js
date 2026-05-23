require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { getDb } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const labModeEnabled = process.env.LAB_MODE === 'true' && !isProduction;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  maxAge: isProduction ? '1d' : 0
}));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(express.json({ limit: '50kb' }));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'same-origin' },
  frameguard: { action: 'sameorigin' }
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Quá nhiều yêu cầu đăng nhập, vui lòng thử lại sau.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use(session({
  name: 'luxstay.sid',
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

function generateCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

function validateCsrf(req, res, next) {
  if (req.method !== 'POST') return next();

  const formToken = req.body?._csrf || req.headers['x-csrf-token'];
  if (!req.session.csrfToken || formToken !== req.session.csrfToken) {
    return res.status(403).render('error', {
      error: { status: 403, message: 'Phiên gửi biểu mẫu không hợp lệ. Vui lòng tải lại trang.' }
    });
  }

  return next();
}

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.csrfToken = generateCsrfToken(req);
  res.locals.success = req.session.success || null;
  res.locals.error = req.session.error || null;
  res.locals.labMode = labModeEnabled;
  delete req.session.success;
  delete req.session.error;
  next();
});

app.use(validateCsrf);

async function startServer() {
  await getDb();
  console.log('📦 Database connected');

  app.use('/', require('./routes/index'));
  app.use('/rooms', require('./routes/rooms'));
  app.use('/bookings', require('./routes/bookings'));
  app.use('/auth', authLimiter, require('./routes/auth'));
  app.use('/support', require('./routes/support'));
  app.use('/contact', require('./routes/contact'));

  app.use((req, res) => {
    res.status(404).render('error', {
      error: { status: 404, message: 'Trang bạn tìm không tồn tại.' }
    });
  });

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).render('error', {
      error: {
        status: err.status || 500,
        message: isProduction ? 'Đã xảy ra lỗi. Vui lòng thử lại sau.' : err.message
      }
    });
  });

  app.listen(PORT, () => {
    console.log(`\n🏨 LuxStay is running at http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
