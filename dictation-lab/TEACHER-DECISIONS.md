# Quyết định của giáo viên / chủ dự án (bản R3, hợp đồng v1.1)

Ngày 11/2026 chủ dự án đã duyệt chính sách dạy học gồm 7 quy tắc (không có Gợi ý, không có Xem đáp án trước khi Check hoặc Nộp; xem lại
sau Check hợp lệ hoặc sau khi máy chủ xác nhận Nộp; chỉ bỏ qua hoa thường và dấu câu; điểm từng phần theo thứ tự từ; transcript chưa
kiểm duyệt chỉ để luyện tập; PASS = 70% điểm toàn bài). Engine R3 đã làm theo các quy tắc đó. Bảng đầy đủ, kèm hệ quả kiểm thử:
`pkg/decision-log-v1.1.md` (tiếng Anh) và phần bổ sung `decision-log-addendum-2026-11.md`.

**21/11/2026: chủ dự án duyệt cuối E-1 … E-6 và P-05 = lưu 90 ngày (phương án B).** Không cần hỏi lại các mục này.

## A. Đã duyệt hoặc đã được thay thế theo chính sách mới

| Mã | Trạng thái | Nghĩa là |
|---|---|---|
| D-12, D-15, D-17 … D-27, D-29 … D-32 | ĐÃ DUYỆT | như đề xuất R2, có làm rõ (D-13 chỉ bỏ nhãn người nói đã khai báo; D-31 ngưỡng chọn câu là mặc định tạm, giáo viên sửa được) |
| D-14, D-16, D-28 | ĐÃ THAY | không còn gợi ý; "chưa từng thấy" chỉ là thông tin, không là điểm; xem lại theo cổng mới |
| P-01, P-03, P-04, P-06 | ĐÃ DUYỆT | |
| P-02 | ĐÃ THAY | không còn gợi ý, xem đáp án nên không cần |
| **P-05** | **ĐÃ DUYỆT: 90 ngày** | lưu câu trả lời **cuối cùng đã nộp** của bài về nhà tối đa 90 ngày kể từ lúc máy chủ nhận bài, chỉ giáo viên của lớp đó xem được, hết hạn tự xóa. Không lưu bản nháp, từng phím gõ, audio, bài bỏ dở, câu trả lời luyện tập. Điểm giữ như mọi bài làm. Chi tiết: `PRIVACY-RETENTION.md` |
| O-1 … O-4 | ĐÃ DUYỆT | O-2 được làm chặt hơn: bài về nhà không gửi đáp án xuống máy học sinh |
| **E-1 … E-6** | **ĐÃ DUYỆT** | xem mục C |

## B. Việc chỉ con người làm được (vẫn bị chặn, chưa ai quyết thay)

| # | Việc | Ai |
|---|---|---|
| 1 | Nghe lại audio cho câu Cambridge `s014`, `s028`, `s033` (D-08). Tệp Cambridge không nằm trong gói | giáo viên |
| 2 | Duyệt từng dạng đáp án thay thế (`allowedForms`, `acceptedForms`) trước khi dùng với học sinh thật | giáo viên |
| 3 | Xác nhận quyền dùng audio gốc hoặc của bên thứ ba và `teacherAttestsAuthorizedUse` cho mỗi bài thật. Muốn dùng audio Cambridge chưa phải là bằng chứng được phép phát trên web | chủ dự án |
| 4 | Bật lưu câu trả lời trên máy chủ: đặt biến `DL_RAW_RETENTION = on` ở Cloudflare (chưa đặt = không lưu gì, an toàn). Tùy chọn: bật Firestore TTL cho `dlRaw.expiresAt` làm lớp xóa thứ hai | chủ dự án |
| 5 | Duyệt cuối và Publish từng bài trước khi giao làm bài về nhà | giáo viên |

## C. Mặc định kỹ thuật: ĐÃ DUYỆT (21/11/2026)

| Mã | Đã duyệt | Đã làm ở đâu |
|---|---|---|
| E-1 | Bài về nhà không có Check từng câu trước khi Nộp; học sinh sửa được tới khi Nộp cả bài | `HomeworkClient` không có `check`; máy chủ chấm |
| E-2 | Câu Answer Spotter độc lập được bảo vệ: Level 1/2, lựa chọn, ngữ cảnh có đáp án của câu đó chờ học sinh trả lời câu đó; bài về nhà chia 2 phần | `presentBlockers` / `phaseLockIds`; test £8.50/£12 → as-005, "school groups" → as-001 |
| E-3 | Cùng một câu dùng ở Level 1 đến 4 thì không chặn, chỉ ghi nhận (không gọi là "chưa từng thấy") | exposure trong `summary()` |
| E-4 | Ngay sau Check chỉ hiện con số; muốn xem đáp án thì bấm Review (luyện tập) hoặc sau khi máy chủ nhận bài (về nhà) | `fbText`, nút Review riêng |
| E-5 | Khi đang chờ máy chủ xác nhận Nộp thì mọi ô bị khóa, nút Nộp tắt ("Submitting…"); lỗi thì trả lại bản nháp; nộp lại không chấm hai lần | `submit_pending`, `dlSubs` |
| E-6 | File bài vẫn có `postCheckReviewUnlock` cũ, engine bỏ qua | test hai giá trị cũ cho cùng kết quả |

Test: `node tests/dictation-decisions.test.js`, `node tests/dictation-retention.test.js`.
