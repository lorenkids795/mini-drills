# Vocab Check Phase 1.1 — báo cáo thực hiện

> Đây là bản ghi QA tại thời điểm hoàn tất triển khai local, trước khi commit. Sau đó giáo viên đã yêu cầu commit/push Phase 1.1; checkout được fast-forward tới commit tài liệu `d6d6750` trước khi chuẩn bị commit. Các mô tả “chưa commit/push” bên dưới là trạng thái lịch sử của lần bàn giao local. Xem Git log để lấy hash thực tế. Merge vào main, deploy và thay đổi production vẫn không thuộc phạm vi.

## Branch và tài liệu áp dụng

Đang làm trên `feature/vocab-lab` của `lorenkids795/mini-drills`. HEAD local giữ nguyên `5b2346644c3b860d2ad45fdf9067423634901fee`; mọi thay đổi Phase 1.1 chưa commit. Đã fetch và đọc tài liệu mới nhất `docs/CODEX-PHASE-1.1-VOCAB-CHECK-UI-UX-QA.md` trực tiếp từ `origin/feature/vocab-lab` tại commit `d6d6750`. Remote mới hơn local đúng một commit chỉ bổ sung hướng dẫn; chưa merge, rebase, commit, push hay deploy.

## UI đã thực hiện

Sorting dùng thẻ trung tâm gọn, ba tile có SVG nguyên bản đặt ngang tại 390/768/1280px (dưới 340px chuyển stack gọn), Undo ngay bên dưới, một vùng tiến độ, chips đếm nhỏ. Hiệu ứng ra/vào 180ms có selected feedback; khoá ngắn chống double-submit, tắt animation khi reduced motion. Focus bàn phím đi theo từ mới, không nhảy cuộn ngoài ý muốn.

Batch Ready là chuyển tiếp ngắn với ba bộ đếm và một CTA chính; không có Know It thì nói rõ bỏ qua check và chuyển sang kết quả. Results hiển thị Batch complete, tiến độ tổng, số phân loại của batch, verified / needs practice / not checked, một CTA tiếp tục; phân loại lại nằm trong details đóng sẵn. Các số kiểm chứng là của batch hiện tại, không phải tuyên bố thành thạo cả bài.

Reality Check có ngữ cảnh, ba lựa chọn dễ đọc, đánh dấu riêng lựa chọn sai, hint trung tính ngay bên dưới. Reveal nằm trong Stuck? và giải thích rõ hệ quả trước khi bấm. Kết quả đúng có giải thích nghĩa/cấu trúc, không chỉ lặp đáp án. Đúng sau retry/hint/reveal vẫn Needs practice. Chỉ first-try không hint được xác minh trong task hiện tại; không Mastered.

Preview utilities tách khỏi activity. Không sửa overlay Work with Codex của host. Chỉ HTML/CSS/SVG nguyên bản, không ảnh AI, không asset Pinterest, không framework/font download mới.

## Removed / Consolidated / Retained

### Removed

- [x] Khung từ khổng lồ có viền nét đứt và khoảng trống thừa.
- [x] Toàn bộ sidebar This batch trên tất cả trạng thái.
- [x] Source ID, priority, mã lesson và Device-only sandbox khỏi màn học.
- [x] Badge Vocab Lab · Preview lặp, mô tả thuật toán 3→5, dòng Unsampled Know It (subset), chữ kỹ thuật word-family evidence, lời hứa Missions/Puzzles.
- [x] Nút Reveal nổi bật trước khi thử; bảng sáu hàng thống kê dày.
- [x] Nội dung Firebase/QA và thông báo sandbox lặp trong activity.

### Consolidated

- [x] Một vùng tiến độ tổng + nhãn word/batch/check.
- [x] Sidebar thành ba chips nhỏ khi hữu ích; không hiện chips trong Reality Check.
- [x] Một thông báo browser-only trong preview utilities, Save/error nhỏ ngoài game surface.
- [x] Kết quả kiểm chứng thành ba số rõ; giải thích giáo dục ngắn, chi tiết trong details.

