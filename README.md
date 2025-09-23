# iframe-ghost-docker

# ~~這個專案全部作廢，被GPT坑了~~
實際上如果把js直接硬寫進footer就可以使用，不需要透過第三方軟體幫忙輸出

## 專案結構
```
iframe-chat/
├─ app/                       # Node.js 應用程式
│   ├─ server.js              # Express 後端程式
│   ├─ package.json
│   ├─ public/                # 前端 GUI、CSS/JS
│   │   ├─ index.html
│   │   └─ editor.js          # GUI 邏輯
│   └─ default/               # 預設 CSS / JS
│       ├─ default.css
│       └─ default.js
├─ data/                      # 對話資料存放，每筆紀錄一個資料夾
│   └─ README.md              # 提示用途
├─ docker-compose.yml
└─ .env                       # 環境變數 (帳號密碼等)
```

### 說明

`app/`: 
 - 後端程式 + 前端 GUI
 - `default/` 裡面放預設 CSS/JS，可被每筆對話資料夾覆蓋

`data/`: 
 - 每筆對話存成資料夾，例如：
```
data/chat-20250923-001/
  ├─ chat.json
  ├─ custom.css
  ├─ custom.js
  └─ index.html
```

`docker-compose.yml`:
 - `./app`：掛載你的 Node.js 程式碼
 - `./data`：存放對話資料與 HTML
 - ADMIN_USER / ADMIN_PASS：透過 .env 設定帳號密碼
 - 容器對外端口 3001 → 可以在 Ghost <iframe> 裡面嵌入

`.env`: 
- 存放簡單登入帳號密碼，例如：
```
ADMIN_USER=admin
ADMIN_PASS=123456
```
