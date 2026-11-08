# Phase 3.1-F Step 2 — Offline Implementation Handoff

**PASS trong phạm vi offline/emulator. Live Spark Auth/IAM: NOT_TESTED.**

Branch: integration/vocab-lab-candidate-2026-11-07. HEAD vẫn 0970e954f7b96e3d909d5b56ee73624196cec8fc. Thay đổi chưa commit/push. Không sửa main, merge, deploy, tạo Firebase project, liên kết billing, tải private key hoặc dùng dữ liệu production.

## Đã thực hiện

1. Tách domain-core.cjs thuần (hash, grading, Independent Recall, session validation) khỏi catalog. Domain cũ giữ API qua wrapper; identity, fixture và runtime synthetic không import domain/catalog thật. schema.cjs chia sẻ danh sách collection mà không kéo theo emulator connector.
2. spark-local/policy.cjs cố định project/database/origin/namespace/service account. Sai/mất config hoặc cấu hình trộn bị từ chối. connect mặc định emulator; Spark và runner live khóa cứng, không fallback.
3. mockAdapter dùng namespace vocab31_spark_fixture_runs, kiểm tra audience/issuer/UID synthetic trước roster, write lock, role/assignment/enrolment bằng service hiện có. Mock HTTP API pin localhost:18790 và Origin, từ chối client chọn scope/identity, không có API seed/delete.
4. Firebase Web Auth client dùng memory persistence, getIdToken cho mỗi request, forced refresh, logout khi 401/403 hoặc refresh lỗi; không tự retry mutation. Kiểm tra phiên thay đổi trước/sau request để tránh trả dữ liệu của phiên đã đăng xuất.
5. Trang /auth-check riêng dùng Firebase SDK pinned được phục vụ local, CSP chỉ cho API/emulator. Browser test chạy Edge headless; không sửa Writing/Library/Vocab UI hiện có.
6. IAM permission proposal, validator impersonated ADC shape và preflight offline. Không đọc ADC thật, không xin token, không tự dùng global gcloud/Owner credentials.
7. Runner live riêng có manifest synthetic, hạn mức đề xuất và lifecycle dùng chung đã chạy emulator. CLI exit 2 SPARK_LIVE_LOCKED. Đây chưa phải transport live hoạt động: cần implementation/review transport và preflight thật sau khi chủ dự án duyệt. Biến môi trường approval không mở được khóa.
8. Runner QA mới chỉ tạo fixture; không gọi runner cũ có seed 102 mục. Backup test chỉ giữ snapshot synthetic trong bộ nhớ, không lưu artifact chứa credentials.

## Kiểm thử cuối cùng

| Nhóm | PASS | FAIL |
|---|---:|---:|
| Offline security + extraction regression | 15 | 0 |
| Existing signed-token/environment contracts | 3 | 0 |
| Focused emulator/API/Rules/browser | 11 | 0 |
| Tổng | 29 | 0 |

Raw TAP: phase31-f-evidence/offline-contracts.tap và emulator-browser.tap. SHA-256 source/evidence: phase31-f-evidence/integrity.json. Tổng hợp machine-readable: PHASE-3.1-F-OFFLINE-QA.json.

Đã kiểm tra lifecycle Draft → Teacher review/Approve → Admin Publish → Student Progress; conflict 409, retry cùng operation không nhân đôi; Independent Recall; cross-student/lesson/run; Tester denial; revoked roster; Auth revokeRefreshTokens và disabled user; Rules deny direct read/write cho bốn role; khóa ghi; checksum restore/subcollections; Web SDK login/refresh/logout và reload không còn đăng nhập; sai project/issuer/audience; missing/mixed config; không fallback; outbound TCP/TLS/fetch/HTTP2 bị chặn; browser không phát sinh application request ngoài localhost.

Bộ regression so sánh grading/hash/session với source ở commit gốc trên input synthetic. Không chạy lại toàn bộ Main QA/Phase cũ.

Các lỗi khi xây dựng test đã được xử lý: sandbox chặn localhost; khởi chạy test trước Auth ready; vị trí khai báo test; fetch không dùng Host header override như kỳ vọng; assert namespace chưa tính run mock trước; Chromium chưa cài nên chuyển Edge hiện có. Evidence cuối có 0 FAIL.

