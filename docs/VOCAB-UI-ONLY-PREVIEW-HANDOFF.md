# Vocab Lab — UI-only preview handoff

## Kết quả và phạm vi

Đã triển khai task `docs/CODEX-UI-ONLY-CLOUDFLARE-PREVIEW.md` tại baseline `7f8826d`, trên `feature/vocab-lab`. Task trước đó mới có tài liệu, chưa có bundle static độc lập. Lượt này tạo bundle riêng và kiểm thử từ chính bundle; không sửa runtime Mini Drills, Firebase rules, Writing, cấu hình Cloudflare hoặc bản `mini-drills/` lồng bên trong. Commit tích hợp trước vẫn là `83c5d8e`; commit mới được ghi trong lịch sử Git và `commit.txt` của gói bàn giao.

Theo task do giáo viên cung cấp: project hiện hữu **myhomeworkmyfuture** có production branch `main`, auto production deployments bật; Preview chưa có env/bindings riêng. Không dùng project này cho artifact mới. Fetch đầu lượt cho thấy main tại `372e9c0`; trước commit main tiếp tục tiến tới `3ea7713` với thay đổi Writing/backend. Không merge, cherry-pick hoặc ghi đè các thay đổi đó. Preview dùng các Vocab components trên feature và shell độc lập mang bố cục Mini Drills.

## Build và kiểm tra lại

Tại repository root, với Node có sẵn, không cần cài package để build/serve:

```powershell
node tools/build-vocab-ui-preview.cjs
node tools/build-vocab-ui-preview.cjs --verify
node tools/serve-vocab-ui-preview.cjs
```

Mở `http://127.0.0.1:8787/`. Server bind localhost, chỉ đọc `preview-ui-dist/`, kiểm manifest và nội dung trước khi phục vụ; không có proxy/API. Có thể dùng `--port 8788` nếu cổng mặc định đang bận. Không mở HTML bằng `file://`; JSON fetch và Web Locks cần localhost hoặc HTTPS. Build output `preview-ui-dist/` đã gitignore, source và docs mới được commit/push.

Trong workspace hiện tại:

- Generated output: `C:/Users/hnnhiii/Documents/Codex/2026-10-28/github-plugin-github-openai-curated-remote/work/mini-drills/preview-ui-dist/`.
- Deliverables: `C:/Users/hnnhiii/Documents/Codex/2026-10-28/github-plugin-github-openai-curated-remote/outputs/vocab-ui-only-preview/`.
- `ui-only-static.zip`: **chỉ 17 file artifact**, sẵn để giáo viên duyệt; `index.html` ở ngay gốc ZIP.
- `static-bundle/manifest.json`: kích thước và SHA-256 của 16 file nội dung; manifest là file thứ 17, không tự hash chính nó. `artifact-sha256.txt` ghi hash của ZIP.
- `gallery.html`, `browser/*.png`: 42 ảnh shell/Check, hai Mission, Word Morph và Final; desktop/tablet/mobile, sáng/tối.
- `test-results.txt`, `browser/network-trace.json`, `browser/browser-results.txt`, `scope-audit.json`: bằng chứng kiểm thử và phạm vi.

## Allowlist artifact — không publish repo root

```text
_headers
index.html
manifest.json
network-guard.js
preview.css
preview.js
vocab-lab-core.js
vocab-lab.css
vocab-lab.js
vocab-mission-content.js
vocab-mission-core.js
vocab-mission-store.js
vocab-mission.css
vocab-mission.js
data/vocab-lab-p1.json
data/vocab-lab-practice.json
data/vocab-lab-practice-v1.json
```

Không có `md-config.js`, `md-backend.js`, Firebase SDK, `vocab-lab-store.js`, Functions/Workers, KV/R2, secrets, auth UI, production URL, external font/image hoặc roster/bài làm của học sinh. Dữ liệu là 102 approved P1 senses/practice fixtures đã có và authored mission riêng; ID bài học/từ không phải user IDs. Tester A/B là hai fixture `.local.invalid`, không là tài khoản thật.

Build dùng allowlist cố định, từ chối file/thư mục lạ kể cả khi rebuild. Verify so byte với kết quả biên dịch hiện tại, hash/manifest và kiểm đường dẫn/symlink; không chỉ tin manifest do output tự khai. Transform phải tìm đúng boundary cloud/sync/eligibility trong source; nếu component đổi, build dừng để review thay vì lặng lẽ copy backend. Test có trường hợp drift, tamper, missing file và chèn backend/config/Functions.

