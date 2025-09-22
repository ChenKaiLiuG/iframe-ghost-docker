const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const MarkdownIt = require('markdown-it');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'chats');
const DEFAULT_DIR = path.join(__dirname, 'default');

// ---- 讀取簡單帳號密碼 ----
let auth = {user:'admin', pass:'password'};
const authFile = path.join(__dirname, 'auth.json');
if(fs.existsSync(authFile)) auth = JSON.parse(fs.readFileSync(authFile,'utf8'));

// ---- Middleware ----
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use(session({
  secret: 'chat-secret-key',
  resave: false,
  saveUninitialized: true
}));

// ---- 簡單登入認證 ----
function authMiddleware(req,res,next){
  if(req.session && req.session.loggedIn) next();
  else res.status(401).send('未登入');
}

app.post('/login', (req,res)=>{
  const {user, pass} = req.body;
  if(user===auth.user && pass===auth.pass){
    req.session.loggedIn=true;
    res.sendStatus(200);
  }else res.sendStatus(401);
});

// ---- Markdown Parser ----
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
});

// ---- 取得對話列表 ----
app.get('/api/chats', authMiddleware, (req,res)=>{
  if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  const chats = fs.readdirSync(DATA_DIR).filter(f=>fs.statSync(path.join(DATA_DIR,f)).isDirectory());
  res.json(chats);
});

// ---- 取得單筆對話 ----
app.get('/api/chat/:chatId', authMiddleware, (req,res)=>{
  const id = req.params.chatId;
  const chatDir = path.join(DATA_DIR,id);
  if(!fs.existsSync(chatDir)) return res.status(404).send('找不到對話');

  const chatFile = path.join(chatDir,'chat.json');
  const cssFile = path.join(chatDir,'custom.css');
  const jsFile = path.join(chatDir,'custom.js');

  const chatData = fs.existsSync(chatFile) ? JSON.parse(fs.readFileSync(chatFile,'utf8')) : [];
  const css = fs.existsSync(cssFile) ? fs.readFileSync(cssFile,'utf8') : fs.readFileSync(path.join(DEFAULT_DIR,'default.css'),'utf8');
  const js = fs.existsSync(jsFile) ? fs.readFileSync(jsFile,'utf8') : fs.readFileSync(path.join(DEFAULT_DIR,'default.js'),'utf8');

  res.json({chat: chatData, css, js});
});

// ---- 新增訊息或對話 ----
app.post('/api/chat', authMiddleware, (req,res)=>{
  let {role, content, chatId} = req.body;
  if(!role || !content) return res.status(400).send('缺少 role 或 content');

  if(!chatId){
    chatId = 'chat_' + Date.now();
    const chatDir = path.join(DATA_DIR,chatId);
    fs.mkdirSync(chatDir, {recursive:true});
    // 初始化 default CSS / JS
    fs.copyFileSync(path.join(DEFAULT_DIR,'default.css'), path.join(chatDir,'custom.css'));
    fs.copyFileSync(path.join(DEFAULT_DIR,'default.js'), path.join(chatDir,'custom.js'));
    fs.writeFileSync(path.join(chatDir,'chat.json'), JSON.stringify([{role, content}], null, 2));
    return res.json({chatId});
  }

  // 已存在對話
  const chatDir = path.join(DATA_DIR,chatId);
  const chatFile = path.join(chatDir,'chat.json');
  let chatData = fs.existsSync(chatFile) ? JSON.parse(fs.readFileSync(chatFile,'utf8')) : [];
  chatData.push({role, content});
  fs.writeFileSync(chatFile, JSON.stringify(chatData,null,2));
  res.json({chatId});
});

// ---- 儲存 CSS / JS ----
app.post('/api/chat/:chatId/save', authMiddleware, (req,res)=>{
  const {css, js} = req.body;
  const chatDir = path.join(DATA_DIR, req.params.chatId);
  if(!fs.existsSync(chatDir)) return res.status(404).send('找不到對話');

  fs.writeFileSync(path.join(chatDir,'custom.css'), css);
  fs.writeFileSync(path.join(chatDir,'custom.js'), js);
  res.json({ok:true});
});

// ---- 渲染 HTML ----
app.get('/render/:chatId', authMiddleware, (req,res)=>{
  const chatDir = path.join(DATA_DIR, req.params.chatId);
  if(!fs.existsSync(chatDir)) return res.status(404).send('找不到對話');

  const chatFile = path.join(chatDir,'chat.json');
  const cssFile = path.join(chatDir,'custom.css');
  const jsFile = path.join(chatDir,'custom.js');

  const chatData = fs.existsSync(chatFile) ? JSON.parse(fs.readFileSync(chatFile,'utf8')) : [];
  const css = fs.existsSync(cssFile) ? fs.readFileSync(cssFile,'utf8') : fs.readFileSync(path.join(DEFAULT_DIR,'default.css'),'utf8');
  const js = fs.existsSync(jsFile) ? fs.readFileSync(jsFile,'utf8') : fs.readFileSync(path.join(DEFAULT_DIR,'default.js'),'utf8');

  let html = `
  <!DOCTYPE html>
  <html lang="zh-TW">
  <head>
    <meta charset="UTF-8">
    <style>${css}</style>
  </head>
  <body>
    <div class="chat-wrap">
      <div class="chat">
  `;

  chatData.forEach(m=>{
    html += `
      <div class="msg ${m.role}">
        <div class="bubble md">${md.render(m.content)}</div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
    <script>${js}</script>
  </body>
  </html>
  `;

  res.send(html);
});

// ---- 啟動伺服器 ----
app.listen(PORT, ()=>{
  console.log(`Server running at http://localhost:${PORT}`);
});
