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

## GĐ 6 — Phần A: Kick + xem lại bài Writing
1. [ ] Admin → Users → **Kick** một học sinh test → modal ghi rõ hậu quả → bấm Kick → nút đổi thành "Kicking…" → có toast "… was kicked." và học sinh biến mất khỏi danh sách. Kiểm tra cả bản điện thoại (bảng dạng thẻ). Nếu báo "The server does not know this action yet…" thì bản deploy chưa có thư mục `functions/` mới nhất.
2. [ ] Change password, Edit class, Resume trong cùng bảng vẫn chạy.
3. [ ] Nộp bài Writing → quay lại Library hoặc Home → mở lại bài đó → thấy "Submitted on …", bài đã nộp (chỉ đọc, giữ xuống dòng, chỗ sai tô đỏ) cùng Corrections, Corrected essay, Vocabulary upgrades; **không** bị chấm AI lại (không tốn lượt).
4. [ ] Bấm **Write a new version** → ô soạn có sẵn bài cũ, có dòng "Back to my submission" → nộp → mở lại thấy bản mới nhất; Recent results vẫn còn bản cũ.
5. [ ] Mở lại ngay khi AI chưa chấm xong → "AI check in progress…" + nút **Check again** → bấm thì hiện kết quả.
6. [ ] Giáo viên chấm xong → học sinh mở lại thấy "Marked: Band …" và nút Open feedback. Bài homework đã quá hạn vẫn mở xem được nhưng không có nút viết lại.
7. [ ] Giáo viên mở bài Writing ở Library (Preview) → vẫn là ô soạn thảo như cũ.

## GĐ 6 — Phần B: giải thích tiếng Việt + Vocabulary upgrades
Chuẩn bị: deploy bản mới (có `functions/`). Không cần sửa Firebase rules hay biến môi trường.
1. [ ] Nộp bài Writing có lỗi (vd. "could accessing", "most highest", "18 percents") → bấm/chạm một chỗ sửa trong bài → popover nhỏ cạnh chữ: dòng trên là category (màu accent), dòng dưới là giải thích **tiếng Việt** ngắn, dễ hiểu (vd. "Sau could phải là V nguyên mẫu."). Không còn tooltip trình duyệt hay toast.
2. [ ] Popover đóng khi bấm ra ngoài, nhấn Esc, cuộn trang, hoặc bấm chỗ sửa khác (popover chuyển sang chỗ mới). Dùng phím Tab đến chỗ sửa rồi Enter cũng mở được.
3. [ ] Ở 390px: popover không tràn khỏi màn hình; chỗ sửa ở cuối màn hình thì popover hiện phía trên.
4. [ ] Danh sách lỗi dưới bài: số tròn · category · gạch đỏ → xanh, dòng dưới là giải thích tiếng Việt. Error Notebook (thẻ, Practice, "Not quite. Think about…") cũng tiếng Việt.
5. [ ] Bài cũ (chấm AI trước bản này) → vẫn hiện, giải thích bằng tiếng Anh, không lỗi.
6. [ ] Giáo viên mở bài trong Marking → giải thích tiếng Việt; rê chuột lên dòng giải thích thấy bản tiếng Anh.
7. [ ] Admin → AI test → kết quả cũng có popover và giải thích tiếng Việt.
8. [ ] Vocabulary upgrades: tiêu đề "VOCABULARY UPGRADES"; mỗi mục một hàng 2 cột (trái: từ gốc nhỏ + từ mới to, đậm; phải: câu ví dụ có cụm mới in đậm, ghi chú nghiêng, nút "+ Flashcard"). Bấm "+ Flashcard" → nút thành "Added ✓" và bị khóa; mở lại bài vẫn là "Added ✓". Trên điện thoại xếp 1 cột.
9. [ ] Kiểm tra dark mode cho popover và Vocabulary upgrades.

## GĐ 6 — Phần C: Leaderboard podium (XP + Streak)
1. [ ] Leaderboard → My class: top 3 là 3 thẻ theo thứ tự **2 | 1 | 3**; thẻ hạng 1 ở giữa cao hơn, viền màu accent, có bóng; huy hiệu số vàng/bạc/đồng ở góc trên trái.
2. [ ] Avatar hạng 1 to nhất, hạng 2 và 3 bằng nhau. Tên, danh hiệu (Achiever/Explorer/Learner…) và "1250 XP" cùng cỡ chữ, và dòng cuối của 3 thẻ nằm trên cùng một đường ngang.
3. [ ] Bảng XP không còn 🔥 và badge danh hiệu phụ (vd. "Grammar Nazi"); badge đó vẫn có trong Inventory.
4. [ ] Hạng 4 trở đi: số hạng · avatar nhỏ · tên + danh hiệu · "310 XP". Hàng của mình nền nhạt màu accent, viền accent, số hạng màu accent, có "(you)". Mình ở top 3 → thẻ podium có nền vàng nhạt và "(you)".
5. [ ] Bấm **Streak** → xếp theo streak, podium ghi "🔥 12 days", danh sách ghi "🔥 4". My class / Everyone vẫn chạy với cả 2 bảng. Tải lại trang (F5) → vẫn nhớ bảng Streak.
6. [ ] Lớp chỉ có 1–2 học sinh → chỉ hiện số thẻ có thật, hạng 1 vẫn ở giữa. Mình ngoài top 13 → có dòng "⋯" rồi hàng của mình.
7. [ ] 390px: 3 thẻ vẫn nằm cạnh nhau, tên dài bị cắt bằng "…", không tràn ngang; nút XP/Streak xuống dòng dưới các tab nếu thiếu chỗ. Dark mode: chữ và nền đọc rõ.

## Gemini fallback (chỉ model miễn phí)
1. [ ] Cloudflare → Variables and Secrets: nếu có `GEMINI_MODEL` = `gemini-2.5-flash` thì xóa (Preview + Production), rồi deploy lại.
2. [ ] Admin → AI test → dòng thống kê ghi `gemini-3.8-flash direct` (hoặc `… via Apps Script relay`). Nếu 3.8 đang bận, dòng này ghi `gemini-3.6-flash` hoặc `gemini-3.5-flash-lite`: đó là fallback đang chạy.
3. [ ] Cloudflare → Functions → Real-time logs: khi một model bận thấy `[gemini] failed gemini-3.8-flash http503 …`, ngay sau đó là model kế tiếp.
4. [ ] Khi cả 3 model đều bận, học sinh thấy "The AI is very busy right now. Your answer is saved. Try again in a few minutes. (code: http503)" và nút Try again.
5. [ ] Google AI Studio → project của key: **chưa bật billing** (Free Tier) để không bao giờ bị tính tiền.

## Kick giáo viên/học sinh + Recent results kiểu cũ
1. [ ] Admin → Users: mọi học sinh và giáo viên (trừ Admin) có **Change password** và **Kick**. Change password chạy cho cả học sinh lẫn giáo viên.
2. [ ] Kick một giáo viên do admin thêm → modal "Kick this teacher?" → Kick → giáo viên biến mất khỏi Users và Teachers, không đăng nhập được nữa. Thêm lại ở Admin → Teachers → đăng nhập được.
3. [ ] Kick giáo viên có trong biến `TEACHERS` → dòng đó hiện "Removed" + nút Resume (muốn xóa hẳn thì bỏ email khỏi `TEACHERS` trên Cloudflare). Resume + Change password → đăng nhập lại được.
4. [ ] Kick học sinh → biến mất; tên hiện lại ở form đăng ký (đúng lớp trong Sheet); đăng ký lại bằng tên đó → vào được.
5. [ ] Home → khung "RECENT RESULTS BY SKILL" giống ảnh mẫu: ô gọn, icon nhỏ, % Listening/Reading xanh hoặc đỏ, band Writing màu accent, ô Speaking trống có khung nét đứt, dòng LATEST: tên bài bên trái, điểm + ngày bên phải. Kiểm tra cả 390px và dark mode.

## Writing: xem lại theo phiên bản
1. [ ] Bài mới nộp 1 lần → không có ô Version. Bấm Write a new version, nộp thêm → mở lại thấy ô **Version** ở đầu: "Version 2 (latest) · ngày giờ · …", "Version 1 · …".
2. [ ] Chọn Version 1 → hiện đúng bài cũ, điểm và kết quả AI của bản đó, kèm dòng "You are viewing an older version". Không gọi AI lại.
3. [ ] Đang xem Version 1 → Write a new version → ô soạn có sẵn bài của Version 1 → nộp → mở lại thấy bản mới nhất được chọn sẵn.
4. [ ] Mở bài khác rồi quay lại → mặc định là bản mới nhất. Kiểm tra ô Version ở 390px (không tràn ngang) và dark mode.

## Admin phản hồi ngay + Recent results 2×2
1. [ ] Admin → Users: dòng đếm ghi "… accounts · server 2026-10-19d". Nếu thấy banner "This site still runs an older server" → chưa deploy thư mục `functions/` mới.
2. [ ] Change password cho 1 học sinh và 1 giáo viên → modal đóng ngay khi lưu xong, có toast; đăng nhập bằng mật khẩu mới được.
3. [ ] Kick 1 học sinh → modal đóng ngay, học sinh biến mất ngay khỏi danh sách (không cần tải lại). Trang đăng ký → tên học sinh đó **vẫn còn** trong lớp → đăng ký lại được (kể cả học sinh do giáo viên thêm bằng CSV có email).
4. [ ] Làm bước 2–3 trên điện thoại (390px): bảng Users thành thẻ, nút không tràn, bấm dễ.
5. [ ] Home → Recent results by skill: 4 ô xếp **2×2**, ô khá vuông, biểu đồ cột như ảnh mẫu, ở cả máy tính và điện thoại.

## Library dạng thẻ Test
1. [ ] Home (học sinh) → Library → bấm một sách → mỗi Test là một thẻ: mũi tên, "Test 1" + số bài, thanh tiến độ và %. Bấm thẻ → mở (viền accent, mũi tên xoay), bấm lại → đóng.
2. [ ] Trong thẻ: 4 tab Listening / Reading / Writing / Speaking có số bài; tab không có bài bị mờ. Mỗi bài có icon theo màu kỹ năng, tên, mô tả nhỏ và % (hoặc Band / Not started / Locked) bên phải; bấm vào mở bài.
3. [ ] Giáo viên: không có thanh %; bài tự tạo có nút Sửa / Xóa; tab trống có "+ Add exercise" mở tab Create.
4. [ ] 390px và dark mode: thanh tab cuộn ngang được, không tràn trang.

