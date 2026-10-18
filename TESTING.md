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
5. [ ] **Kick học sinh**: học sinh đang mở app trên máy B. Admin → Users → **Kick** → xác nhận.
   - [ ] Học sinh biến mất khỏi Users và Leaderboard.
   - [ ] Máy B bị đưa về trang đăng nhập với thông báo "Your account was removed…" trong vòng 10 phút (tải lại trang thì thấy ngay).
   - [ ] Đăng nhập bằng mật khẩu cũ: báo "Wrong email or password."
   - [ ] Tên học sinh hiện lại trong form đăng ký (đúng lớp). Đăng ký lại bằng **cùng email** → vào được, XP và bài làm cũ còn nguyên.
   - [ ] Remove một giáo viên ở tab Teachers → giáo viên đó không đăng nhập được nữa. (Giáo viên trong `TEACHERS` thì hiện "Paused" ở Users, bấm Resume để mở lại.)
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

## AI Auto-Correction + Error Notebook
Chuẩn bị: thêm `GEMINI_KEY` (Secret) cho Preview + Production rồi deploy lại; dán lại `firestore.rules` vào Firebase Console → Publish.
1. [ ] Nộp một bài Writing có lỗi → trong khoảng 5–20 giây thấy Corrections, Corrected essay, Vocabulary upgrades và dòng "N mistakes were added…".
   - [ ] "+ Flashcard" → từ có trong tab Flashcards. "Copy" ở Corrected essay → chép được văn bản sạch.
2. [ ] Tải lại trang → Home → Recent results ô Writing → "Open feedback" → kết quả AI vẫn còn. Giáo viên mở bài đó trong Marking → thấy "Auto corrections" (bài đánh dấu, danh sách lỗi, Corrected essay).
3. [ ] Tab **Error Notebook**: số liệu 3 ô đúng; bấm từng ô thì lọc đúng. Practice đúng → "Correct! +5 XP · next review …", box tăng, ngày ôn lùi lại.
4. [ ] Error Notebook chia nhóm theo category, không còn chữ "Category:" và dòng "From … seen …". Nộp 2 bài cùng mắc lỗi *go → went* → nhóm Past Simple Tense (hoặc tên AI đặt) hiện **2 thẻ** riêng, chip ghi "2 errors · 2 due". Nút "Practice this group" ôn lần lượt các lỗi đến hạn của nhóm. Nhóm đã thuộc hết thì thu gọn sẵn.
5. [ ] Nộp quá giới hạn trong ngày (mặc định 10; có thể tạm đặt `AI_DAILY_LIMIT` = `1` để thử) → "You have used today's AI checks. Try again tomorrow." Mở lại kết quả cũ không tốn thêm lượt.
6. [ ] **Review all due** → làm lần lượt, có "1 of N", cuối hiện "You fixed X of N". Home có thẻ "Error review · N due" → bấm vào mở thẳng chế độ Review.
7. [ ] **Clear All** → hộp xác nhận → notebook trống, tải lại vẫn trống. Học sinh khác không thấy lỗi của mình.
8. [ ] 4 ô Recent results cao bằng nhau ở bố cục 2 cột (màn ~800px) và 4 cột (≥1080px); điện thoại giữ chiều cao tự nhiên.
9. [ ] Đăng nhập student/teacher/admin và Google Sheet vẫn như trước. Giáo viên → Settings có dòng XP "Error Notebook".
10. [ ] Demo (`demo: true`): Minh Anh có sẵn 5 lỗi mẫu trong Error Notebook; nộp bài Writing thấy kết quả AI mẫu. **Nhớ đổi lại `demo: false`.**
11. [ ] Sáng/tối và điện thoại 390px: thẻ lỗi không tràn ngang; header nhóm 2 dòng (tên + chip, rồi nút); ô điền trong câu không làm tràn ngang.
12. [ ] Nộp bài có lỗi "protect the nature is important" → Practice hiện câu có chỗ trống ở đầu, gợi ý `(protect)`, phần sau câu đã viết đúng; gõ `protecting` → Correct, ô chuyển xanh, sau đó mới hiện `original → corrected` và giải thích.
13. [ ] Lúc đang Practice không thấy đáp án; sai lần 1 → "Not quite. Think about: …", ô rung nhẹ, được thử lại; sai lần 2 (hoặc bấm "Show answer") → hiện đáp án điền vào câu và đưa về box 1.
14. [ ] Lỗi lên box 3 trở lên → Practice dùng câu mới, khác câu trong bài.
15. [ ] Lỗi cũ (lưu trước khi có tính năng này) → bấm Practice thấy "Preparing your exercise…", sau đó có bài; mở lại thì không gọi AI lần nữa.
16. [ ] Ngắt mạng hoặc AI lỗi → vẫn có bài Practice dự phòng, kèm dòng "Simple practice (AI exercise not available)".

