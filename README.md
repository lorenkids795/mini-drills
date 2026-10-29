# Mini Drills – hướng dẫn deploy (miễn phí)

Đăng nhập KHÔNG dùng Google, KHÔNG gửi mã:
- Học sinh: lần đầu chọn lớp → chọn tên → nhập email + tự đặt mật khẩu. Các lần sau chỉ email + mật khẩu. Thiết bị được nhớ, không phải đăng nhập lại (trừ khi bấm Sign out hoặc xóa dữ liệu trình duyệt).
- Giáo viên: admin tạo tài khoản và mật khẩu (Admin › Teachers, hoặc Admin › Users › Change password); giáo viên đăng nhập bằng "Teacher sign in". Giáo viên **không** tự tạo mật khẩu được.
- Học sinh quên mật khẩu: nhắn giáo viên/admin → admin vào **Admin → Users** → Change password → báo mật khẩu mới cho học sinh. (Giáo viên không còn tab Students.)
- Phần xác thực nằm trong thư mục `functions/` (Cloudflare Pages Functions), tự chạy khi deploy.

## 1. GitHub
Upload cả thư mục này (index.html, md-config.js, md-backend.js, README.md, thư mục `functions/`). Không cần `ai-worker.js` (đã bỏ). Thư mục `functions/api/[[path]].js` phải giữ đúng tên và đúng chỗ. `firestore.rules` không cần đưa lên GitHub.

## 2. Firebase (Spark, miễn phí)
1. Build → Authentication → **Get started** (không cần bật Google; chỉ cần Authentication đã được khởi tạo).
2. Build → Firestore Database → tab **Rules**: dán `firestore.rules` → Publish.
3. Project settings → **Service accounts** → **Generate new private key** → tải file JSON (giữ bí mật, KHÔNG upload lên GitHub). Cần 2 giá trị: `client_email` và `private_key`.

## 3. Cloudflare Pages
1. Workers & Pages → Storage & Databases → **KV** → tạo namespace (vd. `md-kv`).
2. Pages project → Settings → **Bindings** → Add → KV namespace → Variable name: `MD_KV` → chọn namespace vừa tạo.
3. Pages project → Settings → **Variables and Secrets** → thêm:
   - `FIREBASE_PROJECT_ID` (Text): `mini-drills`
   - `FIREBASE_CLIENT_EMAIL` (Secret): `client_email` trong file JSON
   - `FIREBASE_PRIVATE_KEY` (Secret): `private_key` trong file JSON, dán nguyên cả đoạn từ `-----BEGIN PRIVATE KEY-----`
   - `TEACHERS` (Text): `lorenkids795@gmail.com` (nhiều email thì cách nhau bằng dấu phẩy; phải trùng `teachers` trong `md-config.js`)
   - `ADMIN_SETUP_KEY`: **không còn dùng** (từ 10/2026), có thể xóa
   - `ADMIN_EMAIL` (Text): email của tài khoản admin (admin = giáo viên có thêm tab **Admin**)
   - `ADMIN_PASSWORD` (Secret): mật khẩu đầu tiên của admin, ít nhất 6 ký tự. Chỉ dùng ở lần đăng nhập đầu; sau đó đổi trong Admin → My account
4. Deploy lại (Deployments → Retry deployment) để biến mới có hiệu lực.

## 3b. Admin
- Mở site → tab **Teacher** → đăng nhập bằng `ADMIN_EMAIL` + `ADMIN_PASSWORD` → tab **Admin** hiện ở cuối menu.
- Admin xem mọi tài khoản, đổi mật khẩu cho bất kỳ ai, tạm khóa/mở khóa, thêm/xóa giáo viên. Hướng dẫn chi tiết (tiếng Việt) nằm trong Admin → **Guide**.
- Giáo viên do admin thêm được lưu trong KV (key `staff`), không cần sửa `TEACHERS`.
- Tạm khóa hoặc xóa giáo viên: không đăng nhập được nữa, thiết bị đang mở bị đăng xuất trong vòng 10 phút. Không xóa dữ liệu.
- Firestore rules **không cần sửa** cho tính năng admin.

