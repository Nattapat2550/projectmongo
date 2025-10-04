# ProjectMongo — Full-Stack Web App (Express + MongoDB + Vanilla Frontend)

ระบบสมาชิก/ล็อกอินด้วยอีเมลและ Google OAuth, จัดการโปรไฟล์, หน้าที่ผู้ใช้/แอดมิน, อัปโหลดรูปโปรไฟล์, แก้ไขคอนเทนต์หน้า Home (Carousel) จากหน้า Admin พร้อมรองรับการ deploy บน **Render** แบบ production

> โค้ดนี้ออกแบบให้ **ไม่มีการเปลี่ยนโครงสร้างไฟล์** ใด ๆ จากที่กำหนด และใช้ **ESM** ฝั่ง backend ทั้งหมด
> Frontend เป็น **Vanilla HTML/CSS/JS** ไม่มีเฟรมเวิร์ก

---

## 🔖 โครงสร้างโปรเจกต์

```
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env                      # ใช้เฉพาะฝั่ง backend (ไม่ commit)
│   ├── config/
│   │   └── db.js                 # เชื่อม MongoDB
│   ├── models/
│   │   ├── user.js               # schema ผู้ใช้
│   │   └── homepage.js           # schema เนื้อหา/Carousel หน้า Home
│   ├── routes/
│   │   ├── auth.js               # สมัคร, verify, login, Google OAuth, reset password, logout
│   │   ├── users.js              # ข้อมูลตนเอง, อัปเดตชื่อ, อัปโหลดโปรไฟล์, ลบบัญชี
│   │   ├── admin.js              # สำหรับ admin: จัดการ user, homepage-content, carousel
│   │   └── homepage.js           # API สาธารณะ (GET /api/homepage/carousel)
│   ├── middleware/
│   │   └── auth.js               # isAuthenticated, isAdmin
│   └── utils/
│       ├── gmail.js              # ส่งอีเมลผ่าน Gmail API + OAuth2
│       └── generateCode.js       # สร้างรหัส 6 หลัก
├── frontend/
│   ├── index.html
│   ├── register.html
│   ├── check.html
│   ├── form.html
│   ├── login.html
│   ├── reset.html
│   ├── home.html
│   ├── settings.html
│   ├── admin.html
│   ├── about.html
│   ├── contact.html
│   ├── css/
│   │   └── style.css             # ธีม light/dark + UI ทั้งระบบ
│   ├── js/
│   │   ├── main.js               # fetch wrapper, route guard, theme, navbar, dropdown, logout
│   │   ├── register.js           # สมัครด้วยอีเมล + ปุ่ม Google
│   │   ├── check.js              # ยืนยันรหัส 6 หลัก
│   │   ├── form.js               # กรอก username + password (หรือข้าม password กรณี Google)
│   │   ├── login.js              # ล็อกอิน + modal ลืมรหัสผ่าน
│   │   ├── reset.js              # ตั้งรหัสใหม่จาก token ในลิงก์อีเมล (รองรับวาง token เอง)
│   │   ├── home.js               # โหลด Carousel + ควบคุมเลื่อนภาพ
│   │   ├── settings.js           # เปลี่ยนชื่อ, อัปโหลดโปรไฟล์, สลับธีม, ลบบัญชี
│   │   └── admin.js              # จัดการ Homepage body, Users, Carousel
│   └── images/
│       └── user.png              # รูปโปรไฟล์ default
```

---

## ⚙️ การตั้งค่า `.env` (ใช้ชื่อแปรตามนี้เท่านั้น)

> วางไฟล์ `.env` ไว้ในโฟลเดอร์ `backend/` (อย่า commit) และกำหนดใน Render Dashboard ด้วยชื่อเดียวกัน

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://user:1234@cluster0.mo8yjav.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Session Secret
SESSION_SECRET=your-session-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_CALLBACK_URI=https://projectmongo.onrender.com/api/auth/google/callback

# Frontend URL
FRONTEND_URL=https://projectmongo-1.onrender.com

# Server URL
SERVER_URL=https://projectmongo.onrender.com

# Gmail API (OAuth2)
GOOGLE_REDIRECT_URI=https://projectmongo.onrender.com/oauth2callback
REFRESH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDER_EMAIL=youremail@gmail.com

