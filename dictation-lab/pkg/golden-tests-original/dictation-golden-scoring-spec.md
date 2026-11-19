# Dictation Lab: Golden Scoring and Progressive Feedback Specification (v1, proposal)

Phạm vi: định nghĩa hành vi chấm điểm, phản hồi lũy tiến và trạng thái phiên đủ chính xác để Codex triển khai và so sánh với `dictation-golden-tests/`. Đây là đặc tả và dữ liệu kiểm thử. Claude không viết mã engine sản xuất.

## 0. Trạng thái của từng quy tắc (đọc trước)

| Nhãn | Ý nghĩa |
|---|---|
| Rev1 | Đã được xác lập trong bộ Rev1 (schema 1.1, pedagogy rules, guide). Không đổi ở đây |
| Đề xuất D-nn | Quy tắc mặc định do tài liệu này đề xuất để Codex có thứ để triển khai. Chưa được giáo viên hay chủ dự án phê duyệt. Mỗi mục có mặc định, hệ quả và cách đảo ngược ở mục 14 |

Tên trường dùng trong vector (ví dụ `firstAttempt`, `masteryEvidence`, `unanswered`) là TÊN CHO FIXTURE, không phải tên trường production. Nếu Codex đã có tên khác, chỉ cần ánh xạ ở bộ adapter; không đổi vector.

Những gì kiểm thử được bây giờ: tính toàn vẹn của vector, tính hợp lệ của baseline với validator Rev1, và sự nhất quán giữa giá trị mong đợi viết tay với quy tắc viết ở đây (bằng oracle tham chiếu nhỏ trong runner). Những gì chưa kiểm thử được: bất kỳ engine hay giao diện production nào (chưa tồn tại). Runner báo rõ điều này.

## 1. Chuẩn hóa và tách token khi chấm (Rev1 cho phần chung, Đề xuất cho chi tiết)

Thứ tự thao tác trên cả văn bản mong đợi và câu trả lời của học sinh:

| Bước | Quy tắc | Ví dụ |
|---|---|---|
| 0 | Câu trả lời học sinh: loại ký tự điều khiển (C0 trừ tab, xuống dòng) và ký tự điều khiển hướng bidi; đánh dấu `sanitized`. Quá 4000 ký tự thì từ chối `answer_too_long` (D-15) | `L3-018`, `L3-019` |
| 1 | NFC | `TOK-009` |
| 2 | Dấu nháy cong `’` `‘` `ʼ` thành `'` | `TOK-001` |
| 3 | Chữ thường (không chuyển chữ hoa thành lỗi, D-23) | `L2-020` |
| 4 | Tách theo khoảng trắng Unicode cố định (cùng danh sách với validator Rev1) | `TOK-014` |
| 5 | Mỗi mảnh: cắt ký tự thuộc nhóm Unicode P (dấu câu, kể cả dấu gạch ngang và dấu nháy) ở hai đầu. Ký hiệu thuộc nhóm S (`£`, `<`, `>`, `=`) KHÔNG bị cắt | `TOK-005`, `TOK-008` |
| 6 | Bỏ mảnh không còn chữ cái hoặc chữ số nào | `TOK-004`, `TOK-007`, `TOK-012` |

Hệ quả cần biết:

| Hiện tượng | Kết quả | Vector |
|---|---|---|
| `a.m.` | Thành `a.m`. Học sinh gõ `a.m.` hay `a.m` đều khớp, gõ `am` thì không | `TOK-003` |
| `£8.50,` | Thành `£8.50` (giữ ký hiệu tiền và dấu thập phân giữa chữ số) | `TOK-005` |
| `full-day` | Một token. `full day` là hai token và không khớp nếu chưa khai biến thể | `L2-017`, `L2-018` |
| Ký hiệu lẻ như `<` | Không phải token, không bị chấm | `TOK-007`, `L3-021` (D-17) |
| `<noise>` trong transcript | Một token chữ nghĩa đen; học sinh gõ `noise` không khớp | `TOK-008`, `L3-020` |
| `20%` | `%` thuộc nhóm P nên bị cắt, thành `20` (hạn chế đã biết, D-17) | `TOK-013` |
| Ký tự đồng dạng khác bảng chữ (Cyrillic `а`) | Khác token, không có khoan nhượng | `L2-024` |

## 2. Khớp, tính điểm và đúng hoàn toàn (Đề xuất D-25)

Cho dãy token mong đợi E (n phần tử) và dãy token trả lời A (m phần tử):

