# Phase 3.1-F — Spark Setup trên Windows

Trạng thái: hướng dẫn cho bước SAU, chưa tạo project, chưa đăng nhập cloud hoặc áp dụng IAM. Step 2 chỉ mock/emulator. Không chạy các thao tác Console/gcloud dưới đây cho đến khi chủ dự án duyệt riêng.

## 1. Thao tác thủ công trong Firebase/Google Cloud Console

1. Dùng tài khoản Google được chủ dự án chọn. Tạo project độc lập với ID chính xác **mini-drills-vocab-staging**. Nếu ID đã bị chiếm, DỪNG để duyệt ID và sửa allowlist; không tự dùng project tương tự.
2. Chọn **Spark**. Không thêm payment method hoặc liên kết Cloud Billing. Không chọn Blaze, trial credit, Cloud Run, Cloud Functions, Extensions hay managed backup. Có thể bỏ Analytics vì không cần cho test này.
3. Xác minh tại Firebase Usage and billing: Spark. Kiểm tra Google Cloud Billing → My projects: project này **không liên kết billing account**. Ghi nhận thời điểm và project ID, không đưa thông tin thanh toán vào repository.
4. Tạo Cloud Firestore **Standard / Native**, database **(default)**, location **asia-southeast1 (Singapore)** nếu khả dụng. Location không đổi được; nếu không có Singapore thì dừng xin quyết định. Không tạo thêm database.
5. Bắt đầu với Rules deny-all. Khi được duyệt thay cấu hình staging, dán nội dung staging/firestore.rules vào Rules của đúng project này rồi Publish. Đây là thay đổi cloud và CHƯA thực hiện trong Step 2. Không mở test mode.
6. Authentication → chỉ bật Email/Password. Không Phone/SMS, email-link, social login hoặc Identity Platform upgrade. Không gửi verification/reset email trong test synthetic.
7. Thêm Web app staging; không bật Hosting. Lưu projectId/appId/API key staging để đối chiếu manifest sau. API key Web không phải quyền Admin; vẫn không cần gửi credentials vào chat.
8. Authorized domains: kiểm tra/thêm localhost nếu luồng sau cần. Project mới không mặc định có localhost. Origin backend dự kiến cố định **http://localhost:18790**; không LAN, public tunnel hoặc production origin. Authorized domains không thay thế Host/Origin guard của API.
9. Xem permission set trong staging/spark-local/iam-plan.json. Tạo service account runtime riêng và operator riêng, không cấp Owner/Editor. Chỉ cấp Token Creator cho người vận hành trên đúng service account được phép impersonate, không toàn project.
10. Runtime cần Auth users.get và quyền Firestore transactions/read/create/update/delete được liệt kê. Quyền delete dùng cho publication pointer synthetic khi revise; không có HTTP delete dữ liệu thật. IAM không cô lập collection, vì vậy project/database phải độc lập. Operator bổ sung users.create/users.update để tạo synthetic, đổi claims, disable/revoke; không cấp users.delete.
11. Nếu Console yêu cầu bật API cho impersonation, chỉ thực hiện sau duyệt project/IAM. Nếu yêu cầu billing hoặc quyền rộng hơn dự kiến, DỪNG; không tự nâng gói.
12. Chưa tạo user thủ công tùy ý: UID và email phải khớp fx31_... / UID@local.invalid. Provisioner sau phải tuân manifest <=10 account; không import người dùng thật.