## Chỉnh Library + Recent results
1. [ ] Library → mở một Test: tiêu đề "Test 1" to hơn, không còn dòng "8 exercises"; chữ trên tab Listening/Reading/… to và rõ.
2. [ ] Học sinh: mỗi bài bên phải ghi % (chưa làm = 0%, làm xong 100% màu xanh). Giáo viên **và Admin**: mỗi bài có icon Sửa và Xóa; bấm Xóa → "Delete?" (bấm lần nữa để xóa, sau 4 giây tự trở lại icon) (bài có sẵn thì icon mờ, rê chuột thấy "Built-in exercise…").
3. [ ] Recent results by skill: 4 ô 2×2 trải hết chiều ngang trang, ô gần vuông, biểu đồ cao theo ô; dưới tên Listening/Reading/Writing/Speaking không còn dòng thống kê.
4. [ ] Kiểm tra 390px (4 ô vuông nhỏ, chữ không tràn) và dark mode.

## Library trên điện thoại + chỉnh nhỏ
1. [ ] **Điện thoại**: Home → Library → chọn sách → thấy các thẻ Test; mở Test → 4 tab kỹ năng vừa một hàng (không cần cuộn), danh sách bài đọc rõ, không tràn ngang. Lưới sách 2 cột.
2. [ ] Tab Listening/Reading/Writing/Speaking không còn số đếm.
3. [ ] Homework: mỗi bài chỉ hiện tên bài, không còn dòng nhỏ "Cam 14 · Test 1 · …".
4. [ ] Nút Dark mode và Sign out ở góc trên: không còn viền, rê chuột thì có nền nhạt. Trên điện thoại vẫn hiện icon ☾ và ⎋.
5. [ ] Recent results trên máy tính: tên kỹ năng to hơn, biểu đồ thấp hơn và nằm sát dòng LATEST, ô thấp hơn trước một chút nhưng vẫn gần vuông.

## Kết quả AI dễ đọc hơn
1. [ ] Nộp bài Writing → các tiêu đề "Corrections", "Corrected essay", "Vocabulary upgrades" to, đậm, có gạch dưới.
2. [ ] Mỗi lỗi trong danh sách 3 dòng: (số) tên loại lỗi / lỗi gốc → sửa / giải thích. Cỡ chữ ngang phần Vocabulary upgrades.
3. [ ] Giống vậy ở Open feedback, modal Marking của giáo viên và Admin → AI test. Kiểm tra 390px và dark mode.

## GĐ 7 — Phần A: ghi âm Speaking (dùng tài khoản test)
1. [ ] Học sinh mở bài Speaking → mỗi Part có khung **● Record** (Part 1, Part 2: tối đa 3:00). Bấm Record → trình duyệt hỏi quyền micro → cho phép → chấm đỏ nhấp nháy, đồng hồ `0:10 / 3:00`, thanh âm lượng nhảy → **■ Stop** → nghe lại → **Use this recording** → "Uploading… %" → "Saved ✓". Nút Submit bật lên → Submit.
   - [ ] Chrome máy tính · [ ] Chrome Android · [ ] Safari iPhone
2. [ ] Ghi tới hết thời gian tối đa → tự dừng. Re-record → ghi lại được.
3. [ ] Chặn quyền micro (biểu tượng ổ khóa trên thanh địa chỉ) → bấm Record → câu "Microphone is blocked…" kèm hướng dẫn iPhone. Mục "Recording does not work? Paste a Vocaroo link instead" vẫn dùng được để nộp.
4. [ ] Đang ghi mà chuyển tab khác của app (hoặc bấm Back) → hỏi xác nhận nếu có bản ghi chưa lưu; ghi âm dừng, micro tắt (biểu tượng micro trên trình duyệt biến mất).
5. [ ] Ngắt mạng rồi bấm Use this recording → báo lỗi + nút **Retry**; bật mạng → Retry → Saved ✓ (không phải ghi lại).
6. [ ] Mở lại bài Speaking đã nộp → "Submitted on …", nghe được từng Part và **tua được** (thử trên iPhone). Nộp thêm bằng **Record a new version** → có dropdown Version.
7. [ ] Giáo viên mở bài trong Marking → thấy trình phát "Part 1", "Part 2". Bài cũ (link Vocaroo) vẫn hiện trình phát Vocaroo.
8. [ ] Mở `https://<site>/api/audio/<id>` của một bản ghi → phát được. Học sinh upload quá 20 file trong 1 giờ (cùng mạng) → "Too many uploads from this network. Try again in an hour."
9. [ ] Đăng nhập student / teacher / admin, AI chấm Writing, Error Notebook vẫn chạy như trước.

## Tự tạo bài Listening 5 giai đoạn
1. [ ] Giáo viên → Create → Listening → 5-stage lesson → thấy thẻ "Auto-create a 5-stage lesson (AI)" ở trên cùng. Chọn Reading thì thẻ ẩn đi.
2. [ ] Dán transcript (có thể thêm câu hỏi + đáp án gốc), nhập Title → **Generate** → "Writing the lesson…" → sau 20–60 giây ô JSON ở bước 2 được điền, preview hiện đủ 5 giai đoạn → chọn Book, Test → Add → học sinh mở bài làm được đủ 5 giai đoạn.
3. [ ] Nếu preview báo lỗi (AI viết thiếu/sai) → bấm **Try again**, hoặc sửa JSON ở bước 2 rồi Check format.
4. [ ] Tải lại trang → transcript và câu hỏi vẫn còn (nháp). Cách cũ: Copy prompt + dán JSON vẫn chạy.
5. [ ] Phiên đăng nhập quá 12 giờ → bấm Generate → hiện ô "Enter your password to continue" → nhập đúng → tạo bài tiếp được.

## GĐ 7 — Phần B: Voice feedback + audio bài nghe + phiên âm
1. [ ] Giáo viên mở một bài (Writing hoặc Speaking) trong Marking → khung "Voice feedback" → Record → Stop → Use this recording → Saved ✓ → Save grade. Bấm Save khi chưa "Use this recording" → báo nhắc.
2. [ ] Học sinh mở lại bài đó (hoặc Open feedback ở Recent results) → thấy trình phát "Teacher's voice feedback", nghe được.
3. [ ] Mở lại bài đã chấm trong Marking → bản ghi cũ vẫn hiện (Saved ✓); Re-record rồi Save mà không ghi lại → học sinh không còn thấy voice feedback.
4. [ ] Create → Listening → khung **Audio** → Upload a file (mp3) → Use this recording → Saved ✓. Nếu ô JSON ở bước 2 đang có bài Listening → `audio_url` tự đổi thành `/api/audio/…`. Add → học sinh mở bài nghe được audio, tua ±5 giây được.
5. [ ] Trong thẻ Auto-create → **Transcribe from audio (AI)** → sau ≤ 1 phút ô Transcript được điền (có nhãn MAN:/WOMAN: hoặc tên). Sửa lại nếu cần → Generate → preview → Add → bài có cả audio lẫn 5 giai đoạn.
6. [ ] File ghi âm từ trình duyệt (webm/m4a) mà Transcribe báo lỗi http400 → thử lại với file mp3/wav.
7. [ ] Gọi `/api/ai/transcribe` hoặc `/api/ai/lesson` không có đăng nhập giáo viên → bị từ chối (401).

## Sidebar, phân quyền, Dashboard/Library mới, Daily mới
1. [ ] Đăng nhập **admin** → menu dọc bên trái: Dashboard, Classes, Marking, Library, Create, Prizes, Admin; mở sẵn Dashboard. Admin → có tab con **Students** (khung CSV / danh sách lớp hiện bên dưới) và **XP** (các ô điểm thẳng hàng, Save chạy).
2. [ ] Đăng nhập **giáo viên** có tên trùng cột "Giáo viên" trong Sheet (vd. Sheet ghi "Cô Nhi", admin đặt tên giáo viên "Nhi" hoặc "Cô Nhi") → menu: Classes, Marking, Dashboard, Library; chỉ thấy lớp, bài nộp và số liệu của lớp mình. Giáo viên có tên không khớp → thấy mọi lớp kèm dòng nhắc màu vàng.
3. [ ] Học sinh → menu dọc giống các tab cũ, Library vẫn dạng ô cũ có %.
4. [ ] Dashboard → Overview: vòng tròn %, biểu đồ đường theo tuần, bảng Classes, Hardest exercises đánh số, Homework. Students: bảng có avatar chữ, bấm một dòng → thẻ chi tiết. Mistakes: 3 thẻ Hardest skill/test/exercise, lưới ô màu theo dạng câu hỏi.
5. [ ] Library (GV/admin): các bìa sách màu, sách chưa có bài màu xám; bấm bìa → hiện các Test như trước.
6. [ ] Create: chỉ còn Audio, Auto-create, Book/Test và Preview; Generate → preview → Add vẫn chạy (cả gắn audio).
7. [ ] Home học sinh: Daily practice có đúng 2 bài + "Daily Review" (khi có thẻ đến hạn) + "Error review" (khi có lỗi đến hạn). Hôm sau 2 bài đổi. Thử Read aloud / Speaking Part 1 / Part 3: Record → Stop → nghe lại → Finish (+XP); không có "Use this recording". Dictation và Gap-fill dictation: Play → gõ → Check → Finish.
8. [ ] Home: không còn dòng "… XP · … to Explorer"; chip "HW SUN 25.10" to hơn; bài chưa làm ghi "Waiting".
9. [ ] Flashcards (cả tab Flashcards và Home → Daily Review): bấm Got it / Forgot, Backspace 1 lần (Got it), 2 lần nhanh (Forgot) → chuyển thẻ ngay, kể cả khi mạng chập chờn.
10. [ ] Điện thoại 390px: Dashboard 1 cột, bìa sách 3 cột, ô XP không tràn. Dark mode đọc rõ.
11. [ ] Laptop (≥1024px): bấm ☰ → sidebar thu vào, nội dung giãn ra hết chiều ngang; bấm lại → mở ra. Tải lại trang (F5) và chuyển tab → vẫn giữ trạng thái đã chọn.
12. [ ] Điện thoại/tablet (<1024px): mở trang thì sidebar đóng; ☰ → menu trượt ra đè lên nội dung, có nền mờ, trang phía sau không cuộn được; đóng được bằng bấm nền mờ, nút ×, phím Esc, hoặc chọn một mục.
13. [ ] 390px và ≥1280px, sáng/tối: không tràn ngang khi mở/đóng sidebar; thanh audio dính ở bài Listening vẫn đúng chỗ.

