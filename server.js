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

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'luxstay-fallback-secret-2024',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
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

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.csrfToken = generateCsrfToken(req);
  res.locals.success = req.session.success || null;
  res.locals.error = req.session.error || null;
  delete req.session.success;
  delete req.session.error;
  next();
});

async function startServer() {
  await getDb();
  console.log('📦 Database connected');

  app.use('/', require('./routes/index'));
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
        message: process.env.NODE_ENV === 'production'
          ? 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
          : err.message
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
