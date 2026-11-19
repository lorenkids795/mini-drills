# Dictation Lab: Scoring, Feedback and Session Contract v1.1 (normative)

**Trạng thái:** bản sửa chính sách theo quyết định của chủ dự án (11/2026). `dictation-scoring-contract-v1.md` được **giữ nguyên** làm lịch sử; tài liệu này thay thế các mục 8, 9 (phần mở khóa), 10 đến 15 của v1. Mục 1 đến 7 của v1 (chuẩn hóa, điểm LCS, dạng thay thế, Level 1 đến 4, nhãn người nói) vẫn có hiệu lực nguyên văn. Vector: `golden-tests-v1.1/vectors` (bộ v2 `golden-tests/` giữ nguyên). Ánh xạ từng quyết định: `decision-log-v1.1.md`.

## 0. Chính sách đã được chủ dự án phê duyệt (không thương lượng)

1. Không có Hint, Reveal hay xem trước đáp án ở mọi Level, cả Luyện tập tự do lẫn Bài về nhà; không có đường phụ (API, phím tắt, sự kiện) nào thay thế.
2. Luyện tập tự do: xem lại (đáp án, transcript) của **một mục** chỉ mở sau một lần Check hợp lệ của mục đó. Check trống không phải lần thử và không mở gì. Lần thử hợp lệ đầu tiên bị đóng băng; các lần sau là luyện tập, tính riêng. Không để lộ đáp án của mục độc lập khác chưa làm.
3. Bài về nhà: xem lại chỉ mở sau khi máy chủ xác nhận Nộp. Trước đó không lộ đáp án hay transcript. Bỏ trống được phép sau cảnh báo, tính 0 và bài là chưa hoàn thành. Sau khi nộp bài bị khóa vĩnh viễn; luyện tập thêm là ngữ cảnh riêng, không chấm.
4. Chuẩn hóa: chỉ bỏ qua hoa thường và dấu câu thông thường (mục 1 của v1). Sai chính tả, thiếu hoặc thừa `s`/`ed`, sai biến tố là sai. Giữ ký hiệu số, tiền tệ, đơn vị. Dạng thay thế cần giáo viên duyệt.
5. Điểm từng phần theo thứ tự từ (LCS, mục 2 của v1), luôn kèm đúng hoàn toàn hay chưa và số lỗi. Level 2 theo vị trí; Answer Spotter chấm theo tập đáp án đã duyệt.
6. Transcript chưa được giáo viên kiểm duyệt chỉ dùng cho Luyện tập tự do có nhãn "Unverified transcript"; không giao làm bài về nhà, không làm điểm chính thức hay dữ liệu Personal Goal.
7. PASS = 70% của điểm **toàn bài** (mục bỏ trống tính 0), không phải độ chính xác trên mục đã làm. Hiển thị riêng: độ chính xác trên mục đã làm, điểm toàn bài, tỉ lệ hoàn thành.

## 1 đến 7. Chuẩn hóa, điểm, dạng thay thế, Level 1 đến 4, nhãn người nói

Không đổi so với v1 (C1 đến C8). Mọi vector của `tokenize.json` (22), `l1.json` (13), `l2.json` (24), `l3.json` (39, gồm nhóm `NUM-*`, `LCS-*`) và `l4.json` (21, gồm nhóm `SPK-*`) giữ nguyên, ví dụ `NUM-001`, `LCS-003`, `L2-007`, `SPK-008`. Giới hạn 4000 code point và loại ký tự điều khiển, bidi (D-15) giữ nguyên (`L3-017`, `L3-019`).

D-13 được làm rõ: chỉ bỏ nhãn của người nói **được khai báo** trong metadata bài, ở đầu dòng, theo sau là dấu hai chấm, và chỉ khi chính văn bản mong đợi không bắt đầu bằng nhãn đó (`SPK-008`). Không bao giờ cắt tiền tố tùy ý (`SPK-004`, `SPK-010`).

## 8. Hint và Reveal: đã bỏ

Không có sự kiện `hint`, `reveal`, `preview` cho học sinh. Engine trả `unsupported_event` và không đổi trạng thái khi nhận các sự kiện này (`HWS-002`, `HWS-003`). Ở mức nhật ký, sự kiện lạ không tạo lần thử (`ATS-004`) và không tạo phơi nhiễm (`EXD-011`). Các vector v2 về hint, reveal bị gỡ có lý do trong `golden-tests-v1.1/vector-status-manifest.json` (mục `removed`).