## GĐ 8 — Reading nhiều giai đoạn (Phần A)
1. [ ] Demo (`demo: true`) → học sinh → Library → Cam 14 → Test 1 → Reading → "Cycling in the City" → làm đủ 4 stage; dưới 70% thì phải bấm Try again; xong có thẻ tổng kết; Home → Recent results ô Reading có bài này. **Nhớ đổi lại `demo: false`.**
2. [ ] Stage 3.1 (Guess the meaning) và 3.2 (paraphrase) trông như thẻ Vocabulary/thẻ chọn của bài Listening: chọn bằng radio, sau Check có thẻ từ (word family, collocation, e.g.) và nút "Save these words to Flashcards".
3. [ ] Stage 4.1: kéo thả chạy bằng **chuột, trên iPhone và trên Android**; chạm chip rồi chạm chỗ trống cũng được; Tab + Enter cũng được; thả vào chỗ đã có từ thì đổi chỗ; kéo từ ra ngoài hoặc bấm × thì trả về bank; trang không cuộn khi đang kéo.
4. [ ] Stage 4.2: tiêu đề là câu hỏi ("Should your city spend more on cycling lanes?"); hiện đủ các từ Stage 3; chưa đủ 6 từ hoặc chưa dùng 2 từ thì nút Finish lesson mờ và có lý do. Giáo viên → Dashboard › Students → bấm học sinh → thấy câu trả lời dưới bài "Cycling in the City".

## GĐ 8 — Create theo kỹ năng + AI tạo bài Reading (Phần B)
Chuẩn bị: deploy bản mới (có `functions/`); Admin → Users ghi "server 2026-10-21a".
5. [ ] Create có 4 tab Listening / Reading / Writing / Speaking. Listening vẫn có Audio + Auto-create như trước; Writing và Speaking ghi "coming soon". Chuyển qua lại giữa các tab không mất bài đã Generate của tab kia; tải lại trang thì vẫn mở đúng tab.
6. [ ] Tab Reading → dán một bài đọc (đoạn cách nhau bằng dòng trống) → thấy số từ, số đoạn (dán 2 đoạn, >12 đoạn hoặc >1200 từ thì có cảnh báo) → Generate → "Generating…" (bài dài: sau 40 giây hiện "Still writing…", giới hạn 5 phút) → preview 4 stage → chọn Book/Test → Add → học sinh làm được. Từ ở Guess the meaning không phải thuật ngữ hay tên riêng.
7. [ ] Bài đọc trong bài học luôn giống hệt bài đã dán (không còn lỗi "The AI changed the wording of the passage"); thử bài 8–12 đoạn, có dấu nháy cong ’ và gạch –. Đại từ được tô đúng chỗ (không tô chữ "it" nằm trong "with"). Nếu AI thiếu nội dung (vd. ít câu tóm tắt hơn số đoạn) → preview ghi rõ lý do + "Press Try again".
7b. [ ] Sau khi Generate → bấm **Student View Preview** → bấm thẳng vào từng stage trên thanh stage (Deep reading / Pronouns / Vocabulary / Output) để xem toàn bộ bài; Check answers khi chưa làm hết vẫn hiện đáp án; không bị chặn 70%; "Try this stage again" làm lại được. Làm thử được đủ 4 stage giống học sinh (chọn tóm tắt, đại từ, kéo thả Stage 4.1, câu trả lời 4.2), cuối có thẻ tổng kết + "Start the preview again"; không có bài nào bị lưu (Dashboard không có lượt làm mới). Bấm Summary View rồi Student View lại thì bắt đầu lại từ Stage 1.
8. [ ] Advanced → Copy prompt → dán vào ChatGPT/Claude kèm bài đọc → dán JSON trả về → Check JSON → preview → Add vẫn chạy.
9. [ ] Phiên giáo viên quá 12 giờ → Generate hỏi lại mật khẩu, nhập đúng thì chạy tiếp.

## GĐ 8 — Giao diện Listening + Reading (Phần C)
10. [ ] Listening và Reading ở 390px và ≥1280px: không tràn ngang; chữ bài đọc/transcript to và thoáng như nhau; ô chọn đáp án là các ô có viền, cao, dễ bấm, cách nhau rõ.
11. [ ] Cuộn xuống trong một stage → thanh stage dính ở đầu màn hình, stage hiện tại đậm; bài Listening có thanh audio dính ngay dưới, không bị che. Điện thoại: thanh stage chia đều một hàng (tên dài bị rút gọn "…").
12. [ ] Điện thoại: nút Check answers / Next / Finish rộng hết màn hình, dính ở đáy, không bị thanh Home của iPhone che. Chọn một đáp án thì trang không nhảy; bấm Next thì về đầu stage mới.
13. [ ] Dark mode: thẻ từ sau Vocabulary và dòng giải thích (chữ màu xanh) đọc rõ; đúng/sai có ✓ / ✗ chứ không chỉ khác màu. Site thật không còn "Demo helper" ở bài Listening.

## Sign out, chữ thừa, màu dark mode
1. [ ] Đăng nhập student, teacher và admin: góc phải header có "Sign out" (điện thoại: icon ⎋); cuối sidebar/drawer cũng có "⎋ Sign out". Trang đăng nhập không có nút này. Bấm → về trang đăng nhập ngay. Đang ghi âm hoặc đang viết bài Writing chưa nộp → hỏi xác nhận; Cancel thì ở lại.
2. [ ] Home → Daily Speaking Part 1/3: không còn chip "DAILY", dòng "Answer the question out loud…" và nhãn "YOUR ANSWER (MAX 1:00)"; nút Record vẫn ghi "Max 1:00". Giáo viên mở bài Listening 5 giai đoạn: không còn banner "Preview mode…", dòng "(Demo plays a test tone…)" và "Demo tone only…"; không có khoảng trống thừa ở các chỗ đó; giáo viên làm thử vẫn không lưu bài.
3. [ ] Dark mode: Home, Daily task, Listening 5 giai đoạn, Reading, kết quả AI Writing, Error Notebook, Leaderboard, Admin, trang đăng nhập đều dễ đọc; chip/banner vàng trông ấm và trong (không ô liu đục); ô điền chỗ trống (Dictation, Summary, Reading 4.1, Error Notebook) nền xám xanh + gạch dưới màu xanh, không còn nền vàng; khối lồng trong khối (câu hỏi, trình phát, ô ghi âm) phân biệt rõ với nền thẻ; nút mờ (Finish chưa bật) vẫn đọc được; nút đỏ "Delete"/"Clear All" chữ rõ.

## GĐ 9 — Phần A: sửa UI nhỏ
1. [ ] Dark mode → nộp bài Writing có lỗi → bấm một chỗ sửa: popover nổi hẳn lên khỏi nền (nền sáng hơn, viền rõ, bóng đậm), category màu xanh, chữ giải thích trắng dễ đọc. Popup từ vựng (nhấp đúp một từ) và bảng chọn đáp án của bài Reading cũng nổi rõ như vậy.
2. [ ] Home → Recent results: không còn cột viền đứt nét cho bài Writing/Speaking chưa chấm; ô chỉ có bài chưa chấm vẫn có đường kẻ đáy.
3. [ ] Trong cùng một hàng (2 ô cạnh nhau): đường kẻ đáy biểu đồ, chữ LATEST và dòng tên bài/điểm nằm trên cùng một đường ngang, kể cả khi một ô có feedback dài; kiểm tra máy tính, 390px, sáng và tối.
4. [ ] Học sinh → Settings: Display name, Phone, Target band, Exam date cùng kiểu nhãn, cùng chiều cao 44px, thẳng mép trên và mép dưới (2 cột trên laptop, 1 cột trên điện thoại); ô ngày trên iPhone cao bằng các ô khác; mũi tên của Target band và biểu tượng lịch nhìn rõ ở dark mode.
5. [ ] Admin → Prizes → Rank frames: dưới 6 ô upload có "Live Avatar Preview" (avatar to + nhỏ). Bấm từng rank → khung của rank đó hiện lên avatar; rank chưa có PNG ghi "No frame uploaded…" kèm vòng màu. Upload PNG mới → preview đổi ngay. Kiểm tra 390px và dark mode.

## GĐ 9 — Phần B: Demo helper (giáo viên / admin)
1. [ ] Đăng nhập học sinh (cả bản thật lẫn demo `minhanh@demo.vn`): mở một bài thường, một bài Listening 5 giai đoạn, một bài Reading nhiều giai đoạn → **không** có dòng "Demo helper" ở đâu cả.
2. [ ] Đăng nhập giáo viên hoặc admin → Library → mở một bài Reading/Listening thường (gap, chọn đáp án, True/False/Not Given, ghép): có dòng chữ nhỏ "Demo helper" + 2 nút **All correct**, **Half wrong** (không còn "All wrong"). All correct → Submit = 100%. Half wrong → khoảng một nửa đúng (làm tròn lên), câu sai là đáp án sai thật (chọn phương án khác, ô chữ điền một từ khác). Sau Submit thanh Demo helper biến mất.
3. [ ] Bài Listening 5 giai đoạn: ở mỗi stage bấm All correct → Check answers đạt hết; Half wrong → khoảng một nửa sai, Stage 2.1 tô sai chỗ, các ô điền là từ khác chứ không phải "zzz".
4. [ ] Bài Reading nhiều giai đoạn (Library và Student View Preview ở Create): mỗi stage hai nút điền đúng phần đang hiện; Stage 4.1 Half wrong → các từ đặt sai chỗ, không từ nào xuất hiện 2 lần; 4.2 được điền sẵn câu mẫu để Finish.
5. [ ] Create → preview bài thường và preview Listening 5 giai đoạn: có Demo helper, bấm xong Submit/Check answers ra kết quả tương ứng.
6. [ ] Giáo viên làm thử xong: không có bài mới trong Dashboard/Marking, XP không đổi.

