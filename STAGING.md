# Staging — môi trường thử tách hẳn khỏi production

> File nội bộ: không được xuất bản lên site (`build.js` chỉ chép file công khai vào `dist/`).

## Nguyên tắc

| | Production | Staging (mọi nhánh khác `main` = Preview) |
|---|---|---|
| Địa chỉ | `myhomeworkmyfuture.pages.dev` | `<nhánh>.myhomeworkmyfuture.pages.dev`, ví dụ `phase-b.…` |
| Firebase | dự án `mini-drills` | **dự án riêng** (ví dụ `mini-drills-staging`), không bao giờ là `mini-drills` |
| KV `MD_KV` | namespace production | **namespace riêng**, mang dấu `env:marker = staging:<dự án>` |
| AI (Gemini) | bật | **tắt** (chỉ bật khi `STAGING_AI = on`) |
| R2 `MD_AUDIO` | dùng nếu có | **không dùng** (chỉ dùng khi `STAGING_R2 = isolated`); file ghi âm/ảnh vào KV staging |
| Dữ liệu | thật | chỉ dữ liệu bịa (`@example.test`, lớp `STG-A`/`STG-B`, `staging:true`) |

**Fail closed**: thiếu hoặc sai cấu hình thì staging **không chạy gì**, không bao giờ tự dùng production.
- `build.js` (lúc Cloudflare build nhánh khác `main`) ghi `dist/md-config.js` = dự án staging, hoặc `firebase:null` + lý do → app không nạp Firebase, không cho đăng nhập.
- `build.js` ghi `build-info.js` → server biết mình là staging. Mọi `/api/*` trả 503 (trừ `GET /api/env`) nếu: thiếu `MD_ENV=staging`; `FIREBASE_PROJECT_ID` là `mini-drills` hoặc khác dự án của app; service account thuộc `mini-drills`; KV có dữ liệu mà không có dấu staging (có thể là KV production) hoặc dấu của dự án khác.
- App (`md-backend.js`) hỏi `GET /api/env` trước khi đăng nhập: server không phải staging an toàn, hoặc khác dự án → tắt đăng nhập. App production gặp server staging cũng tắt.
- Trên staging có dải "STAGING · <dự án> · made-up test data only" ở đáy màn hình.

Kiểm tra bất kỳ lúc nào: mở `https://<địa chỉ>/api/env` → `env`, `serverProject`, `frontendProject`, `kv`, `ai`, `uploads`, `ok`, `problems` (không có khóa bí mật nào).

## Việc của chủ dự án (một lần)

Không dán mật khẩu, khóa hay file JSON vào chat. Nhập thẳng vào ô của Firebase / Cloudflare.

### A. Firebase (miễn phí, gói Spark)
1. https://console.firebase.google.com → **Add project** → tên `mini-drills-staging` (ghi lại **Project ID**) → tắt Google Analytics → Create.
2. **Build › Firestore Database › Create database** → *Start in production mode* → chọn vị trí → Enable.
3. **Firestore › Rules**: dán nội dung `firestore.rules` của nhánh đang thử → **Publish** (chỉ ở dự án staging).
4. **Build › Authentication › Get started** (bật dịch vụ đăng nhập; không cần bật nhà cung cấp nào). **Settings › Authorized domains › Add domain**: `phase-b.myhomeworkmyfuture.pages.dev`.
5. **Project settings (bánh răng) › General › Your apps › Web (`</>`)** → nickname `staging-web` → Register app (không chọn Hosting). Ghi lại 2 giá trị **công khai**: `apiKey` (bắt đầu `AIza…`) và `appId` (dạng `1:…:web:…`).
6. **Project settings › Service accounts › Generate new private key** → tải file JSON về máy. Dùng 2 trường của file này ở bước B3 (`client_email`, `private_key`), rồi **xóa file**.

