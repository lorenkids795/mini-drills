# YÊU CẦU: AI Auto-Correction chạy thật + lưu lỗi vào `errors` + giao diện "Error Notebook" (SRS)

> Đọc `CLAUDE.md` trước và tuân thủ quy ước của nó: frontend ES5, `esc()`, `data-act`, biến màu `--*` cho cả sáng/tối, sửa bằng Edit thay vì viết lại cả file. Trả lời bằng tiếng Việt, ngắn gọn.
> **Giữ cách làm đơn giản**: không OAuth, không xác minh ID token, không thêm Worker mới, không thêm package.
> **Không tự chạy** server, wrangler hay trình duyệt để test. Chỉ kiểm tra cú pháp (mục 7).
> **Không được làm hỏng** đăng nhập, Admin, Google Sheet hay dữ liệu đang có.

---

## 0. Hiện trạng (tự kiểm chứng bằng grep trước khi sửa)

- `autoFix(text)` trong `index.html` (khối Writing and speaking) gọi `window.claude.use('sample')` với prompt `FIXP`. `md-backend.js` chỉ hỗ trợ `'db'`, nên **AI không chạy trên site thật** (ô `#fixes` để trống).
- Kết quả cũ có dạng mảng `fixes: [{from, to, type, why}]` và được ghi vào `attempts/{id}.fixes`. Dữ liệu này đang được dùng ở:
  - `fixHTML(text, fixes)` và `fixListHTML(fixes)`
  - modal chấm bài của giáo viên (`modalHTML`: "Auto corrections")
- `ai-worker.js` là Worker riêng, **không được dùng**. Cách xác thực của nó (Google `tokeninfo` + `email_verified`) không khớp với đăng nhập bằng custom token hiện tại.
- `toFields()`/`fromFields()` trong `functions/api/[[path]].js` chỉ xử lý giá trị phẳng (string/number/boolean). Object và mảng sẽ bị biến thành chuỗi.
- `submitWriting()` lưu bài qua `saveAttempt()` (biến `lastRef` giữ ref doc vừa tạo), rồi gọi `autoFix(t)`.

---

## 1. Việc nhỏ làm trước: 4 ô "Recent results by skill" cao bằng nhau

Hiện mỗi hàng của lưới tự co theo nội dung, nên Listening/Reading thấp hơn Writing/Speaking. Sửa trong CSS `.rs-grid`:

```css
@media (min-width:641px){ .rs-grid{ grid-auto-rows:1fr } }
```

`.rs` đang là flex column và `.rs-last` có `margin-top:auto`, nên mục LATEST sẽ tự nằm sát đáy. Kiểm tra cả bố cục 2 cột và 4 cột (≥1080px). Trên điện thoại (1 cột) giữ chiều cao tự nhiên.

---

## 2. Backend AI: endpoint mới trong `functions/api/[[path]].js`

### 2.1 `POST /api/ai/correct` `{attemptId, task}`
- **Xác thực đơn giản, không cần session**: server đọc `attempts/{attemptId}` bằng service account. Chỉ học sinh đã đăng nhập mới tạo được attempt (rules đã chặn), nên một attempt có thật là đủ để tin.
  - Từ chối khi: attempt không tồn tại; không phải `kind:'submission'`; không có `text`; text dài dưới 8 hoặc trên 6000 ký tự; `ts` cũ hơn 2 giờ.
  - Mỗi attempt chỉ chấm AI một lần: dùng KV `ai:<attemptId>` (TTL 2 ngày). Gọi lại thì trả về kết quả đã lưu trong `attempts/{id}.ai`, không gọi Gemini lần nữa.
  - Giới hạn số lần mỗi học sinh mỗi ngày: KV `aiq:<email>:<YYYY-MM-DD>`, mặc định 10 lần (biến `AI_DAILY_LIMIT`). Vượt thì báo "You have used today's AI checks. Try again tomorrow."
