# CLAUDE.md — Mini Drills IELTS

> File này cung cấp toàn bộ bối cảnh dự án cho Claude. Đọc hết trước khi sửa code.
> **Luôn trả lời người dùng bằng tiếng Việt.** Tên hàm, biến, CSS và thông báo commit giữ nguyên tiếng Anh.

---

## 1. Dự án là gì

Web app một trang (SPA) để giao và làm **bài tập về nhà IELTS**. Có 2 vai trò:

- **Student**: làm bài về nhà theo tuần (hạn chót **Chủ nhật 22:00 giờ máy**), làm bài Listening/Reading/Writing/Speaking theo bộ Cambridge IELTS 7–21 (Test 1–4), luyện tập hằng ngày 5–10 phút, học flashcard từ vựng (lặp lại ngắt quãng 1/3/7 ngày), kiếm XP và level, giữ streak, xem Leaderboard, quay Lucky Wheel lấy quà, quản lý Inventory.
- **Teacher**: Dashboard thống kê, giao bài (Assignments), chấm Writing/Speaking theo band IELTS (Marking), quản lý danh sách học sinh bằng CSV (Students), tạo bài bằng cách dán JSON do AI sinh ra (Create), quản lý quà/voucher (Prizes), chỉnh thông số XP (Settings).

Giao diện người dùng viết bằng **tiếng Anh**. Chú thích trong code và README dùng cả tiếng Việt lẫn tiếng Anh.

---

## 2. Tech stack — KHÔNG được thay đổi

| Lớp | Công nghệ |
|---|---|
| Frontend | **HTML + CSS + JavaScript thuần, kiểu ES5**. Không framework, không bundler, không build step, không `package.json` |
| Font | Google Fonts: Be Vietnam Pro (`--font`), IBM Plex Mono (`--mono`) |
| CSDL | **Firebase Firestore**, SDK **v10.12.2 bản compat** (`firebase.firestore()`), tải động từ `gstatic` trong `md-backend.js` |
| Xác thực | Firebase Auth với **Custom Token**, có claims `{em, role, nm}`. Không dùng Google Sign-In |
| API | **Cloudflare Pages Functions**: `functions/api/[[path]].js` (Workers runtime, WebCrypto, `fetch`) |
| Lưu mật khẩu | **Cloudflare KV** (binding `MD_KV`), băm PBKDF2-SHA256 với 100k vòng |
| Server gọi Firestore | Firestore REST API với OAuth2 service account, JWT RS256 tự ký (không dùng firebase-admin) |
| Hosting | Cloudflare Pages, deploy từ GitHub (push là tự deploy) |

---

## 3. Cấu trúc thư mục

```
/
├── index.html            # ~3600 dòng: TOÀN BỘ app (HTML khung + CSS + JS). Đa số thay đổi nằm ở đây
├── md-config.js          # window.MD_CONFIG = { demo, teachers[], api:'/api', firebase:{...} }
├── md-backend.js         # Adapter Firebase + UI đăng nhập thật + form "Reset a student password"
├── firestore.rules       # Security rules (dán tay vào Firebase Console, không tự deploy)
├── README.md             # Hướng dẫn deploy (tiếng Việt)
├── CLAUDE.md             # File này
├── TESTING.md            # Checklist để người dùng tự test trên bản Preview của Cloudflare Pages
├── gemini-relay.gs       # Google Apps Script trung chuyển Gemini (khi Cloudflare bị chặn khu vực). Dán vào script.google.com, không chạy trên Cloudflare
├── ai-worker.js          # DEPRECATED, không dùng (AI chạy qua /api/ai/correct). Chưa xóa vì chưa được đồng ý
└── functions/api/[[path]].js   # Route: xem mục 4 "Endpoint /api"
```

Thứ tự nạp script cuối `index.html`: `md-config.js` → `md-backend.js` → `<script>` inline của app.

### Bản đồ `index.html` (số dòng xấp xỉ, có thể lệch; dùng grep để tìm chính xác)

| Dòng | Nội dung |
|---|---|
| 1–2 | `<style>` reset tối thiểu (dòng rất dài) |
| 7–611 | `<style>` chính: biến màu `:root` + dark mode, sau đó CSS từng khu vực |
| 612–700 | Khung HTML: `.app`, header `.top` (brand, `#tabs`, `#who`, `#status`, `#themeBtn`, `#logoutBtn`), các `<section id="v-*">`, `#toast` |
| 702–2985 | `<script>` app, bọc trong IIFE `(function(){'use strict'; ... })()` |

Các khối JS được ngăn bằng comment `/* ---------- Tên ---------- */`. Tìm nhanh bằng:
`grep -n "/\* ----------" index.html`

| Khối | Hàm và biến chính |
|---|---|
| Helpers | `$`, `$$`, `esc`, `lsGet`, `lsSet`, `pad`, `fmtD`, `fmtT`, `MONTHS`, `DAYS` |
| Weeks and deadlines | `weekStartDate`, `iso`, `fromISO`, `dueOf`, `thisWk`, `shiftWk`, `weekLabel`, `leftLabel` |
| Library data | `BOOKS` (cam7–cam21), `TESTS` t1–t4, `SKILLS`, `SNAME`, `LIBMAP`, `EXS`, `exOf`, `locOf`, `rebuildCustom` |
| Roster / State | `rosterDocs`, `findUser`, `students`, `classTitle`, `U` (user hiện tại), `dbh` (Firestore handle), `setStatus` |
| Sample data | `makeSample`, `makeSubs`, `makeSamplePass`… (chỉ chạy khi `DEMO`) |
| Attempts and progress | `attemptsOf(email)`, `doneMap`, `prog`, `progHTML`, `scoreColor`, `pctColor` |
| Library views | `homeworkHTML`, `actionsHTML`, `recentHTML` (+ `rsInfo`, `rsCell`), `renderLib` |
| Player | `renderPlayer`, `qHTML`, `gradeNow`, `saveAttempt` |
| Writing and speaking | `renderWriting`, `submitWriting`, `renderSpeaking`, `startTimer`, AI: `autoFix(text,ex,how)`, `aiHTML`, `aiShow`, `aiFixes`, `aiOf`, `AIX`, `DEMO_AI`. Sửa lỗi: `aiItems`/`fixItems` → item `{from,to,cat,why,off}`, `fixSpans` (vị trí đã sắp, không chồng nhau), `fixHTML`, `correctedHTML`, `correctedBlockHTML` (Copy qua `CXP`), `fixListHTML`, `correctionsHTML` |
| Teacher | `renderDash`, `renderAsg`/`saveAsg`, `renderMark`/`saveGrade`/`gradeOf`/`CRIT`, `renderRoster`/`importCSV`, `parseAI`/`addExercise` (Create) |
| Shell | `tabsFor`, `showTab`, `signIn`, `refreshLive`, các listener `click`/`change`/`input`/`keydown` |
| Vocabulary | `DICT`, `lookupWord`, popup `VP`/`showPop`, flashcard `CV`, `reviewHTML`, `rvRate`, `bsPress`, `renderCards` |
| Error Notebook | `errorDocs`/`localErr`/`sampleErr`, `ERR_DAYS`, `EN` (state), `errList`, `errDue`, `errRate`, `errOkList`, `setErr`, `renderErrors` (nhóm theo category, `<details class="eng">`, trạng thái mở `EN.gopen`), `errCardHTML`, `enBadge`, `enPracticeHTML`, `enPick`, `enFallback`, `enPrep` (gọi `/api/ai/practice`), `enCheck`, `enReviewHTML`, `enStartReview(cat)`, `enClear`, `enAct` (`data-act` bắt đầu bằng `en-`), `errAddLocal` (demo) |
| Profile | `XPD` (giá trị XP mặc định), `xpv(key)`, `LV`, `lvOf`, `myProf`, `putProf`, `addXP`, `rollStreak`, `grantSpin` |
| Daily Practice | `DTYPES`, `todaysTypes`, `dailyHTML`, `buildDaily`, `renderDailyTask`, `dyAct` |
| Leaderboard | `renderRanks`, `RK` ('class' hoặc 'all') |
| Prizes | `PZ`, `TIERNAME`, `renderWheel`/`doSpin`/`wheelSVG`, `renderBag` (Inventory), `renderPrize` (teacher), `takeCode`, `updMarq` |
| Avatars / settings | `avatarHTML`, `renderSettings`, `renderXps`, `extAct` |
| Listening lesson | 5 giai đoạn `STG`, `LPROMPT`, `parseLesson`, `renderLesson`, `lsGrade`, `lsAct` |
| Boot | nạp dữ liệu demo, áp theme, `signIn` từ localStorage, mở các `onSnapshot` Firestore |

### Tab theo vai trò (`tabsFor()`)