### B. Cloudflare Pages (project `myhomeworkmyfuture`)
1. **Workers & Pages › KV › Create a namespace** → tên `md-kv-staging` (namespace **mới, trống**).
2. **Pages › myhomeworkmyfuture › Settings › Bindings** → chọn môi trường **Preview** → **Add › KV namespace**: Variable name `MD_KV` → `md-kv-staging`. Nếu Preview có R2 `MD_AUDIO` thì xóa (server cũng bỏ qua). **Không sửa môi trường Production.**
3. **Settings › Variables and Secrets** → môi trường **Preview** → thêm:

| Tên | Loại | Giá trị |
|---|---|---|
| `MD_ENV` | Text | `staging` |
| `FIREBASE_PROJECT_ID` | Text | Project ID ở A1 |
| `STAGING_FIREBASE_API_KEY` | Text | `apiKey` ở A5 (công khai) |
| `STAGING_FIREBASE_APP_ID` | Text | `appId` ở A5 (công khai) |
| `FIREBASE_CLIENT_EMAIL` | Text | `client_email` của file A6 |
| `FIREBASE_PRIVATE_KEY` | **Secret** | `private_key` của file A6 (cả đoạn `-----BEGIN PRIVATE KEY-----…`) |
| `ADMIN_EMAIL` | Text | email admin **riêng cho staging**, ví dụ `stg.admin@example.test` |
| `ADMIN_PASSWORD` | **Secret** | mật khẩu mới, **khác** production |

   Không thêm `GEMINI_*`, `TEACHERS`, `GEMINI_PROXY_*` vào Preview. Nếu Preview đã có biến nào chép từ Production thì xóa.
4. **Deployments** → bản `phase-b` mới nhất → **Retry deployment** (hoặc báo để Claude đẩy một commit).

### C. Sau khi deploy
- Mở `https://phase-b.myhomeworkmyfuture.pages.dev/api/env`: phải có `"env":"staging"`, `"ok":true`, `serverProject` = `frontendProject` = Project ID staging, `"kv":"staging-marked"`.
- Đăng nhập bằng `ADMIN_EMAIL`/`ADMIN_PASSWORD` của staging → **Admin › My account › Diagnostics** → **Create staging test data** → chép bảng mật khẩu của 7 tài khoản thử (chỉ hiện một lần) vào nơi an toàn.
- (Tùy chọn) **Add 620 attempts (large data)** để thử dữ liệu lớn.

## Tài khoản thử (bịa, `@example.test` là tên miền dành riêng, không có hộp thư thật)

| Email | Vai trò | Lớp |
|---|---|---|
| `ADMIN_EMAIL` (staging) | Admin | — |
| `stg.teacher@example.test` | Teacher | (thấy STG-A, STG-B) |
| `stg.assistant@example.test` | Homework Assistant | chỉ STG-A |
| `stg.student@example.test` | Student | STG-A |
| `stg.late@example.test` | Student (nộp muộn) | STG-A |
| `stg.mover@example.test` | Student (chuyển từ STG-B) | STG-A |
| `stg.other@example.test` | Student lớp khác | STG-B |
| `stg.tester@example.test` | Tester | Test |

Bài giao: `stg_old` (100 ngày trước), `stg_late` (tuần trước, Library + bài ngoài), `stg_now` (tuần này). Bài làm: bài cũ chưa xác minh, bài cũ điểm tối đa, bài muộn, bài thiếu câu 3/5, bài làm ở lớp cũ STG-B, bài Writing 200 ngày chưa chấm, bài Writing mới.

## Chi phí và giới hạn (ước tính)
- Firebase Spark: 50.000 lượt đọc / 20.000 lượt ghi Firestore mỗi ngày, đăng nhập custom token miễn phí. Không bật Blaze.
- Cloudflare KV miễn phí: 100.000 lượt đọc, **1.000 lượt ghi** mỗi ngày. Mỗi lần đăng nhập ghi vài khóa.
- Dữ liệu lớn: 620 lượt ghi Firestore một lần bấm.
- Dọn staging: xóa cả dự án Firebase staging và namespace `md-kv-staging`. Production không bị ảnh hưởng.