- `task` là đề bài do client gửi lên (`ex.prompt`), dùng để AI đánh giá mức độ bám đề. Cắt tối đa 1500 ký tự.
- Gọi **Gemini** (`generativelanguage.googleapis.com/v1beta/models/<GEMINI_MODEL>:generateContent?key=<GEMINI_KEY>`):
  - `GEMINI_MODEL` mặc định `gemini-2.5-flash`, đổi được bằng biến môi trường
  - `generationConfig`: `temperature: 0.2`, `responseMimeType: "application/json"`, `responseSchema` theo mục 2.2, để Gemini **bắt buộc trả JSON đúng mẫu**
  - Timeout 25 giây bằng `AbortController`
  - Lỗi hoặc hết thời gian thì trả `502 {error:'busy'}`; client hiện "Automatic correction is not available right now."
- **Hậu xử lý ở server** (không tin hoàn toàn vào AI):
  - `summary.word_count` = số từ do server tự đếm, cùng cách đếm với `wordCount()` ở client
  - Chỉ giữ correction có `original_text` **tìm thấy nguyên văn** trong bài, khác `corrected_text`, và có `category`. Riêng loại `Off-topic` thì `corrected_text` được để trống. Tối đa 15 lỗi, sắp theo vị trí xuất hiện trong bài.
  - Với mỗi lỗi, tự trích **câu chứa lỗi** trong bài (tách câu theo `.!?` và xuống dòng) làm trường `context`, tối đa 300 ký tự
- **Ghi dữ liệu** (bằng service account):
  - `attempts/{id}.ai` = `{summary, corrections, vocabulary_upgrades, improved_essay, model, ts}`
  - `attempts/{id}.fixes` = **mảng tương thích ngược** `[{from: original_text, to: corrected_text, type, why: explanation}]`, bỏ các mục Off-topic, để `fixHTML()` và modal chấm bài cũ vẫn chạy
  - Mỗi correction ghi vào collection `errors` (mục 3)
- Trả kết quả `ai` về cho client để hiện ngay.
- **Viết thêm** `toValue()`/`fromValue()` đệ quy (mapValue/arrayValue) và dùng chúng trong `toFields()`/`fromFields()`. Kiểm tra kỹ để các chỗ đang dùng (Sheet, roster, names, admin) **không đổi hành vi**.

### 2.2 Prompt và schema cho Gemini
Đặt prompt trong hằng `AI_PROMPT` ở server, không để ở client. Nội dung chính: *"You are an IELTS Writing examiner and tutor…"*. Yêu cầu:
- `original_text` phải được **chép nguyên văn** từ bài, càng ngắn càng tốt nhưng phải tìm được trong bài
- `category` ngắn, theo kiểu sổ lỗi (ví dụ: Stative Verbs, Gerund as Subject & Articles, Irregular Plural Nouns, Subject–Verb Agreement, Collocation, Spelling…)
- `explanation` là một câu tiếng Anh đơn giản
- `general_feedback` viết bằng **tiếng Việt**
- Không bịa lỗi; bài không có lỗi thì trả `corrections: []`

`responseSchema` (cú pháp OpenAPI-subset của Gemini):

```json
{
  "summary": {
    "word_count": "number (server sẽ ghi đè)",
    "grammar_band_est": "Band X.X",
    "topic_relevance": "High | Medium | Low",
    "general_feedback": "Nhận xét ngắn gọn bằng tiếng Việt (2–4 câu)"
  },
  "corrections": [{
    "original_text": "chép nguyên văn từ bài, VD: am disagree",
    "corrected_text": "VD: disagree (có thể ghi 2 cách: 'wrote / was writing')",
    "category": "VD: Stative Verbs",
    "explanation": "VD: 'Disagree' is an action verb. Use 'I disagree', not 'am disagree'.",
    "type": "Grammar | Vocabulary | Off-topic"
  }],
  "vocabulary_upgrades": [{
    "original": "từ/cụm đơn giản trong bài",
    "upgraded": "cách nói hay hơn",
    "example": "câu ví dụ ngắn dùng từ mới",
    "note": "vì sao tốt hơn (ngắn)"
  }],
  "improved_essay": "bài viết đã sửa, giữ ý của học sinh"
}
```

Quy ước `type`: `Grammar` gồm cả lỗi dấu câu; `Vocabulary` gồm word choice, collocation, chính tả; `Off-topic` là câu lạc đề.