Menu là **sidebar dọc bên trái**: `.shell` > `aside#sideNav.side` (`.sbhead` + nút × `.sbx` `data-act="sb-close"` + `nav#tabs`) + nền mờ `#sbBg.sbbg` + `main.mainc`; chỉ hiện khi `body.nav-on` (đã đăng nhập). Nút ☰ `#sbBtn.sbbtn` (`data-act="sb-toggle"`, `aria-expanded`, `aria-controls="sideNav"`) ở đầu header. Trạng thái `SB.open`, hàm `sbWide()` (≥1024px), `sbSet(open, focus, save)`, `sbInit()` (gọi ở Boot trước `showTab` và khi đổi breakpoint), `sbPref()`. Class trên body: `sb-wide`, `sb-open`, `sb-lock` (cả `html`, khóa cuộn khi drawer mở). ≥1024px: cột thu về 0 / mở 208px, nội dung tự giãn, nhớ ở `localStorage['md-sb']` ('0' = đóng, mặc định mở). <1024px: drawer đè nội dung, mặc định đóng, đóng khi bấm nền mờ / × / Esc (listener capture) / chọn tab. `showTab` chỉ gọi `sbSet(SB.open)`, không tự mở. Trượt 200ms, tắt khi `prefers-reduced-motion`.
- Student: `library` (Home) · `cards` · `errors` (Error Notebook) · `ranks` · `wheel` · `bag` · `set`
- Teacher: `asg` (nhãn **Classes**) · `mark` · `dash` · `library`. Chỉ thấy lớp của mình: `myCls()` = các lớp có học sinh mà `roster.teacher` (cột "Giáo viên" của Sheet) trùng tên giáo viên (`tNorm`: bỏ dấu, hoa thường, danh xưng Cô/Thầy/Ms/Mr). Không lớp nào khớp thì hiện tất cả + `myClsNote()`. Chỉ là lọc giao diện, rules không đổi.
- Admin (`U.adm`): `dash` · `asg` (Classes) · `mark` · `library` · `create` · `prize` · `admin`. Tab con `AD.sub`: `guide` · `users` · `teachers` · `students` (hiện section `#v-roster` ngay dưới) · `sheet` · `xp` (`xpsHTML()`, trước là tab Settings) · `aitest` · `me`
- `showTab(t)` tự chuyển về tab đầu của vai trò nếu vai trò không có tab `t`; `signIn` mở `tabsFor()[0]`.

Mỗi tab ứng với một `<section id="v-...">`: `library` dùng `#v-lib`, các tab khác dùng `#v-<tên tab>`. `showTab(t)` ẩn hết các section, bật section của tab `t` rồi gọi `renderXxx()` tương ứng.

---

## 4. Kiến trúc và luồng dữ liệu

1. **Adapter `window.claude.use('db')`**: app ban đầu được viết như một Claude Artifact. `md-backend.js` giả lập đúng API đó, trả về Promise resolve ra `firebase.firestore()` sau khi đăng nhập. Khi `MD_CONFIG.demo !== false`, adapter không chạy và app dùng **dữ liệu mẫu cục bộ** (tài khoản demo `teacher@demo.vn`, `minhanh@demo.vn`).
2. **Đăng nhập**: POST `/api/login` hoặc `/api/register` → Worker kiểm tra mật khẩu trong KV → trả custom token → `signInWithCustomToken` → `window.MD_USER = {name, email, role, adm}` (lấy từ claims), đồng thời lưu `localStorage['md-email']`.
   - **Vai trò ở server** (`roleOf`): `ADMIN_EMAIL` → KV `staff` hoặc biến `TEACHERS` → `roster/{email}` (student). Claims `{em, role, nm, adm?}`; admin có `role:'teacher'` + `adm:true`.
   - **Vai trò ở client**: ở site thật luôn lấy từ `window.MD_USER` (`meFromToken()` trong `findUser()`, `isT` ở Boot). Boot **chờ** `MD_USER` rồi mới `signIn` (khung đăng nhập hiện "Signing you in…" qua `#v-login[data-wait]`). `CFG.teachers` chỉ còn dùng cho demo.
   - **Admin**: lần đăng nhập đầu tạo `acct:` từ `ADMIN_PASSWORD` (`seedAdmin`). Login trả thêm `adminKey` (KV `adm:<key>`, 12 giờ), lưu ở `sessionStorage['md-akey']`, gửi bằng header `X-Admin-Key`. Hết hạn → tab Admin hiện ô "Enter your admin password to continue" (`/api/admin/unlock`).
   - **Tạm khóa / đổi email / kick**: KV `off:<email>` = `'1'`, `'moved:<email mới>'` hoặc `'kicked'`. Trong Users, học sinh có nút **Kick** (không còn nút Pause). Login từ chối; `md-backend.js` gọi `GET /api/status?em=` lúc khởi động và 10 phút/lần, bị khóa thì `signOut()` và hiện lý do (`sessionStorage['md-ended']`).
   - Học sinh đăng ký lần đầu: chọn lớp, chọn tên (từ collection `names` chưa có ai nhận), rồi nhập email và mật khẩu. Server đặt `names/{id}.claimed=true` (có precondition `updateTime`) và tạo `roster/{email}`.
   - Giáo viên: email phải nằm trong biến môi trường `TEACHERS` và trong `MD_CONFIG.teachers`. Lần đầu tạo mật khẩu cần `ADMIN_SETUP_KEY`.
   - Giới hạn thử: sai 10 lần thì khóa 15 phút; tối đa 30 lần đăng ký mỗi IP mỗi giờ.
3. **Realtime**: ở phần Boot, app mở `onSnapshot` cho các collection. Teacher đọc tất cả; student đọc `where('email','==',myEm)` qua helper `own(col)`. Mỗi snapshot cập nhật một mảng `xxxDocs` rồi gọi `refreshLive()`, hàm này vẽ lại tab đang mở. Không vẽ lại khi người dùng đang gõ trong input.
4. **Dự phòng**: khi ghi Firestore lỗi, dữ liệu được giữ trong mảng `local*` và một số cấu hình lưu localStorage. Ghi dữ liệu theo mẫu: `if(dbh)dbh.collection('x').add(rec).then(ok,fallback);else fallback();`

### Endpoint `/api` và KV