| Đại lượng | Định nghĩa |
|---|---|
| `lcs` | Độ dài dãy con chung dài nhất của E và A (khớp có thứ tự, không phụ thuộc cách căn chỉnh nên không mơ hồ) |
| `den` | `max(n, m)`. Phạt cả từ thiếu lẫn từ thừa |
| Độ chính xác | `lcs / den` |
| `exact` | E bằng A từng token (khi đó `lcs = n = m`) |
| `missing`, `extra` | `n - lcs` và `m - lcs` |
| Không có tín nhiệm gần đúng | Sai chính tả một chữ cái, thiếu `s` hay `ed` không được điểm (D-24). Chỉ phản hồi có thể gắn nhãn gần đúng, không thêm điểm |

Phản hồi từng token (không dùng cho điểm): backtrace xác định trên bảng LCS, ưu tiên khớp, rồi `missing` khi `L[i-1][j] >= L[i][j-1]`, còn lại `extra`. Ranh giới ca mơ hồ (từ lặp) chỉ ảnh hưởng nhãn, không ảnh hưởng `lcs`, `den`, `exact`. Hiển thị có thể ghép một `missing` kề `extra` thành một thay thế.

Ví dụ: `L3-005` thiếu một từ: `lcs 5, den 6`. `L3-006` thừa một từ: `lcs 6, den 7`. `L3-007` thiếu `s`: `lcs 5, den 6`. Hoán đổi hai từ kề nhau (`L1-002`): `5/6`.

## 3. Dạng thay thế được phê duyệt (Rev1, chi tiết Đề xuất)

| Quy tắc | Nội dung | Vector |
|---|---|---|
| Nguồn | Chỉ từ `allowedForms` (target) hoặc `acceptedForms` (Answer Spotter) | |
| Điều kiện | Chỉ `approvalState = teacher_approved` được chấp nhận khi chấm. Dạng `proposed` bị bỏ qua | `L2-004`, `L3-004`, `AS-016` |
| Theo vị trí | Mỗi dạng gắn với một span cụ thể. Không có tương đương toàn cục | `L3-014`, mutant `global_contractions` |
| Cách áp dụng | Với mỗi span có dạng thay thế, thử từng lựa chọn (gốc hoặc một dạng). Chọn tổ hợp có độ chính xác cao nhất, rồi `lcs` cao hơn, rồi ưu tiên bản gốc | `L3-010` |
| Giới hạn tổ hợp | Tối đa 256. Vượt thì chọn tham lam từ trái sang phải. Vector hiện tại chỉ dùng tổ hợp nhỏ | |
| Rút gọn | `We’re` với `We are` chỉ khi đã khai và duyệt. `It’s got` với `it has`, không phải `it is` | `L2-003`, `L2-005`, `L2-006` |
| Số và tiền | `£8.50` với `8.50`, `£12` với `12` chỉ khi khai `symbol_optional`. `24th` với `24`, `twenty-fourth` chỉ khi khai. Dạng nói tự do (`eight fifty`) không bao giờ | `L2-009` đến `L2-016` |
| Không tương đương số | `8.5` khác `8.50`; `8,50` khác `8.50` | `L2-010`, `L2-011` |
| Ký hiệu tiền đứng riêng | `£ 8.50` thành token `8.50` vì `£` lẻ bị bỏ, nên cần dạng `symbol_optional` | `L2-012` |
| Biến thể chính tả | `half day` cho `half-day` chỉ khi khai `spelling_variant` | `L2-017` |

Quy tắc phạm vi: dạng thay thế của một target áp dụng ở mọi nơi span đó được chấm (blank L2, câu L3, đoạn L4). Chúng không áp dụng ở L1 vì thẻ cố định.

## 4. Level 1 Word Builder