## Cơ chế cô lập và gameplay

- Không copy `index.html` ứng dụng thật. Shell mới dùng header/logo chữ, sidebar, spacing, theme và responsive quen thuộc; system fonts tránh tải font ngoài. Writing và màn không liên quan bị disable; không có login/password hoặc liên kết sang production.
- Check được biên dịch từ component thật nhưng **loại bỏ branch khởi tạo cloud và sync adapter**. Mount trong artifact chỉ chấp nhận hai fixture và `demo:true`; không có SDK hay adapter để rơi về backend.
- Mission giữ pure core/content/store gốc. Chỉ bản controller **được sinh trong dist** có gate UI-only marker + hai fixture để chơi trên HTTPS. File `vocab-mission.js` production vẫn giữ `local() && demo===true`; không tắt guard source production.
- Mỗi fixture có Check riêng và Mission namespaces riêng theo nguồn `authored/fixture/check`; snapshot/version, independent/assisted, verified bypass và per-form evidence giữ nguyên. Town dùng Check đã sort; menu cho phép chọn sample classifications rõ nhãn. Save the Coast là authored demo độc lập. Continue Sorting sau reload vẫn trở lại batch đúng.
- LocalStorage/Web Locks chỉ lưu trên browser/origin hiện tại; không cross-device sync, không tạo/ghi progress thật, không migrate cache sang production. Đổi URL/project tạo origin và progress mới. Storage lỗi/thiếu Web Locks không được coi là đã lưu thành công.
- Guard fetch chỉ cho GET ba JSON fixture cùng origin, luôn `credentials: omit`, `redirect: error`. XHR, WebSocket, EventSource và beacon bị chặn. CSP self-only cho script/style, không font, frame, worker, object hoặc form submission; không dùng inline script hay eval. Chỉ static asset được phép có thể xuất hiện trong network trace.

## Kiểm thử đã thực hiện

- **289 kiểm tra Node PASS**: 39 Vocab hiện có + 6 build/server safety + 244 app regressions; kiểm tra nội dung Writing PASS. Những bài này chạy trên source feature hiện tại, không tuyên bố đã kiểm thử/merge các commit Writing mới của main.
- Browser safety suite chạy **từ dist độc lập**, có CSP và kiểm tất cả requests/responses/WebSockets. 42 ảnh: 390/768/1280, light/dark, reduced motion, controls tối thiểu 44px, không tràn ngang; Final không word bank/teaching answer. Đã xem trực quan các màn chính và so với ảnh app thật của lượt tích hợp trước.
- Chơi hết Check → Town → Sorting; sai lần đầu không lộ đáp án, retry/resume assisted; input Check giữ nguyên khi chơi Mission. Town sau reload vẫn về đúng batch.
- Chơi hết Save the Coast: 5 câu cộng dồn bằng keyboard trong một paragraph, teaching sau attempt, 3 vòng Morph và independent evidence theo form, Final typed draft qua F5, identity A/B tách biệt.
- Mô phỏng origin HTTPS ngoài localhost bằng route offline đọc **chính dist**, chứng minh artifact chơi được trên secure origin mà không đổi production gate. Đây không phải deployment thật hay URL public đã tạo.
- Negative probes: API/config/external fetch bị từ chối trước network; WebSocket/XHR/EventSource/beacon bị chặn; cookie giả của test không được gửi qua fixture fetch dù caller yêu cầu `include`. Redirect 302 giả lập bị fetch từ chối và **không có request theo tới API**. Trace phân biệt redirect thử nghiệm có chủ đích với gameplay thường.
- Kết quả trace: **0 request ngoài allowlist, 0 API/Firebase production calls, 0 unexpected redirects, 0 WebSockets, 0 page errors** trong các luồng ứng dụng. Lệnh verify sau test PASS. Trace chỉ ghi URL/method/resource type của tài nguyên tĩnh, không ghi token/cookie values.

## Giới hạn và kiểm tra sau khi giáo viên duyệt publish

