# Vocab Lab → Library: Preview V3 handoff

Đã đọc `CODEX-VOCAB-LAB-INSIDE-LIBRARY.md` tại `3d40263`, nhận fast-forward doc-only `255e6be` và áp dụng addendum mới `CODEX-HIDE-SAVE-THE-COAST-DEMO.md`. Làm việc bằng Git trên `feature/vocab-lab` trong `lorenkids795/mini-drills`. Không merge/deploy hoặc chỉnh Cloudflare.

## Hành vi mới

- App thật: Vocabulary nằm trong Library → Learning Materials, dùng icon tile/accordion/chevron hiện có. Admin/tester mở Vocab Check hoặc Personalized Missions. Không còn sidebar Vocab Lab hay Mission riêng. Giữ nguyên tên Home/Library theo role hiện có.
- Breadcrumb `Library / Learning Materials / Vocab Lab / …`; Back về danh sách Learning Materials, giữ nguyên dữ liệu Check/Mission. Reload khôi phục view đang học; link `#vocab` cũ vẫn qua kiểm tra quyền. Chuyển Cambridge rồi reload không mở lại Vocab.
- Quyết định mới nhất: không có danh sách hai truyện cố định. Personalized Missions mở prototype P1-linked từ các sense đã phân loại thực tế; Town chỉ hỗ trợ năm sense đã biên tập, không phải engine sinh mission cho cả 102 từ. Không có từ phù hợp thì hiển thị trạng thái chưa đủ từ và Continue Sorting. Không dùng sample classifications trong luồng học.
- Save the Coast được giữ nguyên trong engine/content và regression QA; không có menu/card/CTA trong app hoặc Preview. Local `vocab-mission-preview.html` được gắn nhãn Internal QA; production localhost guard giữ nguyên. Metadata Coast cũ trong static Preview không tự mở lại demo.
- Học sinh thường thấy Vocabulary Coming Soon, không có liên kết hành động; route trực tiếp và shell mount vẫn bị chặn. Writing giữ nguyên Coming Soon/tester access.

## Hai môi trường

UI-only mô phỏng Library/Cambridge/Learning Materials, cùng kiểu category từ ZIP nguồn `mini-drills (6).zip`. Writing/Listening/Reading/Speaking chỉ là hàng Coming Soon tĩnh; không nhập nội dung Writing hoặc auth của app. A/B chỉ là fixture và dữ liệu ở trình duyệt. CSP, network guard, allowlist và gameplay build transforms giữ nguyên.

CSS Library được lấy có phạm vi từ source ZIP: icon paths, `.lm*`, `.subtabs`, `.sechead`; shell kế thừa V2. Không có AI/third-party artwork mới. Chưa có screenshot giáo viên gốc dưới dạng file để đối chiếu; `zip-reference-*` là fixture dựng từ source ZIP, không phải ảnh giáo viên. Font stack theo source, dùng fallback local thay vì tải font ngoài.

## Kiểm thử và audit