| Method | Path | Mục đích |
|---|---|---|
| GET | `/api/names` | tên chưa có người nhận (form đăng ký) |
| GET | `/api/status?em=` | `{ok}` / `{off}` / `{moved}` / `{kicked}` |
| POST | `/api/login`, `/api/register` | đăng nhập, đăng ký (admin nhận thêm `adminKey`) |
| POST | `/api/reset` | form cũ của giáo viên (xác thực bằng mật khẩu giáo viên); không đổi được mật khẩu admin |
| POST | `/api/admin/unlock` | `{password}` → `adminKey` mới |
| POST | `/api/admin/users` | mọi tài khoản + `status` (`active`/`paused`/`moved`) + `hasPassword` |
| POST | `/api/admin/password` | `{email, newPassword}`; với chính admin cần thêm `oldPassword` |
| POST | `/api/admin/active` | `{email, active}` → đặt/xóa `off:` (chỉ còn dùng cho Resume giáo viên bị Remove) |
| POST | `/api/admin/kick` | `{email}`: xóa tài khoản **học sinh hoặc giáo viên** (GV: xóa khỏi KV `staff`; GV trong biến `TEACHERS` thì hiện "Removed" trong Users, có Resume). HS: xóa (`acct:`, `roster/{email}` tìm bằng `rosterRow`, trả tên: xóa `names/{id}` có `sid` hoặc đặt `claimed:false`), đặt `off:<email>='kicked'`. **Giữ** bài làm/XP/flashcard; đăng ký lại cùng email thì dữ liệu tự gắn lại. `register` cho phép email `kicked` và xóa cờ này |
| POST | `/api/admin/sheet` | `{op}`: `get`, `check` + `url`, `save` + `url`, `refresh`, `unlink` → cột nhận được, 5 dòng đầu, tên chưa đăng ký theo lớp |
| POST | `/api/admin/class` | `{email, cls, course}`: đổi lớp của học sinh đã đăng ký (`roster`) |
| POST | `/api/admin/aitest` | `{text, task}`: admin thử một bài bất kỳ với Gemini thật (cùng `AI_PROMPT`, `AI_SCHEMA`, `cleanAi`), **không ghi gì**, không tốn lượt HS; trả `{ai, ms, model, raw, dropped}`. KV `aitest:<ngày>`, 200/ngày. Frontend: Admin → AI test (`AT`, `adAiTestHTML`, `adAiTestRun`; demo dùng `demoCorrections`) |
| POST | `/api/admin/teachers` | `{op, name, email, password}`, `op` = `'add'` hoặc `'remove'` |
| POST | `/api/audio?kind=speaking\|feedback\|lesson` | body = file nhị phân, `Content-Type` = loại audio (`audio/webm`, `ogg`, `mp4`, `mpeg`, `wav`, `x-m4a`), tối đa 8 MB → `{id, url:'/api/audio/<id>', size}`. `speaking`: không cần khóa, 20 lần/IP/giờ (KV `aup:<ip>`), lưu 365 ngày. `feedback`/`lesson`: cần `X-Staff-Key`, không hết hạn |
| GET/HEAD | `/api/audio/<id>` | trả file đúng `Content-Type`, `Accept-Ranges: bytes`, **hỗ trợ `Range` (206/416)** cho Safari/iPhone; `Cache-Control: private, max-age=31536000, immutable`; không có → 404 |
| POST | `/api/ai/lesson` | `{title, transcript, questions?, prompt, tzo}` + `X-Staff-Key`: Gemini viết bài Listening 5 giai đoạn. `prompt` do app gửi (= preset `l5`: `LPROMPT` hoặc template admin đã lưu) để **chỉ có một bản prompt**. Server kiểm sơ bộ đủ 5 khóa `stage_*` (`LESSON_KEYS`), thiếu `material` thì lấy transcript; kiểm đầy đủ do client (`parseLesson`). KV `ail:<email>:<ngày>`, 30/ngày |
| POST | `/api/ai/transcribe` | `{audioId, tzo}` + `X-Staff-Key`: đọc file bằng `audioGet`, gửi Gemini dạng `inline_data` (base64, `GEMINI_AUDIO` đổi `audio/mpeg`→`audio/mp3`, m4a→`audio/mp4`), schema `{transcript}` → `{transcript, model}`. Chung giới hạn `ail:` (30/ngày) với `/api/ai/lesson` |
| POST | `/api/staff/unlock` | `{email, password}` (giáo viên/admin) → `staffKey` mới |
| POST | `/api/ai/practice` | `{errorId, tzo}`: đọc `errors/{id}`; có `practice` rồi thì trả luôn; chưa có thì Gemini tạo (`PRACTICE_PROMPT`), lọc bằng `cleanPractice`, lưu vào doc. KV `aipq:<email>:<ngày>`, 50/ngày |
| POST | `/api/ai/correct` | `{attemptId, task, exTitle, tzo}`: không cần session; server đọc `attempts/{id}` (phải là `kind:'submission'`, có `text` 8–6000 ký tự, `ts` < 2 giờ). Gọi Gemini (`responseSchema`, timeout 25 s), lọc lỗi tìm thấy nguyên văn trong bài, ghi `attempts.ai` + `attempts.fixes` (dạng cũ) + collection `errors`. Trả `{ai, added}`. Đã chấm rồi thì trả kết quả cũ, không tốn lượt |

Mọi `/api/admin/*` (trừ `unlock`) cần header `X-Admin-Key`. Ở frontend, mọi lời gọi admin đi qua **`adminApi(path, body)`** (demo: `demoAdminRun()` trên dữ liệu giả `DEMO_ADM`).

KV: `stf:<key>` (staffKey → email, 12 giờ), `aud:<id>` (file audio, metadata `{type,size,by,kind,ts}`; có binding R2 `MD_AUDIO` thì lưu R2 key `aud/<id>`), `aup:<ip>` (đếm upload của HS/giờ), `acct:<email>` (mật khẩu), `rl:<email>` (đếm sai), `reg:<ip>`, `setup:<ip>`, `staff` (`{email:{name,ts}}`), `off:<email>`, `adm:<key>`, `sheet` (`{url, csv, ts}`), `sheetcache` (lần đọc gần nhất, dùng 5 phút), `ai:<attemptId>` (`pending`/`done`, 2 ngày: mỗi bài chấm AI 1 lần), `aiq:<email>:<YYYY-MM-DD>` (số lần AI trong ngày, giới hạn `AI_DAILY_LIMIT`), `aipq:<email>:<YYYY-MM-DD>` (số bài Practice AI tạo trong ngày, 50).

**Google Sheet (danh sách lớp)**: server đọc CSV qua link `export?format=csv&gid=` (Sheet chia sẻ "Anyone with the link"), không dùng Google API.
- Tự tìm dòng tiêu đề trong 20 dòng đầu (`SHEET_COLS`, tên cột Việt/Anh, so khớp đã bỏ dấu).
- Lớp chuẩn hóa theo giờ bằng `classLabel()`: `7H30`→`7h30`, `17PM`→`17h`. Sắp theo giờ (`byClassThenName`). Cột "Hiện tại" (dự phòng "Khối") → `course: 'Grade N'`.
- Mã dòng = `'s'+sha256(lớp|HỌ TÊN giữ dấu)` (hoặc cột `id`). **Không dùng `slug()`** vì tên chỉ khác dấu sẽ trùng.
- Khi có Sheet: `/api/names` trả dòng chưa ai nhận (`takenSet`: `names/{id}.claimed`, `roster.sid`, hoặc trùng lớp + tên trong roster). `/api/register` đọc lại Sheet, tạo `names/{id}` bằng `fsCreate` (`currentDocument.exists=false`), rồi tạo `roster/{email}` có `sid`, `teacher`. Không có Sheet thì dùng luồng `names` cũ.
- Server ghi `config/sheet = {linked}` để tab Students của giáo viên ẩn khung CSV (`renderRoster`).
Biến môi trường thêm: `ADMIN_EMAIL` (Text), `ADMIN_PASSWORD` (Secret), `GEMINI_PROXY_URL` (Text) + `GEMINI_PROXY_SECRET` (Secret) = trạm trung chuyển Apps Script (khi có thì `geminiOnce` gọi qua relay, key nằm trong Script Properties; `aiReady(env)` = có key hoặc relay), `GEMINI_KEY` (Secret), `GEMINI_MODELS` (Text, tùy chọn, danh sách model miễn phí theo thứ tự; mặc định xem mục 7.17), `GEMINI_MODEL` (cũ, tùy chọn), `AI_DAILY_LIMIT` (Text, mặc định 10).
Prompt AI (`AI_PROMPT`) và schema (`AI_SCHEMA`) nằm ở server, không ở client. `toFields`/`fromFields` dùng `toValue`/`fromValue` đệ quy (mapValue/arrayValue); giá trị phẳng ghi như cũ.

### Collection Firestore và quyền (xem `firestore.rules`)

| Collection | Nội dung | Quyền |
|---|---|---|
| `attempts` | bài làm `{email, student, cls, ex, score, total, items, kind?, text?, link?, ts, grade?, fixes?, ai?}` (`ai` = `{corrections, vocabulary_upgrades, model, ts}`, do server ghi; bài cũ có thể còn `summary`/`improved_essay`, không hiển thị) | HS đọc/tạo bài của mình, **không được ghi `grade`**, chỉ sửa được `fixes`; GV toàn quyền |
| `hwdone`, `passes`, `cards`, `redeems` | dữ liệu riêng của HS (có trường `email`) | chỉ chủ sở hữu; GV đọc |
| `profiles` | XP, streak, inv, title, avatar… | mọi người đã đăng nhập đọc được; chỉ chủ ghi |
| `errors` | sổ lỗi, **mỗi lần mắc lỗi một doc** (không gộp), id `{slug(email)}_{attemptId}_{i}` (`i` = thứ tự lỗi trong bài): `{email, student, cls, original, corrected, category, explanation, type, context, practice[], attemptId, ex, exTitle, box, due, reviews, lapses, mastered, createdAt, lastPractice}`. `practice` = tối đa 2 bài `{sentence (một ___ + (gợi ý)), answers[], clue_type, own}`: [0] câu của HS, [1] câu mới. Doc cũ (id `{slug(email)}_{hash}`, có `count`/`lastSeen`) vẫn hiện bình thường | chỉ server tạo; HS đọc, xóa lỗi của mình và chỉ sửa `box/due/reviews/lapses/mastered/lastPractice`; GV đọc/xóa |
| `wins` | marquee "vừa quay trúng" | đã đăng nhập: đọc và tạo |
| `codes` | voucher | HS chỉ nhận được mã còn trống (`to:''` → email của mình) |
| `names` | tên chờ HS nhận | chỉ GV và server |
| `roster`, `exercises`, `assignments`, `classes`, `config` | dữ liệu do GV quản lý | đọc: đã đăng nhập; ghi: GV |

**Thêm collection mới thì phải làm cả 3 việc**: (1) thêm rule vào `firestore.rules` và nhắc người dùng dán lại vào Firebase Console, (2) thêm `onSnapshot` ở phần Boot, (3) có phương án dự phòng cục bộ.