| Quy tắc | Nội dung | Vector |
|---|---|---|
| Token mong đợi | Token hóa câu (`cleanText`) | |
| Thẻ | Văn bản thẻ được chuẩn hóa như mục 1 khi so sánh. Thẻ giống chữ nhau hoán đổi được | `L1-006`, `L1-011` |
| Điểm | `lcs` và `den = max(n, số thẻ đã đặt)` | `L1-001` đến `L1-005` |
| Distractor | Đặt distractor là một token thừa hoặc thay thế (`usedDistractor`) | `L1-003`, `L1-005` |
| Không có dạng thay thế | Mục 3 không áp dụng cho L1 | |
| Đặt thẻ | `place` chỉ hiệu lực với thẻ còn trong kho; nhấp đúp chỉ đặt một lần | `L1-008` |
| Gỡ thẻ | `remove` trả thẻ về vị trí ban đầu trong kho; gỡ thẻ chưa đặt bị bỏ qua | `L1-009`, `L1-013` |
| Sắp xếp lại | `move` đổi vị trí trong dãy đã đặt | `L1-010` |
| Kiểm tra trống | Check khi chưa đặt thẻ nào bị từ chối, không là một lần thử (D-12) | `L1-007`, `L1-012` |
| Xáo thẻ | Ngẫu nhiên có hạt giống, không bao giờ trùng thứ tự đúng. Không kiểm thử được bằng vector xác định; yêu cầu hành vi cho Codex |

## 5. Level 2 Missing Words

| Quy tắc | Nội dung | Vector |
|---|---|---|
| Đơn vị | Mỗi blank chấm riêng theo vị trí. Không có khoan nhượng chéo giữa các blank | `L2-007` |
| Điểm blank | Như mục 2 trên token của target (kèm dạng thay thế) | |
| Điểm mục | `Σ lcs / Σ den` qua các blank. `exact` khi mọi blank đúng | `L2-005`, `L2-023` |
| Blank trống | Tính 0 trên độ dài mong đợi. Check cần ít nhất một blank không trống, nếu không bị từ chối (D-12) | `L2-008` |
| Từ lặp | Target xác định chính xác lần xuất hiện (`occurrence`); chỉ blank đó bị ẩn | `L2-021` |
| Không phân biệt hoa thường | `Groups` đúng | `L2-020` |
| Không gần đúng | `group` cho `groups`; `guide` cho `guided` | `L2-019`, `L2-022` |

## 6. Level 3 Sentence Dictation

Chấm như mục 2, kèm dạng thay thế của mọi target chồng lên câu (mục 3). Dấu câu bên trong câu bị bỏ qua (`L3-009`). Từ lặp: `L3-012`, `L3-013` kiểm tra căn chỉnh lại sau khi thiếu hoặc thừa cụm. `I will` không được chấp nhận cho `I’ll` nếu không khai dạng (`L3-014`). Kết quả đầu vào bị từ chối: trống, quá dài (`L3-017`, `L3-018`). Ký tự điều khiển bị loại và đánh dấu (`L3-019`). Văn bản trả lời giống HTML là văn bản thường và chỉ nhận điểm theo token (`L3-016`).

## 7. Level 4 Extended Dictation (Đề xuất D-13)

| Quy tắc | Nội dung | Vector |
|---|---|---|
| Văn bản mong đợi | Nối token của các câu theo thứ tự audio. Nhãn người nói, marker `(Qn)` và dòng gạch nối không có trong đó | |
| Điểm | Toàn đoạn, như mục 2, kèm dạng thay thế của mọi target trong các câu | `L4-003`, `L4-007` |
| Xuống dòng, dấu câu | Bỏ qua | `L4-001` |
| Thiếu cả một câu | Căn chỉnh lại sau khoảng trống; `sentenceMatchedAll` cho biết câu nào khớp hoàn toàn | `L4-002` |
| Sai thứ tự câu | Phạt theo LCS | `L4-004` |
| Thừa văn bản | Tính là từ thừa | `L4-005` |
| Nhãn người nói do học sinh gõ | Mặc định nghiêm ngặt: tính là từ thừa (D-13). Có thể nới sau bằng cách bỏ nhãn dạng `TÊN:` ở đầu dòng | `L4-006` |

## 8. Answer Spotter (độc lập, xem lại sau kiểm tra) (Rev1 cho hình thức, Đề xuất cho chấm)