Chưa tạo Pages project, upload, deploy, sửa DNS/domain, env/bindings, rules hoặc merge main. Chưa có URL online thật. Teacher chưa duyệt cuối toàn bộ Word Morph/Final; đây là UI review và exact-match authored answer lists, không chứng nhận mastery hay grading ngữ nghĩa.

Pages URLs mặc định có thể truy cập công khai; artifact chỉ có nội dung demo/public fixtures, không đặt dữ liệu bí mật vào đó. Nếu cần giới hạn người xem, nên đánh giá Cloudflare Access ở một bước riêng trước publish. **Access cookie authentication chưa được kiểm thử; fetch artifact cố ý không gửi cookie và có thể không đọc được JSON sau gate cookie-based. Không tự bật Access hoặc nới credential policy trong lượt này.** Không thêm analytics/Zaraz/RUM hoặc service injection; chúng làm thay đổi tiêu chí zero external network và cần review/test lại.

Sau publish tương lai, kiểm tra DevTools Network trên URL mới: đúng 17-file artifact/SHA, CSP có hiệu lực, không external host/API/auth/WebSocket/redirect, thử hai fixtures, F5, Morph/Final. Test Chrome/Edge và mobile thực tế; screenshot/automation hiện tại không thay audit screen reader hoặc toàn bộ browser engines.

## Các bước deploy an toàn — chỉ dành cho giáo viên sau approval

1. Chạy build + verify ở trên; kiểm `ui-only-static.zip` có đúng 17 entries và `index.html` ở gốc. **Không upload repository, repo root, thư mục `mini-drills/` lồng hoặc ZIP chứa báo cáo/source.**
2. Cloudflare dashboard → Workers & Pages → Create application → Pages → **Drag and drop your files / Upload assets** (Direct Upload). Tạo **project mới** với tên riêng, ví dụ `mini-drills-vocab-ui-preview`; nếu tên đã tồn tại, dừng và xác minh, không chọn lại project production `myhomeworkmyfuture`.
3. Chọn đúng ZIP static đã audit hoặc chỉ thư mục `preview-ui-dist/`. Không thêm Variables/Secrets, Functions, KV/R2, production custom domain, analytics hoặc backend service. Xem lại tên project và danh sách asset trước thao tác publish.
4. **Dừng tại màn review cho đến khi chủ dự án quyết định Deploy site.** Codex chưa thực hiện thao tác đó. Lần publish đầu có thể được Cloudflare gọi là production của *project demo mới*; nó không được gắn với project/domain production hiện hữu.
5. Sau khi giáo viên tự publish, dùng URL Pages của project mới để chạy smoke test như trên trước khi chia sẻ. Chưa có URL để gửi trong lượt bàn giao này.

Direct Upload không chuyển trực tiếp sang Git integration về sau; muốn Git integration cần project mới khác. Với Git trong tương lai phải có build context/repository chỉ chứa artifact tĩnh đã audit, không để Pages tự phát hiện Functions từ repo ứng dụng hiện tại. Chưa cấu hình Git deployment cho project mới.

Rollback: giữ ZIP/hash đã audit. Nếu bản demo mới lỗi, ngừng chia sẻ URL và chỉ đưa lại artifact demo đã kiểm thử vào **project demo riêng** sau approval; không đổi `myhomeworkmyfuture`, main, domains hoặc production env. Không xóa cache browser của người dùng một cách tự động.

Nguồn nền tảng: [Direct Upload và giới hạn chuyển sang Git](https://developers.cloudflare.com/pages/get-started/direct-upload/), [Preview URLs và access visibility](https://developers.cloudflare.com/pages/configuration/preview-deployments/), [Skip deployment qua commit prefix](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/). Các bước dashboard có thể đổi nhãn; nếu không thấy Pages/Direct Upload, dừng thay vì chọn nhầm Worker hoặc project hiện có.

## File source mới được commit

`.gitignore`; `preview-ui/index.html`, `preview-ui/preview.css`, `preview-ui/network-guard.js`, `preview-ui/preview.js`; `tools/build-vocab-ui-preview.cjs`, `tools/serve-vocab-ui-preview.cjs`; `tests/vocab-ui-preview.test.js`, `tests/vocab-ui-preview.browser.js`; báo cáo này. Generated dist và deliverables nằm ngoài commit theo chủ đích. Commit dùng `[CF-Pages-Skip]` và chỉ push `feature/vocab-lab`.