### Retained

- [x] 102 mục P1, 69 Core / 20 Supporting / 13 Advanced; slum Supporting; không Royal Commission; P2 giữ pending và không được tải vào UI.
- [x] Batch 12, một từ, ba bins, Undo/U, 1/2/3, autosave/resume và tách tài khoản.
- [x] Sampling 3–5 hoặc ít hơn theo số Know It; zero Know It skip; hint/retry/reveal không thành independent evidence.
- [x] Admin/tester gate, học sinh thường chưa có Vocab Lab; Writing Coming Soon và tester Writing access giữ nguyên.
- [x] Revise và lịch sử lần thử, feedback aria-live, focus, theme, reduced motion.

## Nội dung 102 câu

102/102 câu v2 đã được rà theo nghĩa/source của bank duyệt sẵn, sửa options và giải thích; 34 hints được sửa để tránh gợi thẳng định nghĩa, 2 context dạng định nghĩa được đổi thành tình huống tự nhiên. `overcrowded` giữ ngữ cảnh và clue về người/không gian; `succeed` sửa tham chiếu It/team và bổ sung mẫu succeed in doing something.

Tất cả vẫn có `reviewed_pending_teacher`, không giả định giáo viên đã duyệt. 20 mục có thêm flag kỹ thuật, đa nghĩa, vùng miền hoặc ngôn ngữ xã hội cần xem kỹ. Không có full passage gốc để đối chiếu độc lập; QA dựa trên nghĩa/source trong bank được cung cấp. Xem bảng đầy đủ 102 dòng trong `editorial/VOCAB-LAB-PHASE-1.1-CONTENT-QA.md`.

## Sửa chức năng hẹp bắt buộc cho tương thích nội dung

Core Phase 1 hardcode taskId context-v1 khi ghi evidence. Nếu chỉ thay nội dung, kết quả mới có thể bị gán cho phiên bản cũ, và một lần trả lời dở có thể đổi lựa chọn sau refresh. Đã sửa đúng hàm settle và ba call site để dùng ID câu thực sự đã trả lời.

Giữ nguyên byte bản 102 câu v1 trong file archive. UI pin câu đã có attempt v1 trong batch đang dở về đúng context/options cũ; hint trung tính và giải thích tốt hơn được áp dụng theo cùng sense, không xoá cờ hint/retry. Các kết quả cũ không bị xoá hay đổi nhãn. Khi chủ động phân loại lại hoặc bắt đầu câu mới, dùng context-v2. Test riêng kiểm tra old→reload→retry, giữ evidence v1 rồi revise mới ghi v2. Không đổi Firestore schema, security rules hay store.

## Kiểm thử và ảnh

- `node --test tests/vocab-lab.test.js`: 15/15 PASS.
- 10 suite hiện có: 244/244 PASS (auth, Reading, Writing/LM, admin, UI).
- `node tests/lm-check.js`: Unit 0/2 không lỗi draft; trạng thái pending cũ giữ nguyên.
- `node tests/vocab-lab-ui.browser.js`: 36 ma trận viewport/state/theme PASS; no overflow; touch targets ≥44px; contrast chữ ≥4.5:1 và viền control ≥3:1 theo các sample được kiểm tra; Sorting/Undo trong fold và hint sai lần đầu nhìn thấy không cần tự cuộn.
- Browser bổ sung: double-click chỉ một action; reload giữa chuyển thẻ; keyboard/focus; reduced motion; zero-Known skip; tài khoản riêng; legacy/v2 resume và evidence PASS.
- `node tests/vocab-lab.browser.js`: regression Phase 1, root app integration, offline draft/reload/retry qua Firestore double PASS.
- Kiểm tra preview local app: admin/tester thấy Vocab Lab, ordinary student không thấy; sort/resume và 390px PASS. API thật bị chặn.
- `git diff --check`: không lỗi whitespace. Không thay đổi file ngoài phạm vi được phép. Chưa chạy Firebase thật/emulator; các test Firestore là double/static checks, không phải integration test quyền server.