| Quy tắc | Nội dung | Vector |
|---|---|---|
| Chế độ độc lập | `choose_option` hoặc `type_answer`. Không bao giờ chọn đoạn văn bản ẩn (Rev1) | |
| `choose_option` | Chọn chuỗi tùy chọn; đúng khi bằng đáp án sau chuẩn hóa. `distractorChosen` nếu chọn distractor. Điểm 1/1 hoặc 0/1 | `AS-008` đến `AS-010` |
| `type_answer` (một đáp án) | Khớp toàn bộ chuỗi với đáp án hoặc dạng đã duyệt. Không có điểm từng phần, không đồng nghĩa, không tách gốc từ | `AS-001`, `AS-002`, `AS-005` |
| Giới hạn từ | Quá `maxWords` thì từ chối `exceeds_word_limit` dù có chứa đáp án | `AS-003`, `AS-019` |
| Số | `numberAllowed = false` mà có chữ số thì từ chối `number_not_allowed` | `AS-007` |
| Trống | Không là một lần thử (D-12) | `AS-006` |
| `type_answer` danh sách (target_detection) | Tách theo dấu phẩy, chấm phẩy hoặc xuống dòng. Mỗi ứng viên khớp tối đa một lần. Điểm `khớp / max(số ứng viên, số mục gõ)`. Không phụ thuộc thứ tự. Trùng lặp là thừa | `AS-011` đến `AS-016` |
| Dạng thay thế | Chỉ dạng đã duyệt | `AS-012`, `AS-016`, `AS-017`, `AS-018`, `AS-020` |
| Post-check review | `select_span_in_text`, chỉ sau khi mục độc lập đi kèm đã được kiểm tra lần đầu (hoặc sau reveal theo `postCheckReviewUnlock`). Chỉ cho trạng thái `reviewed`, không bao giờ cho `independentCredit` hay mastery | `AS-022` đến `AS-026` |
| Dữ liệu cho học sinh | Payload của mục độc lập không chứa vai trò span, đáp án đúng, giải thích, văn bản câu bằng chứng, bộ đáp án đã duyệt hay ghi chú marker trước khi kiểm tra | `AS-027` (cần engine) |

## 9. Hint, Reveal, lần thử đầu và trạng thái (Rev1 tên trạng thái; Đề xuất phần còn lại)

| Khái niệm | Định nghĩa |
|---|---|
| Lần thử (attempt) | Mỗi Check có đáp án không trống. Ghi `index`, điểm, số hint đã dùng trước đó (`hintsBefore`), đã reveal trước đó (`revealedBefore`) |
| Check trống | Không là lần thử, không dùng lần thử đầu (D-12) |
| Check lặp | Check có đáp án giống hệt Check trước và không có hint, reveal hay chỉnh sửa xen giữa thì bỏ qua (D-18) |
| `firstAttempt` | Lần thử có `index 0`. `independent` đúng khi `hintsBefore = 0` và chưa reveal. Không bao giờ bị ghi đè, kể cả khi mở lại mục |
| Reveal trước khi Check | `firstAttempt` là rỗng; trạng thái `reviewed` |
| Lần thử sau reveal (chép đáp án) | Được ghi, không bao giờ cho trạng thái thành thạo, không vào luyện tập hiện tại |
| `currentPractice` | Điểm của lần thử gần nhất không sau reveal; rỗng nếu chưa có |

Trạng thái mục (tên Rev1):

| Trạng thái | Điều kiện |
|---|---|
| `independent_success` | Lần thử đầu đúng hoàn toàn, không hint, không reveal trước đó |
| `improved_after_practice` | Không phải trên, nhưng có lần thử đúng hoàn toàn không sau reveal. Bao gồm đúng ngay lần đầu sau khi dùng hint (D-14) |
| `reviewed` | Có reveal và không có lần thử đúng hoàn toàn trước reveal |
| `in_progress` | Có lần thử, chưa đúng, chưa reveal |
| `not_started` | Không lần thử, không reveal |

Bằng chứng thành thạo `masteryEvidence` (Đề xuất D-16):

| Điều kiện | Giá trị |
|---|---|
| `independent_success`, câu chưa từng được cho xem | `independent` |
| `independent_success`, trước đó đã thấy token (L1) hoặc ngữ cảnh có ô trống (L2) | `independent_exposed` |
| `independent_success`, trước đó đã thấy đáp án đầy đủ | `practice` |
| `improved_after_practice` | `practice` |
| `reviewed`, `in_progress`, `not_started` | `none` |

Hint: mọi trợ giúp tiết lộ thông tin ngoài kết quả Check. Số hint tích lũy; Reveal là mức cuối. Hint không đổi điểm của lần thử nhưng đổi `independent`.

Vector: `ATT-001` đến `ATT-013`.

## 10. Tổng hợp theo cấp (Đề xuất D-19)

Điểm lần đầu của một cấp là `Σ num / Σ den` trên các mục có `firstAttempt` (có trọng số theo token, không phải trung bình phần trăm). Mục `reviewed` không có lần đầu thì không vào. Báo cáo kèm số mục `independent_success`, `improved_after_practice`, `reviewed` và chưa làm. Vector: `AGG-001`, `AGG-002`.