## Bảo toàn và dữ liệu

Trong 354 tracked file ở HEAD, 350 không đổi. Chỉ bốn file tracked staging được sửa:
- staging/domain.cjs: chuyển pure primitives sang module dùng chung, giữ legacy wrapper.
- staging/identity.cjs: đổi import sang pure core.
- staging/phase31/fixtures.cjs: đổi import sang pure core.
- staging/phase31/runtime.cjs: pure hash và schema imports.

File mới: domain-core.cjs, phase31/schema.cjs và thư mục spark-local (adapter, policy, preflight, IAM, Auth client/check page, mock/default API entry points, scenarios, locked live runner, focused tests, offline preload). Tài liệu và evidence nằm dưới docs, không sửa production config.

Không sửa bank, catalog, editorial state hay data files. **102 Pending / 0 Approved / 0 Published** là trạng thái đã xác minh trong handoff A–E, được bảo toàn bằng việc không thay nội dung/không thao tác database thật. Step này không truy vấn lại production để tuyên bố số đếm mới. Những Approve/Publish trong QA chỉ thuộc fixture namespace.

Rà soát diff, file mới và scan literal key/JWT không phát hiện credentials thật. Không lưu password, ID token, refresh token hoặc backup dữ liệu thật. ADC validator chứa tên trường và placeholder synthetic để test; đó không phải credentials sử dụng được.

## Giới hạn và việc còn thiếu

- Live Auth/IAM/ADC, project Spark/no billing/location/Rules thật, quota thật: NOT_TESTED.
- Natural one-hour expiry và hai thiết bị vật lý: NOT_TESTED.
- Guard Node và browser route kiểm chứng luồng ứng dụng; không phải firewall hoặc packet capture cho toàn máy/JVM.
- MetadataLookupWarning là SDK lookup bị chặn; PERMISSION_DENIED của Rules là ca âm tính mong đợi.
- Logical restore không khôi phục Auth users/password/refresh token.
- Live runner chưa có transport/provisioner cloud; chưa có SDK bundle hoặc page mở Auth Spark. Không bỏ khóa chỉ bằng sửa biến môi trường.
- Quota trong live manifest là ngân sách dự kiến; metering/backoff live cần kiểm chứng ở bước sau.

## Bước tiếp theo cần chủ dự án duyệt

1. Review thay đổi/evidence này; commit/push chỉ nếu có lệnh riêng và kiểm tra auto-deploy gate.
2. Thao tác Console theo PHASE-3.1-F-SPARK-SETUP-WINDOWS.md: project Spark riêng, Singapore, deny Rules, Auth và IAM tối thiểu.
3. Sau xác nhận project/IAM, duyệt xây dựng/kết nối live transport và read-only preflight.
4. Chỉ khi preflight đạt mới duyệt synthetic provisioning và bounded live QA.

Emulator và các listener QA đã dừng sau bàn giao; không export state. Dừng chờ chủ dự án kiểm tra. Hướng dẫn tái lập: PHASE-3.1-F-OFFLINE-RUNBOOK.md.

## Finalization audit

Các trạng thái Git ở trên là snapshot trước finalization; trạng thái commit/push hiện tại xem Git history và remote refs. Source không đổi sau QA, 29/29 PASS. Hash source trong integrity.json chuẩn hóa CRLF thành LF; TAP evidence được giữ nguyên bytes bằng .gitattributes. Không cần chạy lại QA vì chỉ bổ sung metadata đóng gói.

Remote integration được kiểm tra vẫn ở base 0970e954f7b96e3d909d5b56ee73624196cec8fc trước commit. GitHub audit: 0 workflows, 0 webhooks, 0 deployments, 0 Actions runs, Pages không bật. Dùng xác nhận Cloudflare gần nhất của chủ dự án: production main, preview None; không có thay đổi cấu hình nào được biết đến trong phiên này. Không tuyên bố đã kiểm tra lại Cloudflare Console trực tiếp.
