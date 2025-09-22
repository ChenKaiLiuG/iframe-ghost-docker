let currentChatId = null;

// ---- 登入功能 ----
async function login() {
  const user = document.getElementById('loginUser').value;
  const pass = document.getElementById('loginPass').value;
  const msg = document.getElementById('loginMsg');

  try {
    const res = await fetch('/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({user, pass})
    });
    if(res.ok){
      document.getElementById('loginScreen').style.display='none';
      document.getElementById('appScreen').style.display='flex';
      loadChatList().then(renderPreview);
    } else {
      msg.textContent = '帳號或密碼錯誤';
    }
  } catch(e){
    msg.textContent = '登入失敗';
  }
}

// ---- Markdown 預覽 ----
async function renderPreview() {
  if (!currentChatId) return;
  const res = await fetch(`/api/chat/${currentChatId}`);
  const data = await res.json();
  const preview = document.getElementById('preview');
  preview.innerHTML = '';
  data.chat.forEach(m => {
    const div = document.createElement('div');
    div.className = 'bubble ' + m.role;
    div.innerHTML = m.content
      .replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/\n/g,"<br>");
    preview.appendChild(div);
  });

  document.getElementById('htmlArea').value = await fetch(`/render/${currentChatId}`).then(r=>r.text());
  document.getElementById('cssArea').value = data.css;
  document.getElementById('jsArea').value = data.js;
}

// ---- 對話列表 ----
async function loadChatList() {
  const res = await fetch('/api/chats');
  const chats = await res.json();
  const list = document.getElementById('chatList');
  list.innerHTML = '';
  chats.forEach(id => {
    const li = document.createElement('li');
    li.textContent = id;
    li.style.cursor = 'pointer';
    li.onclick = () => { currentChatId = id; renderPreview(); };
    list.appendChild(li);
  });
}

// ---- 新增對話 ----
function newChat() {
  currentChatId = null;
  const role = document.getElementById('role').value;
  const content = document.getElementById('content').value || '初始訊息';
  fetch('/api/chat', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({role, content})
  }).then(r=>r.json()).then(res=>{
    currentChatId = res.chatId;
    document.getElementById('content').value = '';
    loadChatList().then(renderPreview);
  });
}

// ---- 新增訊息 ----
function addMessage() {
  if (!currentChatId) { alert('請先選擇或建立對話'); return; }
  const role = document.getElementById('role').value;
  const content = document.getElementById('content').value;
  if (!content) return;
  fetch('/api/chat', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({role, content, chatId: currentChatId})
  }).then(r=>r.json()).then(res=>{
    document.getElementById('content').value = '';
    renderPreview();
  });
}

// ---- 更新預覽 ----
function loadRender() { renderPreview(); }

// ---- 複製 HTML ----
function copyHTML() {
  const area = document.getElementById('htmlArea');
  area.select();
  document.execCommand('copy');
  alert('已複製 HTML');
}

// ---- 儲存 CSS / JS ----
function saveCSSJS() {
  if (!currentChatId) return;
  const css = document.getElementById('cssArea').value;
  const js = document.getElementById('jsArea').value;
  fetch(`/api/chat/${currentChatId}/save`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({css, js})
  }).then(r=>r.json()).then(res=>{
    alert('已儲存 CSS / JS');
    renderPreview();
  });
}