### Giao diện sửa lỗi + Practice không nhảy trang (GĐ 5)
17. [ ] Nộp bài có lỗi → phần Corrections: chỗ sai đỏ gạch ngang, chỗ sửa xanh có nền highlight; rê chuột (máy tính) hoặc chạm (điện thoại) thấy lý do.
18. [ ] Mục "Corrected essay" hiện bài đã sửa, chỗ sửa tô xanh, đúng số "N changes"; nút Copy cho ra văn bản sạch (không có HTML).
19. [ ] Không còn khối tóm tắt AI (band estimate, topic relevance, nhận xét) và "Improved essay", ở cả học sinh lẫn modal Marking. Mở một bài cũ đã chấm AI trước đây → vẫn hiện bình thường, không lỗi.
20. [ ] Bài gốc, Corrections và Corrected essay có **cùng cỡ chữ và giãn dòng**, giữ nguyên xuống dòng và đoạn văn. Kiểm tra ở 390px và ở dark mode.
21. [ ] Giáo viên mở bài trong Marking → thấy đủ các khối trên với cùng kiểu chữ và màu.
22. [ ] Error Notebook: cuộn xuống giữa trang → bấm Practice một thẻ → **trang không nhảy**. Check đúng, sai, thử lại, Show answer → thẻ vẫn ở nguyên chỗ. Bấm Close → danh sách sắp xếp lại, vị trí cuộn gần như giữ nguyên.
23. [ ] "Review all due" và "Practice this group" mở khung ở đầu danh sách; làm lần lượt nhiều lỗi mà trang không nhảy. "End review" đóng khung, giữ vị trí cuộn.
24. [ ] Sau khi AI chấm xong, ô **Your answer** chuyển thành bài có chỗ sai tô đỏ (gạch sóng) kèm số 1, 2, 3…; cùng số xuất hiện ở bài đánh dấu, danh sách lỗi và Corrected essay. Bấm vào một lỗi → hiện lý do và mọi chỗ cùng số được viền sáng.
25. [ ] **Admin → AI test**: dán một bài → Check with AI → sau 5–20 giây thấy dòng "model · thời gian · AI returned N, kept M, highlighted M", ô Your answer có highlight, Corrections, Corrected essay, Vocabulary và danh sách bài Practice. Firestore không có doc mới. Nếu báo lỗi: "GEMINI_KEY is not set" = chưa thêm biến/chưa deploy lại; "Gemini error (gemini 400/403)" = sai key; "404" = sai GEMINI_MODEL.
26. [ ] Nếu AI lỗi, học sinh thấy "Automatic correction is not available right now. Your answer is saved. (code: …)" và nút **Try again**; bấm lại chạy được. Chờ quá 30 giây thì câu báo đổi thành "Still checking…" (giới hạn 5 phút). Mã lỗi: `nokey` (chưa có GEMINI_KEY), `http403`/`http400` (sai key), `http404` (sai GEMINI_MODEL), `http429` (hết quota), `http5xx`/`timeout` (Gemini bận/chậm), `save` (không ghi được Firestore), `server` (lỗi server, xem Real-time logs).
27. [ ] (Nếu bị "User location is not supported") Làm theo README 3e. Mở link `/exec` thấy `{"ok":true}`. Admin → AI test chạy được và ghi "via Apps Script relay". Học sinh nộp bài → có kết quả AI. Sai `GEMINI_PROXY_SECRET` → báo `code: relay`.

## Giai đoạn 3 — Đổi email (chưa làm)
- [ ] Email cũ bị từ chối; email mới đăng nhập bằng **mật khẩu cũ**; XP, bài làm, flashcard còn nguyên.