### 2.3 Biến môi trường mới (Cloudflare Pages → Variables and Secrets, cho cả Preview và Production)
- `GEMINI_KEY` (Secret)
- `GEMINI_MODEL` (Text, tùy chọn)
- `AI_DAILY_LIMIT` (Text, tùy chọn)

Cập nhật README: cách lấy key Gemini ở Google AI Studio và thêm biến. Thêm một dòng chú thích ở đầu `ai-worker.js`: *"DEPRECATED – không dùng, AI chạy qua /api/ai/correct"*. **Không xóa** file khi tôi chưa đồng ý.

---

## 3. Collection `errors` (Spaced Repetition)

### 3.1 Cấu trúc doc
- Id doc: **`<slug(email)>_<h>`**, với `h` = 12 ký tự đầu của `sha256(lower(original_text)+'|'+lower(corrected_text))`. Có `slug(email)` ở đầu id để khớp với quy ước đổi email đã ghi trong `CLAUDE.md` mục 7.7.
- Trường:
  - Nội dung lỗi: `{email, student, cls, original, corrected, category, explanation, type, context, attemptId, ex, exTitle}`
  - Trạng thái ôn tập: `box:1, due:<ts đầu ngày hôm nay>, reviews:0, lapses:0, mastered:false`
  - Theo dõi: `count:1, createdAt, lastSeen, lastPractice:0`
- **Gặp lại cùng một lỗi** (doc đã tồn tại): `count+1`, `lastSeen=now`, `box=1`, `due=hôm nay`, `mastered=false`, cập nhật `context`/`attemptId` mới nhất. Không tạo bản trùng.

### 3.2 Lặp lại ngắt quãng (hộp Leitner)
- `ERR_DAYS = [0, 1, 3, 7, 14]`: khoảng cách ngày của box 1 đến 5.
- **Trả lời đúng**: `box+1`, `due = đầu ngày + ERR_DAYS[box-1]` ngày, `reviews+1`. Đúng khi đang ở **box 5** thì `mastered:true`. Mỗi lần đúng cộng XP `xpv('errFix')`, mặc định 5; thêm khóa `errFix` vào `XPD` và vào màn Settings XP của giáo viên.
- **Trả lời sai**: `box=1`, `due = ngày mai`, `lapses+1`.
- "Due today" nghĩa là `!mastered && due <= cuối ngày hôm nay`.

### 3.3 Firestore rules (thêm vào `firestore.rules`, nhắc tôi dán lại vào Firebase Console)
```
match /errors/{id} {
  allow read: if teacher() || ownsOld();
  allow create: if false;   // chỉ server tạo (service account)
  allow update: if ownsOld() && request.resource.data.diff(resource.data).affectedKeys()
                 .hasOnly(['box','due','reviews','lapses','mastered','lastPractice']);
  allow delete: if teacher() || ownsOld();
}
```

### 3.4 Client
- Ở phần Boot: `own('errors').onSnapshot(...)` → `errorDocs`, rồi `refreshLive()`.
- Ghi thất bại thì dùng mảng `localErr` làm phương án dự phòng.
- Thêm `errors` vào **danh sách collection phụ thuộc email** trong `CLAUDE.md` mục 7.7, để giai đoạn đổi email (`migrateEmail`) và `admin/kick` xử lý luôn collection này.

---

## 4. Frontend: kết quả AI sau khi nộp bài Writing

- Viết lại `autoFix(text)`:
  - Chế độ thật: sau khi `saveAttempt` trả về `'db'`, gọi `POST /api/ai/correct` với `{attemptId: lastRef.id, task: ex.prompt}`.
  - Bài chỉ lưu cục bộ (`local-…`): hiện "Automatic correction needs an internet connection." và không gọi AI.
  - Chế độ demo: dùng kết quả mẫu `DEMO_AI` (5 lỗi như trong ảnh: *am disagree→disagree*, *protect the nature→protecting nature*, *Many peoples→Many people*, *is write→wrote / was writing*, *go→went*) và thêm lỗi vào `localErr`.