# Environment
NODE_ENV=production
```

**สำคัญ:**

* `FRONTEND_URL` และ `SERVER_URL` ต้องตรงกับโดเมนที่ใช้งานจริงบน Render
* ตั้งค่า **Authorized redirect URI** ใน Google Cloud Console ให้ตรงกับ `GOOGLE_CALLBACK_URI`
* Gmail API ต้องเปิดใช้ (Scopes: Gmail.send) และได้ `refresh_token` ของบัญชีผู้ส่งที่ตรงกับ `SENDER_EMAIL`

---

## ▶️ การรันในเครื่อง (Local Dev)

1. ติดตั้งแพ็กเกจ (เฉพาะฝั่ง backend)

```bash
cd backend
npm install
```

2. สร้าง `backend/.env` ตามตัวอย่างด้านบน (เปลี่ยนค่าเป็นของคุณ)

3. รันเซิร์ฟเวอร์

```bash
npm start
```

4. เปิดไฟล์ HTML ใน `frontend/` ด้วย Live Server หรือเสิร์ฟ static ด้วย backend (โหมด production จะเสิร์ฟไฟล์จาก `frontend/` อัตโนมัติ)

> ใน dev ถ้าจะยิง API โดยตรง ใช้ `http://localhost:<PORT>/api/...` (ค่าเริ่มต้น PORT=10000 ถ้าไม่ได้ตั้ง)

---

## 🚀 Deploy บน Render

1. สร้างบริการ **Web Service** ชี้ไปที่โฟลเดอร์ `backend/`
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Node version ใช้จาก `backend/package.json` (รองรับ Node 18+)
5. เพิ่ม **Environment Variables** ทั้งหมดตาม `.env` ข้างบน
6. ถ้าเสิร์ฟ frontend ด้วย backend: ให้ commit โฟลเดอร์ `frontend/` ไปพร้อมกัน (production จะเสิร์ฟ static จาก `/frontend`)

---

## 🔐 สถาปัตยกรรมและความปลอดภัย (สรุป)

* **Auth แบบผสม**:

  * Email Flow: `/register` → ส่งรหัส 6 หลักทางอีเมล → `/verify-email` (ออก **pre-token**) → `/complete-registration` (สร้างรหัสผ่าน+username → ออก **full token**)
  * Google OAuth: `/api/auth/google` → Google → `/api/auth/google/callback` (ออก full token)
* **JWT**:

  * เก็บใน **cookie (httpOnly)** + **sessionStorage/localStorage** เพื่อกันกรณี Third-Party Cookies ถูกบล็อก
* **CORS**:

  * อนุญาตเฉพาะ `FRONTEND_URL` และ `SERVER_URL`
* **Cookies**:

  * ใน production ใช้ `secure: true` + `sameSite: 'none'`
* **พาสเวิร์ด**:

  * เก็บแบบ hash ด้วย **bcrypt**, เปลี่ยนแปลงผ่าน pre-save hook
* **ลืมรหัสผ่าน**:

  * สร้าง token แบบสุ่ม (เก็บ **hash** + expiration) → ส่งลิงก์ `/reset.html?token=...` ทางอีเมล → หน้าตั้งรหัสใหม่ (`/api/auth/reset-password`)
* **อัปโหลดไฟล์**:

  * ใช้ `multer` เก็บไฟล์ลง `backend/uploads/` และเสิร์ฟสาธารณะที่ `/uploads/...`
* **Route Guard ฝั่งหน้าเว็บ**:

  * ไม่มี token และไม่ใช่หน้า public → เด้งไป `/index.html`
  * role=user ไปหน้าอื่นที่ไม่เกี่ยว → เด้ง `/home.html`
  * role=admin เข้าทุกหน้า

---

## 🧭 รายละเอียดไฟล์ — Backend

### `backend/server.js`

* โหลด env, เชื่อม Mongo (`connectDB`)
* ตั้งค่า middleware: `cors`, `express.json`, `cookie-parser`, `express-session` (ใช้เฉพาะ OAuth flow, ไม่ผูก state)
* `passport.initialize()` และ config Google Strategy ใน `routes/auth.js`
* Static `/uploads` ให้ผู้ใช้เข้าถึงรูปที่อัปโหลด
* Mount routes: `/api/auth`, `/api/users`, `/api/admin`, `/api/homepage`
* โหมด production: เสิร์ฟไฟล์ใน `frontend/` สำหรับทุกหน้า (เช่น `/home.html`, `/admin.html`, …)
* เริ่มฟัง `PORT` (default 10000)