Nguồn chính thức: [Spark/Blaze](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [Firestore locations](https://firebase.google.com/docs/firestore/locations), [Auth authorized domains](https://firebase.google.com/docs/auth/faq-and-troubleshooting).

## 2. Windows và impersonation — chỉ sau phê duyệt

Không tải/tạo service-account JSON private key. Không dùng Owner ADC làm fallback.

Dùng thư mục gcloud riêng, ngoài repository; không ghi đè cấu hình Google hiện có. Ví dụ chuẩn bị phiên PowerShell riêng (chưa thực hiện):

    $env:CLOUDSDK_CONFIG = Join-Path $env:LOCALAPPDATA 'MiniDrillsSpark\gcloud'
    gcloud auth application-default login --impersonate-service-account=vocab-spark-runtime@mini-drills-vocab-staging.iam.gserviceaccount.com

Lệnh đăng nhập là thao tác người dùng tương tác, chỉ chạy khi đã duyệt. Cần kiểm tra ADC được tạo đúng target, quota_project_id, loại impersonated_service_account và không có key; chưa giả định gcloud sẽ tự ghi đúng mọi field. Không chỉnh thủ công token để vượt validator. Nếu SDK/ADC không tương thích thì dừng, không đổi sang service account key.

File ADC impersonation có thể chứa refresh token của tài khoản nguồn: đó vẫn là secret. Giữ ngoài repo, hạn chế Windows ACL cho tài khoản vận hành, không đưa vào log/chat/backup fixture. Tương lai chỉ truyền đường dẫn ADC rõ ràng; không tự khám phá global ADC.

preflight.cjs hiện chỉ kiểm tra **shape của object synthetic** trong test; không đọc file ADC hay cấp access token. PASS shape không chứng minh danh tính, IAM, billing, Rules hoặc location. Node hỗ trợ local impersonated ADC theo [Google ADC docs](https://docs.cloud.google.com/docs/authentication/set-up-adc-local-dev-environment); tương thích Firebase Admin Auth/Firestore của runtime này phải kiểm chứng riêng sau. [Firebase Admin setup](https://firebase.google.com/docs/admin/setup).

## 3. Quota và chi phí

| Hạng mục | Spark / kế hoạch |
|---|---|
| Backend | Localhost; không server cloud |
| Firestore free quota | 1 GiB, 50.000 reads/ngày, 20.000 writes/ngày, 20.000 deletes/ngày, 10 GiB outbound/tháng; một free database |
| Mục tiêu nội bộ | <5.000 reads, <2.000 writes/ngày, <10 MiB synthetic |
| Live run tương lai | <=3 lượt có duyệt, <=500 API request/lượt, <=10 account, 8 item/2 lesson |
| Logical snapshot | <=440 document/run; không Auth credentials |
| Managed backup/restore, PITR, TTL | Không dùng; cần billing |

API request không tương đương một Firestore operation; transaction/retry/Auth kiểm tra roster có thể phát sinh thêm lượt đọc. Ngân sách trên là giới hạn vận hành đề xuất, chưa phải metering cloud đã kiểm chứng. Gặp 429/quota exceeded thì dừng và đợi reset, không bật billing. [Firestore pricing](https://firebase.google.com/docs/firestore/pricing), [Auth limits](https://firebase.google.com/docs/auth/limits).

## 4. Điều kiện mở kết nối live

- Chủ dự án xác nhận project ID, Spark/no billing, location, Rules, IAM và account manifest.
- Review và triển khai transport cloud riêng; Step 2 cố ý KHÔNG cung cấp transport đó. Không biến môi trường hoặc chuỗi approval thành nút mở cloud.
- Preflight read-only thật trước; ghi kết quả riêng cho Auth, IAM, database, location và Rules.
- Duyệt provisioning và ghi fixture trước khi chạy lifecycle. Chỉ vocab31_spark_fixture_runs/fx31_...; tuyệt đối không runner staging/phase31/qa.cjs.
- Cần kiểm chứng egress cho cả REST/gRPC/HTTP2, project/aud/iss và credential target. Allowlist hostname Google không đủ để tách production.
- Natural ID token expiry (~1 giờ), hai thiết bị vật lý và live quota chỉ PASS nếu thực hiện thật; forced refresh/hai context không thay thế.

## 5. Rollback

Dừng backend/browser; giữ live runner khóa. Khi live được phép sau này: khóa run, revoke synthetic sessions; nếu API không kiểm soát được thì thu hồi impersonation/IAM trên Console. Restore logical snapshot vào run mới khóa ghi, kiểm chứng checksum/subcollections trước khi đổi run. Không xóa run cũ/production, không rollback main, không hạ Rules để chạy tiếp.
