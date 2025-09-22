require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const md = require('markdown-it')({ html: true, linkify: true, typographer: true });
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(require('cors')());

// Session for simple login
app.use(session({
  secret: 'iframe-chat-secret',
  resave: false,
  saveUninitialized: true
}));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session.loggedIn) return next();
  res.status(401).send('Unauthorized');
}

// Environment login
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '123456';

// Directories
const DATA_DIR = path.join(__dirname, 'data');
const DEFAULT_CSS = path.join(__dirname, 'default', 'default.css');
const DEFAULT_JS = path.join(__dirname, 'default', 'default.js');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// --- Login API ---
app.post('/login', (req, res) => {
  const { user, pass } = req.body;
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    req.session.loggedIn = true;
    res.json({ status: 'ok' });
  } else {
    res.status(401).json({ status: 'fail' });
  }
});

// --- List all chats ---
app.get('/api/chats', requireAuth, (req, res) => {
  const chats = fs.readdirSync(DATA_DIR).filter(f => fs.statSync(path.join(DATA_DIR,f)).isDirectory());
  res.json(chats);
});

// --- Get specific chat data ---
app.get('/api/chat/:id', requireAuth, (req,res) => {
  const chatId = req.params.id;
  const chatDir = path.join(DATA_DIR, chatId);
  if (!fs.existsSync(chatDir)) return res.status(404).send('Not found');

  const chatFile = path.join(chatDir, 'chat.json');
  const cssFile = path.join(chatDir, 'custom.css');
  const jsFile = path.join(chatDir, 'custom.js');

  const chatData = fs.existsSync(chatFile) ? JSON.parse(fs.readFileSync(chatFile)) : [];
  const cssData = fs.existsSync(cssFile) ? fs.readFileSync(cssFile, 'utf-8') : fs.existsSync(DEFAULT_CSS) ? fs.readFileSync(DEFAULT_CSS, 'utf-8') : '';
  const jsData = fs.existsSync(jsFile) ? fs.readFileSync(jsFile, 'utf-8') : fs.existsSync(DEFAULT_JS) ? fs.readFileSync(DEFAULT_JS, 'utf-8') : '';

  res.json({ chat: chatData, css: cssData, js: jsData });
});

// --- Create new chat / add message ---
app.post('/api/chat', requireAuth, (req,res) => {
  const { role, content, chatId } = req.body;
  let id = chatId;
  if (!id) {
    id = 'chat-' + new Date().toISOString().replace(/[:.]/g,'-') + '-' + uuidv4().slice(0,6);
    fs.mkdirSync(path.join(DATA_DIR, id), { recursive: true });
    // copy default css/js
    if (fs.existsSync(DEFAULT_CSS)) fs.copyFileSync(DEFAULT_CSS, path.join(DATA_DIR,id,'custom.css'));
    if (fs.existsSync(DEFAULT_JS)) fs.copyFileSync(DEFAULT_JS, path.join(DATA_DIR,id,'custom.js'));
  }

  const chatFile = path.join(DATA_DIR, id, 'chat.json');
  let chatData = [];
  if (fs.existsSync(chatFile)) chatData = JSON.parse(fs.readFileSync(chatFile));
  chatData.push({ role, content });
  fs.writeFileSync(chatFile, JSON.stringify(chatData,null,2));

  res.json({ status:'ok', chatId: id });
});

// --- Save CSS/JS ---
app.post('/api/chat/:id/save', requireAuth, (req,res) => {
  const chatId = req.params.id;
  const chatDir = path.join(DATA_DIR, chatId);
  if (!fs.existsSync(chatDir)) return res.status(404).send('Not found');

  const { css, js } = req.body;
  if (css !== undefined) fs.writeFileSync(path.join(chatDir,'custom.css'), css);
  if (js !== undefined) fs.writeFileSync(path.join(chatDir,'custom.js'), js);

  res.json({ status:'ok' });
});

// --- Render chat HTML for iframe ---
app.get('/render/:id', (req,res) => {
  const chatId = req.params.id;
  const chatDir = path.join(DATA_DIR, chatId);
  if (!fs.existsSync(chatDir)) return res.status(404).send('Not found');

  const chatFile = path.join(chatDir, 'chat.json');
  const cssFile = path.join(chatDir, 'custom.css');
  const jsFile = path.join(chatDir, 'custom.js');

  const chatData = fs.existsSync(chatFile) ? JSON.parse(fs.readFileSync(chatFile)) : [];
  const cssData = fs.existsSync(cssFile) ? fs.readFileSync(cssFile, 'utf-8') : '';
  const jsData = fs.existsSync(jsFile) ? fs.readFileSync(jsFile, 'utf-8') : '';

  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <title>${chatId}</title>
    <style>
      body { font-family:sans-serif; background:#f5f7fa; padding:20px; }
      .bubble { max-width:80%; padding:12px 14px; border-radius:16px; margin-bottom:12px; }
      .ai { background:#fff; color:#111; border:1px solid #e5e7eb; }
      .user { background:linear-gradient(135deg,#4aa3ff,#0078d7); color:#fff; }
      pre { background:#1e293b; color:#e2e8f0; padding:10px; border-radius:8px; overflow-x:auto; }
      code { background:rgba(0,0,0,0.1); padding:2px 6px; border-radius:4px; font-family:monospace; }
      img { max-width:100%; border-radius:6px; margin:6px 0; }
      ${cssData}
    </style>
  </head>
  <body>
  `;

  chatData.forEach(m => {
    html += `<div class="bubble ${m.role}">${md.render(m.content)}</div>`;
  });

  html += `<script>${jsData}</script></body></html>`;
  res.send(html);
});

// Start server
app.listen(PORT, () => {
  console.log(`Iframe Chat running on port ${PORT}`);
});