## GĐ 9 — Phần C: Reading Deep reading + đồng hồ + AI mới
1. [ ] Học sinh mở bài Reading nhiều giai đoạn (demo: Cam 14 · Test 1 · Reading · "Cycling in the City"): đồng hồ `00:00` ở **góc phải thẻ tiêu đề** tự chạy ngay. Bấm ⏸ → dừng, bấm ▶ → chạy tiếp. Không còn nút "Start reading timer".
2. [ ] Rời bài (mở tab khác trong app) rồi mở lại cùng bài: đồng hồ chạy tiếp từ số cũ. Điện thoại 390px: đồng hồ vẫn ở góc phải, tên bài dài tự xuống dòng, không đè lên đồng hồ.
3. [ ] Thanh stage: **1. Deep reading · 2. Pronouns · 3. Vocabulary · 4. Output**. Không còn phần "Put the paragraphs in order".
4. [ ] Stage 1 trên laptop: bài đọc có nhãn Paragraph A, B, C… ở cột trái, **dính khi cuộn**; câu hỏi ở cột phải. Điện thoại: nút "Show passage" mở/đóng bài đọc.
5. [ ] 1.1 Completion: ghi "NO MORE THAN TWO WORDS…", ô nhập nằm trong câu; gõ 3 từ → dưới ô báo "No more than two words…" ngay. Đáp án viết hoa / có dấu chấm / thừa khoảng trắng vẫn được chấm đúng.
6. [ ] 1.2 True / False / Not Given: 3 nút TRUE / FALSE / NOT GIVEN mỗi câu.
7. [ ] 1.3 Matching headings: khung "List of Headings" đánh số i, ii, iii…; đúng 3 đoạn (vd. Paragraph B, A, C) theo dễ → khó; chọn heading bằng bottom sheet; heading đã chọn cho đoạn khác ghi "Used in Paragraph …".
8. [ ] 1.4 Matching information: mỗi câu chọn một đoạn (Paragraph A…) hoặc một tên (Copenhagen / Critics / experts).
9. [ ] Đúng dưới 70% cả stage 1 → Try again như cũ; đạt → sang Pronouns. Stage 2–4 như trước.
10. [ ] Finish → thẻ tổng kết có "Reading time m:ss · ~N words/min"; đồng hồ dừng.
11. [ ] Bài Reading cũ (demo: "Cycling in the City (old format)") vẫn mở được: Stage 1 tên "Deep reading", phần "Matching headings" với các câu tóm tắt cũ, không có phần sắp thứ tự, không lỗi.
12. [ ] Create → Reading → dán bài → Generate (site thật): preview liệt kê đủ 4 phần Deep reading; Student View Preview mở được cả 4 stage và 4 phần con. Nếu có mục bị bỏ, khung viền cam "Fixed or left out automatically" ghi lý do.
13. [ ] Create → Advanced → dán JSON có Matching headings chỉ 2 đoạn (hoặc đáp án không nằm trong List of Headings) → Check JSON → báo lỗi dễ hiểu, không cho Add.
14. [ ] Giáo viên / admin: Demo helper All correct / Half wrong điền được cả 4 phần của Deep reading.

## GĐ 9 — Phần D: XP / Rank / Season
1. [ ] Học sinh: trong cùng một tuần làm 3 bài Reading đạt ≥70% → toast +25, rồi +18, rồi +13 XP; bài thứ 4, 5 → +8. Sau đó làm một bài Listening đạt → +25 (tính riêng). Listening 5 giai đoạn đạt → +40.
2. [ ] Một bài dưới 70% → +5 XP; bấm Try again rồi lại dưới 70% ở cùng bài → không cộng thêm (mỗi bài 1 lần/tuần). Bài dưới 70% không làm giảm mức của bài đạt tiếp theo.
3. [ ] Nộp Writing → +30; nộp bản mới (Write a new version) → +21. Speaking tương tự, đếm riêng.
4. [ ] Sang tuần mới (thứ Hai; hoặc đổi ngày máy) → bài Reading đạt đầu tiên lại +25.
5. [ ] Hoàn thành 100% bài tuần → "I'm done" → +50 XP một lần; bấm lại / bài giao khác cùng tuần → không cộng thêm.
6. [ ] Error Notebook: sửa đúng một lỗi → +5; Practice lại chính lỗi đó trong ngày (đúng lần nữa) → không cộng; hôm sau → +5 lại. Sai rồi đúng trong cùng ngày vẫn được +5.
7. [ ] Rank hiện dạng "Explorer II" ở Home, Leaderboard (podium + danh sách), Inventory, Settings. Kiểm mốc: 369 XP = Beginner I, 370 = Learner III, 760 = Learner I, 1010 = Explorer III, 7890 trở lên = Master I, thanh đầy. Khung avatar vẫn đổi theo rank (6 khung), không theo bậc.
8. [ ] Admin → XP: nhóm Exercises có ô "25, 18, 13, 8" và ô "under 70%". Gõ "30, 20, 10" → Save → bài Reading đạt lần 1/2/3/4 = 30/20/10/10. Gõ chữ sai (vd. "abc") → báo lỗi, không lưu.
9. [ ] Admin → Season (dùng demo hoặc tài khoản test): thấy mùa hiện tại (hoặc "No season has been started yet"). Preview reset → bảng tên → rank hiện tại → rank mùa mới (Explorer → Learner I 760, Learner → Beginner I 220, Beginner → 0) và số học sinh đổi rank so với bảng cũ.
10. [ ] Start new season → nhập id (vd. 2027-S1), gõ RESET → Start. Học sinh Explorer về Learner I 760 XP; Leaderboard XP dùng XP mới; bảng Streak không đổi. Settings học sinh có chip "S1 · Explorer II" (rank cao nhất mùa cũ) và Lifetime XP không giảm.
11. [ ] Start lại với cùng id → "0 students reset, N already done", XP không đổi thêm. Gõ sai chữ RESET → báo lỗi, không làm gì.
12. [ ] (Site thật) Một học sinh đang mở app lúc reset: sau reset làm một bài → XP hiện là XP mùa mới (cộng thêm), không quay về XP cũ của mùa trước; tải lại trang vẫn đúng.

## Bảo mật (10/2026)
Làm trên bản Preview sau khi đã deploy (cả `functions/` và file `_headers`) và đã dán `firestore.rules` mới vào Firebase Console.
1. [ ] Mở site, bấm F12 → Console: **không có** dòng đỏ "Refused to load / Refused to connect … Content Security Policy". Đăng nhập, mở Library, Leaderboard, Wheel, Settings, Create, Admin đều chạy như trước; font Be Vietnam Pro vẫn hiện.
2. [ ] Học sinh nộp bài Writing → AI chấm như cũ (không báo "code: auth"). Error Notebook → Practice một lỗi chưa có bài luyện → bài luyện hiện ra.
3. [ ] Học sinh ghi âm Speaking → "Use this recording" → upload xong, nộp được. Giáo viên ghi voice feedback / audio bài Listening vẫn chạy.
4. [ ] Học sinh làm bài, quay Wheel, dùng Streak Freeze / Answer Peek, sửa Settings, đánh dấu flashcard: không có lỗi; tải lại trang, XP / spin / vật phẩm vẫn đúng (rules mới không chặn việc bình thường).
5. [ ] Bảng Leaderboard và avatar vẫn hiện ảnh; ảnh bìa lớp, sticker chấm bài, icon quà, khung rank vẫn hiện.
6. [ ] Form cũ "Reset a student password" (Admin › Students): đổi mật khẩu một học sinh được; nhập email giáo viên → báo "Only student passwords can be reset here…".
7. [ ] (Tùy chọn, kiểm tra chặn) Mở site trong một trang web khác bằng `<iframe>` → trình duyệt từ chối hiển thị.

## Icon site + Daily practice dạng thẻ dọc
1. [ ] Tab trình duyệt hiện logo xanh (favicon) thay cho icon mặc định, cả ở chế độ sáng và tối của trình duyệt.
2. [ ] iPhone (Safari): Chia sẻ → "Thêm vào MH chính": icon là logo xanh trên nền trắng, tên "Mini Drills". Mở từ màn hình chính: app chạy toàn màn hình, đăng nhập vẫn được.
3. [ ] Android (Chrome): menu ⋮ → "Thêm vào màn hình chính" / "Cài đặt ứng dụng": icon logo, tên "Mini Drills", mở toàn màn hình.
4. [ ] Học sinh → Home → Daily practice: mỗi bài là một thẻ rộng hết khung, xếp dọc: icon tròn bên trái, tên in đậm + dòng phụ (vd. "Word of the Day" / "Daily vocabulary", "Error review" / "N due"), bên phải "Start ›".
5. [ ] Làm xong một bài Daily → quay về Home: thẻ đó chuyển nền xanh lá nhạt, icon thành dấu tích, chữ xanh lá, bên phải "Done". Kiểm tra sáng, tối và 390px.

## Master spec — đợt 01
1. [ ] Admin → XP: mọi dòng (cả dòng "25, 18, 13, 8" lẫn dòng số "5") có ô nhập thẳng một cột, chữ "XP · default …" bắt đầu cùng một vị trí. 390px: ô nhập bên phải, "XP · default" xuống dòng dưới.
2. [ ] Classes → New assignment: chọn Send date là thứ Tư → Deadline tự thành Chủ nhật cùng tuần; chọn đúng Chủ nhật → Deadline là chính ngày đó. Sửa tay Deadline sau đó vẫn được và vẫn lưu đúng.
3. [ ] Create: khu "Book and test" chỉ còn tiêu đề + 2 ô chọn to (Cam 14, Test 1) trên một hàng, không còn câu "The new exercise…" và nhãn BOOK/TEST. Add vẫn thêm đúng sách/test đã chọn.
4. [ ] Prizes → Item pictures và Rank frames: không còn nút "Choose image"; rê chuột vào ảnh thấy mờ + biểu tượng bút, bấm ảnh mở chọn file, chọn xong ảnh đổi ngay. Không còn dòng mô tả dưới "Rank frames". Bấm avatar lớn ở Live Avatar Preview → upload khung của rank đang chọn.
5. [ ] Bài Reading (học sinh và Student View Preview): thanh stage + đồng hồ ở góc phải + Demo helper (giáo viên) luôn nằm trên cùng khi cuộn. Stage 1: mỗi phần 1.1, 1.2… là một card riêng.
6. [ ] Laptop: bài đọc bên trái đứng yên khi cuộn câu hỏi bên phải. Điện thoại (390px): bài đọc nửa trên, câu hỏi nửa dưới, kéo từng nửa riêng; nút Check answers vẫn ở đáy màn hình.