Giàn giáo vốn có của từng Level vẫn giữ: thẻ từ xáo trộn của Level 1, ngữ cảnh câu của Level 2. Điều khiển audio (nghe toàn bài, ±3 giây, tốc độ 0.75/1/1.25, vòng A–B, phím tắt) là công cụ nghe, không phải gợi ý.

## 9. Answer Spotter (C9, D-27)

Như v1 mục 9 (`AS-001` đến `AS-022`, `AS-028` đến `AS-049`), trừ phần mở khóa: thiết lập `postCheckReviewUnlock` trong tài liệu nhập bị **bỏ qua**, áp dụng cổng ở mục 9a (`RVU-008`). Payload học sinh của mục độc lập không chứa đáp án, dạng chấp nhận, vai trò span hay vị trí câu chứa đáp án (P-03); kiểm ở mức dữ liệu và trên trang ví dụ, còn giao diện sản phẩm thì chưa (`AS-027`).

## 9a. Cổng xem lại và chống lộ đáp án (mới)

| Ngữ cảnh | Xem lại mở khi | Vector |
|---|---|---|
| Luyện tập, mục thường | có ít nhất một Check hợp lệ của chính mục đó | `RVU-001`, `RVU-002`, `ATS-002`, `ATS-003` |
| Luyện tập, mục có chung câu với một mục Answer Spotter độc lập chưa Check | chờ tới khi mục Answer Spotter đó có Check hợp lệ | `RVU-003` |
| Bài về nhà | chỉ khi máy chủ đã xác nhận nộp (không phải khi đang chờ) | `RVU-004` đến `RVU-007`, `HWS-008`, `HWS-009` |

Quy tắc kèm theo:

* Phản hồi ngay sau Check, khi cổng chưa mở, chỉ có số liệu (đúng hoàn toàn hay chưa, `num/den`, số từ thiếu, thừa, số lỗi target). Không có văn bản dạng thay thế, vị trí lỗi hay đáp án.
* Luyện tập: Level 1 và Level 2 của một câu chứa đáp án Answer Spotter độc lập bị khóa (`answer_spotter_first`) cho tới khi mục Answer Spotter đó được Check. Thứ tự mặc định: Answer Spotter độc lập trước (nghe trước), rồi các Level.
* Bài về nhà: các mục Level 1, 2 như vậy chỉ được máy chủ gửi ở **giai đoạn 2**, sau khi câu trả lời giai đoạn 1 đã được máy chủ lưu và khóa.
* Cùng một câu được dùng ở nhiều Level (L1 đến L4) là thiết kế tiến dần của bài; việc xem lại một Level có thể cho thấy câu của Level khác. Điều này được ghi nhận bằng nhãn phơi nhiễm (mục 11), không chặn. Đây là giả định kỹ thuật, ghi ở `decision-log-v1.1.md`.

## 10. Lần thử (C10, D-12, D-18)

| Trường | Định nghĩa |
|---|---|
| Lần thử | Một Check hợp lệ (còn token sau làm sạch). Check trống hoặc chỉ dấu câu không phải lần thử (`ATT-011`, `ATS-003`) |
| `firstAttempt` | `{num, den, exact}` của lần thử đầu tiên; bất biến (`EXP-012`, `ATS-005`) |
| `status` | `first_attempt_exact`, `improved_after_practice`, `in_progress`, `not_started` |
| `outcome` | `succeeded` (có lần exact), `in_progress`, `not_started` |
| `practiceAttempts`, `currentPractice` | số lần thử sau lần đầu và điểm lần gần nhất: chỉ là luyện tập |
| `reviewUnlocked` | có ít nhất một lần thử (cổng của mục; mục 9a thêm điều kiện chặn) |

Check lặp cùng chuỗi token với Check ngay trước, không có Check trống xen giữa, bị bỏ qua (`ATT-012`, `EXP-011`). Vector khác: `ATT-001`, `ATT-002`, `ATT-007` đến `ATT-010`.

## 11. Phơi nhiễm: chỉ là thông tin (C11, D-16, P-01, P-06)