### Mô hình dữ liệu cần biết

- Bài tập (`EXS[id]` / `exOf(id)`): `{id, title, skill:'listening'|'reading'|'writing'|'speaking', material, questions[], kind?('readaloud'|lesson...), audio_url?}`
- Câu hỏi: `gap {q, ans:[...]}` · `mcq {q, opts, ans:index}` · `tfng {q, ans:'True'|'False'|'Not Given'}` · `match {q, opts, ans}` · có thể kèm `tag`
- Bài Writing/Speaking là attempt có `kind:'submission'`, `score:0, total:0`; điểm nằm ở `gradeOf(a) → {overall, max(=9), crit{}, feedback, sticker, marks, link}`
- `CRIT`: 4 tiêu chí band cho writing và speaking; 3 tiêu chí cho `readaloud`
- XP: `xpv('key')` đọc `config/xp` và dùng `XPD` làm mặc định (có `errFix`=5). Bài tự chấm đạt khi `score/total >= .7`
- Error Notebook (Leitner): `ERR_DAYS=[0,1,3,7,14]` cho box 1–5. Đúng: box+1, `due` = đầu ngày + `ERR_DAYS[box mới-1]`; đúng ở box 5 thì `mastered`. Sai: box 1, ôn lại ngày mai. "Due" = `!mastered && due <= cuối ngày hôm nay`. XP `errFix` tối đa 1 lần/lỗi/ngày. Lỗi lặp lại là thẻ riêng, mỗi thẻ có box riêng.
- Practice: box 1–2 dùng `practice[0]` (câu của HS), box 3–5 dùng `practice[1]` (câu mới); chỉ có 1 bài thì dùng bài đó. Chưa có `practice` → `/api/ai/practice`; AI lỗi/demo thiếu → `enFallback` (câu `context`, chỗ sai thành `___`, gợi ý = gốc của từ sửa, từ bất quy tắc thì lấy từ của HS). Sai lần 1 chưa tính (gợi ý + thử lại), sai lần 2 hoặc "Show answer" = sai. So khớp `errNorm` (chữ thường, gộp khoảng trắng, bỏ dấu câu hai đầu, `’`→`'`). Server lọc bài Practice bằng `cleanPractice` (đúng 1 `___` có ngoặc ngay sau, gợi ý không chứa đáp án trừ khi đáp án là chính từ gốc đã có trong lỗi, `practice[0]` điền xong không còn `original_text`)

---

## 5. Quy ước code BẮT BUỘC

1. **Chỉ dùng ES5**: `var`, `function`, nối chuỗi bằng `+`. **Không** dùng `let`, `const`, arrow function, template literal, class, `async/await`, ES module, optional chaining. (Riêng `functions/api/[[path]].js` là code Workers hiện đại, ở đó được dùng `const`/`async`.)
2. **Render bằng ghép chuỗi HTML** rồi gán `el.innerHTML`. Hàm con đặt tên `xxxHTML()` và trả về chuỗi. **Mọi dữ liệu người dùng hoặc DB đưa vào HTML đều phải qua `esc()`**, kể cả giá trị trong thuộc tính (`title`, `data-*`, `src`).
3. **Sự kiện dùng event delegation**: không gắn `onclick` trên từng phần tử. Thêm `data-act="ten-hanh-dong"` (kèm `data-*` nếu cần) vào phần tử, rồi xử lý trong listener `click` toàn cục (`document.addEventListener('click', ...)` ở khối Shell). Listener đó lấy `t=e.target.closest('[data-act]')`, `a=t.dataset.act`. Các nhóm lớn có hàm con trả về `true` khi đã xử lý (`extAct`, `dyAct`, `lsAct`, `mkAct`).
4. **CSS**: dùng biến màu trên `:root` (`--bg --surface --ink --muted --line --accent --good --bad --warn --more --hl --hl-soft`, huy chương `--gold-* --silv-* --brz-*`). Màu mới phải khai báo ở **cả 3 chỗ**: `:root` (sáng), `@media (prefers-color-scheme: dark){:root:not([data-theme="light"])}` và `:root[data-theme="dark"]`. Trên điện thoại phải hiển thị tốt ở độ rộng 390px (`@media (max-width:640px)`).
5. **Khả năng tiếp cận**: phần tử bấm được phải là `<button type="button">`; thêm `aria-label` cho nút chỉ có icon; dùng `aria-live` cho thông báo.
6. **Thay đổi nhỏ và có chủ đích**: dùng Edit thay chuỗi chính xác, **không viết lại cả `index.html`**. File có nhiều dòng rất dài (hơn 500 ký tự), nên khi sửa hãy lấy đúng đoạn bằng `grep -n` hoặc Read có offset.
7. **Không đổi** tên route `/api/*`, đường dẫn `functions/api/[[path]].js`, claims của token (`em`, `role`, `nm`) hay tên collection, trừ khi người dùng yêu cầu.
8. Không commit với `demo: true` trong `md-config.js` (site thật cần `demo: false`).
9. Không đưa secret vào repo (service account JSON, `ADMIN_SETUP_KEY`). `apiKey` Firebase web trong `md-config.js` là công khai theo thiết kế.

---

## 6. Chạy thử trên máy

```bash
# 1) Chuyển sang chế độ demo (dữ liệu mẫu, không cần Firebase). NHỚ đổi lại trước khi commit!
#    md-config.js: demo: false  ->  demo: true
# 2) Chạy server tĩnh ở thư mục gốc
python3 -m http.server 8765        # hoặc: npx serve .
# 3) Mở http://localhost:8765, bấm "Student · Minh Anh" hoặc "Teacher"
```

- `/api/*` không chạy được với server tĩnh. Muốn thử đăng nhập thật thì dùng `npx wrangler pages dev .` (cần KV và các biến môi trường như trong README).
- Sau mỗi thay đổi, kiểm tra: không có lỗi trong Console; giao diện sáng và tối (nút Dark mode); độ rộng 390px và từ 1280px trở lên; cả tab Student lẫn Teacher nếu phần sửa dùng chung.

---

## 7. Lịch sử thay đổi gần nhất (Student UI, 10/2026)

Các thay đổi đã có trong code. **Không đảo ngược** nếu không được yêu cầu:

1. **Header `#status`**: chỉ còn một chấm tròn, không có chữ. `data-s="saved"` màu xanh lá, `"local"` màu cam, `"wait"` màu xám nhấp nháy. Mô tả trạng thái nằm ở `title`/`aria-label` (sửa trong `setStatus()`).
2. **Daily practice**: thẻ `.dtask` không còn icon `.di`, chỉ còn tiêu đề (`dailyHTML()`).
3. **Recent Results By Skill**: `recentHTML()` chia 4 ô L/R/W/S qua `rsCell(sk, list)` và `rsInfo(a)`; CSS nằm trong `.rs-*`.
   - Ngưỡng đạt: `RS_PASS_PCT=70` (L/R), `RS_PASS_BAND=6` (W/S, quy về thang 9). `RS_BARS=12` là số cột hiển thị.
   - Cột biểu đồ là `<button>` có `data-act="fb-open"` (nếu bài có feedback) hoặc `data-act="nav"`.
   - Bài đang chờ chấm có class `.pd`. Ô không có bài hiện "No X results yet. Your first one will show here." trong khung nét đứt `.rs-empty`, dòng phụ "Nothing yet".
   - (10/2026) Tiêu đề đổi thành "Recent results". Số trung bình lớn tô `--good`/`--bad` theo cùng ngưỡng đạt; W/S ghi "N tasks marked" và nhãn "band". Dòng Latest: tên bài bên trái, điểm + ngày bên phải (`.rs-sd`). Biểu đồ cao 110px (90px trên điện thoại), cột rộng tối đa 38px; ô `.rs` có `min-height:300px`, padding 22px 24px.
   - Phân trang cũ (`RP`, `data-act="rpage"`) không còn dùng nhưng handler vẫn để lại, vô hại.
4. **Flashcard**: Space để lật thẻ; **Backspace 1 lần = Got it**; **Backspace 2 lần trong `BS_GAP=300`ms = Forgot**. Lần nhấn đầu chờ 300ms rồi mới chấm. Bỏ qua `e.repeat`. Enter không còn là phím tắt. Hàm: `bsPress()`, `bsClear()`.
5. **Leaderboard** (đã thay bằng podium ở mục 16): hạng 1–3 có class `.rk.top1/.top2/.top3`, tô nền cả hàng vàng kim/bạc/đồng và hiện số thứ tự thay cho emoji huy chương. Hàng của người dùng `.rk.me` giữ nền `--hl-soft` và có thêm viền `--accent`.
6. **Inventory**: đã xóa nút "Open file" cho vật phẩm `mat` và `custom` có `url` (nhánh `act=''` trong `renderBag()`).