- Hiển thị trong `#fixes` (dùng lại class sẵn có, thêm CSS gọn nếu cần):
  1. **Tóm tắt**: số từ · "Grammar (AI estimate): Band X.X" · Topic relevance (chip màu High=good, Medium=warn, Low=bad) · nhận xét tiếng Việt. Ghi rõ đây là **ước lượng của AI**, band chính thức do giáo viên chấm. **Không** đưa band AI vào "Recent results by skill".
  2. **Corrections**: bài có đánh dấu bằng `fixHTML()`, và danh sách lỗi theo `category` (gạch đỏ → chữ xanh, kèm giải thích).
  3. **Vocabulary upgrades**: danh sách `original → upgraded`, kèm ví dụ. Mỗi dòng có nút "+ Flashcard" dùng `saveCard()` hiện có, nếu gọi được đơn giản.
  4. **Improved essay**: đặt trong `<details>` (thu gọn mặc định), có nút Copy.
  5. Dòng cuối: "N mistakes were added to your **Error Notebook**", kèm nút mở tab đó.
- Modal chấm bài của giáo viên (`modalHTML`): nếu attempt có `ai` thì hiện thêm phần tóm tắt AI (thu gọn được). Phần "Auto corrections" cũ vẫn giữ.

---

## 5. Frontend: tab "Error Notebook" (theo ảnh mẫu, đồng bộ style của web)

- Thêm `['errors','Error Notebook']` vào `tabsFor()` của **student**, đặt ngay sau Flashcards. Thêm `<section id="v-errors" hidden>` và hàm `renderErrors()`. Nhớ thêm `'errors'` vào **cả mảng id** lẫn **object ánh xạ** trong `showTab()`, và vào `refreshLive()` (không vẽ lại khi đang gõ trong input của tab này).
- **Header**: `h2` "Error Notebook", dòng phụ "Spaced Repetition System (SRS)" màu `--muted`, bên phải là nút `btn bad sm` "Clear All".
- **3 ô thống kê** cùng cỡ:
  - `TOTAL ERRORS`: nền `--surface`, viền `--line`
  - `DUE TODAY`: nền `--bad-bg`, chữ `--bad`
  - `MASTERED`: nền `--good-bg`, chữ `--good`
  - Số to dùng `--mono`, nhãn viết hoa nhỏ. Bấm vào ô nào thì lọc danh sách theo ô đó (All / Due / Mastered). Ô đang chọn có viền `--accent`.
- Dưới các ô: nút `btn pri` **"Review all due (N)"** (ẩn khi N=0) và một `<select>` lọc theo Category.
- **Thẻ lỗi** (`.errc`, nền `--surface`, viền `--line`, bo góc 12px). Sắp xếp: lỗi đến hạn lên trước, rồi theo `due` tăng dần.
  - Dòng 1: "Category: X" (màu `--accent`, đậm) ở bên trái; badge ở bên phải:
    - `BOX n: REVIEW NOW` (nền `--bad-bg`, chữ `--bad`) khi đến hạn
    - `BOX n · NEXT 21 OCT` (nền `--line`) khi chưa đến hạn
    - `MASTERED` (nền `--good-bg`) khi đã thuộc
  - Dòng 2: `<del>` original (đỏ, gạch ngang) `->` `<ins>` corrected (xanh, đậm, không gạch chân)
  - Dòng 3: explanation, màu `--muted`
  - Dòng nhỏ: "From: {exTitle} · {ngày} · seen {count}×"
  - Nút `btn pri sm` **"Practice This Error"** (ẩn khi đã mastered; thay bằng "Practice again" dạng `btn sm`)
- **Practice** (mở ngay trong thẻ, không chuyển trang):
  - Hiện `context`, trong đó phần sai được tô `--hl-soft`, kèm câu hỏi "Rewrite the highlighted part correctly:". Có ô input; Enter hoặc nút "Check" để kiểm tra.
  - So khớp: chữ thường, bỏ khoảng trắng thừa, bỏ dấu câu ở cuối. Chấp nhận mọi phương án trong `corrected` khi tách bằng ` / ` hoặc `|`.
  - Đúng: hiện "Correct! +5 XP · next review {ngày}", rồi cập nhật SRS.
  - Sai: hiện đáp án và explanation, đặt lại box 1.
  - Lỗi `Off-topic`: không có ô nhập, chỉ hiện explanation và nút "I understand" (tính là đúng).