## Master spec — đợt 02
1. [ ] Admin → Google Sheet: 2 cột. Trái "Connection" (Connected, ô link mờ không sửa được cho tới khi bấm vào, Save & check, Refresh now, "Last read … · every 5 min", Unlink đỏ). Phải "Registration" (X of Y students registered) + thẻ từng lớp có pill "N pending"/"All registered", thanh tiến độ, "a of b registered". Bấm thẻ → hiện tên chưa đăng ký và đã đăng ký; bấm lần nữa → thu gọn. 390px: tất cả 1 cột.
2. [ ] Save & check (đổi link), Refresh now, Unlink vẫn chạy như trước.
3. [ ] Prizes → Rank frames → Live Avatar Preview: kéo Scale / Offset X / Offset Y → khung trên avatar to/nhỏ, dịch trái/phải, lên/xuống ngay. Reset → về mặc định. Save frame settings → tải lại trang vẫn giữ; đổi sang rank khác chỉnh riêng được.
4. [ ] Học sinh → Leaderboard: khung PNG đúng rank của từng người, ở podium và danh sách dưới, đúng Scale/Offset vừa lưu; cánh/vương miện thò ra ngoài không bị cắt.
5. [ ] Admin → Users → "Add a tester account": tên, email (vd. tester@gmail.com), lớp, mật khẩu → Create tester → dòng mới có pill "Tester". Đăng nhập bằng tài khoản đó: làm bài, nhận XP, thấy giao diện học sinh bình thường.
6. [ ] Tài khoản tester không có trong: Classes (thẻ lớp và danh sách), Admin → Students, Dashboard (số liệu không đổi), Leaderboard của học sinh khác. Tester tự xem Leaderboard vẫn thấy dòng của mình.
7. [ ] Nút "Tester: on/off" ở một học sinh thường → học sinh đó ẩn/hiện lại đúng như trên.

## Master spec — đợt 03
1. [ ] Create: trên cùng là "Pick a free slot": tab kỹ năng → ô chọn sách + 4 nút Test 1–4 cùng hàng → một hàng Part 1–4 (Reading: Passage 1–3, Writing: Task 1–2, Speaking: Part 1–3). Slot trống ghi "+ Add here", slot có bài ghi tên bài (dài thì "…"), slot đang chọn viền xanh. Không còn khu "Book and test" ở cuối.
2. [ ] Chọn slot đã có bài → khung vàng "Part N is taken by …". Gõ Title trùng tên bài khác cùng sách → "A lesson with this title already exists in …".
3. [ ] Generate (chưa chọn slot vẫn được) → nút dưới preview mờ "Add" + "→ Select a slot"; chọn slot trống → "Add to Part N"; slot có bài → "Replace Part N". Add → "Added “…” to Cam 14 · Test 1 · Listening · Part N.", slot đó thành tên bài ngay. Replace bài đã có học sinh làm → hỏi xác nhận.
4. [ ] Học sinh mở Library: bài mới nằm đúng Test, đúng thứ tự Part. Sửa bài đó bằng nút ✎ rồi lưu → vẫn ở đúng Part.
5. [ ] Bài Reading: nút Aa cạnh đồng hồ → 5 cỡ chữ; đổi cỡ thì bài đọc và câu hỏi to/nhỏ cùng lúc, tải lại vẫn giữ.
6. [ ] Bôi đen một đoạn trong bài đọc (laptop) hoặc nhấn giữ (điện thoại) → thanh vàng/xanh/hồng/✕ → tô màu; ✕ xóa; chuyển stage rồi quay lại vẫn còn; đóng bài mở lại (cùng phiên) vẫn còn.
7. [ ] Số câu chạy liên tục 1, 2, 3… qua Completion, TFNG, Matching headings, Matching information, rồi tiếp ở Pronouns, Vocabulary, Summary. Matching headings: số + "PARAGRAPH B" + ô chọn cùng hàng. Matching information: danh sách chỉ ghi Paragraph A, B…
8. [ ] Stage 3 sau Check: thẻ từ ghi định nghĩa kèm (từ đồng nghĩa); mỗi câu paraphrase hiện "“cụm câu hỏi” → “cụm trong bài”" + giải thích (bài mới tạo bằng AI; bài cũ không có thì chỉ không hiện). 4.2 có 2–3 câu gợi ý dưới câu hỏi.
9. [ ] Daily Speaking Part 1/Part 3: dưới câu hỏi có 2–3 câu gợi ý.
10. [ ] Home (390px): Recent results không còn "Open feedback", không có ngày, nhận xét 1 dòng có "…"; bấm cột biểu đồ vẫn mở feedback. Thẻ Homework: hạn "2 days left" nằm cùng hàng tên bài, bên phải; laptop thấy cả ngày giờ.

## Master spec — đợt 04 (chấm Speaking)
1. [ ] Marking → mở một bài Speaking: modal 2 cột (trái: bản ghi Part 1/Part 2, Transcript, "What the student sees", Overall; phải: Marking, Voice feedback, Written note + Sticker). Chân chỉ có nút Update grade bên phải. Writing và Read aloud vẫn modal cũ.
2. [ ] Trình phát: 3 nút icon ↺ ▶ ↻ (không có chữ "5"), rê chuột thấy "Back 5 seconds"/"Forward 5 seconds"; lùi/tiến 5 giây chạy thật; có thời gian và thanh tua.
3. [ ] Rubric: 4 tab tiêu chí (badge – khi chưa có). Tick descriptor ở nhiều band → mỗi band hiện n/tổng, band tự tính = band có tỉ lệ tick cao nhất (hòa → band cao hơn), hàng band đó tô xanh. Override chọn Band 5 → badge 5; chọn Auto → tính lại từ tick.
4. [ ] Overall: 7,7,7,7 → 7; 7,7,7,6 → 6.5; 7,7,6,6 → 6.5; 6,6,6,7 → 6. Thiếu 1 tiêu chí → "–".
5. [ ] Stars: thêm mục tiêu (gõ + Enter), bấm chip đổi ✗ → ◐ → ✓; sao tự tính (vd. 2 mục tiêu ✓ + ◐ → 8 sao). Bấm 6 sao → 6 (chỉnh tay, hiện nút Auto); đổi chip không đổi điểm; bấm lại sao 6 hoặc Auto → tự tính lại. Overall = trung bình 1 số lẻ, thiếu tiêu chí → "–".
6. [ ] Mở bài của học sinh khác cùng bài: danh sách mục tiêu giống hệt (dùng chung cả lớp), chip thì riêng. Xóa một mục tiêu bằng × → biến mất ở mọi học sinh.
7. [ ] Đổi Rubric ↔ Stars rồi đổi lại: dữ liệu cả hai giữ nguyên. Update grade ở Stars → danh sách Marking ghi "7.8 /10"; ở Rubric → "Band 6.5"; chỉ ghi note → "Marked".
8. [ ] Học sinh: Recent results hiện "Band 6.5" hoặc "7.8 /10" (Stars không làm thay đổi số band trung bình); Open feedback hiện điểm, các descriptor đã tick có tag B6/B7 (hoặc sao + mục tiêu ✓/◐ "(used, still some mistakes)"/✗), note, sticker, voice.
9. [ ] Bài đã chấm bằng modal cũ (4 điểm) vẫn hiện điểm cũ cho học sinh; mở lại bằng modal mới thấy các band đó ở Override.
10. [ ] Có thay đổi chưa lưu → bấm Close / Esc → hỏi xác nhận. 390px: một cột theo đúng thứ tự Recording → Transcript → Marking → Voice → Note + Sticker → Student view → Overall. Kiểm tra dark mode.

## Master spec — đợt 05 (chấm Writing)
1. [ ] Marking → mở bài Writing: 2 cột (trái: Task + bảng số liệu, Student answer; phải: Comments, Overall comment). Không còn công cụ tô đỏ/cam/vàng; lỗi AI nằm trong mục gập "AI already checked grammar and word choice (n)", chỉ đọc.
2. [ ] Bôi đen một cụm/câu trong bài → thanh "TA · Task Achievement" (bài Task 2: "TR · Task Response") và "CC · Coherence & Cohesion" hiện ngay trên vùng chọn → chọn TA → đoạn đó tô xanh dương có số, thẻ nhận xét mới ở cột phải và con trỏ nằm sẵn trong ô nhập. CC → tô xanh lá.
3. [ ] Chọn < 3 ký tự hoặc chọn ngoài khung bài → không hiện thanh. Chọn đè lên đoạn đã có nhận xét → không hiện thanh, báo "That part already has a comment…".
4. [ ] Thêm nhận xét ở đoạn trước nhận xét số 1 → đánh số lại theo vị trí trong bài, số trên bài và trên thẻ khớp. Xóa thẻ (×) → bỏ tô màu, đánh số lại.
5. [ ] Bấm vùng tô → thẻ tương ứng sáng viền và con trỏ vào ô nhập; bấm thẻ → bài cuộn tới vùng tô đó.
6. [ ] Update grade → đóng/mở lại bài: nhận xét, vị trí, số thứ tự và Overall comment còn nguyên. Bài chưa có điểm: chỉ lưu nhận xét thì danh sách vẫn ghi "Done" (không tự thành Band 6).
7. [ ] Mở mục "Band and feedback for the student" → kéo điểm, ghi note → Update grade → học sinh thấy band và note như trước. Học sinh **không** thấy các nhận xét TA/TR/CC.
8. [ ] Bài làm của học sinh (chữ, số từ) không thay đổi. 390px: 1 cột theo thứ tự Task → Student answer → Comments → Overall comment. Dark mode: màu tô và tag đọc rõ.

## Master spec — đợt 06 (Lucky Wheel)
Trước khi test: deploy `functions/` mới và dán lại `firestore.rules` (thêm chặn `pity`).
1. [ ] Học sinh → Lucky Wheel: đúng 12 ô, màu theo tier (xanh dương Common, xanh lá Materials, tím Teacher perk, vàng Real-life), chữ sát mép ngoài.
2. [ ] Quay bằng spin: nút khóa trong lúc quay, bánh xe quay 5–7 vòng rồi dừng đúng ô của quà hiện ở dưới; số spin giảm 1; quà vào Inventory (Streak Freeze thì tăng số Freeze). Quay bằng 300 XP: XP giảm 300.
3. [ ] Bấm Spin 2 lần thật nhanh / mạng chập chờn → chỉ mất 1 lượt. Hết spin → nút mờ; gọi thẳng API khi hết spin → server từ chối.
4. [ ] Tải lại trang sau khi quay: spin, XP, quà vẫn đúng (không quay về số cũ).
5. [ ] Trúng Teacher perk / Real-life → dòng "vừa quay trúng" hiện cho học sinh khác. Trúng voucher khi Prizes có mã còn trống → hiện mã và mã đó chuyển "Won by …".
6. [ ] Admin → Users: dưới "Student" có "RL n · TP+ n". Sau mỗi lượt Common/Materials cả hai +1; trúng Teacher perk → TP+ về 0; trúng Real-life → cả hai về 0.
7. [ ] Admin → Prizes: bảng chia theo tier, có cột Weight và Chance (mặc định: Streak Freeze 14.37%, Hint Pass 12.64%, Answer Peek 12.64%, 1-day Extension 10.34%, Random study pack 12%, Vocabulary pack 10.5%, Audio pack 7.5%, Highlighter pen 8.25%, VIP Essay Correction 6.75%, Bubble tea 3%, Mock −20% 1.5%, Mock −25% 0.5%). Sửa một weight → Chance cả tier tính lại; thêm/xóa quà → tính lại.
8. [ ] (Tùy chọn) Tài khoản tester quay nhiều lần: tới lượt thứ 26 không trúng Real-life thì lượt đó chắc chắn Real-life.