7. **Admin (GĐ 1, 10/2026)**: vai trò admin, tab Admin (Guide/Users/Teachers/My account), Pause/Resume, đổi mật khẩu, thêm/xóa giáo viên, `/api/status`. GĐ 2 (Google Sheet, Edit class) đã xong. Còn lại: GĐ 3 đổi email (`migrateEmail`).
8. **AI Auto-Correction + Error Notebook (10/2026)**: `/api/ai/correct` (Gemini) thay cho `window.claude.use('sample')`; kết quả hiện ngay dưới bài Writing (tóm tắt + band ước lượng, sửa lỗi, từ vựng nâng cấp có "+ Flashcard", bài đã sửa). Học sinh mở lại qua "Open feedback" ở Recent results (`showFb` hiện cả AI). Tab **Error Notebook** (thống kê lọc được, Practice trong thẻ, Review all due, Clear All). Home có thẻ `.dtask` "Error review · N due". Modal Marking của GV có phần "AI summary (estimate)" thu gọn; "Auto corrections" cũ vẫn giữ. 4 ô Recent results cao bằng nhau (`grid-auto-rows:1fr` từ 641px). Band AI **không** tính vào Recent results.
9. **Error Notebook GĐ 4 (10/2026)**: bỏ gộp lỗi trùng (mỗi lần mắc lỗi một doc `errors/{slug(email)}_{attemptId}_{i}`); danh sách chia nhóm theo category (`<details>`, chip "N errors · M due", nút "Practice this group (M)"), bỏ dropdown Category, bỏ chữ "Category:" và dòng "From … seen …". Practice mới: câu đầy đủ có ô điền ngay trong câu + gợi ý trong ngoặc, AI tạo 2 bài mỗi lỗi (`practice` trong schema, `AI_PRACTICE_RULES`), endpoint `/api/ai/practice` cho lỗi cũ, phương án dự phòng `enFallback`. Demo: 6 lỗi mẫu, có 2 thẻ *go → went*.
10. **GĐ 5 (10/2026)**: bỏ `summary` (band estimate, topic relevance, nhận xét) và `improved_essay` khỏi schema AI, prompt và giao diện (HS và modal Marking). Kết quả AI chỉ còn Corrections + **Corrected essay** (tạo tất định từ bài gốc bằng `correctedHTML`, chỗ sửa `<mark class="fx-new">`, nút Copy văn bản sạch) + Vocabulary upgrades. Class chung **`.essay`** (font `--font`, 1rem, line-height 1.75, `pre-wrap`, tối đa 72ch) cho mọi khối bài viết; chỗ sai `.fx-del`, chỗ sửa `.fx-ins` (nền `--good-bg`), cặp sửa bọc `.fx` có `title` + `data-act="fx-tip"` (toast trên điện thoại), câu lạc đề `.fx-off`. Error Notebook: biến **`EP`** `{id, where:'card'|'rv', tries, res}`; khi `EP` hoặc Review đang mở thì **không vẽ lại cả tab** (`refreshLive` chỉ gọi `enUpdateCounts`), chỉ vẽ lại thẻ bằng `renderErrCard(id)` (thay `outerHTML`) hoặc khung Review `#enRv` (`renderRv`); thẻ vừa làm giữ nguyên chỗ (nút Next due error / Close), chỉ sắp xếp lại khi Close/đổi tab; vẽ lại cả tab dùng `renderErrorsKeep()` (giữ `scrollY`); focus bằng `{preventScroll:true}`. Review all due / Practice this group mở khung cố định ở đầu danh sách.
11. **Số thứ tự lỗi (10/2026)**: `fixSpans` đánh số mỗi lỗi theo vị trí trong bài (`s.n`, `f.n`); cùng số (`<sup class="fx-n">`, `data-fn`) hiện ở ô Your answer (`markAnswer` thay textarea `#wText` bằng `#wMarked`, chỗ sai `.fx-bad` đỏ gạch sóng), bài đánh dấu, danh sách lỗi và Corrected essay. Một hàm vẽ chung `marksHTML(text, sp, 'fix'|'bad'|'new')`. Bấm một lỗi → toast lý do + `fxHot` viền `--accent` mọi chỗ cùng số trong 1,8 giây.
12. **AI ổn định hơn (10/2026)**: `askGemini` → `geminiOnce` có mã lỗi (`AiError.code`: `nokey`, `timeout`, `network`, `http<status>`, `blocked`, `empty`, `too_long`, `parse`, thêm `save`, `server`). **Giới hạn chờ Gemini `AI_TIMEOUT` = 5 phút**. Gemini 2.5 Flash gửi `thinkingConfig:{thinkingBudget:0}` (nhanh hơn). Tự thử lại 1 lần khi lỗi nhanh (<25 s): bỏ schema nếu bị từ chối, chờ 1,5 s nếu Gemini bận/trả sai. Đọc JSON lỏng (`parseJsonLoose`), schema không còn `enum`. Lỗi trả `502 {error:'busy', code}` + `console.log` (Cloudflare Real-time logs). KV `ai:<id>` = `pending:<ts>`, quá 6 phút coi như chết. Client: `AIR` + `aiRun()`, sau 30 s hiện "Still checking…", câu báo lỗi có `(code: …)` và nút **Try again** (`data-act="ai-retry"`).
13. **Trạm trung chuyển Gemini (10/2026)**: Gemini trả `400 FAILED_PRECONDITION "User location is not supported"` khi Cloudflare chạy ở khu vực bị chặn (vd. Hồng Kông). `gemini-relay.gs` (Apps Script web app, `doPost` nhận `{secret, model, body}`, trả `{status, body}` hoặc `{relayError}`), bật bằng `GEMINI_PROXY_URL`/`GEMINI_PROXY_SECRET`. Mã lỗi mới `relay`. Admin → AI test ghi "via Apps Script relay" hoặc "direct". Hướng dẫn: README 3e.
   - Email là khóa dữ liệu ở: `roster/{email}`, `profiles/{slug(email)}`, `cards/{slug(email)}_{word}`, `hwdone/{slug(email)}_{asgId}`, `passes/{slug(email)}_{asgId}`, `errors/{slug(email)}_{attemptId}_{i}` (Error Notebook, có trường `email`; doc cũ dạng `{slug(email)}_{hash}`), trường `email` của `attempts`/`redeems`, `codes.to`, `names.email`, **`classes.removed[]`**, KV `acct:`/`rl:`/`staff`.
14. **GĐ 6 phần A (10/2026)**:
   - **Kick**: code client và server đều đúng khi chạy thử. Nguyên nhân thực tế: (1) `adminUsers` liệt kê học sinh theo trường `email` (hoặc id) của `roster`, còn `adminKick`/`adminClass` chỉ tìm theo id `roster/{email}` → doc có id lệch (chữ hoa, khoảng trắng) báo 404 "Only students can be kicked…", học sinh vẫn còn trong danh sách; (2) thư mục làm việc từng thiếu `functions/`, nên deploy có thể chạy server cũ. Sửa: `rosterRow(env, email)` (tìm theo id rồi theo trường `email`) dùng trong `adminKick`/`adminClass`; `adminApi` báo lỗi rõ khi server trả 404 "Not found." hoặc không phải JSON (`d._nojson` từ `adPost`); nút xác nhận hiện "Kicking…" (`AD.modal.busy`, `adBusy(btn, on, lbl)`).
   - **Xem lại bài Writing đã nộp**: `mySub(exId)` (bài nộp mới nhất của HS), `renderSubmittedWriting(ex, head, ban, a, lk)`: banner `subStatusHTML` ("Submitted on …", band + "Open feedback" khi đã chấm), bài chỉ đọc `#wSub` (`.essay`, có highlight nếu có AI), kết quả AI đã lưu (không gọi lại AI). Chưa có AI và còn trong 2 giờ: "AI check in progress…" + nút **Check again** (`ai-retry`). Nút **Write a new version** (`data-act="w-new"`, biến `WNEW` = id bài, tự xóa khi mở bài khác; nháp điền sẵn bài cũ), banner "Back to my submission" (`w-view`). Nộp xong xóa nháp, không còn nút "Try again" (`nextBtns(noRetry)`). Bài đã nộp vẫn xem được sau hạn chót (`renderPlayer`), nhưng không có nút viết lại. Giáo viên (Preview) không đổi. `aiShow` cũng tô lỗi vào `#wSub`.