Lớp phơi nhiễm của câu: `none < tokens_shown (L1) < context_shown (L2) < answer_shown (xem lại sau Check)` (`EXD-001` đến `EXD-003`, `EXD-005` đến `EXD-010`). Engine ghi `exposureAtFirstCheck` tại thời điểm Check hợp lệ đầu tiên (`ATS-001`, `EXP-001` đến `EXP-006`, `EXP-008`). Đây **không** phải dữ kiện chấm điểm: máy chủ không chứng minh được việc học sinh đã thấy gì trên máy mình. Không còn các khái niệm `novel_independent`, `assisted`, `independent_unverified_novelty`.

## 12. Tổng hợp điểm và PASS (C12, D-19, D-29, O-3)

Như v1 mục 12, bỏ `reviewedOnly` (không còn mục chỉ Reveal). Thêm `result` chỉ cho bài về nhà đã được máy chủ xác nhận:

| Trường | Định nghĩa | Vector |
|---|---|---|
| `result.passed` | `overall.itemWeightedAssignmentScore ≥ 70%` (mỗi mục cùng trọng số, mục bỏ trống = 0); rỗng nếu không có mục hợp lệ | `AGS-012`, `AGS-013`, `AGS-014`, `AGS-017`, `AGS-018` |
| `result.completed` | mọi mục hợp lệ đều có câu trả lời được chấm | `AGS-012`, `AGS-013` |
| Luyện tập, bài chưa xác nhận | `result = null`; chỉ có `projectedAssignmentScore` | `AGS-015`, `AGS-016` |

`attemptedAccuracy` và `assignmentScore` không bao giờ được trình bày thay thế cho nhau (`AGS-001`). Vector khác: `AGS-002` đến `AGS-008`, `AGS-010`, `AGS-011`, `AGG-001`, `AGG-002`.

## 13. Phiên và nộp bài (C13, D-20, D-21, D-22)

**Luyện tập tự do:** sự kiện `check`, `check_empty`. Không có nộp bài (`NAV-008`); không có sự kiện `answer` (`HWS-007`). Bỏ qua, quay lại vẫn giữ lần đầu (`NAV-001`, `NAV-002`).

**Bài về nhà:** không có Check chấm điểm trước khi nộp (`HWS-001`, `HWS-010`) vì máy học sinh không có đáp án (mục 13a). Học sinh chỉ ghi câu trả lời nháp (`answer`, có cờ trống).

| Sự kiện | Quy tắc | Vector |
|---|---|---|
| `answer` | cập nhật nháp; trống thì mục là chưa trả lời | `HWS-004`, `HWS-006`, `NAV-009` |
| `submit_requested` | còn mục chưa trả lời mà chưa xác nhận: hỏi lại | `NAV-004`, `SUB-012`, `HWS-004` |
| xác nhận | `submit_pending`, khóa sửa và khóa `resume` | `SUB-001`, `SUB-008`, `SUB-009`, `SUB-013` |
| `server_ack` hợp lệ | chỉ lúc này mới `submitted`; xem lại mở | `NAV-004`, `SUB-005`, `HWS-009` |
| ack sai, thiếu id, không có yêu cầu | bỏ qua | `SUB-003`, `SUB-004`, `SUB-007` |
| từ chối, lỗi mạng | về nháp, dữ liệu nguyên vẹn | `SUB-002`, `SUB-006`, `NAV-005` |
| sau khi nộp | khóa vĩnh viễn câu trả lời và nháp cũ | `NAV-007`, `HWS-005` |
| `startFreePractice` | chỉ sau khi nộp; ghi riêng, không chấm, không đổi bài nộp | `SUB-010`, `SUB-011` |
| `saveDraft`, `resume`, phiên bản mới | nháp không bao giờ là bài nộp; phiên bản đang làm được ghim | `NAV-003`, `NAV-006`, `NAV-010` |

## 13a. Giao thức bài về nhà (O-2, P-05; mới)

