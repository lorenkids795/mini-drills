# Vocab Lab — early integration QA

## Phạm vi và trạng thái

Repository `lorenkids795/mini-drills`, branch `feature/vocab-lab`. Phase 2 refinement đã hoàn tất tại `200d11eeebd96fde7713c75871ffb3b0083f2472` trước lượt tích hợp này. Hướng dẫn áp dụng: `docs/CODEX-VOCAB-LAB-EARLY-INTEGRATION.md`. SHA của commit tích hợp được ghi trong handoff `commit.txt` và lịch sử Git của báo cáo này, tránh ghi SHA tự tham chiếu chưa tồn tại.

| Hạng mục | Sẵn sàng đến đâu |
| --- | --- |
| Admin/tester chơi trong app Mini Drills thật ở localhost | Có: navigation, header, typography, theme, Check → Mission → Sorting, reload/resume, đổi tài khoản. |
| Học sinh thường | Không có nav Vocab Lab; route và shell mount bị chặn. Writing vẫn Coming Soon; tester vẫn mở Unit 2 hiện có. |
| Vocab Check trên web | Source đã tích hợp vào shell, giữ adapter Firestore UID-bound hiện có. Cần xác minh cấu hình hosting, rules thực tế và test project/emulator trước khi xác nhận launch. Chưa kiểm thử tài khoản production. |
| Mission trên web | Vẫn chặn ngoài localhost hoặc demo=false. UI admin/tester nói rõ Mission gameplay/save/sync chưa khả dụng online. Không tạo collection/quyền ghi Mission production. |
| Cloudflare preview URL | Chưa tạo: dashboard yêu cầu đăng nhập, cấu hình môi trường chưa xác minh; không deploy trong lượt này. |
| Production | Chưa đủ điều kiện bật Mission. Chưa merge main, deploy, thay đổi Cloudflare hay publish Firebase rules. |

## Thay đổi implementation

- `index.html`: thêm hai module nhỏ; dùng shell adapter cho section Vocab Lab. Chỉ đổi các điểm nối navigation/lifecycle và route `#vocab`, không thay shared CSS hay code Writing. Gate của app shell luôn admin/tester, không bật nav học sinh qua `config/vocabLab.enabled`.
- `vocab-lab-shell.js`: một section dùng navigation/header/fonts/theme thật. Notice preview gọn, thông tin kỹ thuật thu gọn. Check và Mission có host riêng nên redraw/watch Check không đè màn Mission. Lưu vị trí Check/Mission trong sessionStorage theo tài khoản; dữ liệu học tập vẫn giữ namespace cũ. Nav đi/về và reload khôi phục view; Continue Sorting trở lại batch tiếp theo.
- `vocab-lab.js`: callback mở Mission/ready và unmount; từ chối thao tác của session đã rời hoặc bị thu hồi. Giữ nguyên bank, classification/check transitions, saved v1 compatibility, XP và adapter Firestore.
- `vocab-mission.js` + `vocab-mission-store.js`: local save được serialize bằng Web Locks và so sánh snapshot trước ghi. Tab cũ nhận snapshot mới + thông báo, không ghi đè tab thắng. Lỗi quota/corrupt/mất khả năng lưu được báo và không tiến bước giả. Browser thiếu Web Locks không được hứa lưu an toàn. Đăng xuất/đổi tài khoản đóng controller cũ; callbacks đang chờ không render sang tài khoản khác.
- `vocab-lab.css`: chỉ thêm styles scoped `.vocab-shell`; giữ UI Check đã duyệt và hình SVG gốc. Hai file standalone preview chỉ thêm include local store; vẫn là công cụ QA.

Các file thay đổi: `index.html`, `vocab-lab-shell.js`, `vocab-lab.js`, `vocab-lab.css`, `vocab-mission.js`, `vocab-mission-store.js`, `vocab-lab-preview.html`, `vocab-mission-preview.html`, `tests/vocab-lab.test.js`, `tests/vocab-mission.browser.js`, `tests/vocab-mission-store.test.js`, `tests/vocab-shell.browser.js`, và báo cáo này. Danh sách chính xác được kiểm lại bằng Git trong `scope-audit.json` của handoff.