15. **GĐ 6 phần B (10/2026)**:
   - **`explanation_vi`**: mỗi phần tử `corrections` có thêm giải thích tiếng Việt (1 câu ≤ ~20 từ, nêu từ cụ thể, chỉ dùng V nguyên mẫu / V-ing / V3/V-ed / danh từ / tính từ / trạng từ / số ít / số nhiều, không thuật ngữ khó). Có trong `AI_PROMPT` (kèm ví dụ), `AI_SCHEMA` (required), `AI_SHAPE`; `cleanAi` cắt bằng `viShort` (~160 ký tự), thiếu thì lấy `explanation`; `saveErrors` ghi vào `errors.explanation_vi` (trường server ghi, rules không đổi). Giữ `explanation` tiếng Anh.
   - Client: item sửa lỗi có `vi` (`aiItems`), hiển thị qua `fixWhy(f)` = `vi || why` (dữ liệu cũ tự dùng tiếng Anh). **Popover** thay cho `title`/toast: `span` sửa lỗi có `tabindex="0"`, `data-cat`, `data-why`; bấm/Enter → `fxPopOpen(t)` vẽ `#fxPop` (`.fxpop`, `role="dialog"`, `aria-live`), đặt dưới chữ hoặc lật lên trên, căn trong màn hình; đóng khi bấm ra ngoài, Esc, cuộn, resize hoặc bấm chỗ khác (`fxPopClose`, biến `FXP`). Dòng trong danh sách lỗi chỉ làm sáng các chỗ cùng số (`fxHot`). Modal Marking: `correctionsHTML(text, items, true)` → dòng giải thích có `title` tiếng Anh. Error Notebook dùng `enWhy(e)` = `explanation_vi || explanation` (thẻ, Practice, "Not quite. Think about…"). Demo: `DEMO_AI` và `DEMO_RULES` (phần tử thứ 6) có tiếng Việt.
   - **Vocabulary upgrades**: `.vu` → mỗi mục một hàng `.vur` 2 cột (trái 32%: `.vuo` từ gốc nhỏ màu `--muted`, `.vuu` từ mới 1.35rem đậm; phải: `.vue` ví dụ có cụm mới in đậm bằng `vuBold`, `.vun` ghi chú nghiêng, nút "+ Flashcard"). Dưới 640px xếp 1 cột. `vuWord`/`vuHas`: đã có trong Flashcards thì nút là "Added ✓" và bị vô hiệu hóa. Bỏ CSS `.aivu`.
16. **GĐ 6 phần C (10/2026) — Leaderboard podium**: `renderRanks()` viết lại. Tab My class / Everyone (`RK`) + nút segmented XP | Streak (`.seg`, `data-act="rk-mode"`, biến `RKM` = `'xp'|'streak'`, lưu `localStorage['md-rkm']`). XP: XP giảm dần rồi tên; Streak: `streak` → `best` → XP → tên (streak 0 vẫn hiện cuối). Top 3 là thẻ `.pod` theo thứ tự 2 | 1 | 3 (`.pod1` cột giữa, cao hơn 24px, viền 2px `--accent`, bóng nhẹ); huy hiệu `.podn` nền `--gold-a`/`--silv-a`/`--brz-a`; avatar 112px (hạng 1) và 80px (hạng 2–3), dưới 640px là 72/56px (`--s` + `!important`); khối chữ `.podt` (`margin-top:auto`, cùng cỡ chữ, thẳng hàng ở đáy): tên · danh hiệu cấp độ `lvOf(xp).name` · giá trị (`rkVal`: "1250 XP" / "🔥 12 days"). Người dùng trong top 3: `.pod.me` nền `--hl-soft` + "(you)". Hạng 4–13: `.rk` (số hạng mono, avatar 36px, tên + cấp độ, giá trị "310 XP" / "🔥 4"); hàng của mình `.rk.me` nền `color-mix(accent 10%)`, viền 1.5px `--accent`; ngoài top 13 thì thêm "⋯" + hàng của mình. Đã bỏ `.rk.top1/2/3`, 🔥 ở bảng XP và badge danh hiệu phụ (`p.title`, vẫn có ở Inventory). Mục 7.5 cũ không còn đúng.
18. **Kick cho mọi tài khoản + Recent results kiểu cũ (10/2026)**: Users: mọi dòng (trừ admin, trừ `moved`) có Change password + **Kick** (HS thêm Edit class; `paused`/`kicked` có Resume). Modal Kick ghi hậu quả theo vai trò (HS: đăng ký lại bằng tên trong Google Sheet; GV: thêm lại ở Admin › Teachers). `adminUsers` trả `status:'kicked'` (pill "Removed", chỉ còn thấy với GV trong `TEACHERS`). `adminPassword` cũng tìm HS qua `rosterRow`. Demo: `demoAdminRun` kick được `teacher@demo.vn` và GV thêm bởi admin. Recent results quay về layout gọn như ảnh: tiêu đề "Recent results by skill" (in hoa nhỏ), ô `.rs` padding 16px 18px không còn `min-height:300px`, icon `.sq` 28px, số trung bình 1.45rem (L/R xanh/đỏ, W/S band màu `--accent`), biểu đồ cao 60px (56px điện thoại), cột tối đa 22px, điểm ở dòng Latest màu chữ thường (chờ chấm thì `--muted`).
19. **Writing: xem lại theo phiên bản (10/2026)**: `mySubs(exId)` = mọi lần nộp, mới nhất trước (`mySub` = phần tử đầu). Từ 2 lần nộp trở lên, chế độ xem lại có dropdown `#wVer` (`versionsHTML`, CSS `.wver`): "Version N (latest) · ngày giờ · Band x / not marked yet" (Version 1 = cũ nhất). Chọn → biến `WVER` `{ex, id}` + `renderPlayer()` (listener `change`); xem bản cũ có banner "You are viewing an older version". Mỗi phiên bản hiện điểm, bài và kết quả AI của chính nó. "Write a new version" có `data-id` = phiên bản đang xem: viết tiếp từ bài đó (bản cũ thì luôn ghi đè nháp). `WVER` tự xóa khi mở bài khác hoặc vừa nộp bản mới. Ngày giờ dùng chung `subDate(a)`.
   - (10/2026) Chế độ xem lại Writing/Speaking **không còn** banner "Submitted on …" và dòng "Waiting for your teacher to mark it." (`subStatusHTML` trả `''` khi chưa chấm; ngày nộp xem ở dropdown Version). Đã chấm thì vẫn hiện "Marked: Band … · Open feedback" + Teacher note.
