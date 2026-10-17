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

## Giai đoạn 2 — Google Sheet (chưa làm)
- [ ] Đăng ký mới chỉ thấy tên có trong Sheet; một tên chỉ đăng ký được một lần.

## Giai đoạn 3 — Đổi email (chưa làm)
- [ ] Email cũ bị từ chối; email mới đăng nhập bằng **mật khẩu cũ**; XP, bài làm, flashcard còn nguyên.