### `backend/config/db.js`

* เชื่อม Mongoose ด้วย `MONGODB_URI` พร้อม log

### `backend/models/user.js`

* ฟิลด์: `email`, `username`, `password`, `googleId`, `profilePicture`, `role`, token/expire สำหรับ verify/reset
* pre-save hash password
* method `comparePassword()`

### `backend/models/homepage.js`

* เก็บเนื้อหาหน้า Home และรายการ Carousel (index, title, subtitle, description, imageUrl, active)

### `backend/middleware/auth.js`

* `isAuthenticated`: ตรวจ JWT จาก **Authorization: Bearer** หรือ **cookie** → แนบ `req.user`
* `isAdmin`: ตรวจ `req.user.role === 'admin'`

### `backend/utils/generateCode.js`

* คืนโค้ด 6 หลักเป็น string

### `backend/utils/gmail.js`

* Gmail API + OAuth2 (ใช้ `googleapis` + `nodemailer`’s `MailComposer`)
* `sendEmail(to, subject, html)`

### `backend/routes/auth.js`

* `POST /register` — รับ `email`, ตรวจซ้ำ, สร้าง user (เฉพาะ email+verification hash), ส่งรหัสทางเมล
* `POST /verify-email` — ตรวจรหัส 6 หลักและหมดอายุ, เคลียร์ฟิลด์, ออก **pre-token** (stage:'pre')
* `POST /complete-registration` — ต้องมี pre-token; รับ `username`, `password`; เซฟและออก **full token** (cookie + JSON)
* `GET /google` — เริ่ม OAuth
* `GET /google/callback` — รับจาก Google, หา/สร้าง user, ออก token, redirect กลับ `FRONTEND_URL` พร้อม `#token=`
* `POST /login` — email/password → token (จำ session ตาม `rememberMe`)
* `POST /forgot-password` — สร้าง token, เก็บ hash+หมดอายุ, ส่งลิงก์ `/reset.html?token=...`
* `POST /reset-password` — ยอมรับ token จาก **query** หรือ **body**, ตรวจหมดอายุ, อัปเดตรหัสผ่าน
* `POST /logout` — ลบ cookie/หมดอายุ

### `backend/routes/users.js`

* **ทั้งหมดต้อง auth**
* `GET /me` — คืนข้อมูลผู้ใช้ปัจจุบัน (ไม่รวม password hash)
* `PUT /settings` — เปลี่ยน `username`
* `POST /settings/upload-picture` — อัปโหลดรูป (multer) → เซฟพาธลง `profilePicture` → คืน URL `/uploads/xxx.png`
* `DELETE /account` — ลบผู้ใช้ (soft delete ไม่ได้ implement)

### `backend/routes/admin.js`

* ใช้ `isAuthenticated` + `isAdmin` ทุก endpoint
* `GET /users` — ดึงผู้ใช้ทั้งหมด (ตัดฟิลด์ลับ)
* `PUT /users/:id` — เปลี่ยน role/username
* `GET /homepage-content` / `PUT /homepage-content` — เนื้อหาหลักหน้า Home
* `GET /carousel` / `POST /carousel` / `PUT /carousel/:id` / `DELETE /carousel/:id` — จัดการสไลด์

### `backend/routes/homepage.js`

* `GET /api/homepage/carousel` — ดึงสไลด์ที่ active สำหรับหน้า Home (public)

---

## 🧭 รายละเอียดไฟล์ — Frontend

### `frontend/css/style.css`

* ธีม **dark/light** ผ่าน class `html.theme-dark` / `html.theme-light`
* สไตล์ Navbar, Dropdown, Card, Form, Button, Table
* Carousel: viewport/track/controls/dots รูปย่อวงกลม
* ปรับ checkbox label ให้ **อยู่บรรทัดเดียวกัน** (class `checkline`)

### `frontend/js/main.js`

* **Route Guard (ตามที่ขอ)**

  * ไม่มี token และไม่ใช่หน้า public (`/`, `/index.html`, `/about.html`, `/contact.html`, `/login.html`, `/register.html`, `/reset.html`) → **เด้ง `/index.html`**
  * role=`user` และเข้าเพจที่ไม่ใช่ (`/about.html`, `/contact.html`, `/settings.html`, `/home.html`, `/index.html`, `/reset.html`) → **เด้ง `/home.html`**