20. **Admin phản hồi ngay + giữ tên khi Kick + Recent results 2×2 (10/2026)**: `adDone(msg, patch)` đóng modal **ngay** khi server trả OK, sửa `AD.users` tại chỗ (`adSet(email, obj)` hoặc lọc bỏ), vẽ lại, toast, rồi `adLoad(true)` tải lại ngầm (`adAgain`: đang tải dở thì tải thêm 1 lần, tránh danh sách cũ ghi đè). Trước đây modal đứng ở "Saving…/Kicking…" tới khi tải xong cả danh sách Users. Server: `API_VERSION` (trả trong `admin/users` là `ver`, hiện "· server …" ở Users; thiếu thì banner "This site still runs an older server…" = chưa deploy `functions/` mới). `adminKick`: HS chưa từng nhận tên (thêm bằng CSV có email) và chưa nối Sheet → tạo lại `names/{slug(lớp-tên)}` `claimed:false` để đăng ký lại; có Sheet thì dòng Sheet tự trống. Users trên điện thoại: nút thao tác giãn đều, cao 38px, email tự xuống dòng. Recent results: lưới luôn 2 cột (`max-width:760px`, `grid-auto-rows:1fr`, ô `min-height:200px`), điện thoại vẫn 2 cột thu nhỏ chữ/biểu đồ (dưới 360px mới 1 cột); bỏ bố cục 4 cột ≥1080px.
21. **Library dạng thẻ Test + tab kỹ năng (10/2026)**: chọn sách (lưới `.tile` giữ nguyên) → `.lpanel` chứa các thẻ `libTestHTML(bk, t, dm, stu)`: thẻ `.lt` (mở: `.lt.open`, viền `--accent`), đầu thẻ `.lth` (`data-act="lx" data-l="test"`, mũi tên `.chev` xoay 90°, "Test N" + số bài, HS có `.ltbar` + `.ltpct`). Mở ra: thanh tab `.ltabs`/`.ltab` 4 kỹ năng kèm số bài (`data-l="skill"`, chỉ chọn, không đóng; tab trống `.empty` mờ, HS bị `disabled`; mặc định kỹ năng đầu tiên có bài). Mỗi bài là `.lsn` (biến `--c` = `SKC[skill]`): nút `.lsnb` (`data-act="nav"`) gồm icon nét `skIco(s)` (`SKSVG`), tên + `exSub`, bên phải `lpvHTML` (HS: %, Band, Submitted, Not started, Locked); GV có `.act` Sửa/Xóa (`ICO_EDIT`/`ICO_DEL`, chỉ bài tự tạo). Tab trống: `.lnone` "No X exercises yet." (GV có "+ Add exercise" → tab Create). Dưới 520px thu nhỏ. Class `.lrow` cũ vẫn dùng ở Homework.
22. **Chỉnh Library + Recent results (10/2026)**: Library: tiêu đề Test 1.12rem, bỏ dòng số bài, mũi tên tam giác đặc; tab kỹ năng .98rem đậm; bên phải mỗi bài `lpvHTML` luôn là % làm (chưa làm = 0%, Writing/Speaking đã nộp = 100% với `title` Band/Submitted, Locked giữ chữ); GV có Sửa/Xóa ở **mọi** dòng (bài có sẵn: nút `disabled` + `title` "Built-in exercise…"). HS không có nút Sửa/Xóa. Admin có `role:'teacher'` (+`adm`) nên có đúng các nút như GV; rules `exercises` cho `teacher()` ghi. Nút "Delete?" tự trở lại icon sau 4 s (điều kiện vẽ lại: `TAB==='library' && !NAV.ex && !XED`).
23. **Sửa Library trên điện thoại + chỉnh nhỏ (10/2026)**: **Lỗi**: thẻ Test từng dùng class `.lt`, trùng với `<span class="lt">` (chữ "Dark mode"/"Sign out") mà CSS điện thoại ẩn (`.lt,.rl{display:none}`), nên trên điện thoại cả danh sách Test biến mất. Đổi thành **`.ltc`**. ⚠ Không dùng lại tên `.lt`, `.rl`, `.ic` cho chỗ khác. Tab kỹ năng trong Library bỏ số đếm; dưới 520px thanh tab chia 4 cột đều (không cuộn), lưới sách 2 cột. Homework: mỗi dòng chỉ còn tên bài (bỏ dòng "Cam 14 · Test 1 · Listening"). `#themeBtn`/`#logoutBtn`: không viền, nền trong suốt, hover nền `--line`. Recent results máy tính: `aspect-ratio:3/2`, tên kỹ năng 1.22rem, icon 34px, biểu đồ cao 120px (`.rs-bars` sát trên dòng LATEST: `.rs-bars+.rs-last{margin-top:0}`); điện thoại biểu đồ 56px.
24. **Kết quả AI dễ đọc hơn (10/2026)**: tiêu đề phần Corrections / Corrected essay / Vocabulary upgrades dùng `h4.tk.sect` (1.3rem, weight 800, màu `--ink`, vạch trái 4px `--accent` giống `.lock` "Let's lock in"; điện thoại 1.15rem). `fixListHTML` xếp mỗi lỗi **3 dòng**: `.fxc` (số `.fx-n` + category `.aicat` 1.1rem đậm màu `--accent`, to hơn dòng sửa) → `.fxp` (`del` → `ins`) → `small` (giải thích). `.fxl` 1rem (giải thích .92rem), cùng cỡ với Vocabulary upgrades. Áp dụng cho HS, Open feedback, modal Marking, Admin → AI test.
25. **GĐ 7 phần A (10/2026) — Ghi âm trên web**:
   - **Server**: `audioPut(env,id,buf,meta,ttl)` / `audioGet(env,id)` (KV mặc định, R2 nếu có `MD_AUDIO`), `audioUpload`, `audioServe` (Range). Route audio xử lý **trước** khi đọc body JSON. `staffKey`: `login` (và tạo mật khẩu GV lần đầu) trả thêm `staffKey` cho GV/admin (`newStaffKey`, KV `stf:`), kiểm bằng `staffEmail(env, request)` (khóa còn hạn + vẫn là GV + không bị khóa), hết hạn → `401 {needUnlock}` (`staffLocked`). `adminKey` giữ nguyên.
   - **Client**: `md-backend.js` lưu `sessionStorage['md-skey']` (xóa khi đăng xuất/bị khóa). `stfKey()`, `staffApi(path, body)` (như `adminApi`, tự hỏi mật khẩu khi hết hạn), `staffUnlock(onOk,onNo)` = modal `#stfModal` "Enter your password to continue" (`stf-ok`/`stf-cancel`, Enter). `adPost(path, body, key, moreHeaders)`.
   - **Component ghi âm** (khối "Recorder" trước "Player"): `recorderHTML(rid, opts)` (`opts = {max, kind, label, upload, onChange}`), trạng thái `REC[rid].st` = `idle/rec/done/up/saved/err`, `REC[rid].saved = {id,url,size,dur,type}`; `recAct` (`rec-start/stop/use/redo/file`), `recStart` (gọi `getUserMedia` ngay trong click; `MediaRecorder` mime `audio/webm;codecs=opus` → `audio/ogg;codecs=opus` → `audio/mp4`), đồng hồ + thanh âm lượng (`AnalyserNode`, không có thì bỏ qua), tự dừng khi hết `max`, dừng xong tắt micro (`recRelease`). "Use this recording" → `audioUpload(blob, kind, onProgress)` (XHR, % tiến độ; demo: link `blob:` cục bộ). Lỗi micro: `recErrMsg` (có hướng dẫn iPhone). Upload lỗi → Retry, bản ghi giữ trong bộ nhớ. File có sẵn (`opts.upload`) → `audFileType` chuẩn hóa loại. `recClearAll` khi đổi tab (`showTab`), rời bài (`renderLib`) hoặc mở bài khác (`renderPlayer`, `REC_EX`); `visibilitychange` → dừng ghi; `beforeunload` + `confirm(REC_LEAVE)` khi rời đi lúc còn bản ghi chưa lưu. `audioTagHTML(url)` chỉ nhận `/api/audio/<id>` hoặc `blob:`.
   - **Speaking (HS)**: `renderSpeaking` dùng `spParts(ex)` (Part 1 / Part 2 / Part 3 nếu có = 3/3/4 phút; `readaloud` 2 phút, hiện đoạn văn + Focus; bài khác 1 lần 5 phút), mỗi phần một recorder (`spRid`). Submit chỉ bật khi có ít nhất 1 bản ghi đã lưu hoặc link Vocaroo (`spSync`; Vocaroo nằm trong `<details class="vocalt">`, trình duyệt không hỗ trợ ghi âm thì hiện sẵn). Attempt thêm `audio: [{part, id, url, dur, type}]` (giữ `link` nếu có). `renderPlayer` cho `readaloud` dùng trang Speaking. Xem lại bài đã nộp: `renderSubmittedSpeaking` (dropdown Version dùng chung `versionsHTML`/`WVER`, banner + điểm + "Teacher note", trình phát từng Part `subAudioHTML`, nút **Record a new version** `sp-new`). Modal Marking: `subAudioHTML(a)` thay iframe Vocaroo (bài cũ vẫn `vocEmbed`).
26. **Tự tạo bài Listening 5 giai đoạn (GĐ 7 phần C, bản rút gọn, 10/2026)**: tab Create, khi chọn Listening → "5-stage lesson" hiện thẻ `#alBox` (`renderAutoL`, gọi cuối `renderCpPrompt`): Title (tùy chọn), **Transcript** (bắt buộc), "Original questions and answer key" (tùy chọn, trong `<details>`), nút **Generate 5-stage lesson** (`al-gen` → `alGen`). Gọi `staffApi('ai/lesson', {…, prompt: alPrompt()})`; JSON trả về được ghi vào `#jsonIn` rồi `checkJSON()` → `parseAI`/`parseLesson` → preview như cách thủ công → nút Add như cũ (Book/Test ở bước 2). Lỗi → câu báo + nút "Try again". Nháp lưu `localStorage['md-al']` (biến `AL`). Demo: dùng `EXAMPLE_L`. Cách thủ công (copy prompt, dán JSON) giữ nguyên. Đã thêm (mục 27): khung Audio và nút phiên âm.
   - **Tự sửa `highlight_target`** (`lsFix`, `lsFind`, `lsWords`, chạy đầu phần stage 2 của `parseLesson`): AI hay lệch dấu câu/khoảng trắng/nhãn người nói. Tìm cùng các TỪ (bỏ qua dấu câu, khoảng trắng, hoa thường) trong `transcript_segment` rồi chép nguyên văn; không có thì tìm trong các lượt nói của `material` (tách bằng dòng trống) và lấy lượt đó làm `transcript_segment`. Vẫn không thấy → lỗi kèm cụm chữ. `LPROMPT` dặn thêm "copied character for character… no speaker label".
