# UI Preview V2 — shell fidelity handoff

Đã thực hiện hai task `CODEX-UI-PREVIEW-FIDELITY-FIX.md` và `CODEX-LATEST-ZIP-SHELL-ADDENDUM.md` trên `feature/vocab-lab`, baseline `d520d29`. Chỉ thay shell preview và tests/docs. Không merge/deploy, sửa Cloudflare, ghi đè index ứng dụng thật hoặc chạm Writing/backend.

## Source chuẩn đã dùng

Đọc trực tiếp `E:/download/down coke/mini-drills (6).zip`, chỉ trích entry cần thiết vào work area để phân tích; không extract/overwrite vào repository. ZIP SHA-256: `37b7beafe71d7635a0e8b5da8a5b760c36e60872fa7bd765faa0b5560ed6f72e`. Entry `mini-drills/index.html`: 858877 bytes, SHA-256 `be4cf2ce7a8d652554ae16bd10717e30d0d1cbddb5f1338cb98b3936c92f94c5`.

Git blob entry ZIP là `ef18f81cb01a91ed9b458b7158de62e09273bd03`, khớp `origin/main:index.html` tại commit đã quan sát `3ea771389edf53750ddd1d79445e78afd199a4d1`. Feature root index khác (`6cbf8d3d44966608a34be22a0385574ee9c67eff`). Vì vậy ZIP mới là chuẩn bố cục, không dùng shell cũ để suy đoán; khác biệt backend/Writing không được nhập vào feature.

Các selector và metrics được ghi riêng tại `docs/VOCAB-UI-PREVIEW-V2-REFERENCE.json`. CSS shell được lấy có phạm vi từ source: `.app`, `.top`, `.brand`, `.right`, `.shell`, `.side`, `.tabs`, `.mainc`, `.sbbtn`, drawer/backdrop, palette và mobile overrides. Không chép nguyên index, app script, auth hoặc dữ liệu tài khoản trong ZIP.

**Chưa nhận được ảnh admin gốc dưới dạng file ảnh trong turn này; ZIP chỉ có icons, không có screenshot đó.** Ảnh `zip-reference-*` là bản dựng fixture từ CSS/DOM thật của ZIP (không chạy app/auth scripts), không phải screenshot do giáo viên chụp. Gallery ghi rõ điều này. Teacher vẫn cần duyệt bằng ảnh/web thật trước khi upload lại; không tuyên bố pixel-perfect với ảnh chưa nhận được.

## Khác biệt V1 → V2

V1 đã có giới hạn 1180px, nhưng header và layout là hai wrapper riêng, main có padding thêm, toolbar/menu/disclaimer khác source. V2 dùng một `.app` chứa header và shell đúng cấu trúc ZIP.

| Mốc tại viewport 1280, scale 1 | V1 | V2 | Reference ZIP |
| --- | --- | --- | --- |
| Container width/x | 1180 / 50px | 1180 / 50px | 1180 / 50px |
| Logo font size | 28px | 32px | 32px |
| Header border bottom y | 85.75px | 77px | 75px |
| Sidebar x/width | 50 / 208px | 50 / 208px | 50 / 208px |
| Main box x/width | 288 / 942px, thêm 20px padding trái | 286 / 944px, không padding thừa | 286 / 944px |
| Main/sidebar top y | 105.75px | 95px | 93px |
| Active row radius | 9px | 8px | 8px |

Chênh 2px header/logo offset với source là chủ đích accessibility: source có nút 40/42px; preview đặt sàn 44px. Nav chỉ còn ba mục nên chiều cao nhóm thấp hơn menu admin nhiều mục trong reference. Các box x/width của app/header/sidebar/main khớp reference trong tolerance 0.1px ở cả sáng/tối; cỡ chữ logo khớp.

- Header: hamburger luôn có trên desktop, wordmark dùng `<b>Mini <mark>Drills</mark></b>`, nhóm `.right/.who` compact với fixture Tester A/B và theme. Không Admin giả, trạng thái kết nối hoặc Sign out giả.
- Sidebar: nền/border/radius, padding 6px, gap 2px và active row theo source. Chỉ Vocab Check, Town on the Move, Save the Coast; xóa Writing/Other disabled và card Sign out.
- Main: sát sidebar theo đúng gap 28px, bỏ panel demo lớn trước nội dung. Notice gọn `UI demo · local browser data` trong details phía dưới phần học.
- Font stack đúng source: `Be Vietnam Pro`, system-ui, -apple-system, Segoe UI; mono tương ứng `IBM Plex Mono`. Không tải Google fonts hoặc font file mới. Nếu máy không có font chính thì dùng fallback; reference render cũng dùng cùng chính sách offline. Đây là giới hạn fidelity được công khai.
- Responsive: breakpoint 1024, desktop column thu gọn và nhớ lựa chọn; mobile drawer rộng `min(280px,84vw)` theo source, backdrop + scroll lock, đóng bằng Escape/×/click backdrop/chọn view. Có focus return/trap và inert main trong lúc drawer mở; đổi viewport đúng state.

## Gameplay và bảo vệ giữ nguyên

Không sửa các Vocab domain/controller/content/store/CSS nguồn, data fixtures, builder, local server, `network-guard.js` hoặc CSP. Các entry trong ZIP V2 **chỉ khác V1 ở `index.html`, `preview.css`, `preview.js` và manifest hash tương ứng**. Những file gameplay và guard có byte/hash giống V1.

