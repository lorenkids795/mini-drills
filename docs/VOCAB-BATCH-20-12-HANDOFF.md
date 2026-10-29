# Vocab Check Standard 20 / Quick 12 — Preview V4

Thực hiện `docs/CODEX-VOCAB-BATCH-20-12.md` tại baseline `e4ad9387602cb549867134962206198400c3f40d` trên `feature/vocab-lab`, repository `lorenkids795/mini-drills`.

## Hành vi

- Standard Check mặc định 20 từ; Quick Check 12 từ. Không có chế độ 6 từ. Có thể chọn trước từ đầu tiên của batch mới. Sau khi bắt đầu, kích thước và sense IDs cố định, kể cả Undo về từ đầu; thiết lập tiếp theo nằm trong phần mở rộng “Next batch settings”.
- Tiến độ chính là Word X of 20/12 và progress bar của batch. Tổng lesson ở details “Lesson progress” phía dưới nội dung học. Batch cuối dùng số từ thực còn lại; Standard là 5×20 + 2, Quick là 8×12 + 6. Sáu từ ở cuối Quick là batch dư, không phải một chế độ lựa chọn.
- Sau Reality Check có Finish for now, Continue next batch và đường vào linked Mission trong local sandbox. Finish trả về Learning Materials ở app/Preview; trang Check sandbox riêng có Resume. Không cần hoàn thành cả 102 từ trước.
- Giữ Undo, keyboard 1/2/3/U, focus, reduced motion, classification, first-try/assisted evidence và clue/reveal. Giữ nguyên quy tắc lấy mẫu 3–5, giới hạn bởi Known thực tế; không bịa mẫu khi Known = 0/1/2.
- Vocab vẫn ở Library → Learning Materials, không có sidebar riêng. Coast chỉ QA nội bộ; linked Mission chỉ lấy sense đã phân loại, không tạo filler hoặc hứa có mission cho mọi bộ từ.

## Tương thích dữ liệu

Giữ schemaVersion 1 và toàn bộ progress/evidence storage paths. Không chạy migration hoặc resize khi đọc. `batch.ids`, history, checks/results và attempted question snapshots cũ được đọc nguyên trạng. Batch v1 12 từ thiếu metadata mới luôn cố định 12; next batch theo lựa chọn mới.

Batch mới có `size` và `configurable`; core chỉ chấp nhận lựa chọn 20/12, khóa cấu hình từ lần phân loại đầu tiên. Bắt đầu batch tiếp theo lấy các sense chưa phân loại theo thứ tự bank gốc, không bỏ sót/trùng. Reclassify vẫn là batch review riêng và giữ lịch sử attempts.

Preference lưu trong trình duyệt theo `md-vocab-batch-size:v1:<demo|account>:<encoded-email>`. A/B và demo/account tách biệt. Đây là lựa chọn trên thiết bị, không phải cấu hình đồng bộ cloud; kích thước batch đang học vẫn đi cùng progress account. Đổi preference giữa batch không ghi lại progress hiện tại. Store adapter, Firebase rules và authentication không đổi.

## Kiểm thử cuối

- **298 PASS**: 54 Node tests (9 ca batch mới) + 244 assertions regression Writing/auth/Reading/admin/UI; `lm-check.js` PASS. Nội dung Writing đang pending vẫn giữ nguyên.
- Core: 20/12, reject 6, 102 từ đúng thứ tự, 5×20+2, 8×12+6, trộn 12/20, partial tail, Undo/review, legacy v1 12 từ, Known 0/1/2/3/n, sampling 3–5 và evidence/Mission eligibility PASS.
- Batch browser: **24 screenshots** = app/static × 20/12 × 390/768/1280 × light/dark. Default 20, chọn Quick, khóa batch sau Undo, đổi preference chỉ cho batch tiếp, focus và reload PASS. Cả hai size trong cả hai môi trường: classify → eligible Mission → Library → Finish → resume → batch size khác PASS. Legacy raw v1 không đổi khi load/đổi preference; A/B không rò lựa chọn hoặc progress.
- Regression browser: Check UI 36 trạng thái/theme/viewport, keyboard/double click, Undo trên mobile, contrast và phản hồi clue trong màn hình, lịch sử câu hỏi legacy; Mission full gameplay; real Library, role/UID guards, cloud doubles, multi-tab và Writing student/tester PASS.
- Static isolation: 42 screenshot states, hosted HTTPS origin mô phỏng, API/config/external fetch/WS/XHR/EventSource/beacon blocked, cookies omitted, redirects không theo đến API, 0 unexpected requests / 0 page errors PASS.
- Fidelity Library/shell desktop/mobile và light/dark PASS. Tham chiếu source ZIP và ảnh fixture before/after được giữ trong folder; không nhận thêm ảnh giáo viên thật trong task này.
- Các lỗi trung gian đã sửa: thiết lập batch ban đầu đẩy feedback xuống dưới màn hình mobile; đổi sang details cho next batch và tổng lesson phía dưới. Test cũ đọc innerText của nội dung đã chủ ý thu gọn và chờ sidebar baseline mobile phải visible cũng được cập nhật theo UI. Log cuối 19 lệnh đều PASS nằm ở `FINAL-TEST-RESULTS.txt`.

## Audit và ZIP

Không đổi root `index.html`/Writing, nested `mini-drills/`, approved P1/P2, authored Mission content/core/store, Vocab store, auth/backend/config/rules, static allowlist/CSP/network guard/builder. Chỉ sửa batch core/UI, callbacks Finish và tests/docs. Không thêm secret markers; Git diff check sạch. Mọi kiểm thử dùng fixtures/mocks, không dùng học sinh thật.

`ui-only-static-v4.zip`: đúng **17 file**, root ZIP không có folder bọc; giải nén so từng byte với output và manifest. So V3 chỉ đổi `vocab-lab-core.js`, `vocab-lab.js`, `vocab-lab.css`, `preview.js`, `manifest.json`; 12 file còn lại giữ nguyên byte. ZIP **97123 bytes**, SHA-256 `2a34b95b011e86f3e5c0005c9b03cd392d45cfce35c79660535d0c7fc27b363d`.

Đã chuẩn bị để giáo viên duyệt và upload thủ công vào project Direct Upload `mini-drills-vocab-ui-preview`. Git push không tự cập nhật project đó. Chưa upload/deploy, chưa merge main hoặc chỉnh Cloudflare. Trước deployment app thật vẫn cần reconcile main/Writing mới, Firebase emulator/staging cho rules/auth thực tế và xác nhận Cloudflare root/build output. Không có cloud Mission sync mới.

## Các file thay đổi

- `docs/VOCAB-BATCH-20-12-HANDOFF.md`
- `docs/VOCAB-UI-PREVIEW-V4-MANIFEST.json`
- `preview-ui/preview.js`
- `tests/vocab-batch.browser.js`
- `tests/vocab-batch.test.js`
- `tests/vocab-lab-ui.browser.js`
- `tests/vocab-lab.browser.js`
- `tests/vocab-lab.test.js`
- `tests/vocab-mission.browser.js`
- `tests/vocab-shell.browser.js`
- `tests/vocab-ui-fidelity.browser.js`
- `tests/vocab-ui-preview.browser.js`
- `vocab-lab-core.js`
- `vocab-lab-shell.js`
- `vocab-lab.css`
- `vocab-lab.js`

Ảnh: `screenshots.html`, `batch-screenshots/`, cùng các folder regression. Audit: `scope-audit.json`, `preview-v4-manifest.json`, `FINAL-TEST-RESULTS.txt`. ZIP V1/V2/V3 trước đó được giữ nguyên.