- **Review all due**: lần lượt từng lỗi đến hạn theo cùng giao diện Practice, có thanh "3 of 5", kết thúc hiện "You fixed X of N". Có thể dùng lại kiểu `.fcard` của Flashcards.
- **Clear All**: modal xác nhận (kiểu Marking) ghi rõ "This deletes all N errors in your notebook. This cannot be undone." Sau đó xóa doc `errors` của chính học sinh, theo lô.
- **Trạng thái trống**: "No errors yet. Submit a Writing task and AI will collect your mistakes here."
- **Trang Home**: nếu có lỗi đến hạn, thêm một thẻ vào lưới Daily practice ("Error review · N due"), bấm vào thì mở tab Error Notebook ở chế độ Review. Thẻ này dùng đúng kiểu `.dtask` hiện có, **không có icon**.
- Hiển thị tốt ở 390px (badge xuống dòng dưới category) và ở dark mode.
- **Demo**: tài khoản Minh Anh có sẵn 5 lỗi mẫu như trong ảnh, để xem được giao diện mà không cần server.

---

## 6. Làm theo giai đoạn, DỪNG sau mỗi giai đoạn để tôi kiểm tra

- **GĐ 1**: mục 1 (CSS 4 ô) + mục 2 (endpoint AI, schema, `toValue`/`fromValue`) + mục 4 (hiển thị kết quả).
- **GĐ 2**: mục 3 (`errors`, SRS, rules) + mục 5 (tab Error Notebook, Practice, Review, Clear All, demo).
- **GĐ 3**: thẻ trên Home, phần AI trong modal của giáo viên, cập nhật `README.md`, `CLAUDE.md` (mục 3, 4 endpoint, collection `errors`, mục 7 lịch sử, mục 8 giới hạn) và `TESTING.md`.

Báo cáo mỗi giai đoạn theo mẫu: **Đã làm gì → File/hàm đã sửa → Việc tôi cần làm trên Cloudflare/Firebase → Cách test**.

---

## 7. Kiểm tra (chỉ kiểm tra tĩnh, nhanh)

- `node --check "functions/api/[[path]].js"`
- Tách `<script>` inline của `index.html` ra file tạm rồi chạy `node --check`. Grep để chắc frontend không có `let`, `const`, `=>` hay template literal.
- Grep để chắc mọi chuỗi mới đưa vào `innerHTML` đều qua `esc()`.

**Thêm vào `TESTING.md`** (tôi tự test trên bản Preview):
1. Nộp một bài Writing có lỗi → trong khoảng 5–20 giây thấy tóm tắt, phần sửa lỗi, từ vựng nâng cấp, bài đã sửa và dòng "N mistakes were added…".
2. Tải lại trang → kết quả AI vẫn còn (đọc từ `attempts.ai`). Giáo viên mở bài đó trong Marking → thấy Auto corrections và tóm tắt AI.
3. Tab Error Notebook: số liệu 3 ô đúng; Practice đúng thì box tăng và ngày ôn lùi lại; sai thì về box 1.
4. Nộp bài khác có cùng lỗi → không tạo thẻ trùng, "seen 2×", thẻ quay về box 1.
5. Vượt giới hạn trong ngày → có thông báo dễ hiểu. Gọi lại AI cho cùng một bài → không tốn thêm lượt.
6. Clear All → notebook trống. Học sinh khác không thấy lỗi của mình.
7. 4 ô Recent results cao bằng nhau ở bố cục 2 cột và 4 cột.
8. Đăng nhập student/teacher/admin và Google Sheet vẫn hoạt động như trước. Chế độ demo chạy được với 5 lỗi mẫu.

Chỗ nào chưa rõ thì chọn cách **đơn giản và an toàn nhất**, ghi giả định rồi làm tiếp. Chỉ hỏi tôi trước khi xóa file hoặc làm điều có thể mất dữ liệu.