## Đối chiếu main / Writing

- Đã fetch `origin/main` bằng refspec rõ ràng vì clone ban đầu chỉ track feature branch. Main tại thời điểm audit: `56cb32b5fddc63c2898f6b294cae777259ca925d`, là ancestor của feature. Không có commit main mới cần hòa giải; checkout ban đầu sạch. Remote heads chỉ có `main` và `feature/vocab-lab` khi kiểm tra.
- So sánh implementation Writing/LM, renderer, bài học, shared CSS, `md-backend.js`, `functions/`, `firestore.rules` với baseline trước tích hợp: không đổi. Chính sách Writing thường/tester vốn có trên feature được giữ nguyên; không chép đè index từ main hoặc từ nguồn Claude khác.
- Không thể xác nhận bản nháp Claude chưa push ở một workspace khác. Khi chuẩn bị merge tương lai, fetch lại main và kiểm tra lại diff Writing nếu SHA main đã đổi. Đây là giới hạn phạm vi quan sát, không phải một conflict đang tồn tại.
- Không chỉnh sửa bản `mini-drills/` lồng bên trong.

## Phân quyền và dữ liệu

- Vai trò app thật tiếp tục đến từ `MD_USER`/token và roster tester do server quản lý. Không thêm cờ tester giả vào source production. UI gate không phải security boundary: file JS, bank P1 và story tĩnh vẫn có thể được tải trực tiếp; không coi nội dung này là bí mật và không có dữ liệu học sinh trong đó.
- Check vẫn dùng `MD_VOCAB_STORE` với UID hiện tại, transaction revision, documents riêng và rules hiện có. Test double kiểm tra đường dẫn UID và không ghi Mission/XP/Writing. Không thay rules đã hoạt động, không tuyên bố rules production đã được xác nhận. Rules hiện có còn nhánh release `config/vocabLab.enabled`; cần xác minh flag/rules trong staging trước online rollout, UI strict gate không thay thế kiểm tra server.
- Mission local dùng namespace email + mission + nguồn `authored/fixture/check`; lesson/source revision và snapshot contentVersion được pin. Hai tài khoản/nguồn không chia progress. Snapshot cũ được đọc nguyên, không tự migrate hoặc đổi evidence. Replay tạo run mới có chủ đích. Web Lock + compare-before-write tránh lost update giữa các tab cùng origin; tab bị conflict phải thử lại trên snapshot mới.
- Không có cross-device Mission sync. Kế hoạch online: namespace theo Firebase UID + lesson + mission, collection staging riêng, revision/runId trong transaction, idempotent operation IDs, ownership/schema/size/role validation phía server; không tự import cache email vào UID. Test denied/allowed/cross-UID/revocation/offline/conflict bằng Emulator hoặc Firebase test project trước khi bật persistence. Chỉ migrate snapshot có version hỗ trợ, giữ task IDs/evidence, hiển thị lựa chọn khôi phục khi không tương thích. Production cần quyết định riêng của chủ dự án.

## Audit Cloudflare trước triển khai

Đã đọc repository, README, `_headers`, `functions/api/[[path]].js`; không có Wrangler/Pages build config hoặc GitHub Actions workflow khai báo topology. `md-config.js` hiện trỏ Firebase production, API `/api`. **Không dùng config này cho preview thử ghi dữ liệu.** Dashboard trong trình duyệt chuyển tới `https://dash.cloudflare.com/login`; không đọc được project settings, không điền credentials hay đổi cấu hình.

