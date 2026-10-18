# Mini Drills – hướng dẫn deploy (miễn phí)

Đăng nhập KHÔNG dùng Google, KHÔNG gửi mã:
- Học sinh: lần đầu chọn lớp → chọn tên → nhập email + tự đặt mật khẩu. Các lần sau chỉ email + mật khẩu. Thiết bị được nhớ, không phải đăng nhập lại (trừ khi bấm Sign out hoặc xóa dữ liệu trình duyệt).
- Giáo viên: lần đầu tạo mật khẩu bằng "setup key" (chỉ bạn biết), sau đó đăng nhập bằng email + mật khẩu.
- Học sinh quên mật khẩu: nhắn giáo viên → giáo viên vào tab **Students** → "Reset a student password" → đặt mật khẩu mới rồi báo lại cho học sinh. Admin làm việc này ở tab **Admin → Users**.
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
   - `ADMIN_SETUP_KEY` (Secret): một câu dài ít nhất 8 ký tự do bạn tự nghĩ, dùng 1 lần khi tạo mật khẩu giáo viên
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
   - `GEMINI_MODEL` (Text, tùy chọn): mặc định `gemini-2.5-flash`
   - `AI_DAILY_LIMIT` (Text, tùy chọn): số lần AI chấm mỗi học sinh mỗi ngày, mặc định `10`
3. Deploy lại.
4. Firebase → Firestore → **Rules**: dán lại `firestore.rules` (có thêm khối `errors`) → **Publish**.
- Học sinh nộp bài Writing → sau 5–20 giây thấy bài có đánh dấu chỗ sai/chỗ sửa, bài đã sửa (Corrected essay, chỗ sửa tô xanh) và từ vựng nâng cấp. Các lỗi được đưa vào tab **Error Notebook** để ôn lại (box 1–5: hôm nay, 1, 3, 7, 14 ngày).
- Mỗi bài chỉ chấm AI 1 lần, chỉ trong 2 giờ sau khi nộp. AI không cho điểm band; điểm do giáo viên chấm.
- `ai-worker.js` không còn dùng (AI chạy qua `/api/ai/correct`).

## 4. Dùng
- Giáo viên: mở site → tab **Teacher** → "First time? Create your teacher password" → nhập email, mật khẩu mới và setup key.
- Tab **Students** → dán danh sách CSV với cột `name, course, class` → Import. Học sinh tự chọn tên trên trang đăng nhập.
- Nếu đã biết email học sinh, thêm cột `email`: học sinh bấm "My teacher already added my email" để đặt mật khẩu.
- Audio nghe: bỏ file mp3 vào thư mục `audio/` trong repo, trong JSON thêm `"audio_url": "audio/ten-file.mp3"`.

## Giới hạn
- Học sinh nhập email tự do: ai biết tên và lớp thì có thể đăng ký trước tên đó. Giáo viên kiểm tra tab Students nếu thấy lạ.
- Danh sách tên chưa đăng ký của từng lớp hiển thị công khai trên trang đăng nhập (không kèm email).
- Sau khi giáo viên đổi mật khẩu, thiết bị đang đăng nhập sẵn của học sinh vẫn dùng tiếp được. (Muốn đẩy thiết bị ra: admin bấm Pause, tối đa 10 phút.)
- AI chữa lỗi Writing chạy trên site thật (cần `GEMINI_KEY`). Tra từ bằng AI (`aiLookup`) vẫn chưa chạy. Chưa có email nhắc 20:00.
- Rules: học sinh chỉ đọc/ghi bài của mình, giáo viên đọc tất cả. Bảng `roster` (tên và email cả lớp) vẫn đọc được bởi mọi người đã đăng nhập.