* fetch wrapper: `/api/*` ยิงไป backend, ใส่ **Authorization: Bearer** อัตโนมัติถ้ามี token ใน storage
* Theme toggle (บันทึกใน `localStorage`)
* Navbar population: โหลด `/api/users/me` เพื่อโชว์ username + avatar
* Dropdown controller + Logout
* แก้เคสรูป `src="/https://..."` อัตโนมัติ

### `frontend/js/register.js`

* POST `/api/auth/register` → ไป `/check.html?email=...`
* ปุ่ม Google → ไป `/api/auth/google`

### `frontend/js/check.js`

* ใส่ code 6 หลัก → POST `/api/auth/verify-email` → เก็บ pre-token และไป `/form.html`

### `frontend/js/form.js`

* ถ้ามาจาก Google (`?source=google`) จะซ่อน input password
* POST `/api/auth/complete-registration` → ออก full token และ redirect ตาม role

### `frontend/js/login.js`

* Login: POST `/api/auth/login` (remember me) → เก็บ token → redirect
* ปุ่ม Google OAuth
* Modal “ลืมรหัสผ่าน?” → POST `/api/auth/forgot-password` (ส่งลิงก์ไปอีเมล)

### `frontend/js/reset.js`

* อ่าน token จาก `?token=` หรือ `#token=`; ถ้าไม่มี เปิด input ให้วาง token เอง
* POST `/api/auth/reset-password` พร้อม token + รหัสใหม่ (ยืนยันให้ตรงกัน)

### `frontend/js/home.js`

* โหลดสไลด์จาก `/api/homepage/carousel`
* แสดงภาพแบบ `object-fit: contain` (ไม่ครอป), title ที่หัวรูป, description ใต้รูป
* ปุ่มก่อนหน้า/ถัดไป, auto slide, swipe บน mobile, dots เป็นรูปย่อวงกลม

### `frontend/js/settings.js`

* แสดงชื่อปัจจุบัน, เปลี่ยนชื่อ, อัปโหลดโปรไฟล์, ปุ่มลบบัญชี, ปุ่มสลับธีม

### `frontend/js/admin.js`

* แก้ไข homepage body
* ตารางผู้ใช้ (เปลี่ยน role, username)
* จัดการ Carousel (เพิ่ม/แก้/ลบ) + ปุ่มเลือกภาพแล้วอัปโหลดผ่าน `/api/users/settings/upload-picture`

### HTML ทุกหน้า

* มี Navbar + Dropdown (บางหน้า public จะไม่มี user data)
* ผูก script `main.js` ทุกหน้า และ script เฉพาะหน้าตามบทบาท

---

## 🔌 Endpoints สรุป

### Auth

* `POST /api/auth/register` — `{ email }`
* `POST /api/auth/verify-email` — `{ email, verificationCode }` ⇒ `{ token: preToken }`
* `POST /api/auth/complete-registration` — (Auth: preToken) `{ username, password? }` ⇒ `{ token, role }`
* `GET  /api/auth/google` — เริ่ม OAuth
* `GET  /api/auth/google/callback` — สร้าง/ล็อกอิน user ⇒ redirect `FRONTEND_URL` + `#token=...`
* `POST /api/auth/login` — `{ email, password, rememberMe }` ⇒ `{ token, role }`
* `POST /api/auth/forgot-password` — `{ email }` ⇒ ส่งลิงก์ `/reset.html?token=...` ทางอีเมล
* `POST /api/auth/reset-password?token=...` — `{ token?, newPassword, confirmPassword }`
* `POST /api/auth/logout`

### Users (ต้อง auth)

* `GET    /api/users/me`
* `PUT    /api/users/settings` — `{ username }`
* `POST   /api/users/settings/upload-picture` — `FormData{ avatar: file }` ⇒ `{ profilePicture: '/uploads/xxx.png' }`
* `DELETE /api/users/account`

### Admin (ต้อง auth + role=admin)

* `GET    /api/admin/users`
* `PUT    /api/admin/users/:id` — `{ role?, username? }`
* `GET    /api/admin/homepage-content`
* `PUT    /api/admin/homepage-content` — `{ body }`
* `GET    /api/admin/carousel`
* `POST   /api/admin/carousel` — `{ index, title, subtitle, description, imageUrl, active }`
* `PUT    /api/admin/carousel/:id` — ฟิลด์เดียวกับ POST (อัปเดตตามจำเป็น)
* `DELETE /api/admin/carousel/:id`