| Thông tin | Kết quả audit |
| --- | --- |
| Production branch Cloudflare | Chưa xác minh; không suy ra chỉ từ tên Git `main`. |
| Preview branch build controls/auto deploy | Chưa xác minh. Commit push có prefix `[CF-Pages-Skip]` theo tài liệu chính thức để bỏ deployment của commit này. |
| Root directory / build command / output directory | Chưa xác minh. Source đang sửa là repository root có index và functions; nested `mini-drills/` khác biệt. Nếu dashboard đang chọn nested thì source này chưa phải artifact được phục vụ. |
| Pages Functions | Repo có catch-all `/api` trong functions, phụ thuộc KV và Firebase/service credentials. Chưa xác minh bindings/env/runtime đã deploy. Static server QA không chạy Functions thật. |
| Preview/Production env differences | Chưa xác minh Firebase project, KV/R2, secrets, Access policy, domains. Không sao chép hoặc in secrets. |

Các bước giáo viên kiểm tra **chỉ đọc**, chưa bấm deploy: Cloudflare → Workers & Pages → đúng project nối repo này → Settings → Builds & deployments/Builds: ghi production branch, preview controls, root, command, output; kiểm tra Deployment details/SHA đang phục vụ. Sang Variables and Secrets/Bindings, chọn lần lượt Preview và Production, ghi tên project ID/binding và liệu có dùng chung production; không gửi giá trị secret. Kiểm tra custom domain và Access preview policy. Sau đó mới chốt kế hoạch preview.

Kế hoạch preview an toàn cần duyệt: chỉ branch `feature/vocab-lab`, artifact từ root đúng, không production deployment, Access admin/tester, Firebase test project + bindings preview tách biệt. Ban đầu có thể giữ Mission online bị khóa và thông báo save/sync chưa có; không tắt localhost guard để giả vờ chơi/sync online. Muốn chơi Mission online phải hoàn tất staging storage/rules gate nói trên. Chưa có URL preview để cung cấp và chưa có approval deploy.

Nguồn hành vi nền tảng: [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Static HTML](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/), [Branch controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/), [GitHub integration / skip commit](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/). Đây là mô tả nền tảng, không phải bằng chứng cấu hình của project người dùng.

## QA và cách chơi local

Kết quả: **283 kiểm tra Node PASS** (39 Vocab + 244 regression app), kiểm tra nội dung Writing PASS, **4 browser suites PASS**: Check behavior, 36 Check visual cases, 80 Mission screenshots, và shell integration (45 ảnh gồm 42 state/viewport/theme + 3 ảnh quyền/trạng thái account). Browser suite shell kiểm tra menu đi/về, route/reload, typed draft, hai tài khoản, hai tab, callback đang lưu khi đổi tài khoản, UID đổi, role/direct route, Writing Coming Soon/tester Unit 2 và Mission bị khóa khi online. `git diff --check`, scope/secret-pattern audit và đối chiếu Writing/shared CSS đều PASS.

Handoff kèm log regression, scope audit và ảnh trong app thật. Dữ liệu và tài khoản kiểm thử đều giả, mọi API/Firebase production bị chặn trong browser tests. Test quyền token/rules bằng doubles/static contract không thay thế Emulator, đăng nhập thật hoặc audit assistive technology thủ công. Teacher chưa ký duyệt toàn bộ Morph/Final.

Local server được chuẩn bị tại `http://127.0.0.1:8765/app/` (chỉ máy này): chọn **Tester · Preview** hoặc Admin → menu **Vocab Lab** → sort 12 từ → Reality Check/results → **Start mission** → Continue Sorting. Thử F5, đổi theme, menu đi/về; mở tab thứ hai cùng origin để thử conflict. Học sinh thường không thấy Vocab Lab và vẫn thấy Writing Coming Soon. Trên Windows, launcher `Start-Vocab-App.cmd` trong gói handoff mở server này bằng Node runtime đi kèm; không chỉnh source hoặc config production. Nếu server đã dừng, launcher khởi động lại đúng local helper.

Rollback source trước deploy: revert commit tích hợp trên feature sau khi xem diff, giữ commit refinement `200d11e`; không xóa cache của người dùng hoặc đổi main. Hai module mới không ghi cloud, cấu trúc snapshot cũ vẫn được hỗ trợ. Sau deploy tương lai, rollback cần artifact/SHA và env đã xác nhận trong topology audit, không đoán production target.