## Writing Task 1 — biểu đồ đường (tự test trên trình duyệt)
1. [ ] Create → Writing → "Fill in a line-chart example" → "Check and preview": preview có biểu đồ 3 đường (màu + nét khác nhau + điểm khác hình), chú giải bên dưới, "Data table" mở được, khung "Facts checked from the chart" + 2 câu mẫu.
2. [ ] Chọn slot Task 1 → Add → tải lại trang → Library: bài mới có đúng biểu đồ; nút ✎ (sửa) thấy "chart" và "writingModule" trong dữ liệu.
3. [ ] Sửa JSON cho sai (2 điểm cùng x, id trùng, y là chữ, 5 đường) → Check and preview: danh sách lỗi cụ thể, không có nút Add.
4. [ ] Học sinh mở bài biểu đồ: ô "Your overview" + khung gợi ý bên phải (điện thoại: xếp dưới); nộp bài → xem lại / AI chữa lỗi / Marking như bài Writing thường.
5. [ ] Bài Writing có bảng (Task 1: internet access) và bài Task 2 vẫn hiện và nộp như cũ.
6. [ ] 390px và dark mode: biểu đồ co theo màn hình, chữ trục đọc được, chú giải không đè nhau.

## Tinh chỉnh Admin + Leaderboard Spotlight (10/2026)
1. [ ] Admin › Users: không còn dòng "RL 0 · TP+ 0" và nút "Tester: on/off". Tài khoản tester chỉ có nhãn **Tester** màu nâu vàng; bấm **Add sample data** → toast "… 5 results", đăng nhập tester thấy Recent results có cột.
2. [ ] Đăng nhập tester: mọi bài có thanh **Demo helper** (All correct / Half wrong).
3. [ ] Header học sinh: chỉ có ảnh + tên (không "· student", không khung rank). Settings: ảnh cạnh "Choose photo" không có khung.
4. [ ] Prizes › Rank frames: các ô xem trước to hơn, cánh/vương miện không bị cắt.
5. [ ] Reading Stage 1 trên máy tính: kéo thanh giữa bài đọc và câu hỏi (con trỏ ↔); tải lại trang vẫn giữ độ rộng; trên điện thoại không có thanh.
6. [ ] Leaderboard mặc định **Everyone**. #1 là khối tím có sao lấp lánh/sao băng, chữ "Champion"; #2/#3 là 2 thẻ có ruy băng bạc/đồng, không số; từ #4 có thanh tiến độ. Nút XP | Streak đổi được, nút đang chọn nền đậm.
7. [ ] Hai bạn bằng XP: bạn đạt mức đó trước đứng trên. Hàng của mình có "(you)" nền vàng nhạt viền xanh.
8. [ ] Lớp chỉ có 1 bạn → chỉ khối #1; 2 bạn → khối #1 + 1 thẻ ở giữa; chưa có ai → "No one on the leaderboard yet."
9. [ ] Dark mode và 390px: khối #1 đọc rõ, giá trị 34px, 2 thẻ #2/#3 vẫn nằm cạnh nhau. Bật "Reduce motion" của máy → không còn sao băng.
10. [ ] Xóa thủ công 2 tài khoản 3667@gmail.com và nghiatucayfai@gmail.com bằng Admin › Users → Kick.

## Learning Materials — PR 1 (10/2026)
Tự động: `node tests/lm-meta.test.js` → 18/18. Phần dưới đây cần thầy/cô tự xem:
1. [ ] Học sinh › Home › Library: có 2 tab **Cambridge IELTS** | **Learning Materials**; tab Cambridge (lưới sách, mở Test, làm bài) y như cũ.
2. [ ] Học sinh/giáo viên chọn Learning Materials → chỉ thấy "Learning Materials are coming soon.", không có Unit 2, không nút nào bấm được.
3. [ ] Admin chọn Learning Materials → Writing › IELTS Academic Task 1 › "Unit 2: Overview…" có nhãn "Unpublished preview"; mở ra là khung trống, có nút "‹ Learning Materials" quay lại.
4. [ ] Tải lại trang: tab đang chọn được nhớ. Daily, Homework, Recent results vẫn hiện bình thường.
5. [ ] 390px và dark mode: 2 tab nằm gọn một hàng, chữ rõ.
6. [ ] Khi đưa lên site: nhớ tải lên cả file mới `lm-content.js` (thiếu file này tab Learning Materials vẫn chạy, chỉ hiện "coming soon").

## Learning Materials — PR 2 (10/2026)
Tự động (đã chạy): `node tests/chart-facts.test.js` → 56/56 · `node tests/lm-meta.test.js` → 18/18 · `node tests/lm-check.js` → 37 mục, 0 lỗi, 37 pending · `node tests/lm-check.js --release` → báo lỗi (đúng, vì còn pending).
Cần thầy/cô tự xem (chưa kiểm trên trình duyệt):
1. [ ] Mở `tests/lm-review.html` bằng trình duyệt: đọc từng câu tiếng Anh/tiếng Việt, đáp án Controlled, key features; gửi lại danh sách id đồng ý ở cuối trang.
2. [ ] Create › Writing › "Fill in a line-chart example" → Check and preview: biểu đồ vẫn hiện, **không còn** khung "Facts checked / Sample overview".
3. [ ] Bài demo Cam 14 · Test 1 · Writing có biểu đồ: biểu đồ hiện, ô viết bài và nộp bài như cũ; modal chấm vẫn thấy biểu đồ.
4. [ ] Bài Writing có bảng và Task 2 vẫn như cũ. Console không có lỗi `chValidate is not defined`.
5. [ ] Khi đưa lên site: **bắt buộc** tải lên `md-chart.js` (thiếu là biểu đồ Writing hỏng). Không tải `tests/`.

## Learning Materials — PR 3 (10/2026)
Tự động (đã chạy): `node tests/lm-unit2-ui.test.js` → 22/22 · `chart-facts` 56/56 · `lm-meta` 18/18 · `lm-check` 0 lỗi, 37 pending.
Cần thầy/cô tự xem bằng tài khoản **admin** (học sinh chưa thấy bài):
1. [ ] Library › Learning Materials › Unit 2: có nhãn "37 content items still waiting for review" và 5 bước; bước Review mờ.
2. [ ] Learn: biểu đồ Museum A/B/C, các đoạn tiếng Anh + tiếng Việt, câu mẫu, key features. Không có chữ "App X/Y/Z".
3. [ ] Controlled: chọn đáp án → Check answers → mỗi câu báo đúng/sai, đáp án và lý do 2 thứ tiếng; Try again làm lại được.
4. [ ] Guided: tick đặc điểm, viết vài câu; tải lại trang → chữ vẫn còn ("Draft saved on this device.").
5. [ ] Independent: biểu đồ App X/Y/Z lần đầu xuất hiện; chưa có câu mẫu; bấm "I'm done" khi ô trống → nhắc viết trước; có chữ → sang Review.
6. [ ] Review: sửa bài tiếp được, tick key features, thấy câu mẫu của biểu đồ B. Clear draft hỏi xác nhận rồi xóa và quay về Independent.
7. [ ] 390px + dark mode: nút đáp án xếp dọc dễ bấm, biểu đồ vừa màn hình, chữ tiếng Việt đọc rõ.
8. [ ] Tài khoản học sinh: Learning Materials vẫn chỉ "coming soon".
9. [ ] Cambridge Library, Create, nộp bài Writing, AI chấm, modal chấm: như cũ.
10. [ ] Khi đưa lên site: tải lên `md-chart.js`, `lm-content.js`, `lm-engine.js`, `lm-unit2.js` cùng `index.html`.

## Leaderboard theo prototype v2 (10/2026)
1. [ ] #1: khối tím căn giữa, avatar tròn ở giữa có quầng vàng phía sau, tên → số XP lớn màu vàng → "Level · Top of the leaderboard" → chip "Champion"; có sao nhấp nháy, vệt sáng từ trên chiếu xuống, 2 sao băng (lần đầu sau 1 giây và 5 giây).
2. [ ] #2/#3: 2 thẻ cạnh nhau, ruy băng bạc/đồng treo ở mép trên bên trái, không có số hạng.
3. [ ] Từ #4: mọi bạn đều hiện (không còn "⋯"), thanh tiến độ so với #1, số đậm + "XP"/"days" trên 1 dòng.
4. [ ] So với file `leaderboard (2).html` mở cạnh nhau: kích thước, bo góc, khoảng cách giống nhau (chế độ sáng và tối, 390px).

## Admin › Users › Kick (10/2026)
Tự động (đã chạy): `node tests/admin-kick.test.js` → 36/36 (script thật của app, DOM giả, server giả) · `node --check` cho script inline, `functions/api/[[path]].js` và các file .js: đạt.
Trên site thật (bắt buộc, theo thứ tự):
1. [ ] Sau khi đưa bản mới lên, mở Admin › Users: dòng đầu phải ghi **"· app 2026-10-24c · server 2026-10-23d"**. Không thấy "app 2026-10-24c" = site vẫn chạy `index.html` cũ → đưa lại file, rồi tải lại trang bằng Ctrl+F5 (điện thoại: xóa dữ liệu trang / mở tab ẩn danh).
2. [ ] Bấm **Kick** ở dòng 3667@gmail.com → hiện hộp "Kick this student?" có tên + email đúng. Cancel → hộp đóng, không đổi gì. Esc cũng đóng.
3. [ ] Nếu hộp của app không hiện được trên máy này, sau ~0,2 giây trình duyệt tự hỏi bằng hộp của chính nó ("Kick this student?" + OK / Cancel): OK = Kick thật. Nếu không có cả hai: phải có thông báo "Something went wrong (ad-kick: …)". Chụp lại câu đó gửi cho Claude. Không có cả thông báo → mở Console (F12) và chụp dòng đỏ.
4. [ ] Bấm lại Kick → **Kick** trong hộp: nút đổi "Kicking…", hộp đóng, dòng biến mất, toast "… was kicked." F5 → không quay lại.
5. [ ] Làm như vậy với nghiatucayfai@gmail.com (QUANG KHANG). **Không** Kick nghiatucayfai75@gmail.com (Teacher), tester@gmail.com, lorenkids795@gmail.com (Admin).
6. [ ] Lỗi: hộp vẫn mở và ghi lý do (hết hạn admin key → ô nhập mật khẩu admin; "Deploy the latest version…" = thiếu thư mục functions/).
7. [ ] **Change password**: bấm ở một học sinh → hộp có ô mật khẩu (Generate / Copy / Save password), hoặc nếu hộp không hiện được thì trình duyệt hỏi bằng ô nhập có sẵn mật khẩu gợi ý → OK → thông báo hiện mật khẩu mới để chép; đăng nhập học sinh đó bằng mật khẩu mới được. Edit class, Add a tester account, Resume, Teachers, My account vẫn chạy. 390px và máy tính, sáng/tối.

