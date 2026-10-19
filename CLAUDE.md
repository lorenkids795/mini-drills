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

- Student: `library` (Home) · `cards` · `errors` (Error Notebook) · `ranks` · `wheel` · `bag` · `set`
- Teacher: `library` · `dash` · `asg` · `mark` · `roster` · `create` · `prize` · `xps`
- Admin (teacher có `U.adm`): như Teacher, thêm `admin` ở cuối (`#v-admin`, `renderAdmin()`, tab con `AD.sub`: `guide` · `users` · `teachers` · `sheet` · `aitest` · `me`)

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
| POST | `/api/ai/practice` | `{errorId, tzo}`: đọc `errors/{id}`; có `practice` rồi thì trả luôn; chưa có thì Gemini tạo (`PRACTICE_PROMPT`), lọc bằng `cleanPractice`, lưu vào doc. KV `aipq:<email>:<ngày>`, 50/ngày |
| POST | `/api/ai/correct` | `{attemptId, task, exTitle, tzo}`: không cần session; server đọc `attempts/{id}` (phải là `kind:'submission'`, có `text` 8–6000 ký tự, `ts` < 2 giờ). Gọi Gemini (`responseSchema`, timeout 25 s), lọc lỗi tìm thấy nguyên văn trong bài, ghi `attempts.ai` + `attempts.fixes` (dạng cũ) + collection `errors`. Trả `{ai, added}`. Đã chấm rồi thì trả kết quả cũ, không tốn lượt |

Mọi `/api/admin/*` (trừ `unlock`) cần header `X-Admin-Key`. Ở frontend, mọi lời gọi admin đi qua **`adminApi(path, body)`** (demo: `demoAdminRun()` trên dữ liệu giả `DEMO_ADM`).

KV: `acct:<email>` (mật khẩu), `rl:<email>` (đếm sai), `reg:<ip>`, `setup:<ip>`, `staff` (`{email:{name,ts}}`), `off:<email>`, `adm:<key>`, `sheet` (`{url, csv, ts}`), `sheetcache` (lần đọc gần nhất, dùng 5 phút), `ai:<attemptId>` (`pending`/`done`, 2 ngày: mỗi bài chấm AI 1 lần), `aiq:<email>:<YYYY-MM-DD>` (số lần AI trong ngày, giới hạn `AI_DAILY_LIMIT`), `aipq:<email>:<YYYY-MM-DD>` (số bài Practice AI tạo trong ngày, 50).

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
17. **Gemini fallback, chỉ model miễn phí (10/2026)**: `AI_MODELS` = `gemini-3.8-flash` → `gemini-3.6-flash` → `gemini-3.5-flash-lite` (đều có Free Tier). `aiModels(env)`: `GEMINI_MODELS` (danh sách) thay danh sách mặc định; `GEMINI_MODEL` cũ được thử trước; model trả phí (`PAID_ONLY`: pro, argon, gemini-4+) luôn bị bỏ. `genConfig`: Gemini 3.x không đặt `temperature` (theo khuyến nghị của Google), `thinkingLevel` `low` (3.8) / `minimal` (3.6, 3.5-lite); 2.5 vẫn `thinkingBudget:0`. `askGemini` thử từng model: lỗi 400 về thinking/schema thì thử lại cùng model (bỏ thinking hoặc bỏ schema); 404/429/5xx/network/empty/parse/too_long hoặc 400 khác thì sang model sau (chờ 0,8 s nếu 429/5xx); 403, 400 'location'/'API key', timeout, blocked, relay thì dừng ngay. Không bắt đầu model mới sau 90 s; mọi model chung giới hạn `AI_TIMEOUT`. Trả `{out, model (model thật đã dùng), via, retried}`. Client: mã `http429`/`http5xx` → "The AI is very busy right now…".

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