1. Máy chủ (nơi có bài học có phiên bản, đã duyệt) gửi **payload học sinh**: mục, thẻ Level 1, câu có chỗ trống Level 2, lời hỏi Answer Spotter. Không có văn bản câu Level 3, 4, đáp án, dạng chấp nhận, vai trò span, giải thích hay vị trí câu chứa đáp án.
2. Nếu có mục Level 1, 2 chung câu với Answer Spotter độc lập: giai đoạn 1 gồm Answer Spotter, Level 3, 4 và các mục còn lại; máy chủ lưu câu trả lời giai đoạn 1 (lần đầu thắng, không ghi đè) rồi mới gửi giai đoạn 2.
3. Nộp: chỉ gửi **câu trả lời cuối** của từng mục, khóa idempotency, mã bài, phiên bản. Không gửi nhật ký gõ phím hay nhật ký sự kiện.
4. Máy chủ kiểm xác thực, quyền lớp, bài còn mở, phiên bản, kích thước (tối đa 256 KB, 4000 ký tự mỗi câu, 200 mục), mã mục; chấm **một lần** mỗi mục bằng bài học của chính máy chủ: đó là lần thử đầu chính thức. Mục trống, quá dài hoặc sai dạng tính 0.
5. Trùng (học sinh, bài, phiên bản): trả lại đúng mã nộp và kết quả cũ, không tạo bản thứ hai; mất phản hồi rồi gửi lại cũng vậy.
6. Kết quả và phần xem lại chỉ đi kèm phản hồi đã chấp nhận.
7. Lưu trữ: mặc định chỉ điểm từng mục, **không** lưu câu trả lời thô. Lưu câu trả lời thô chỉ khi trường đã duyệt thời hạn lưu (**CHỜ QUYẾT ĐỊNH CỦA CON NGƯỜI**); trước đó không được triển khai việc lưu này lên production.

Máy chủ không chứng minh được những gì học sinh đã xem trên máy mình (P-06); vì vậy không có trường nào trong điểm chính thức dựa trên điều đó.

## 14. Nội dung, engine lai, xác định (C14, D-31, D-32, P-04)

| Chủ đề | Quy tắc |
|---|---|
| Kiểm duyệt | `GATE_PASS`, `GATE_PASS_WITH_EXCLUSIONS`: dùng cho luyện tập và (khi giáo viên duyệt đúng phiên bản) bài về nhà. `GATE_NOT_AUDITED`: chỉ luyện tập, nhãn "Unverified transcript", không chính thức. Gate khác: không chạy |
| Phân tích | Chỉ bài về nhà đã nộp, do máy chủ chấm, nội dung đã kiểm duyệt mới là điểm chính thức hoặc dữ liệu Personal Goal. Luyện tập tự do không bao giờ |
| Mặc định cơ học | Như v1 mục 14; ngưỡng (L1 6 đến 14, L3 4 đến 22, L4 25 đến 80 từ, tối đa 10/10/10/4) là **mặc định tạm**, giáo viên sửa được, không phải chứng nhận nội dung |
| Xác định | PRNG có hạt giống; phát lại cùng nhật ký cho cùng trạng thái; nhật ký và payload không chứa đáp án |

## 15. Sổ quyết định v1.1

Chi tiết và hệ quả kiểm thử: `decision-log-v1.1.md`.

| Mã | Chủ đề | v1.1 |
|---|---|---|
| D-12 | Check trống không phải lần thử, không mở xem lại | APPROVED |
| D-13 | Bỏ nhãn người nói đã khai báo ở đầu dòng (L4) | APPROVED (làm rõ) |
| D-14 | Hint trước lần đầu | REPLACED (không còn hint) |
| D-15 | Làm sạch, 4000 code point | APPROVED |
| D-16 | Phơi nhiễm, bằng chứng | REPLACED (chỉ thông tin) |
| D-17 | Ký hiệu có nghĩa được giữ | APPROVED |
| D-18 | Check lặp bị bỏ qua | APPROVED |
| D-19 | Ba chỉ số tách biệt + PASS toàn bài | APPROVED |
| D-20 | Nộp chỉ khi máy chủ xác nhận | APPROVED |
| D-21 | Ghim phiên bản | APPROVED |
| D-22 | Khóa sau nộp, luyện tập riêng | APPROVED |
| D-23 | Không chấm hoa thường | APPROVED |
| D-24 | Không gần đúng | APPROVED |
| D-25 | LCS kèm exact và lỗi | APPROVED |
| D-26 | Level 2 theo vị trí | APPROVED |
| D-27 | Answer Spotter: đáp án đã duyệt, nhãn nguồn | APPROVED |
| D-28 | Mở khóa post-check | REPLACED (mục 9a) |
| D-29 | Mẫu số, mục không hợp lệ | APPROVED (bỏ phần Reveal-only) |
| D-30 | Không tương đương số tự động | APPROVED |
| D-31 | Engine lai, mặc định cơ học | APPROVED (ngưỡng là mặc định tạm) |
| D-32 | Xác định | APPROVED |