## 3c. Danh sách lớp từ Google Sheet
1. Sheet cần dòng tiêu đề có cột **Họ và tên** và **Lớp** (tùy chọn: Giáo viên, Khối, Hiện tại, id). Các dòng tiêu đề phụ phía trên được bỏ qua.
2. Lớp ghi theo giờ: `7H30`, `15H`, `17PM`… App hiển thị thành `7h30`, `15h`, `17h` và sắp theo giờ.
3. Chia sẻ Sheet: **Share → General access → Anyone with the link → Viewer**. Sheet chỉ nên có tên, lớp, khối; **không** ghi email hay số điện thoại.
4. Admin → **Google Sheet** → dán link → **Save & check**. Form đăng ký của học sinh dùng danh sách này ngay; sau khi sửa Sheet, tối đa 5 phút là cập nhật (hoặc bấm **Refresh now**).
5. Khi đã nối Sheet, khung nhập CSV ở tab Students của giáo viên được ẩn đi. Học sinh đã đăng ký từ trước vẫn đăng nhập bình thường.

## 3d. AI chữa bài Writing (Gemini) + Error Notebook
1. Lấy key: mở https://aistudio.google.com/apikey → đăng nhập Google → **Create API key** → copy.
2. Cloudflare Pages → Settings → **Variables and Secrets** (cho cả **Preview** và **Production**):
   - `GEMINI_KEY` (Secret): key vừa copy
   - Model: **không cần đặt**. Server tự thử lần lượt 3 model miễn phí `gemini-3.8-flash` → `gemini-3.6-flash` → `gemini-3.5-flash-lite` (model này bận hoặc hết lượt miễn phí thì chuyển model sau). Muốn đổi danh sách: `GEMINI_MODELS` (Text, cách nhau bằng dấu phẩy). Model trả phí (Pro, Argon, Gemini 4) luôn bị bỏ qua.
   - Nếu trước đây đã đặt `GEMINI_MODEL` = `gemini-2.5-flash` thì **xóa biến đó** (Google đã hạn chế model 2.5).
   - Muốn chắc chắn không mất tiền: tạo key ở project Google **chưa bật thanh toán (billing)**; khi đó Google chỉ cho dùng gói Free Tier.
   - `AI_DAILY_LIMIT` (Text, tùy chọn): số lần AI chấm mỗi học sinh mỗi ngày, mặc định `10`
3. Deploy lại.
4. Firebase → Firestore → **Rules**: dán lại `firestore.rules` (có thêm khối `errors`) → **Publish**.
- Học sinh nộp bài Writing → sau 5–20 giây thấy bài có đánh dấu chỗ sai/chỗ sửa, bài đã sửa (Corrected essay, chỗ sửa tô xanh) và từ vựng nâng cấp. Các lỗi được đưa vào tab **Error Notebook** để ôn lại (box 1–5: hôm nay, 1, 3, 7, 14 ngày).
- Mỗi bài chỉ chấm AI 1 lần, chỉ trong 2 giờ sau khi nộp. AI không cho điểm band; điểm do giáo viên chấm.
- `ai-worker.js` không còn dùng (AI chạy qua `/api/ai/correct`).

## 3e. Khi AI báo "User location is not supported" (trạm trung chuyển Apps Script)
Cloudflare có thể chạy `/api` ở máy chủ thuộc khu vực Gemini chặn (vd. Hồng Kông, hay gặp với người dùng ở Việt Nam). Khi đó Admin → AI test báo `code: http400 … User location is not supported`. Cách xử lý: cho Google Apps Script (chạy trên máy chủ Google ở Mỹ, miễn phí) gọi Gemini thay.
1. Mở https://script.google.com → **New project** → xóa code mẫu → dán toàn bộ file `gemini-relay.gs` trong repo → **Save**.
2. Biểu tượng bánh răng **Project Settings** → **Script Properties** → **Add script property**:
   - `GEMINI_KEY` = key Gemini (aistudio.google.com/apikey)
   - `RELAY_SECRET` = một câu dài ngẫu nhiên do bạn tự đặt (vd. 30 ký tự bất kỳ)
3. **Deploy** → **New deployment** → bánh răng chọn **Web app** → Execute as: **Me** → Who has access: **Anyone** → **Deploy** → cho phép quyền truy cập (Advanced → Go to … nếu Google cảnh báo).
4. Copy **Web app URL** (đuôi `/exec`). Dán vào trình duyệt: phải thấy `{"ok":true,...}`.
5. Cloudflare Pages → Settings → Variables and Secrets (Preview + Production):
   - `GEMINI_PROXY_URL` (Text) = link `/exec`
   - `GEMINI_PROXY_SECRET` (Secret) = đúng câu `RELAY_SECRET` ở bước 2
   - `GEMINI_MODELS` vẫn dùng như cũ (không cần sửa script khi đổi model). `GEMINI_KEY` trên Cloudflare không còn cần (key nằm trong script).
