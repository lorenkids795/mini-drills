# Ma trận quyết định chấm điểm (D-12 đến D-32)

> **R3 (11/2026):** bảng này là lịch sử của đề xuất v1. Trạng thái hiện hành theo chính sách đã được chủ dự án duyệt (APPROVED / REPLACED / PENDING) nằm ở `decision-log-v1.1.md`; D-14, D-16 và D-28 đã được thay.

Nguồn của cột đề xuất gốc: bảng mục 14 trong `golden-tests-original/dictation-golden-scoring-spec.md` (trích nguyên văn bằng script). Cột còn lại là kết quả rà soát. Không quyết định nào được giáo viên phê duyệt: mọi `Mặc định` là đề xuất.

| Mã | Chủ đề | Đề xuất gốc (nguyên văn) | Rà soát | Lý do và thay đổi | Vector gốc tham chiếu | Vector v2 đổi | Vector v2 mới tham chiếu |
|---|---|---|---|---|---|---|---|
| D-12 | Check trống có tính là lần thử không | Không. Từ chối, không dùng lần thử đầu; hệ quả: Học sinh không mất lần đầu vì bấm nhầm | Chấp nhận | Rõ hơn: rỗng là không còn token sau làm sạch và bỏ nhãn. | 5 | 1 | 0 |
| D-13 | Nhãn người nói học sinh tự gõ | Tính là từ thừa; hệ quả: Học sinh gõ `TOM:` mất điểm nhẹ | SỬA | Đề xuất gốc (tính nhãn là từ thừa) quá khắt khe. Mới: bỏ nhãn người nói đã biết ở đầu dòng, chỉ Level 4, mặc định bật nhưng cần giáo viên phê duyệt; có bảo vệ khi nhãn nằm trong văn bản gốc. | 1 | 1 | 14 |
| D-14 | Dùng hint trước Check đầu rồi đúng | Lần đầu không độc lập; trạng thái `improved_after_practice`; hệ quả: Không tính thành công độc lập | SỬA | Tách chiều: hint trước lần đầu làm `independence = assisted`; kết quả và bằng chứng là chiều riêng. | 1 | 8 | 0 |
| D-15 | Làm sạch đầu vào | Tối đa 4000 ký tự; loại ký tự điều khiển và bidi; hệ quả: Nhập quá dài bị từ chối | Chấp nhận | Ngưỡng cấu hình được. | 2 | 0 | 0 |
| D-16 | Phơi nhiễm trước và bằng chứng thành thạo | Ba mức như mục 9; hệ quả: Đã thấy đáp án thì không tính độc lập | SỬA | Thêm lớp phơi nhiễm, cờ lịch sử đầy đủ và phân loại bằng chứng: novel, unverified novelty, practice, assisted. L1 rồi L3 là practice success, không phải bằng chứng mới. | 2 | 10 | 22 |
| D-17 | Ký hiệu không phải chữ (`<`, `%`) | Không chấm ký hiệu lẻ; `%` cuối bị cắt; hệ quả: Học sinh không gõ `<` vẫn đúng; `20%` coi như `20` | SỬA | Đề xuất gốc cắt `%` và dấu đầu số. Mới: giữ `%`, `£ $ €` gắn số, dấu âm, dấu thập phân đầu, đơn vị dính liền; chỉ ký hiệu lẻ bị bỏ. | 2 | 1 | 20 |
| D-18 | Check lặp nhanh cùng đáp án | Bỏ qua; hệ quả: Không tạo lần thử thừa | Chấp nhận | Khóa dedupe là chuỗi token đã chuẩn hóa. | 2 | 2 | 0 |
| D-19 | Cách tổng hợp điểm cấp | Σ num / Σ den; hệ quả: Mục dài có trọng số lớn hơn | SỬA | Đề xuất gốc Σnum/Σden trên mục đã làm che giấu mục bỏ qua. Mới: attemptedAccuracy, assignmentScore, completionRate tách biệt; mục không hợp lệ và Reveal-only xử lý rõ. | 2 | 2 | 0 |
| D-20 | Nộp lỗi mạng và nộp trùng | Không đánh dấu đã nộp; nộp lại thành công; nộp trùng vô hại; hệ quả: Không mất bài | SỬA | Đề xuất gốc dùng cờ mạng. Mới: chỉ thành công khi có `server_ack` hợp lệ; pending khóa chỉnh sửa; idempotency key. | 1 | 4 | 13 |
| D-21 | Bản nháp và bài nộp theo phiên bản | Ghim phiên bản đang làm; hệ quả: Học sinh hoàn thành đúng bản đã bắt đầu | Chấp nhận | Hợp đồng tích hợp: host cung cấp phiên bản; engine không bao giờ chấm lại chéo phiên bản. | 1 | 1 | 0 |
| D-22 | Sau khi nộp bài về nhà | Khóa; giáo viên mở lại; hệ quả: Không sửa sau nộp | Chấp nhận | Thêm Free Practice tùy chọn sau nộp, tách biệt bài nộp. | 1 | 1 | 0 |
| D-23 | Hoa thường tên riêng | Không chấm hoa thường; hệ quả: `harbour` và `Harbour` như nhau | Chấp nhận | - | 0 | 0 | 0 |
| D-24 | Tín nhiệm gần đúng | Không có điểm; có thể gắn nhãn phản hồi; hệ quả: Nghiêm ngặt chính tả | Chấp nhận | Chỉ phản hồi có thể gắn nhãn gần đúng, không thêm điểm. | 0 | 0 | 0 |
| D-25 | Công thức điểm | LCS trên `max(n, m)`; hệ quả: Hoán đổi và từ thừa bị phạt | Chấp nhận có điều kiện | LCS được giữ vì bộ vector chứng minh không che giấu lỗi nặng; bắt buộc hiển thị kèm exact và lỗi target. | 0 | 0 | 6 |
| D-26 | Quan hệ blank L2 | Theo vị trí, không chéo; hệ quả: Gõ nhầm ô không được điểm | Chấp nhận | Mỗi blank chấm riêng theo vị trí (hợp đồng mục 5, `L2-007`); target 0 token làm mục không hợp lệ (D-29). Dòng này bị sót trong bản v2 trước (cột cuối của spec gốc để trống), bổ sung 11/2026; không đổi quy tắc hay vector. | 0 | 0 | 0 |
| D-27 | Điểm Answer Spotter | Nhị phân cho một đáp án; tập hợp cho danh sách; hệ quả: Không điểm từng phần ở đáp án đơn | SỬA | Giữ nhị phân / tập hợp; thêm: chỉ `choose_option` / `type_answer` độc lập, `select_span_in_text` chỉ post-check, khớp theo tập đáp án đã duyệt (không số học, không đồng nghĩa), nhãn nguồn và `officialClaim` (hợp đồng mục 9, rà soát #7). Dòng này bị sót trong bản v2 trước, bổ sung 11/2026; số vector đếm bằng script. | 0 | 0 | 22 |
| D-28 | Mở khóa post-check | Theo `postCheckReviewUnlock`; hệ quả: `after_reveal` chỉ mở sau reveal | Chấp nhận | - | 0 | 0 | 0 |
| D-29 | Mẫu số, mục không hợp lệ và Reveal-only | (mới, không có trong đề xuất gốc) Mục 0 token loại khỏi mẫu số; Reveal-only là chưa làm; hệ quả: Điểm không bị chia cho 0 hay phình | MỚI | Rà soát thiết kế yêu cầu quyết định này. Đảo ngược: Đổi quy tắc ở một hàm | 0 | 2 | 11 |
| D-30 | Số, tiền, đơn vị | (mới, không có trong đề xuất gốc) Không tương đương tự động; chỉ dạng đã duyệt; hệ quả: Học sinh gõ 35 cho £35 cần dạng được duyệt | MỚI | Rà soát thiết kế yêu cầu quyết định này. Đảo ngược: Thêm dạng vào bộ đáp án | 0 | 0 | 33 |
| D-31 | Ranh giới engine lai và mặc định cơ học | (mới, không có trong đề xuất gốc) Mặc định xác định theo mục 14 của hợp đồng; hệ quả: Transcript Only vẫn dùng được | MỚI | Rà soát thiết kế yêu cầu quyết định này. Đảo ngược: Đổi hằng số hoặc dùng mục tường minh | 0 | 0 | 0 |
| D-32 | Xác định | (mới, không có trong đề xuất gốc) PRNG có hạt giống; phiên là hàm của nhật ký; hệ quả: Tái lập mọi lỗi | MỚI | Rà soát thiết kế yêu cầu quyết định này. Đảo ngược: - | 0 | 0 | 0 |

## Tóm tắt tác động lên bộ 134 vector gốc

| Chỉ số | Giá trị |
|---|---|
| Vector gốc | 134 |
| Giữ nguyên | 112 |
| Đổi kỳ vọng hoặc đầu vào | 22 |
| Vector mới | 108 |
| Tổng v2 | 242 |

Danh sách 22 vector đổi và lý do chi tiết: `golden-tests/vector-status-manifest.json` và `dictation-scoring-changelog.md`.

## Đánh giá lại theo từng yêu cầu rà soát thiết kế

| # | Yêu cầu | Xử lý |
|---|---|---|
| 1 | Chỉ số điểm tách biệt | D-19, D-29 (mục 12 hợp đồng) |
| 2 | Ký hiệu số có nghĩa | D-17, D-30 (mục 1) |
| 3 | Phơi nhiễm | D-16 (mục 11) |
| 4 | Nhãn người nói | D-13 (mục 7) |
| 5 | Hoàn tất nộp bài do máy chủ xác nhận | D-20, D-22 (mục 13) |
| 6 | LCS chỉ giữ nếu không che giấu lỗi | D-25, vector LCS-001..006 (mục 2) |
| 7 | Answer Spotter độc lập và nhãn nguồn | D-27 (mục 9) |
| 8 | Không gộp các khái niệm | mục 10 và 12 |