## 11. Điều hướng, phiên và bài tập về nhà (Đề xuất D-20, D-21, D-22)

Guided Listening trình bày mục theo thứ tự audio, nhưng học sinh được phép nhảy, bỏ qua và quay lại.

| Quy tắc | Nội dung | Vector |
|---|---|---|
| Bỏ qua rồi quay lại | Lần thử đầu của mục vẫn là lần đầu | `NAV-001` |
| Mở lại mục đã làm | Thêm lần thử mới; lần đầu không đổi | `NAV-002` |
| Bản nháp | Lưu tự động; khôi phục lần thử và hint; không phải bài nộp | `NAV-003`, `NAV-010` |
| Nộp khi còn mục chưa làm | Lần đầu trả `needs_confirmation:N` và không đổi gì; xác nhận mới nộp, ghi `unanswered` | `NAV-004` |
| Nộp lỗi mạng | Không đánh dấu đã nộp; thử lại thành công; nộp lần nữa là `already_submitted`, không ghi đè | `NAV-005` |
| Phiên bản | Bản nháp và bài nộp ghim theo phiên bản đang làm; phiên bản mới của giáo viên không đổi bài đang làm | `NAV-006` |
| Sau khi nộp | Bài tập về nhà bị khóa: Check bị từ chối `locked_after_submit` (giáo viên có thể mở lại) | `NAV-007` |
| Luyện tập tự do | Không có nộp; không khóa | `NAV-008` |
| Check trống | Không ghi gì | `NAV-009` |

## 12. An toàn và hiển thị (Rev1 yêu cầu; kiểm thử cần giao diện)

| Yêu cầu | Vector |
|---|---|
| Mọi văn bản từ transcript, câu trả lời học sinh, phản hồi, bảng điểm, preview, báo cáo audit hiển thị bằng text node, không bao giờ biến chuỗi thành phần tử hay markup | `SAF-001`, `SAF-002` |
| JSON nhập không bao giờ cung cấp URL, CSS hay trình xử lý sự kiện cho giao diện theo dõi | `SAF-003` |
| Văn bản có dấu `<` `>` hiển thị đúng các ký tự đó | `SAF-002` |
| Phía chấm điểm: câu trả lời giống HTML chỉ là văn bản | `L3-016` |

Các vector `SAF-*` và `AS-027` có `requires: engine_ui`: runner báo chưa chạy cho tới khi có adapter hoặc kiểm thử giao diện.

## 13. Danh mục ca biên theo vector

| Ca biên | Vector |
|---|---|
| Dấu nháy cong và thẳng | `TOK-001`, `L2-002`, `L3-002` |
| Chữ hoa chữ thường, hoa tên riêng | `L2-020`, `L3-002` |
| Dấu câu cuối và giữa câu, dấu gạch ngang đứng riêng | `TOK-002`, `TOK-004`, `L2-016`, `L3-009` |
| Từ ghép gạch nối, biến thể | `L2-017`, `L2-018` |
| Số, tiền, ngày, dạng chữ | `L2-009` đến `L2-016`, `L3-010`, `L3-015`, `AS-012`, `AS-017`, `AS-018` |
| Rút gọn | `L2-003`, `L2-004`, `L2-005`, `L2-006`, `L3-003`, `L3-004`, `L3-014` |
| Từ lặp | `L2-021`, `L3-012`, `L3-013`, `L1-006`, `L1-011` |
| Thiếu từ, thừa từ, hoán đổi, đổi thứ tự câu | `L3-005`, `L3-006`, `L1-002`, `L4-004` |
| Sai chính tả, thiếu `s`, `ed`, gần đúng | `L2-019`, `L2-022`, `L3-007`, `L3-011`, `AS-005` |
| Ký tự đồng dạng, ký tự điều khiển | `L2-024`, `L3-019` |
| Blank trống, kiểm tra trống, check lặp nhanh | `L1-007`, `L1-012`, `L2-008`, `ATT-011`, `ATT-012` |
| Nhấp đúp nhiều lần | `L1-008`, `ATT-012` |
| Hint, reveal, chép đáp án, mở lại mục | `ATT-003` đến `ATT-008`, `ATT-013` |
| Đã thấy ở cấp trước (phơi nhiễm) | `ATT-009`, `ATT-010` |
| Dạng chưa duyệt | `L2-004`, `L3-004`, `AS-016` |
| Nhập quá dài | `L3-018` |
| Văn bản giống HTML | `TOK-007`, `TOK-008`, `L3-016`, `L3-020`, `SAF-001`, `SAF-002` |
| Nộp lỗi, trùng nộp, phiên bản mới, khóa sau nộp | `NAV-004` đến `NAV-007` |