- 45 Node tests Vocab/build/store/server + 244 assertions regression hiện có PASS (Writing Unit 0/2, Reading, auth, admin và UI); `lm-check.js` PASS, nội dung Writing pending vẫn giữ nguyên.
- Browser Check standalone/UI, Mission và real app integration PASS. Real app: 65 screenshots, 390/768/1280, light/dark, Back/reload/resume, account switch, stale multi-tab saves, UID-based mock storage và phân quyền. Writing student/tester được kiểm tra lại. Chỉ dùng local fixtures/mocks, không ghi học sinh thật.
- Static output: 42 screenshots Check + internal QA mission phases; full Check → linked Mission → Sorting, retry/hint, Word Morph, Final typed draft resume, A/B isolation PASS. Coast QA được inject bởi test; không phải đường đi trong UI đã ship.
- Fidelity: 32 ảnh before/after/reference, Library rows, typography, shell geometry, desktop collapse/mobile drawer, Escape/focus/inert và controls ≥44px PASS.
- Hosted HTTPS origin mô phỏng: không có Firebase/config/API production; không có unexpected requests/page errors. Chặn fetch ngoài allowlist, XHR/WS/EventSource/beacon; bỏ cookies; không theo redirect đến API. “Offline” ở đây nghĩa không dùng dịch vụ bên ngoài; vẫn tải file static từ host cùng origin.
- Kiểm tra riêng: legacy Coast metadata không khôi phục UI công khai, không có sample control, empty mission không có Begin, Back giữ nguyên raw Check storage PASS.
- Byte/hash audit: toàn bộ block inline Learning Materials/Writing (`lmData` đến trước `renderLib`) không đổi; SHA-256 `2afc6e66a1cc18acbd88eff81b0ae8148661be4ff77e57a4ac7243545377c81d`. Các file Writing, Vocab controllers/core/store/data, mission CSS/content, guard và builder không đổi. Không sửa nested `mini-drills/`, backend/rules/config. Không thêm secret markers; diff whitespace check PASS.
- Một lượt test trung gian còn selector menu Coast cũ sau khi nhận addendum; đã chuyển sang internal QA, chạy lại cả static/fidelity/real-shell suite và PASS. Log cuối của ba suite là `test-results-vocab-ui-preview.browser.js-vocab-ui-fidelity.browser.js-vocab-shell.browser.js.txt`.

## Artifact / trước khi đưa lên web

ZIP `ui-only-static-v3.zip`: đúng 17 file static ở root, không bọc trong thư mục. Đã giải nén so từng byte với build và kiểm manifest. So V2, chỉ đổi `index.html`, `preview.css`, `preview.js`, `vocab-lab.css`, `manifest.json`; 12 file khác giữ nguyên byte, gồm CSP headers/network guard/gameplay/data.

ZIP size: 95900 bytes. SHA-256: `0989e9c2a77d8a3392253d3c2c6221e266627578fcdc4b3564c84a4c6e3d4f41`.

Giáo viên có thể dùng ZIP này để upload thủ công sau khi duyệt ảnh, vào đúng project Direct Upload `mini-drills-vocab-ui-preview`; Git push không cập nhật project đó. Không dùng project production `myhomeworkmyfuture`. Chưa upload/deploy trong task này.

Trước khi đưa app thật lên web: đối chiếu screenshot/web thật, kiểm quyền admin/tester bằng tài khoản staging; reconcile các thay đổi Writing/backend mới trên main; kiểm rules bằng Firebase emulator/staging (task này chỉ chạy mocks/static contract), xác nhận build/root/output và cấu hình Cloudflare. Mission app thật vẫn chỉ local sandbox; chưa có cloud Mission sync hoặc nội dung cho mọi bộ từ. Đây không phải xác nhận app production sẵn sàng deploy.

## File thay đổi

- `docs/VOCAB-LIBRARY-PREVIEW-V3-HANDOFF.md`
- `docs/VOCAB-LIBRARY-PREVIEW-V3-MANIFEST.json`
- `index.html`
- `preview-ui/index.html`
- `preview-ui/preview.css`
- `preview-ui/preview.js`
- `tests/vocab-lab.browser.js`
- `tests/vocab-lab.test.js`
- `tests/vocab-mission.browser.js`
- `tests/vocab-shell.browser.js`
- `tests/vocab-ui-fidelity.browser.js`
- `tests/vocab-ui-preview.browser.js`
- `vocab-lab-shell.js`
- `vocab-lab.css`
- `vocab-mission-preview.html`

Ảnh và kết quả: `screenshots.html`, `before-after/`, `app-screenshots/`, `static-screenshots/`, `scope-audit.json`, `library-routing-checks.json`, `preview-v3-manifest.json`, các log test trong thư mục bàn giao. Manifest được lưu trong repo tại `docs/VOCAB-LIBRARY-PREVIEW-V3-MANIFEST.json`.