## Learning Materials — Learn mới (10/2026)
Tự động (đã chạy): `node tests/lm-unit2-ui.test.js` → 34/34 · `chart-facts` 56/56 · `lm-meta` 18/18 · `admin-kick` 36/36 · `lm-check` 0 lỗi, 70 pending (`--release` báo lỗi đúng).
Cần xem trên trình duyệt (tài khoản admin):
1. [ ] Mở Unit 2: nút **English | Tiếng Việt**, mặc định Tiếng Việt; giải thích chỉ hiện 1 ngôn ngữ; câu IELTS mẫu luôn tiếng Anh.
2. [ ] Learn: chỉ thẻ 1 hiện, bấm Tiếp tục mở dần tới thẻ 7. Máy tính: biểu đồ bên trái đứng yên khi cuộn; điện thoại 390px: biểu đồ ở trên, thẻ bên dưới, chữ và nút không bị tràn.
3. [ ] Thẻ 3: bấm Trends → Museum A và B sáng, C mờ; Highest / Lowest → chỉ A; Highlights → chỉ C; bấm lại → bỏ chọn. Chip ✓ "Museum A: 60 → 90 (2000–2020)".
4. [ ] Thẻ 4: tick rồi "Xem nhận xét" → mới hiện Chính/Phụ, "Bạn đã chọn". Thẻ 6: câu mẫu chỉ hiện sau "Xem câu mẫu".
5. [ ] Đang ở Controlled đã chọn đáp án, hoặc Guided đã viết nháp → đổi ngôn ngữ → vẫn ở chỗ cũ, đáp án và nháp còn nguyên. Tải lại trang → ngôn ngữ được nhớ.
6. [ ] Chế độ tối: biểu đồ mờ/sáng vẫn rõ, thẻ đang làm có viền xanh.
7. [ ] Học sinh vẫn chỉ thấy "coming soon". Mở `tests/lm-review.html` để duyệt 70 mục.

## Learning Materials — sửa sau review (10/2026)
Tự động (đã chạy): `lm-unit2-ui` 51/51 · `chart-facts` 56/56 · `lm-meta` 18/18 · `admin-kick` 36/36 · `lm-check` 0 lỗi, 121 pending (`--release` báo lỗi đúng).
Cần xem trên trình duyệt (admin):
1. [ ] Learn: bấm Tiếp tục tới bước 7 mà **không** bấm "Xem câu mẫu" → ô Overview chỉ có lời nhắc + nút, không có câu mẫu.
2. [ ] Bước 3–6 chưa làm → nút "Bỏ qua, tiếp tục" (màu phụ) + dòng gợi ý; làm rồi → "Tiếp tục".
3. [ ] Bước 5: chọn Museum A / Museum C ở 2 ô đầu, Museum B ở ô cuối → "Kiểm tra câu" → báo đúng; chọn sai → "Chưa đúng" + Làm lại. Trên điện thoại 3 ô chọn không tràn.
4. [ ] Tiếng Việt: thanh bước (Học · Luyện nhận biết · Viết có gợi ý · Tự viết · Xem lại & sửa), nút, phản hồi Controlled ("Chưa đúng. Đáp án: …"), Guided/Independent/Review và thông báo nháp đều tiếng Việt; câu IELTS vẫn tiếng Anh. Chuyển English → tất cả sang tiếng Anh, đáp án/nháp còn nguyên.
5. [ ] Câu mẫu về Museum C có nhãn "Phụ · có thể bỏ qua".

## Trang đăng nhập v2 (10/2026)
Tự động (đã chạy): `node tests/sign-in.test.js` → 11/11 (4 trạng thái, link đổi vai trò, ô tên khóa tới khi chọn lớp, gọi `/api/login` / `/api/register` như cũ).
Cần xem trên trình duyệt (đã đăng xuất):
1. [ ] Máy tính: trái là khối tím có logo "Mini Drills" (Drills nền vàng), khẩu hiệu to có "mistakes away" nền vàng in nghiêng, sao nhấp nháy + sao băng; phải là form "Sign in". Không còn thanh đầu trang, không còn 2 nút Student/Teacher.
2. [ ] Đăng nhập học sinh, "First time here?" (chọn lớp → mới chọn được tên; đổi lớp → tên chọn lại), "Sign in as teachers" → đăng nhập giáo viên → "Sign in as student". Giáo viên mới: "First time? Create your teacher password" vẫn có.
3. [ ] Nhập sai mật khẩu → báo lỗi như cũ. Đăng nhập đúng → vào app, thanh đầu trang và menu hiện lại bình thường. Đăng xuất → về trang này.
4. [ ] Nút tròn góc phải đổi sáng/tối. Dark mode: form chữ sáng, ô nhập rõ; khối tím đậm hơn.
5. [ ] Điện thoại 390px: khối tím ở trên (khẩu hiệu nhỏ hơn logo), form bên dưới, không tràn ngang; iPhone không bị tai thỏ che.
6. [ ] Trình duyệt tự điền email/mật khẩu được; tab Issues của Chrome không còn "form field has neither an id nor a name" cho form này.

## Kick xóa dữ liệu · trạng thái lớp · xóa lớp · gỡ khung · quà tùy chỉnh (10/2026)
Tự động (đã chạy): `server-purge` 8/8 · `admin-kick` 50/50 · các bộ khác như cũ.
Trên site thật (cần deploy cả `functions/` — Users phải ghi "server 2026-10-24a", "app 2026-10-24d"):
1. [ ] ⚠ Thử trước bằng **tài khoản tester phụ**, không bằng học sinh thật. Kick → hộp ghi "ALL their learning data are deleted for good". Sau đó: tài khoản không còn trong Users, Recent results/Leaderboard/Error Notebook của bạn đó trống; đăng ký lại cùng email = bắt đầu từ 0.
2. [ ] Classes (admin): lớp có học sinh ở mục chính; lớp chỉ có trong Sheet ở mục "Pending"; một học sinh đăng ký vào lớp Pending → lớp tự thành Active.
3. [ ] Class settings › Status: chọn Archived → Save → lớp xuống mục "Archived" (gập lại); chọn lại Active → về chỗ cũ. Giáo viên không thấy khối Status / Delete class.
4. [ ] ⚠ Delete class (thử với một lớp thử nghiệm): gõ DELETE → "Kicking 1 of N…" → toast số học sinh và bài giao đã xóa; lớp biến mất (còn trong Sheet thì hiện lại ở Pending). Gõ sai → không xóa gì.
5. [ ] Prizes › Rank frames: rank có khung → nút "Remove frame" cạnh Reset → xác nhận → avatar về vòng màu.
6. [ ] Prizes › Add a prize: Type "Custom / Other…" → hiện ô "Custom prize"; thêm "Mini Drills T-shirt", tier Real-life, weight 100 → bảng có dòng "Custom: Mini Drills T-shirt", Chance tính lại. Gõ weight ở một dòng → cột Chance và "total weight" đổi ngay khi gõ.

## Library · Admin · Leaderboard · Reading · Unit 2 v4 (10/2026)
Tự động (đã chạy): `lm-unit2-ui` 37/37 · `reading` 12/12 · `misc` 6/6 · `admin-kick` 50/50 · `chart-facts` 56/56 · `lm-meta` 18/18 · `server-purge` 8/8 · `sign-in` 11/11 · `lm-check` 0 lỗi, 153 pending. Cần deploy `index.html`, `functions/`, `md-chart.js`, `lm-*.js`, `md-backend.js` (Users phải ghi "server 2026-10-24b").
1. [ ] Học sinh: tab Library tên "Cambridge"; tài khoản chưa có sách nào có bài → dòng "No Cambridge books yet…".
2. [ ] Admin › Users: không còn nút Edit class. Tìm tài khoản tester (kiểm đúng email; "tester@gmai.com" có thể gõ nhầm) → Add sample data 2 lần → Recent results có 5 bài + 1 Writing + 1 Speaking đã chấm, **không bị nhân đôi**. Học sinh thường không có nút này.
3. [ ] Leaderboard: hero có sao nhấp nháy mềm, sao băng đầu tiên sau ~1 s; thẻ #2/#3 không lặp lại người #1. Windows tắt Animation effects → đứng yên.
4. [ ] Create › Reading: Generate → ba dòng Easy / Medium / Hard có trạng thái; câu Completion và TFNG theo thứ tự bài đọc. Thêm bài.
5. [ ] Class settings: chọn Level cho một học sinh (Beginner) → học sinh mở bài Reading thấy pill "Easy" và nội dung bản Easy; giáo viên đổi bản bằng Easy/Medium/Hard trên thanh trên cùng.
6. [ ] Deep reading: khung bài ghi "Selected excerpts · … (not the whole passage)", nút xem cả bài và quay lại. Stage 3 sau Check: các cặp "… ≈ …".
7. [ ] Learning Materials › Unit 2 (admin): nút ENG | VI; mọi stage biểu đồ trái, bài phải (máy tính), xếp dọc ở 390px; dưới biểu đồ "Biểu đồ luyện tập (số liệu giả định)".
8. [ ] Learn: không có nút Bỏ qua; Tiếp tục mờ tới khi làm xong bước. Trends sáng cả 3 đường. Bước 5 "Overall"/"while" được tô; sai 2 lần → hiện đáp án.
9. [ ] Bước 6: đoạn ngắn 2 câu + đoạn tô 3 màu kèm chú giải; dark mode đọc được.
10. [ ] Controlled: YES / NO / NOT GIVEN; đúng 5/8 → nút sang Guided mờ; 6/8 → mở. Guided: 3 bài nhỏ, đạt 5/6 mới hiện ô viết. Independent: "Bí ý?" mở overview mẫu của biểu đồ bảo tàng.
11. [ ] "Preview: auto-fill" (chỉ admin) bật → Controlled/Guided có sẵn đáp án đúng; ô viết vẫn trống; tắt lại được.

