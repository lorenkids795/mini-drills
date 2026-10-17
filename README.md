# Mini Drills – hướng dẫn deploy (miễn phí)

Đăng nhập KHÔNG dùng Google, KHÔNG gửi mã:
- Học sinh: lần đầu chọn lớp → chọn tên → nhập email + tự đặt mật khẩu. Các lần sau chỉ email + mật khẩu. Thiết bị được nhớ, không phải đăng nhập lại (trừ khi bấm Sign out hoặc xóa dữ liệu trình duyệt).
- Giáo viên: lần đầu tạo mật khẩu bằng "setup key" (chỉ bạn biết), sau đó đăng nhập bằng email + mật khẩu.
- Học sinh quên mật khẩu: nhắn giáo viên → giáo viên vào tab **Students** → "Reset a student password" → đặt mật khẩu mới rồi báo lại cho học sinh.
- Phần xác thực nằm trong thư mục `functions/` (Cloudflare Pages Functions), tự chạy khi deploy.

## 1. GitHub
Upload cả thư mục này (index.html, md-config.js, md-backend.js, README.md, thư mục `functions/`). Thư mục `functions/api/[[path]].js` phải giữ đúng tên và đúng chỗ. `firestore.rules` không cần đưa lên GitHub.

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
4. Deploy lại (Deployments → Retry deployment) để biến mới có hiệu lực.

## 4. Dùng
- Giáo viên: mở site → tab **Teacher** → "First time? Create your teacher password" → nhập email, mật khẩu mới và setup key.
- Tab **Students** → dán danh sách CSV với cột `name, course, class` → Import. Học sinh tự chọn tên trên trang đăng nhập.
- Nếu đã biết email học sinh, thêm cột `email`: học sinh bấm "My teacher already added my email" để đặt mật khẩu.
- Audio nghe: bỏ file mp3 vào thư mục `audio/` trong repo, trong JSON thêm `"audio_url": "audio/ten-file.mp3"`.

## Chế độ Demo (test giao diện)
- Mở `https://<site>/?demo=1` (hoặc bấm link "Demo mode" ở màn hình đăng nhập) để dùng dữ liệu mẫu, không đụng tới dữ liệu thật.
- Ở màn hình đăng nhập có 2 nút: **Demo: Login as Teacher** (lorenkids795@gmail.com) và **Demo: Login as Student** (Minh Anh).
- Trong bài tập có thanh **Demo helper**: Fill all correct, Half correct, Clear. Thanh này chỉ hiện ở chế độ demo hoặc khi giáo viên đăng nhập, học sinh trên site thật không thấy.

## Giới hạn
- Học sinh nhập email tự do: ai biết tên và lớp thì có thể đăng ký trước tên đó. Giáo viên kiểm tra tab Students nếu thấy lạ.
- Danh sách tên chưa đăng ký của từng lớp hiển thị công khai trên trang đăng nhập (không kèm email).
- Sau khi giáo viên đổi mật khẩu, thiết bị đang đăng nhập sẵn của học sinh vẫn dùng tiếp được.
- AI chấm Writing tự động / tra từ AI chưa chạy trên site thật. Chưa có email nhắc 20:00.
- Rules: học sinh chỉ đọc/ghi bài của mình, giáo viên đọc tất cả. Bảng `roster` (tên và email cả lớp) vẫn đọc được bởi mọi người đã đăng nhập.