Ảnh gốc trước: 24 PNG, 6 trạng thái × desktop/390 × light/dark. Ảnh sau: 36 PNG thêm 768px. Trạng thái gồm Sorting, Ready, Check trước, sai lần đầu, đúng lần đầu, Results. Tất cả dùng fixture tài khoản giả, không dùng dữ liệu học sinh. Ảnh trước đã chụp trước khi sửa source. Gallery cung cấp 24 cặp trước/sau; PNG đầy đủ trong gói ảnh.

Chiều cao full-page ở các fixture sáng (viewport mobile 390×844, desktop 1280×900; trang ngắn hơn viewport được tính bằng chiều cao viewport):

| Viewport | Màn hình | Trước | Sau |
| --- | --- | --- | --- |
| 390px | sorting | 1553px | 844px |
| 390px | ready | 1155px | 844px |
| 390px | check-wrong | 1578px | 855px |
| 390px | results | 1562px | 869px |
| 1280px | sorting | 1012px | 900px |
| 1280px | ready | 900px | 900px |
| 1280px | check-wrong | 1008px | 900px |
| 1280px | results | 1103px | 907px |

Sorting mobile giảm từ 1553px xuống một viewport 844px. Reality Check có hint và Results chỉ dài hơn viewport một ít; feedback/CTA chính vẫn trong fold ở fixture kiểm tra. Không chỉnh overlay của Codex host.

## File thay đổi chính xác

- `data/vocab-lab-practice-v1.json`
- `data/vocab-lab-practice.json`
- `docs/VOCAB-LAB-PHASE-1.1-REPORT.md`
- `editorial/VOCAB-LAB-PHASE-1.1-CONTENT-QA.md`
- `editorial/vocab-lab-contexts.tsv`
- `editorial/vocab-lab-review.tsv`
- `tests/vocab-lab-ui.browser.js`
- `tests/vocab-lab.test.js`
- `tools/build-vocab-practice.py`
- `vocab-lab-core.js`
- `vocab-lab-preview.html`
- `vocab-lab.css`
- `vocab-lab.js`

`index.html`, `firestore.rules`, `vocab-lab-store.js`, auth/config, toàn bộ `lm-*`, dữ liệu từ vựng P1/P2, backend và cây `mini-drills/` lồng bên trong không đổi. Không ghi dữ liệu production, không có asset bên ngoài.

## Chơi thử local

Server local đã cập nhật ở `http://127.0.0.1:8765/vocab-lab-preview.html`; F5 để nạp UI mới. Chọn Tester A/B và Switch theme; sort đủ 12, giữ ít nhất 3 Know It để thử check. F5 giữa batch và sau một lần sai để thử resume. `http://127.0.0.1:8765/app/` dùng tài khoản demo để thử gate admin/tester/student. `http://127.0.0.1:8765/mobile` là khung 390px.

Nếu server chưa chạy, có thể dùng launcher Windows đã bàn giao hoặc chạy static server ở root repo: `python -m http.server 8765 --bind 127.0.0.1`, rồi mở **vocab-lab-preview.html**. Không mở index.html trỏ cấu hình production để thử ghi thật. Standalone không nạp Firebase; autosave ở cùng trình duyệt/origin. Chưa xác minh sync đa thiết bị/quyền Firebase thật hoặc cấu hình Cloudflare.

## Trạng thái bàn giao

Chưa commit/push Phase 1.1, chưa merge/deploy. Local HEAD vẫn 5b23466; remote có thêm commit tài liệu d6d6750 đã đọc. Khi được yêu cầu commit, cần cập nhật commit tài liệu cùng branch trước khi push, giữ các thay đổi source local. Không cần triển khai database cho các sửa UI này; việc kiểm thử rules Phase 1 trên Firebase test vẫn là bước riêng trước release.
