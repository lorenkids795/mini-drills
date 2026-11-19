# Quyết định của giáo viên / chủ dự án (bản R3, hợp đồng v1.1)

Ngày 11/2026 chủ dự án đã duyệt chính sách dạy học gồm 7 quy tắc (không có Gợi ý, không có Xem đáp án trước khi Check hoặc Nộp; xem lại
sau Check hợp lệ hoặc sau khi máy chủ xác nhận Nộp; chỉ bỏ qua hoa thường và dấu câu; điểm từng phần theo thứ tự từ; transcript chưa
kiểm duyệt chỉ để luyện tập; PASS = 70% điểm toàn bài). Engine R3 đã làm theo các quy tắc đó. Bảng đầy đủ, kèm hệ quả kiểm thử:
`pkg/decision-log-v1.1.md` (tiếng Anh).

## A. Đã duyệt hoặc đã được thay thế theo chính sách mới

| Mã | Trạng thái | Nghĩa là |
|---|---|---|
| D-12, D-15, D-17 … D-27, D-29 … D-32 | ĐÃ DUYỆT | như đề xuất R2, có làm rõ (D-13 chỉ bỏ nhãn người nói đã khai báo; D-31 ngưỡng chọn câu là mặc định tạm, giáo viên sửa được) |
| D-14, D-16, D-28 | ĐÃ THAY | không còn gợi ý; "chưa từng thấy" chỉ là thông tin, không là điểm; xem lại theo cổng mới |
| P-01, P-03, P-04, P-06 | ĐÃ DUYỆT | |
| P-02 | ĐÃ THAY | không còn gợi ý, xem đáp án nên không cần |
| P-05 | ĐÃ DUYỆT, trừ thời hạn lưu | máy học sinh chỉ gửi câu trả lời cuối; mặc định chỉ lưu điểm |
| O-1 … O-4 | ĐÃ DUYỆT | O-2 được làm chặt hơn: bài về nhà không gửi đáp án xuống máy học sinh |

## B. Việc chỉ con người làm được (vẫn bị chặn, chưa ai quyết thay)

| # | Việc | Ai |
|---|---|---|
| 1 | Nghe lại audio cho câu Cambridge `s014`, `s028`, `s033` (D-08). Tệp Cambridge không nằm trong gói | giáo viên |
| 2 | Duyệt từng dạng đáp án thay thế (`allowedForms`, `acceptedForms`) trước khi dùng với học sinh thật | giáo viên |
| 3 | Xác nhận quyền dùng audio gốc hoặc của bên thứ ba và `teacherAttestsAuthorizedUse` cho mỗi bài thật | chủ dự án |
| 4 | **Thời hạn lưu câu trả lời thô** của học sinh (P-05). Chưa có thì không lưu câu trả lời thô lên production | chủ dự án |
| 5 | Duyệt cuối và Publish từng bài trước khi giao làm bài về nhà | giáo viên |

Đề xuất cho mục 4 (chỉ là gợi ý, chưa áp dụng): không lưu câu trả lời thô; nếu cần để giáo viên xem lại, lưu 90 ngày rồi tự xóa,
chỉ giáo viên của lớp đọc được.

## C. Mặc định kỹ thuật cần xác nhận (đã làm, đổi được)

| Mã | Mặc định | Vì sao |
|---|---|---|
| E-1 | Bài về nhà không có nút Check từng câu trước khi Nộp; học sinh gõ hết rồi Nộp một lần | máy học sinh không có đáp án nên không chấm được; chấm từng câu trên máy chủ sẽ để lộ điểm từng câu |
| E-2 | Câu hỏi Answer Spotter độc lập được bảo vệ: Level 1/2 hoặc lựa chọn trắc nghiệm có chứa đáp án của câu đó phải chờ học sinh trả lời câu đó trước. Bài về nhà chia 2 phần nếu cần | khi kiểm thử phát hiện 2 chỗ lộ đáp án thật trong bài mẫu (lựa chọn £8.50/£12 là đáp án phải gõ của as-005; ngữ cảnh "school groups" ở Level 2 là đáp án "groups" của as-001) |
| E-3 | Cùng một câu dùng ở Level 1 đến 4 thì không chặn (đó là thiết kế tiến dần), chỉ ghi nhận | chặn sẽ không xem lại được Level 1 |
| E-4 | Ngay sau Check (khi chưa được xem lại) chỉ hiện con số: đúng hoàn toàn chưa, số từ đúng thứ tự, thiếu, thừa | chi tiết có thể lộ dạng đáp án |
| E-5 | Khi đang chờ máy chủ xác nhận Nộp thì không mở lại bản nháp cũ | mở bản nháp là sửa bài |
| E-6 | File bài vẫn có thiết lập `postCheckReviewUnlock` cũ nhưng engine bỏ qua | đổi schema sẽ làm lệch kiểm tra với bản Python |

Ghi "Đồng ý" hoặc "Không đồng ý: …" cạnh mã rồi giao lại cho người lập trình.
