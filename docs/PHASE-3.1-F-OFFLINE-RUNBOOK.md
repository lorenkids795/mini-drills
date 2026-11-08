# Phase 3.1-F Step 2 — Offline runbook

Branch integration/vocab-lab-candidate-2026-11-07, base 0970e954f7b96e3d909d5b56ee73624196cec8fc. Chưa commit/push. Không chạy runner Phase 3.1-A–E cũ vì runner đó seed catalog 102 mục.

## Focused QA

Chạy từ repository root, Node >=22. Dùng dependencies pinned tại tools/emulator-runtime và tools/qa-runtime. Có thể trỏ tới bản runtime đã có bằng biến bên dưới; không cần cài cloud CLI/đăng nhập Google.

Offline contracts:

    node --test staging/spark-local/offline.test.cjs staging/tests/contracts.cjs

Emulator ở terminal PowerShell riêng. Đảm bảo ports 14400/14401/18080/19099/9150 chưa thuộc tiến trình khác. Không import/export state cũ.

    $env:VOCAB_EMULATOR_RUNTIME = (Resolve-Path 'tools/emulator-runtime').Path
    $env:VOCAB_QA_RUNTIME = (Resolve-Path 'tools/qa-runtime').Path
    $env:JAVA_HOME = (Get-ChildItem "$env:VOCAB_EMULATOR_RUNTIME/java" -Directory | Select-Object -First 1).FullName
    $env:PATH = "$env:JAVA_HOME/bin;$env:PATH"
    $env:FIREBASE_CLI_DISABLE_TELEMETRY = '1'
    $env:CI = '1'
    $env:NODE_OPTIONS = '--require ./staging/spark-local/offline-preload.cjs'
    node "$env:VOCAB_EMULATOR_RUNTIME/node_modules/firebase-tools/lib/bin/firebase.js" emulators:start --config staging/firebase.json --project demo-mini-drills-vocab-test --only auth,firestore

Chờ **All emulators ready**; không chạy test sớm. Máy này dùng runtime nằm ngoài integration worktree, ở root repo ban đầu; truyền đường dẫn tuyệt đối phù hợp, không mặc định tìm credentials.

Ở terminal QA:

    $env:GCLOUD_PROJECT = 'demo-mini-drills-vocab-test'
    $env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:18080'
    $env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:19099'
    $env:VOCAB_EMULATOR_RUNTIME = '<absolute path to existing tools/emulator-runtime>'
    $env:VOCAB_QA_RUNTIME = '<absolute path to existing tools/qa-runtime>'
    $env:NODE_OPTIONS = '--require ./staging/spark-local/offline-preload.cjs'
    node --test staging/spark-local/emulator-qa.cjs

Edge đã cài sẵn được Playwright dùng headless; không tải Chromium. Nếu sandbox chặn localhost, cần quyền chạy local networking, không gỡ guard outbound. Không cấu hình GOOGLE_APPLICATION_CREDENTIALS/FIREBASE_CONFIG. Runner tự tạo run và tài khoản synthetic ngẫu nhiên, không in password/token, không ghi snapshot ra file. Run độc lập nên có thể chạy lại trong emulator chỉ chứa hai namespace fixture. Dừng bằng Ctrl+C sau QA; không export dữ liệu.

Có thể dùng --test-reporter=tap và --test-reporter-destination=<file> để lưu evidence. Không lưu raw HTTP headers, ADC hoặc browser storage state.

## Các entry point

- adapter.connect() mặc định emulator, thiếu guard sẽ lỗi; không fallback.
- adapter.connect(..., {mode:'spark-local'}) luôn báo SPARK_LIVE_LOCKED trong release offline.
- mockAdapter(config, {db,auth}) chỉ test bằng driver giả hoặc emulator; cài loopback transport guard. Namespace Spark mock riêng, không import environment/connector emulator cho scope logic.
- server.cjs cung cấp API mock với Host/Origin cố định. Chạy trực tiếp mặc định dùng API emulator.
- emulator-web.cjs phục vụ /auth-check và SDK pinned tại localhost. Chỉ dùng để kiểm tra Auth emulator, không thay UI production hay UI Phase 3.1 cũ.
- live-qa.cjs có manifest ca live và lifecycle synthetic dùng chung; CLI luôn exit 2, chưa có transport live. Không có biến môi trường nào mở khóa.
- preflight.cjs chỉ kiểm tra cấu hình/shape synthetic, không kiểm chứng quyền thật.

Ví dụ xem kế hoạch offline (không network):

    node -e "const {PIN}=require('./staging/spark-local/policy.cjs'); console.log(require('./staging/spark-local/live-qa.cjs').plan({...PIN,runId:'fx31_future_run',lessonId:'fx31_alpha'}))"

## Bảo mật và giới hạn

Web Auth dùng inMemoryPersistence, SDK getIdToken(false) cho mỗi request, refresh chủ động getIdToken(true); 401/403 sign out, không tự replay POST. API kiểm tra token + user hiện tại + roster, assignment/enrolment. Auth/revoke thật trên Spark chưa chạy.

Browser chỉ tải SDK local; CSP và test route chặn origin ngoài localhost. Node guard chặn outbound TCP trước connect (bao gồm transport fetch/TLS/HTTP2 được kiểm thử). Đây không phải firewall hệ điều hành hoặc packet capture cho mọi tiến trình trên máy; Java emulator không được instrument bằng Node preload. MetadataLookupWarning là lookup bị guard chặn, không phải cloud authentication thành công. Các PERMISSION_DENIED trong Rules test là kết quả mong đợi.

Live quota, Google IAM, billing, natural expiry, hai thiết bị vật lý: NOT_TESTED. Backup chỉ bảo toàn Firestore synthetic, không khôi phục Auth users/password/refresh tokens.
