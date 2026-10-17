# TESTING — checklist tự test trên bản Preview của Cloudflare Pages

Đánh dấu `[x]` khi đạt. Ghi chú lỗi (nếu có) ngay dưới dòng đó.

## Chuẩn bị (một lần)
- [ ] Cloudflare Pages → Settings → Variables and Secrets: thêm `ADMIN_EMAIL` (Text) và `ADMIN_PASSWORD` (Secret, ít nhất 6 ký tự), cho cả **Preview** và **Production**.
- [ ] Deploy (push lên GitHub, hoặc Deployments → Retry deployment). Mở link Preview.
- [ ] `md-config.js` đang là `demo: false`.

## Giai đoạn 1 — Admin, vai trò, tạm khóa
1. [ ] **Admin lần đầu**: tab Teacher → đăng nhập bằng `ADMIN_EMAIL` / `ADMIN_PASSWORD` → thấy các tab giáo viên + tab **Admin** ở cuối; góc trên ghi "· admin".
2. [ ] **Admin thêm giáo viên**: Admin → Teachers → nhập Name, Email, bấm Generate → Add teacher. Mở cửa sổ ẩn danh → tab Teacher → đăng nhập bằng email/mật khẩu đó → thấy **giao diện giáo viên** (Dashboard, Assignments, Marking…), **không** có tab Admin; Dashboard thấy bài của cả lớp.
3. [ ] **Tài khoản cũ**: giáo viên trong `TEACHERS` đăng nhập được như trước. Học sinh cũ đăng nhập được. Tải lại trang (F5) → vào thẳng app, không phải đăng nhập lại (có thể thấy "Signing you in…" trong 1–2 giây).
4. [ ] **Đổi mật khẩu học sinh**: Admin → Users → tìm học sinh → Change password → Generate → Copy → Save password. Đăng nhập bằng mật khẩu mới: được. Bằng mật khẩu cũ: báo "Wrong email or password."
   - [ ] Nhập sai mật khẩu 10 lần → "Too many tries". Admin đổi mật khẩu → đăng nhập được ngay.
5. [ ] **Tạm khóa**: học sinh đang mở app trên máy B. Admin → Users → Pause.
   - [ ] Đăng nhập lại bằng tài khoản đó: báo "Your account is paused. Ask your teacher."
   - [ ] Máy B bị đưa về trang đăng nhập, kèm thông báo, trong vòng 10 phút (tải lại trang thì thấy ngay).
   - [ ] Resume → đăng nhập lại bình thường, XP và bài làm còn nguyên.
   - [ ] Remove một giáo viên ở tab Teachers → giáo viên đó không đăng nhập được nữa.
6. [ ] **Phiên admin**: mở tab trình duyệt mới → Admin → Users → thấy ô "Enter your admin password to continue" → nhập mật khẩu → danh sách hiện ra (không bị đăng xuất khỏi app).
7. [ ] **My account**: đổi mật khẩu admin (nhập mật khẩu hiện tại sai → báo lỗi; đúng → đổi được). Đăng xuất, đăng nhập bằng mật khẩu mới.
8. [ ] **Không tự khóa admin**: dòng Admin trong Users không có nút Pause / Change password (chỉ có "My account").
9. [ ] **Giáo viên thường**: tab Students vẫn có form "Reset a student password" như cũ và dùng được. Admin thì không thấy form này (dùng tab Admin).
10. [ ] **Demo**: đổi tạm `md-config.js` thành `demo: true`, chạy thử: 3 nút Teacher / Student · Minh Anh / Admin đều vào được; tab Admin có banner "Demo: changes are not saved". **Nhớ đổi lại `demo: false`.**
11. [ ] Giao diện sáng/tối (nút Dark mode) và trên điện thoại (bảng Users thành dạng thẻ, không bị tràn ngang).

## Giai đoạn 2 — Google Sheet
1. [ ] Sheet đã chia sẻ "Anyone with the link → Viewer". Admin → **Google Sheet** → dán link → **Save & check** → thấy "51 students in 3 classes: 7h30, 15h, 17h", bảng 5 dòng đầu và danh sách "Not registered yet" theo lớp.
2. [ ] Thử dán một link Sheet **chưa chia sẻ** → báo lỗi dễ hiểu (Share → Anyone with the link).
3. [ ] Trang đăng nhập → Student → "First time here?" → ô **Class** có 7h30, 15h, 17h (đúng thứ tự giờ) + "My teacher already added my email". Chọn 17h → thấy cả VĂN THIÊN và VĂN THIỆN.
4. [ ] Đăng ký một học sinh (chọn lớp, tên, nhập email, mật khẩu) → vào app được. Tải lại trang đăng ký → tên đó **không còn** trong danh sách. Admin → Users thấy học sinh đó với lớp 17h, Grade 10.
5. [ ] Hai máy cùng chọn một tên rồi bấm gần như cùng lúc → chỉ một máy thành công, máy kia báo "That name was just taken".
6. [ ] Thêm một dòng mới vào Sheet → bấm **Refresh now** (hoặc chờ 5 phút) → tên mới hiện ở form đăng ký.
7. [ ] Admin → Users → **Edit class** một học sinh đã đăng ký → lớp đổi trong Users; học sinh tải lại app thấy bài về nhà của lớp mới.
8. [ ] Giáo viên thường → tab Students: khung CSV đã ẩn, thấy dòng "Class list comes from Google Sheet (managed by Admin)". Admin thấy thêm nút "Open Admin › Google Sheet".
9. [ ] Học sinh cũ (đăng ký trước khi nối Sheet) vẫn đăng nhập được.
10. [ ] **Unlink** → form đăng ký quay về danh sách cũ; nối lại → hoạt động như trước.
11. [ ] Demo (`demo: true`): Admin → Google Sheet → dán link bất kỳ dạng docs.google.com/spreadsheets/... → thấy dữ liệu mẫu. **Nhớ đổi lại `demo: false`.**

## Giai đoạn 3 — Đổi email (chưa làm)
- [ ] Email cũ bị từ chối; email mới đăng nhập bằng **mật khẩu cũ**; XP, bài làm, flashcard còn nguyên.
