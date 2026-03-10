const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const RATE_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const requestBuckets = new Map();

const isPlaceholder = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes('your_email') ||
    normalized.includes('your_app_password') ||
    normalized.includes('example.com')
  );
};

const smtpConfig = {
  host: process.env.SMTP_HOST || '',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: String(process.env.SMTP_SECURE || 'true').toLowerCase() === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

const mailConfig = {
  from: isPlaceholder(process.env.SMTP_FROM) ? process.env.SMTP_USER || '' : process.env.SMTP_FROM || '',
  to: isPlaceholder(process.env.SMTP_TO) ? process.env.SMTP_USER || '' : process.env.SMTP_TO || '',
};

const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowAnyOrigin = allowedOrigins.includes('*');

const smtpMissingKeys = [];
if (isPlaceholder(smtpConfig.host)) {
  smtpMissingKeys.push('SMTP_HOST');
}
if (isPlaceholder(smtpConfig.auth.user)) {
  smtpMissingKeys.push('SMTP_USER');
}
if (isPlaceholder(smtpConfig.auth.pass)) {
  smtpMissingKeys.push('SMTP_PASS');
}
if (isPlaceholder(mailConfig.to)) {
  smtpMissingKeys.push('SMTP_TO');
}

const isSmtpReady = smtpMissingKeys.length === 0;

let transporter = null;
if (isSmtpReady) {
  transporter = nodemailer.createTransport(smtpConfig);
  transporter.verify().then(
    () => {
      console.log('[SMTP] Transport is ready.');
    },
    (error) => {
      console.error('[SMTP] Transport verification failed:', error.message);
    },
  );
} else {
  console.warn(
    `[SMTP] Missing SMTP env values (${smtpMissingKeys.join(', ')}). Contact API will return configuration errors.`,
  );
}

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

app.use('/api', (req, res, next) => {
  const origin = String(req.headers.origin || '');

  if (allowAnyOrigin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

app.use(express.static(ROOT_DIR));

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cleanText = (value, maxLen) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLen);

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getClientIp = (req) => {
  const forwarded = String(req.headers['x-forwarded-for'] || '');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return req.socket?.remoteAddress || 'unknown';
};

const isRateLimited = (ip) => {
  const now = Date.now();
  const bucket = requestBuckets.get(ip);

  if (!bucket || now > bucket.resetAt) {
    requestBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  bucket.count += 1;
  return false;
};

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    smtpReady: isSmtpReady,
    missingSmtp: smtpMissingKeys,
    time: new Date().toISOString(),
  });
});

app.post('/api/contact', async (req, res) => {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again in a minute.',
    });
    return;
  }

  const fullname = cleanText(req.body.fullname, 120);
  const email = cleanText(req.body.email, 160).toLowerCase();
  const message = String(req.body.message || '').trim().slice(0, 4000);

  if (!fullname || !email || !message) {
    res.status(400).json({
      success: false,
      message: 'Full name, email, and message are required.',
    });
    return;
  }

  if (!emailRegex.test(email)) {
    res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.',
    });
    return;
  }

  if (!transporter || !isSmtpReady) {
    res.status(500).json({
      success: false,
      message: `Email service is not configured. Missing: ${smtpMissingKeys.join(', ')}. Update .env and restart server.`,
    });
    return;
  }

  const safeName = escapeHtml(fullname);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
  const userAgent = escapeHtml(req.headers['user-agent'] || 'unknown');
  const submittedAt = new Date().toISOString();

  const subject = `Portfolio Contact from ${fullname}`;
  const textBody = [
    `Name: ${fullname}`,
    `Email: ${email}`,
    `IP: ${ip}`,
    `User Agent: ${req.headers['user-agent'] || 'unknown'}`,
    `Submitted: ${submittedAt}`,
    '',
    'Message:',
    message,
  ].join('\n');

  const htmlBody = `
    <h2>New portfolio contact message</h2>
    <p><strong>Name:</strong> ${safeName}</p>
    <p><strong>Email:</strong> ${safeEmail}</p>
    <p><strong>IP:</strong> ${escapeHtml(ip)}</p>
    <p><strong>User Agent:</strong> ${userAgent}</p>
    <p><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>
    <hr>
    <p><strong>Message:</strong></p>
    <p>${safeMessage}</p>
  `;

  try {
    await transporter.sendMail({
      from: mailConfig.from,
      to: mailConfig.to,
      replyTo: email,
      subject,
      text: textBody,
      html: htmlBody,
    });

    res.json({
      success: true,
      message: 'Message sent successfully.',
    });
  } catch (error) {
    console.error('[SMTP] sendMail failed:', error.message);

    const errorMessage = String(error && error.message ? error.message : '');
    const isAuthError =
      errorMessage.toLowerCase().includes('invalid login') ||
      errorMessage.toLowerCase().includes('badcredentials') ||
      errorMessage.toLowerCase().includes('username and password not accepted') ||
      errorMessage.toLowerCase().includes('eauth');

    res.status(502).json({
      success: false,
      message: isAuthError
        ? 'SMTP authentication failed. For Gmail, use App Password in SMTP_PASS and restart server.'
        : 'Message could not be sent. Please try again later.',
    });
  }
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ success: false, message: 'API route not found.' });
    return;
  }

  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
