# Firebase Spark Metadata-Only Probe — Windows

**Chưa được duyệt chạy live.** Hướng dẫn này không cấp phép IAM/ADC. Chỉ chạy mục live sau phê duyệt riêng. Probe không mở khóa spark-local hoặc synthetic live runner.

## Phạm vi

Chỉ một Firestore operation: GET https://firestore.googleapis.com/v1/projects/mini-drills-vocab-staging/databases/(default)

Service account: vocab-spark-runtime@mini-drills-vocab-staging.iam.gserviceaccount.com

Không có tham số đổi project/database/endpoint/principal/method/API key. Không đọc document/collection, transaction, ghi dữ liệu, tạo user, đổi IAM hoặc bật API. Không cần Web App API key.

## Chạy offline

Từ repository root, Node >=22:

    node staging/metadata-probe/cli.cjs --plan
    node --test staging/metadata-probe/offline.test.cjs

Không tham số cũng là --plan: không đọc credential hoặc gọi mạng. Tests dùng credential/token giả trong memory, HTTPS mock và loopback guard.

## Điều kiện phải duyệt trước live

1. Xác nhận service account chỉ có datastore.databases.getMetadata, không có binding rộng hơn ngoài ý muốn.
2. Chọn người vận hành và duyệt roles/iam.serviceAccountTokenCreator trên đúng service account đích.
3. Xác nhận IAM Service Account Credentials API và Firestore API đã bật. Nếu chưa, xin duyệt; không bật billing.
4. **Duyệt riêng việc chuẩn bị ADC impersonation ngoài repository.** Đây là phương án khác kế hoạch CLI impersonation không ADC trước đó. Probe không chạy gcloud hoặc dùng token cache của CLI, không cần private key.
5. Duyệt hai credential exchanges (OAuth refresh, IAM generateAccessToken) và một metadata GET, một attempt/stage, không retry.
6. Dùng máy tin cậy, không debug/log HTTP/TLS hoặc proxy/credential overrides.

ADC impersonation chứa refresh token của người vận hành: đó là secret, không gửi vào chat/repo/backup/evidence. Giữ file ngoài repo, Windows ACL chỉ cho người vận hành/admin cần thiết. Việc chuẩn bị ADC có thể dùng quy trình gcloud chính thức trong môi trường riêng sau phê duyệt; chưa thực hiện ở bước này. Login/tooling ngoài probe có cơ chế lưu credentials riêng, không nằm trong bảo đảm không ghi token của probe.

Credential shape được hỗ trợ:
- type = impersonated_service_account.
- service_account_impersonation_url = đúng endpoint generateAccessToken của service account đã pin.
- quota_project_id = mini-drills-vocab-staging.
- delegates vắng hoặc [].
- source_credentials.type = authorized_user, có client_id/client_secret/refresh_token.
- Không private key, access_token có sẵn, token_uri, universe override hoặc field lạ.

Nếu file thật không đúng shape, dừng review compatibility; không sửa token/credential bằng tay để vượt validator, không đổi sang Owner ADC hoặc key. ADC compatibility vẫn NOT_TESTED.

Tài liệu: [Local impersonated ADC](https://docs.cloud.google.com/docs/authentication/set-up-adc-local-dev-environment), [IAM generateAccessToken](https://docs.cloud.google.com/iam/docs/reference/credentials/rest/v1/projects.serviceAccounts/generateAccessToken).

## Một lượt live thủ công — CHƯA CHẠY

Mở PowerShell riêng sau khi duyệt credential preparation. Không đặt GOOGLE_APPLICATION_CREDENTIALS; không dùng global ADC discovery. Probe từ chối GOOGLE_*, GCLOUD_*, FIREBASE_*, FIRESTORE_*, CLOUDSDK_* và các biến proxy/debug/TLS override. Dùng phiên sạch, không xóa cấu hình global hoặc nới guard.

Ví dụ đường dẫn dưới đây chỉ là placeholder:

    $probeCredentialPath = 'C:\Users\<you>\AppData\Local\MiniDrillsSpark\impersonated-adc.json'
    node staging/metadata-probe/cli.cjs --live-metadata-read --credential-file $probeCredentialPath --confirm 'READ_METADATA_ONLY:projects/mini-drills-vocab-staging/databases/(default)'

Không truyền token bằng argument/stdin/environment. Không chạy gcloud print-access-token hoặc chép token vào clipboard. Probe không chạy shell/gcloud hay ghi file.

Flag --live-metadata-read và chuỗi --confirm chỉ mở probe riêng một lượt; không thay thế phê duyệt của chủ dự án và không mở ứng dụng/runner.

## Token provenance

Access token opaque không thể chứng minh là impersonated bằng regex hoặc nhãn service account. Probe không nhận token có sẵn. Nó:
1. POST OAuth refresh tới oauth2.googleapis.com/token.
2. Chỉ dùng source access token để POST IAMCredentials generateAccessToken của đúng service account; scope datastore, lifetime 600s, delegates [].
3. Chỉ dùng accessToken vừa mint để GET metadata.

Token người vận hành không bao giờ gửi tới Firestore. Lỗi OAuth/IAM dừng trước metadata, không fallback. HTTPS xác minh certificate, không follow redirect. Token/credential response chỉ ở memory, không stdout/log/file. JavaScript không bảo đảm zeroization hoặc ngăn OS swap/crash dump; không chụp heap/debug trong lượt live.

Không gửi X-Goog-User-Project; quota_project_id chỉ kiểm tra config trộn. Không tự xin serviceusage.services.use. Nếu endpoint báo thiếu quota/API/permission, dừng để chủ dự án xem xét.

## Kết quả

Exit 0, PASS_METADATA_ONLY: response 200 có đúng resource, Singapore, FIRESTORE_NATIVE. databaseEdition phải STANDARD nếu được trả về; thiếu field thì editionVerification = NOT_VERIFIED. Không suy diễn Auth/Rules/billing/data-access PASS.

Lỗi config: TARGET_DENIED / CREDENTIAL_DENIED / ENVIRONMENT_DENIED.
Lỗi xác thực/quyền: *_UNAUTHENTICATED / *_PERMISSION_DENIED.
Redirect/quota/network: *_REDIRECT_DENIED / *_QUOTA_EXCEEDED / *_TRANSPORT_FAILED.
Metadata không khớp: METADATA_MISMATCH.
Mọi lỗi đều dừng, không retry/fallback/cấp thêm IAM.

Deadline 15s/stage, response <=32 KiB. Chỉ output JSON lọc; không raw Google error/body/header. Chỉ bàn giao output JSON an toàn, không ADC/network dump. Tiến trình kết thúc sau một lượt, không service nền.

**Live metadata/IAM, ADC compatibility, billing: NOT_TESTED trong bàn giao offline này.**
