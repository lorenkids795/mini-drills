# Mini Drills – hướng dẫn deploy (miễn phí)

## 1. GitHub
Tạo repo trống (vd `mini-drills`) → Add file → Upload files → kéo cả thư mục này vào (index.html, md-config.js, md-backend.js, firestore.rules, README.md) → Commit.

## 2. Firebase (gói Spark, miễn phí)
1. console.firebase.google.com → Add project.
2. Build → Authentication → Get started → bật **Google**.
3. Build → Firestore Database → Create database (production mode).
4. Tab **Rules**: dán nội dung `firestore.rules` (email giáo viên đã điền sẵn) → Publish.
5. Project settings → Your apps → Web (`</>`) → copy `firebaseConfig`.
6. Sửa `md-config.js` trên GitHub: dán `projectId`, `authDomain`, `appId` từ firebaseConfig (apiKey và email giáo viên đã điền sẵn).

## 3. Cloudflare Pages
Workers & Pages → Create → Pages → Connect to Git → chọn repo → Build command: để trống; Output directory: `/` → Deploy.
Sau đó copy domain `xxx.pages.dev` → Firebase → Authentication → Settings → **Authorized domains** → Add.

## 4. Dùng
- Giáo viên đăng nhập bằng Google (email trong `teachers`), HS nào có Google cũng bấm Sign in with Google là vào thẳng, không cần roster.
- Audio nghe: bỏ file mp3 vào thư mục `audio/` trong repo, trong JSON thêm `"audio_url": "audio/ten-file.mp3"`.

## Giới hạn
- Tính năng AI (chấm Writing tự động, tra từ AI) chưa chạy trên site thật (cần backend AI riêng).
- Chưa có email nhắc 20:00.
- Rules đã siết "bài ai nấy xem": học sinh chỉ đọc/ghi doc có email của mình, giáo viên đọc tất cả (Leaderboard và mã voucher vẫn dùng chung).