27. **GĐ 7 phần B + phiên âm (10/2026)**:
   - **Voice feedback**: modal Marking có recorder `fb_<attemptId>` (`kind:'feedback'`, 3 phút, khởi tạo từ `grade.voice` qua `opts.saved`); link Vocaroo cũ nằm trong `<details>`. `saveGrade` ghi `grade.voice = {id,url,dur,type}` (Re-record rồi để trống = xóa; bản ghi chưa "Use this recording" thì không cho lưu). `hasFb` tính cả `voice`. HS nghe qua `voiceFbHTML(g)` ("Teacher's voice feedback") ở Open feedback (`showFb`) và chế độ xem lại Writing/Speaking (`subStatusHTML`).
   - **Audio cho bài Listening** (tab Create, chọn Listening): thẻ `#audBox` (`renderAudBox`) = recorder `cr_aud` (`kind:'lesson'`, 10 phút, `upload:true`). Lưu xong → `CP.aud` (localStorage `md-craud`), `cpAudApply()` ghi `audio_url` vào JSON ở bước 2 rồi `checkJSON()`; `checkJSON` cũng tự gắn `CP.aud` cho bài Listening chưa có audio; `alGen` gắn vào JSON do AI viết. Re-record = bỏ audio. Cách cũ `audio/ten-file.mp3` vẫn chạy.
   - **Transcribe from audio (AI)**: nút `al-trn` (`alTranscribe`) trong thẻ Auto-create, chỉ bật khi đã có `CP.aud`; kết quả điền vào ô Transcript (sửa được) rồi mới Generate. Demo: lấy transcript của `EXAMPLE_L`.
   - `geminiOnce` nhận `prompt` là chuỗi **hoặc** mảng parts (audio). `API_VERSION` = `2026-10-20b`.
 Recent results: lưới 2 cột **hết chiều ngang** (bỏ `max-width`), ô `.rs` `aspect-ratio:4/3` (điện thoại 1/1, dưới 360px 1 cột, chiều cao tự nhiên), biểu đồ `.rs-bars` `flex:1` giãn theo ô; bỏ dòng thống kê dưới tên kỹ năng (tên căn giữa theo chiều dọc với icon 30px). CSS điện thoại của `.rs` nằm **sau** CSS gốc (trước đó bị ghi đè).
17. **Gemini fallback, chỉ model miễn phí (10/2026)**: `AI_MODELS` = `gemini-3.8-flash` → `gemini-3.6-flash` → `gemini-3.5-flash-lite` (đều có Free Tier). `aiModels(env)`: `GEMINI_MODELS` (danh sách) thay danh sách mặc định; `GEMINI_MODEL` cũ được thử trước; model trả phí (`PAID_ONLY`: pro, argon, gemini-4+) luôn bị bỏ. `genConfig`: Gemini 3.x không đặt `temperature` (theo khuyến nghị của Google), `thinkingLevel` `low` (3.8) / `minimal` (3.6, 3.5-lite); 2.5 vẫn `thinkingBudget:0`. `askGemini` thử từng model: lỗi 400 về thinking/schema thì thử lại cùng model (bỏ thinking hoặc bỏ schema); 404/429/5xx/network/empty/parse/too_long hoặc 400 khác thì sang model sau (chờ 0,8 s nếu 429/5xx); 403, 400 'location'/'API key', timeout, blocked, relay thì dừng ngay. Không bắt đầu model mới sau 90 s; mọi model chung giới hạn `AI_TIMEOUT`. Trả `{out, model (model thật đã dùng), via, retried}`. Client: mã `http429`/`http5xx` → "The AI is very busy right now…".

28. **Sidebar + phân quyền + Dashboard/Library mới + Daily mới (10/2026)**:
   - Menu sidebar và tab theo vai trò: xem mục 3 "Tab theo vai trò". Giáo viên không còn Students/Create/Prizes/Settings (form "Reset a student password" của `md-backend.js` nằm trong `#v-roster`, nên giờ chỉ admin thấy, và admin dùng Admin › Users).
   - **Dashboard** (`renderDash`, CSS `.dcard .dhero .dring .dch .dtbl .drk .dht .dg2/3/4`): Overview = vòng tròn điểm trung bình + biểu đồ đường 8 tuần (`dLine`), bảng Classes, Hardest exercises dạng xếp hạng (`dRank`), Homework (`.dhw .dseg`). Students = bảng (avatar chữ `dAv`, chấm tiến độ `dDots`, `dScore`) + thẻ chi tiết. Mistakes = 3 thẻ hardest skill/test/exercise + lưới nhiệt question type + thanh hardest exercises. Homework giữ như cũ. Lọc theo `clsOk`.
   - **Library GV/admin**: lưới bìa sách `.covers > button.bk` (màu `hsl(số sách × 47)`, xám `.bk.e` = chưa có bài, `.bk.sel` đang mở), bấm vẫn mở `.lpanel` thẻ Test như cũ. Học sinh giữ lưới `.tile` cũ. "+ Add exercise" chỉ admin.
   - **Create**: bỏ bước 1 (prompt) và 2 (dán JSON), nút Check format và các nút Example. Còn Audio, Auto-create 5 giai đoạn, Book/Test, Preview. JSON nằm trong `CP.raw` (`checkJSON(txt)`). Reading/Writing/Speaking sẽ có format sau (prompt vẫn ở `cpPresets`).
   - **Admin › XP**: hàng `.xprow` (nhãn | ô số 96px | default), căn đều.
   - **Daily practice**: mỗi ngày 2 bài xoay vòng từ 7 dạng `DKS` = `wotd` · `syn` · `ra` (Read aloud) · `dict` (Dictation) · `dcl` (Gap-fill dictation, 3 chỗ trống `dclGaps`) · `sp1` · `sp3` (Speaking Part 1/3, 1 câu từ `SP1_Q`/`SP3_Q`). Daily Review chỉ hiện khi có thẻ đến hạn (hoặc đã làm hôm nay); Error review hiện khi có lỗi đến hạn. Đã bỏ Sentence Paraphrasing và 5-Min Reading. Ghi âm Daily dùng recorder `opts.local` (chỉ nghe lại trên máy, không upload, không tính vào `recUnsaved`). XP mới `d_dcl, d_ra, d_sp1, d_sp3`.
   - Home: bỏ dòng "N XP · M to …" dưới thanh cấp độ; chip tên HW to hơn (`.hw .sechead .chip`); trạng thái "To do" → **"Waiting"**.
   - Flashcard: `setCard` ghi bản JSON (bỏ `undefined`) trong `try/catch`, id thẻ đổi `/` → `-`; `rvRate` luôn sang thẻ sau kể cả khi lưu lỗi; Backspace chấm được cả trước khi lật thẻ.

## 8. Giới hạn đã biết / chưa làm

- AI chữa lỗi Writing chạy qua `/api/ai/correct` (cần `GEMINI_KEY`). `aiLookup` (tra từ bằng AI) vẫn gọi `window.claude` nên chưa chạy trên site thật.
- AI chỉ chấm được trong 2 giờ sau khi nộp, mỗi bài 1 lần. AI không cho band (đã bỏ `summary`/`improved_essay` ở GĐ 5).
- `/api/ai/correct` không kiểm tra token: ai có `attemptId` (id ngẫu nhiên, chỉ chủ bài và GV đọc được) thì gọi được, nhưng vẫn bị giới hạn 1 lần/bài và `AI_DAILY_LIMIT`/ngày.
- `admin/kick` giữ lại `errors` như các dữ liệu học tập khác; đổi email (`migrateEmail`, chưa làm) phải chuyển cả `errors`.
- Chưa gửi email nhắc lúc 20:00 (mới có checkbox và phần Preview trong Inventory).
- Collection `roster` đọc được bởi mọi người đã đăng nhập. Ai biết tên và lớp có thể nhận tên của học sinh khác trước.
- Học sinh hiện không có nút mở file Materials (do mục 7.6).

---

## 9. Cách làm việc với người dùng

- Người dùng là giáo viên/chủ dự án, không chuyên lập trình: **giải thích ngắn, bằng tiếng Việt**, nói rõ đã sửa hàm nào và CSS nào.
- Khi yêu cầu chưa rõ (ví dụ màu sắc, ngưỡng điểm, vị trí), chọn phương án hợp lý nhất, làm luôn, rồi nêu giả định trong câu trả lời. Chỉ hỏi trước khi thay đổi có thể làm mất dữ liệu, đổi schema Firestore/rules hoặc đổi cách đăng nhập.
- Khi người dùng nói có ảnh thiết kế đính kèm nhưng không thấy ảnh, nói rõ điều đó và làm theo mô tả chữ.
- Sau khi sửa, tóm tắt theo mẫu: **Đã đổi gì → Ở đâu (hàm/CSS) → Cách kiểm tra → Lưu ý/giả định**.
- Thay đổi ảnh hưởng `firestore.rules` hoặc biến môi trường Cloudflare thì nhắc người dùng các bước làm trên Console.