17-file allowlist giữ nguyên. Không thêm Firebase SDK/config/backend, Functions, auth, font/image/network dependency hoặc student data. Fixture identities, source separation, snapshot version, Check/Mission save keys, per-form evidence, hint/retry independence, Case File và Final recall đều giữ nguyên. Sidebar preference là key UI riêng; không đổi dữ liệu học tập. Bản production vẫn giữ localhost/demo gate.

Safety suite tiếp tục chặn external requests, API/auth calls, redirect-follow, WebSocket/XHR/EventSource/beacon; fixture fetch vẫn `credentials: omit`. Access cookie-auth chưa được kiểm thử, không nới credential policy. Không dùng toàn bộ ZIP source làm build output.

## Kết quả kiểm thử

- 289 kiểm tra Node PASS (45 Vocab/build/server + 244 app regressions); Writing content check PASS trên source feature hiện tại. Không tuyên bố đã merge/test Writing mới trong ZIP vào feature.
- UI-only safety/gameplay suite PASS: 42 ảnh 390/768/1280 light/dark, hai mission đi hết luồng, Check→Mission→Sorting, neutral first-error/hint, typed resume, identity A/B, secure hosted-origin simulation; controls 44px, không overflow, không page error.
- Fidelity suite PASS: 6 viewport/theme contracts, geometry against ZIP reference, only 3 nav items, compact disclosure, desktop collapse + reload preference, mobile keyboard/overlay/Escape/focus/inert; 20 ảnh before/after/drawer/reference.
- Network trace: 763 same-origin static requests, 0 unexpected requests, 0 production Firebase/API calls, 0 page errors. Negative redirect probe được ghi riêng và không được theo tới API; cookie test vẫn không gửi cookie. Fidelity reference tests cũng không có external request.
- Build verify, artifact manifest/hash/allowlist và Git diff check PASS. Đã xem ảnh V1/V2/reference cạnh nhau; đây là kiểm chứng source-shell, không thay thế final teacher visual review hoặc mọi browser engine/screen reader.

## Artifact và cách xem

Build bằng `node tools/build-vocab-ui-preview.cjs`, verify bằng `node tools/build-vocab-ui-preview.cjs --verify`; output vẫn là `preview-ui-dist/` gitignored. Serve bằng `node tools/serve-vocab-ui-preview.cjs`, mở `http://127.0.0.1:8787/` rồi refresh để nhận V2.

Deliverables ở `outputs/vocab-ui-preview-v2/` của workspace này:

- **`ui-only-static-v2.zip`**: 17 file tĩnh, `index.html` ở gốc, không kèm docs/reference/tests. V1 `ui-only-static.zip` được giữ nguyên để phân biệt và rollback.
- `artifact-sha256.txt`, `static-bundle/manifest.json`, `scope-audit.json`: hash và kiểm phạm vi.
- `comparison.html`: trước/sau và ZIP-source reference ở cùng viewport/theme, có số đo và nhãn reference rõ ràng.
- `browser/`: 42 gameplay snapshots, network trace và log.
- `fidelity/`: 20 ảnh shell/drawer/before/after/reference và `fidelity-metrics.json`.
- `test-results.txt`, `Report.md`, `commit.txt`: kết quả và commit đã push.

Fidelity test có thể nhận `VOCAB_SHELL_REFERENCE_DIR` trỏ tới bản trích work area và `VOCAB_PREVIEW_V1_DIR` trỏ tới V1 đã audit; không có ZIP thì vẫn kiểm contract metrics đã ghi nhưng không tự thay bằng remote main hay giả mạo screenshot. Lượt này đã cung cấp hai biến và kiểm cả reference/before.

## Upstream và upload

Các anchor CSS/DOM shell này vốn đã ở app thật; **không cần đưa shell preview ngược lên app thật**, không thay header/nav sản phẩm bằng fixture UI. Identity selector, demo details và allowlist adapter chỉ thuộc preview. Sàn hit target 44px và focus/inert của drawer có thể được cân nhắc thành patch accessibility riêng sau này, với auth/Writing regression riêng; không port mù từ preview.

Không có thay đổi gameplay cần upstream trong lượt này. Future Vocab integration nên mount components trong shell thật sẵn có, giữ source Writing mới, không copy index từ ZIP hoặc preview.

**Push Git không tự cập nhật project Cloudflare Direct Upload riêng.** Giáo viên cần duyệt V2 rồi upload thủ công **chỉ ZIP V2** vào đúng project UI demo độc lập đã tạo, không vào `myhomeworkmyfuture`, không upload repo root. Áp dụng quy trình project/manifest/no-bindings trong handoff UI-only trước; không thêm secrets, Functions, production domain, analytics hoặc credential policy mới. Codex chưa upload/deploy/chỉnh settings.

Rollback UI demo bằng ZIP V1 đã giữ, chỉ sau quyết định của chủ dự án; không chạm production hoặc xóa progress browser tự động. Teacher review và re-upload là bước tiếp theo, ngoài phạm vi thực thi hiện tại.

## File thay đổi

`preview-ui/index.html`, `preview-ui/preview.css`, `preview-ui/preview.js`, `tests/vocab-ui-preview.browser.js`, `tests/vocab-ui-fidelity.browser.js`, `docs/VOCAB-UI-PREVIEW-V2-REFERENCE.json`, báo cáo này. Prefix commit `[CF-Pages-Skip]`, push chỉ `feature/vocab-lab`.