6. Deploy lại site → Admin → AI test → dòng thống kê ghi **"via Apps Script relay"**.
- Sửa code trong script xong phải **Deploy → Manage deployments → Edit (bút chì) → Version: New version → Deploy**, nếu không bản cũ vẫn chạy (link `/exec` giữ nguyên).
- Muốn quay lại gọi trực tiếp: xóa biến `GEMINI_PROXY_URL` rồi deploy lại.

## 3f. Ghi âm trên web (Speaking, nhận xét bằng giọng nói, audio bài nghe)
- File ghi âm lưu trong **KV** (`MD_KV`) đang có, không cần cài thêm. Mỗi file tối đa 8 MB (khoảng 10 phút).
- Gói miễn phí của Cloudflare KV có **1 GB** dung lượng và **1.000 lần ghi/ngày**. Bài Speaking của học sinh tự xóa sau 365 ngày. Khoảng 1 phút ghi âm ≈ 0,5–1 MB, nên 1 GB đủ cho khoảng 1.000–2.000 phút.
- Khi cần nhiều chỗ hơn, bật **R2**: Cloudflare → R2 → tạo bucket (vd. `md-audio`) → Pages project → Settings → **Bindings** → Add → **R2 bucket** → Variable name: `MD_AUDIO` → chọn bucket → deploy lại. Từ đó file mới lưu vào R2 (file cũ trong KV không tự chuyển). R2 không tự xóa file cũ: nếu muốn, tạo **Lifecycle rule** trong bucket.
- Giáo viên/admin cần phiên đăng nhập còn hạn (12 giờ) để upload; hết hạn thì app tự hỏi lại mật khẩu.

## 4. Dùng
- Giáo viên: admin đặt mật khẩu ở Admin › Teachers (hoặc Users › Change password) rồi đưa cho giáo viên → giáo viên mở site → **Teacher sign in**.
- Tab **Students** → dán danh sách CSV với cột `name, course, class` → Import. Học sinh tự chọn tên trên trang đăng nhập.
- Nếu đã biết email học sinh, thêm cột `email`: học sinh bấm "My teacher already added my email" để đặt mật khẩu.
- Audio nghe: ở tab **Create** → Listening → khung **Audio** → Upload a file (mp3/m4a/wav, tối đa 8 MB) hoặc Record. Audio tự gắn vào bài. Cách cũ (bỏ mp3 vào thư mục `audio/` và ghi `"audio_url": "audio/ten-file.mp3"`) vẫn dùng được.
- Bài Reading 4 giai đoạn: Create → tab **Reading** → dán bài đọc → **Generate reading lesson** → kiểm tra preview → chọn Book, Test → Add.
- Bài Listening 5 giai đoạn: Create → Listening → 5-stage lesson → (có audio thì bấm **Transcribe from audio**) → dán/sửa transcript → **Generate 5-stage lesson** → kiểm tra preview → Add.

## Giới hạn
- Học sinh nhập email tự do: ai biết tên và lớp thì có thể đăng ký trước tên đó. Giáo viên kiểm tra tab Students nếu thấy lạ.
- Danh sách tên chưa đăng ký của từng lớp hiển thị công khai trên trang đăng nhập (không kèm email).
- Sau khi giáo viên đổi mật khẩu, thiết bị đang đăng nhập sẵn của học sinh vẫn dùng tiếp được. (Muốn đẩy thiết bị ra: admin bấm Pause, tối đa 10 phút.)
- AI chữa lỗi Writing chạy trên site thật (cần `GEMINI_KEY`). Tra từ bằng AI (`aiLookup`) vẫn chưa chạy. Chưa có email nhắc 20:00.
- Rules: học sinh chỉ đọc/ghi bài của mình, giáo viên đọc tất cả. Bảng `roster` (tên và email cả lớp) vẫn đọc được bởi mọi người đã đăng nhập.

## Bảo mật (10/2026)

- **Dán lại `firestore.rules`** vào Firebase Console → Firestore Database → Rules → Publish mỗi khi file này đổi (bản 10/2026 giới hạn XP/spin mỗi lần ghi, chặn học sinh tự ghi kết quả AI và đổi mùa).
- File **`_headers`** ở thư mục gốc được Cloudflare Pages tự áp dụng (CSP, chống nhúng khung…). Nếu sau này thêm một dịch vụ bên ngoài (script, API, iframe) mà trang bị chặn, mở F12 → Console để xem địa chỉ bị chặn rồi thêm vào dòng `Content-Security-Policy`; tạm thời có thể xóa file này để tắt.
- AI chấm Writing, bài luyện Error Notebook và upload ghi âm của học sinh giờ cần học sinh đang đăng nhập (server kiểm tra Firebase ID token bằng `FIREBASE_PROJECT_ID`, không cần thêm biến môi trường).