### Homepage (public)

* `GET /api/homepage/carousel`

---

## 🧪 การทดสอบการทำงานหลัก (Quick Manual Test)

1. **Register + Verify:**

   * `/register.html` → ใส่อีเมล → ไป `/check.html` → ใส่รหัส 6 หลัก (เช็คเมล) → ได้ pre-token → `/form.html` → ตั้ง username/password → ได้ full token → `/home.html`

2. **Google OAuth:**

   * `/register.html` หรือ `/login.html` → “Login with Google” → อนุญาต → กลับมาที่ `/form.html?source=google#token=...` (ถ้ายังไม่มี username) หรือ `/home.html#token=...` (ถ้ามีแล้ว)

3. **Forgot Password:**

   * `/login.html` → “ลืมรหัสผ่าน?” → ใส่เมล → เช็คอีเมล → คลิกลิงก์ `/reset.html?token=...` → ตั้งรหัสใหม่

4. **Upload Avatar:**

   * `/settings.html` → เลือกไฟล์ → Upload → Navbar เปลี่ยนรูป

5. **Admin:**

   * เปลี่ยน role ผู้ใช้เป็น admin (เช่นจาก MongoDB หรือให้บัญชีแรกเป็น admin manual)
   * เข้า `/admin.html` → ปรับ homepage content + Carousel

---

## 🛠️ เคล็ดลับแก้ปัญหา (Troubleshooting)

* **path-to-regexp “Missing parameter name …”**
  เกิดจากใช้เส้นทาง `*` ใน Express รุ่นใหม่ (ห้ามใช้) — โค้ดนี้ **ไม่มี** การใช้ wildcard
* **CORS 401/Blocked**
  ตรวจให้ `FRONTEND_URL`/`SERVER_URL` ใน `.env` ตรงโดเมนจริงบน Render
* **รูปโปรไฟล์ไม่ขึ้น**
  ค่า `profilePicture` ต้องเป็น:

  * URL absolute (`https://...`) หรือ
  * Path สาธารณะที่ backend เสิร์ฟ (`/uploads/file.png`) หรือ
  * รูป default `/images/user.png`
* **ลิงก์รีเซ็ตรหัสผ่านกดแล้ว 400**
  ให้กด “ลืมรหัสผ่าน?” ใหม่เพื่อรับลิงก์ล่าสุด และตั้งรหัสผ่านอย่างน้อย 8 ตัว
* **Google OAuth 400/redirect ผิด**
  ตรวจ `GOOGLE_CALLBACK_URI` ให้ตรงกับที่ตั้งไว้ใน Google Cloud Console
* **Third-Party Cookies ถูกบล็อก**
  ระบบเก็บ token ซ้ำใน storage (`sessionStorage/localStorage`) และแนบใน `Authorization` header อัตโนมัติผ่าน `main.js`

---

## ❓คำถามพบบ่อย (FAQ)

**Q: จะเพิ่มหน้า public เพิ่มเองได้ไหม?**
A: ได้ — ไปแก้ `PUBLIC` set ใน `frontend/js/main.js` (ส่วน route guard)

**Q: จะเพิ่มสิทธิ์หน้าให้ผู้ใช้ (role=user) เข้าได้อีก?**
A: ปรับ `USER_ALLOWED` set ใน `main.js`

**Q: ทำไม deploy แล้ว CSS/JS 502?**
A: ระหว่างเปลี่ยนเวอร์ชัน/รีสตาร์ท Render อาจมีช่วงสั้น ๆ ที่ asset โหลดไม่ทัน ลองรีเฟรช หรือเช็ค log

**Q: ทำอย่างไรให้สมาชิกบางคนเป็น admin?**
A: ตั้งค่าใน DB: `db.users.updateOne({_id:ObjectId("...")}, {$set:{role:"admin"}})` หรือเพิ่ม endpoint ตั้งค่าเฉพาะกิจแล้วลบทีหลัง

---

## 🧾 License

โปรเจกต์นี้จัดทำเป็นตัวอย่างโครงสร้างและแนวปฏิบัติ สามารถปรับใช้ภายในทีม/การเรียนรู้ได้ตามต้องการ

---