## Learning Materials dạng cây (10/2026)
Tự động (đã chạy): `lm-meta` 22/22, các bộ khác như cũ.
1. [ ] Library › Learning Materials: 4 dòng Writing (mở sẵn) · Listening · Reading · Speaking (3 dòng sau mờ, có "Coming soon", bấm không được). Không có khung thẻ.
2. [ ] Trong Writing: "IELTS Academic Task 1" và "IELTS Task 2" (đóng); bấm để mở/đóng, mũi tên xoay; đường kẻ dọc màu nhạt bên trái.
3. [ ] Admin: mở Task 1 → "Unit 2: Overview (Time-series Line Charts)" + badge vàng nâu "Unpublished preview" → bấm mở bài. Task 2 → "No units yet".
4. [ ] Học sinh/giáo viên: mở Task 1 → "No units yet" (bài chưa phát hành không hiện).
5. [ ] Dark mode và 390px: màu đọc được, không tràn ngang; Tab bàn phím thấy viền focus.

## Rà UI/UX toàn app (10/2026)
Tự động (đã chạy): `ui-audit` 15/15, `contrast.js` 0 cặp lỗi, các bộ khác như cũ.
1. [ ] Chế độ sáng: chữ xám (ghi chú, ngày giờ) đậm hơn một chút; viền ô nhập rõ hơn (xám đậm) ở Settings, Create, trang đăng nhập.
2. [ ] Điện thoại: mọi nút bấm dễ (≥ 44px); bảng dữ liệu của bài Writing và bảng Classes ở Dashboard kéo ngang được, trang không tràn.
3. [ ] Làm bài thường (Library): sau Submit answers, lựa chọn đúng có ✓, sai có ✗; ô điền sai có viền đứt.
4. [ ] Listening/Reading trên điện thoại: chạm vào ô điền → thanh nút ở đáy không còn che ô và bàn phím; rời ô → thanh dính lại.
5. [ ] Flashcard / popup từ vựng / Daily: nút phát âm là icon loa (không còn emoji 🔊). Classes: nút bánh răng trên ảnh bìa nhìn rõ cả với ảnh sáng.
6. [ ] Windows tắt "Animation effects" (hoặc máy bật giảm chuyển động): không còn hiệu ứng chạy ở bất kỳ đâu.
7. [ ] Dùng phím Tab đi qua trang: luôn thấy viền focus; ở danh sách lỗi AI và chế độ chọn từ Listening, Enter/Space chọn được.

## Unit 2 — feedback bổ sung (10/2026)
Tự động (đã chạy): `lm-unit2-ui` 41/41, `chart-facts` 56/56, `lm-check` 0 lỗi (152 pending), các bộ khác như cũ.
1. [ ] Admin mở Unit 2: hàng trên cùng có "Learning Materials › Writing › IELTS Academic Task 1" bên trái, ENG | VI và "Preview: auto-fill" bên phải; không còn nút "‹ Learning Materials" và dòng "Unpublished preview · 152…". Bấm "Learning Materials" (breadcrumb hoặc tab trên) → về danh sách. Điện thoại 390px: hàng này xuống dòng gọn.
2. [ ] Tiêu đề biểu đồ căn giữa, to và đậm hơn (Learn, Independent và cả bài Writing có biểu đồ trong Cambridge).
3. [ ] Tên đường: Larkfield / Westmere / Corvale Museum (Chart A), Chatora / Pixlo / Notivo (Chart B), ở biểu đồ, câu hỏi, câu mẫu, Controlled, Guided.
4. [ ] Không còn dòng "Practice chart (made-up data)." dưới biểu đồ; mở "Data table" → bảng gọn, số căn giữa, có dòng nhỏ "Biểu đồ luyện tập (số liệu giả định)" ở dưới; điện thoại không cuộn ngang nữa.
5. [ ] Bước 2–3 của Learn: không còn chữ "Answer the questions…" / "Open all three lenses…" (rê chuột lên nút Continue mờ vẫn thấy gợi ý). Bước 6: không còn "You do not need all three parts…"; câu mẫu có "also" và "Notably,".
6. [ ] Học sinh vẫn không thấy Unit 2.

## Learning Materials — Unit 0: Data Reading & Selection (10/2026)
Tự động (đã chạy): `lm-unit0` 23/23, `lm-check` 0 lỗi (Unit 0: 165 pending, Unit 2: 152 pending), các bộ khác như cũ. Cần deploy thêm file `lm-unit0.js`.
1. [ ] Admin › Library › Learning Materials › Writing › IELTS Academic Task 1: có "Unit 0: Data Reading & Selection" (badge Unpublished preview) trên Unit 2. Học sinh/giáo viên không thấy.
2. [ ] Learn: bước 1 có bảng kiểm 5 bước + một dòng "số liệu giả định"; Continue mờ tới khi trả lời + Kiểm tra; trả lời sai 2 lần thì hiện đáp án và đi tiếp được. Bước 3: bấm từng đường → đường đó sáng lên, hiện "80 → 48 (2005–2025)" và mô tả. Bước 5: Chính/Phụ chỉ hiện sau Kiểm tra.
3. [ ] Controlled: 8 câu, nút YES / NO / NOT GIVEN và Đặc điểm chính / Chi tiết phụ; đúng 5/8 → không sang Guided được, 6/8 → được.
4. [ ] Guided: 7 ô chọn (đúng ≥ 5 mới mở phần sau) → chọn đặc điểm + lý do → viết ≥ 2 nhận xét → "Put my observations together" → sửa bản tóm tắt → tick "I compared…" → sang Independent.
5. [ ] Independent: biểu đồ Brennick lần đầu xuất hiện; mở "Need a reminder…" chỉ thấy phương pháp, không có số liệu hay đáp án. Thiếu ô nào thì "I am done" báo cần điền đủ.
6. [ ] Review: bảng tham khảo (Car dẫn đầu 2016, Bicycle dẫn đầu 2024, Bus = Bicycle năm 2022), tự kiểm "Tôi đã nêu… / Tôi đã tránh…".
7. [ ] Tải lại trang giữa chừng: quay lại đúng bước, đáp án và ghi chú còn. ENG | VI không làm mất gì. "Preview: auto-fill" (admin) bật → câu chấm được có sẵn đáp án; tắt → về như cũ.
8. [ ] Điện thoại 390px + dark mode: biểu đồ trên, bài dưới; ô chọn Guided xếp 1 cột; không tràn ngang.

## P0 cổng bài viết + Unit 2 Refinement (10/2026)
Tự động (đã chạy): `lm-unit2-ui` 55/55, `lm-unit0` 25/25, `lm-check` 0 lỗi (Unit 2: 189 pending, Unit 0: 172 pending), các bộ khác như cũ. Thử với tài khoản **học sinh/tester** (admin luôn mở mọi bước):
1. [ ] Guided Unit 2: gõ `dcd`, chỉ dấu cách, "Overall", chữ lung tung hoặc chép đề → bấm lưu → báo lý do (EN/VI), **không** có nút sang Independent.
2. [ ] Viết 2 câu overview thật → "Save my overview for practice" → dòng "Bài viết: chưa được đánh giá", nút "Tiếp tục luyện (bài viết chưa được đánh giá)". Sửa overview thành `dcd` → nút mờ lại.
3. [ ] Dòng trạng thái tách riêng: "Luyện nhận biết: đúng 5 / 6 · đạt" và "Bài viết: …"; không chỗ nào ghi bài viết "đạt" hay "70%".
4. [ ] Independent: "I'm done" với `dcd` → báo lý do; viết thật → Review hiện "Your first version" + ô sửa + đoạn mẫu "One possible overview…" có chip số liệu.
5. [ ] Admin: dòng vàng "Admin preview: every stage is open…"; ở Independent có mục mở ra "Reviewed sample overview…" (không chèn vào ô viết).
6. [ ] Unit 0 Guided/Independent: `dcd` ở ô nhận xét / ô bảng kiểm bị từ chối kèm tên ô; nhận xét thật thì qua; dòng "Ghi chú của bạn: chưa được đánh giá".

## Add teacher · Unit 0 refinement · Writing "Coming soon" (10/2026)
Tự động (đã chạy): `admin-actions` 9/9, `lm-access` 7/7, `lm-unit0` 27/27, `lm-unit2-ui` 55/55, `lm-meta` 23/23, các bộ khác như cũ; `lm-check` 0 lỗi (Unit 0: 206 pending, Unit 2: 189 pending). Users phải ghi "app 2026-10-28a".
1. [ ] Admin › Teachers: Name + Email + Password (hoặc Generate) → Add teacher → không còn "Something went wrong", giáo viên mới hiện trong danh sách. Thiếu ô → câu báo, không gửi. Admin › Users › Add a tester account vẫn tạo được tester.
2. [ ] Học sinh **thường**: Library › Learning Materials → dòng Writing mờ, "Coming soon", bấm không mở. **Tester**: Writing mở, thấy Unit 0 và Unit 2, làm được như trước. Đăng xuất rồi đăng nhập bằng tài khoản kia → hiện đúng.
3. [ ] Unit 0 (đăng nhập tester): Learn tiêu đề không còn "3 2. …"; bấm Solar thấy "Đầu → cuối … 2 → 15" và "Hình dạng: lúc tăng lúc giảm". Bước chọn: sau Kiểm tra có ghi chú chính/phụ + "Một lựa chọn hợp lý khác".
4. [ ] Controlled: 10 câu, có 2 câu "The gap between…"; 6/10 không qua, 7/10 qua.
5. [ ] Guided: gõ `gfg`, `abc`, `gfg gfg` vào nhận xét → không được gộp; chọn 2–3 đặc điểm → mỗi đặc điểm một ô; "Check my observations" mới hiện số liệu đã kiểm; gộp ghi chú; phải bấm "Tôi đã so… chưa được đánh giá" mới sang Independent; không chỗ nào ghi "đạt".
6. [ ] Independent: đúng 5 ô gọn; `frf` ở một ô → báo đúng ô. Review: A. So sánh (lần đầu cạnh đáp án) → B. Sửa → "Save revision": không sửa gì → "chưa sửa"; có sửa → bảng Trước / Sau.
7. [ ] Admin bật "Preview: auto-fill": đi hết 5 bước không phải gõ; Guided là câu về Coal/Wind/Solar, Independent/Review là câu về Car/Bus/Bicycle, bản Sau khác bản Trước; tắt auto-fill → chữ mẫu biến mất, chữ admin tự gõ còn nguyên.
8. [ ] Điện thoại 390px + dark mode: Unit 0 các ô gọn, không tràn; bảng Trước / Sau cuộn ngang được.

## Giai đoạn 3 — Đổi email (chưa làm)
- [ ] Email cũ bị từ chối; email mới đăng nhập bằng **mật khẩu cũ**; XP, bài làm, flashcard còn nguyên.