## 14. Quyết định còn mở (đề xuất, chưa phê duyệt)

Số thứ tự tiếp nối D-01 đến D-11 của changelog Rev1.

| Mã | Vấn đề | Mặc định đề xuất | Hệ quả | Cách đảo ngược |
|---|---|---|---|---|
| D-12 | Check trống có tính là lần thử không | Không. Từ chối, không dùng lần thử đầu | Học sinh không mất lần đầu vì bấm nhầm | Đổi hằng số ở engine; vector `ATT-011` và `NAV-009` đổi kỳ vọng |
| D-13 | Nhãn người nói học sinh tự gõ | Tính là từ thừa | Học sinh gõ `TOM:` mất điểm nhẹ | Bỏ nhãn dạng `TÊN:` đầu dòng trước khi chấm |
| D-14 | Dùng hint trước Check đầu rồi đúng | Lần đầu không độc lập; trạng thái `improved_after_practice` | Không tính thành công độc lập | Thêm trạng thái riêng nếu muốn |
| D-15 | Làm sạch đầu vào | Tối đa 4000 ký tự; loại ký tự điều khiển và bidi | Nhập quá dài bị từ chối | Đổi ngưỡng |
| D-16 | Phơi nhiễm trước và bằng chứng thành thạo | Ba mức như mục 9 | Đã thấy đáp án thì không tính độc lập | Thêm mức hoặc bỏ phân biệt |
| D-17 | Ký hiệu không phải chữ (`<`, `%`) | Không chấm ký hiệu lẻ; `%` cuối bị cắt | Học sinh không gõ `<` vẫn đúng; `20%` coi như `20` | Thêm quy tắc riêng cho `%` |
| D-18 | Check lặp nhanh cùng đáp án | Bỏ qua | Không tạo lần thử thừa | Tắt dedupe |
| D-19 | Cách tổng hợp điểm cấp | Σ num / Σ den | Mục dài có trọng số lớn hơn | Dùng trung bình mục |
| D-20 | Nộp lỗi mạng và nộp trùng | Không đánh dấu đã nộp; nộp lại thành công; nộp trùng vô hại | Không mất bài | Thêm cơ chế khóa |
| D-21 | Bản nháp và bài nộp theo phiên bản | Ghim phiên bản đang làm | Học sinh hoàn thành đúng bản đã bắt đầu | Cho phép di chuyển phiên bản có xác nhận |
| D-22 | Sau khi nộp bài về nhà | Khóa; giáo viên mở lại | Không sửa sau nộp | Cho luyện thêm ngoài bài nộp |
| D-23 | Hoa thường tên riêng | Không chấm hoa thường | `harbour` và `Harbour` như nhau | Thêm cảnh báo ở phản hồi |
| D-24 | Tín nhiệm gần đúng | Không có điểm; có thể gắn nhãn phản hồi | Nghiêm ngặt chính tả | Thêm khoan nhượng có cấu hình |
| D-25 | Công thức điểm | LCS trên `max(n, m)` | Hoán đổi và từ thừa bị phạt | Đổi công thức, cập nhật vector |
| D-26 | Quan hệ blank L2 | Theo vị trí, không chéo | Gõ nhầm ô không được điểm | |
| D-27 | Điểm Answer Spotter | Nhị phân cho một đáp án; tập hợp cho danh sách | Không điểm từng phần ở đáp án đơn | |
| D-28 | Mở khóa post-check | Theo `postCheckReviewUnlock` | `after_reveal` chỉ mở sau reveal | Đổi cài đặt |

Quyết định còn tồn đọng từ Rev1 (D-01 đến D-11) giữ nguyên ý nghĩa và vẫn chưa giải quyết, trong đó D-08 (ba span Cambridge chưa xác minh) vẫn là mở.

## 15. Cách chạy

```text
pip install jsonschema          # tùy chọn; không có thì bước kiểm tra schema vector được ghi là NOT RUN
python dictation-golden-test-runner.py
python dictation-golden-test-runner.py --adapter "node my-engine-adapter.js"    # khi Codex có adapter
```

Xem `dictation-golden-tests-readme.md` cho giao thức adapter, cấu trúc vector và cách đọc kết quả.
