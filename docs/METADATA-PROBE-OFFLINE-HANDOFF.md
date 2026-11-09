# Firebase Spark Metadata-Only Probe — Offline Implementation

Base: integration/vocab-lab-candidate-2026-11-07 @ 5d3707c253310f006974fcdef1c5df13da1d304f.
Hoàn tất implementation/mock QA; chưa commit/push, chưa chạy live.

## Source mới, độc lập

- staging/metadata-probe/policy.cjs: pin target/endpoints; validate ADC/environment/token response/metadata.
- staging/metadata-probe/core.cjs: OAuth refresh → IAM mint → Firestore metadata GET; không token đầu vào hoặc fallback.
- staging/metadata-probe/transport.cjs: Node HTTPS, certificate verification, no redirect/retry, deadline 15s/stage, response <=32 KiB.
- staging/metadata-probe/cli.cjs: default --plan offline; live cần flag + confirmation + credential path ngoài repo; không global ADC discovery, shell/gcloud, ghi file.
- staging/metadata-probe/offline.test.cjs: focused mock/security tests.

Không thêm dependencies. Không import Firebase SDK/catalog/seed/application service. Source diff đầy đủ: metadata-probe-evidence/source.patch.

## Credential design

Probe không nhận bearer token từ caller: opaque token không chứng minh principal/provenance offline. ADC impersonation explicit chỉ đọc sau phê duyệt live. Validator từ chối direct user ADC, keys, target lạ, delegates, endpoint overrides và token có sẵn.

OAuth refresh tạo source user token trong memory, chỉ gửi tới IAMCredentials của service account đã pin. Chỉ token vừa mint mới tới Firestore. Không in/log/lưu token; output summary allowlist hoặc mã lỗi cố định. Không sửa IAM.

Đây là thay đổi phương án vận hành tương lai so với kế hoạch CLI không ADC: cần duyệt riêng ADC impersonation ngoài repo. Chưa tạo/đọc ADC thật. Không chạy gcloud print-access-token trong probe để tránh phụ thuộc cache của CLI.

## QA

22/22 focused tests PASS, 0 FAIL. Raw TAP: metadata-probe-evidence/offline.tap; hashes: integrity.json; summary: METADATA-PROBE-OFFLINE-QA.json.

Kiểm tra: project/database/resource/principal sai; ADC/keys/overrides không hợp lệ; OAuth/IAM/metadata 401/403; transport, redirect, quota; no retry/fallback; expiry/token malformed/source-token reuse; metadata mismatch; không document/query/write/IAM-policy route; default plan không network; CLI không echo token; credential path trong repo bị chặn; summary không echo raw response; TLS options; oversized/malformed response; không catalog/SDK imports; app locks byte-identical với base.

Không chạy lại QA cũ vì tracked source hiện có không đổi. Không khởi động emulator hay đọc Firestore thật. Chỉ tham khảo tài liệu công khai; không gọi project API.

## Preservation và giới hạn

spark-local adapter, Web Auth và synthetic runner không đổi; application cloud lock giữ nguyên. Không sửa Writing/Library/Vocab, main hoặc 102 mục thật. Không tạo user/key, bật API/billing, cấp IAM, đăng nhập ADC, xin token/deploy. Không lưu credential/backup; tests chỉ có sentinel synthetic không dùng được.

102 Pending / 0 Approved / 0 Published giữ theo baseline, không truy vấn production lại.

Live metadata/IAM, ADC compatibility, quota/API enabled status: NOT_TESTED. Mock PASS không chứng minh service account đang có quyền thật.

Trước live cần duyệt ADC preparation, người impersonate/Token Creator, API prerequisites và một lượt hai credential exchanges + metadata GET. Shape/quota không phù hợp thì dừng, không tự mở rộng quyền.

Service account chỉ cần datastore.databases.getMetadata; không cần data-reader, Auth-reader hoặc IAM-admin. Token Creator thuộc caller trên đúng service account.

Hướng dẫn: METADATA-PROBE-WINDOWS-RUNBOOK.md. Dừng trước commit/push.
