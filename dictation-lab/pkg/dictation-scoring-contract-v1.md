# Dictation Lab: Scoring, Feedback and Session Contract v1 (normative)

Tài liệu này thay thế phần chấm điểm của `golden-tests-original/dictation-golden-scoring-spec.md` (giữ nguyên, không sửa) sau khi rà soát thiết kế. Mọi giá trị mong đợi trong `golden-tests/vectors` được viết tay theo tài liệu này. Từ khóa MUST, SHOULD, MAY có nghĩa chuẩn. Mỗi quy tắc có tham chiếu vector; mỗi quyết định có mã D-nn ở mục 15 và `scoring-decision-matrix.md`.

Phạm vi: hành vi engine JavaScript trong trình duyệt hoặc Node, không phụ thuộc DOM, không gọi AI, không trả phí. Backend, xác thực, lưu trữ, R2, hạn mức nằm ngoài phạm vi (mục 14).

## 1. Chuẩn hóa và token hóa (C1)

Thứ tự thao tác cho cả văn bản mong đợi và câu trả lời học sinh:

| Bước | Quy tắc |
|---|---|
| 0 (chỉ câu trả lời) | Loại ký tự điều khiển (nhóm Cc trừ tab, LF, CR) và ký tự bidi; đặt cờ `sanitized`. Hơn 4000 code point thì từ chối `answer_too_long` (D-15) |
| 1 | NFC |
| 2 | `’` `‘` `ʼ` thành `'`; dấu trừ U+2212 thành `-` |
| 3 | Chữ thường (không phân biệt hoa thường, kể cả tên riêng, D-23) |
| 4 | Tách theo tập khoảng trắng cố định `[ \t\n\r\f\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]` |
| 5 | Cắt đầu mảnh: lặp xóa ký tự nhóm Unicode P, TRỪ `-` hoặc `.` đứng ngay trước một chữ số (dấu âm, dấu thập phân đầu) |
| 6 | Cắt cuối mảnh: lặp xóa ký tự nhóm P, TRỪ `%` và `‰` |
| 7 | Bỏ mảnh không còn chữ cái hay chữ số nào (ký hiệu lẻ như `<`, `£`, `%` đứng riêng bị bỏ) |

Ký hiệu có nghĩa được giữ (D-17, D-30): `£ $ €` gắn với số (nhóm S không bị cắt), `%` cuối, dấu `-` hoặc `+` trước số, dấu thập phân (kể cả đầu `.5`), dấu `°`, đơn vị dính liền (`5km`). Không có tương đương số tự động.

| Ví dụ | Kết quả | Vector |
|---|---|---|
| `The tax is 20%.` | `the tax is 20%` | `NUM-001` |
| `costs £35, not €40.` | `costs £35 not €40` | `NUM-002` |
| `-5 or +3` | giữ dấu | `NUM-003`, `NUM-006` |
| `.5 of 3.5` | `.5` và `3.5` | `NUM-004` |
| `25°C and 5km` | `25°c`, `5km` | `NUM-005` |
| `€5,50, please` | `€5,50` | `NUM-007` |
| `20` so với `20%`, `35` so với `£35`, `3.5` so với `35`, `0.5` so với `.5` | không khớp | `NUM-009`, `NUM-012`, `NUM-014`, `NUM-017` |
| `5 km` so với `5km`, `20 %` so với `20%` | không khớp | `NUM-015`, `NUM-019` |
| `thirty-five pounds` so với `£35` | không khớp nếu chưa duyệt | `NUM-020` |
| Văn bản chữ như `A < B`, `<noise>` | `<` lẻ bị bỏ; `<noise>` là một token | `TOK-007`, `TOK-008` |

Hạn chế đã biết: `<`, `>`, `=` đứng riêng không được chấm (D-17); `toLowerCase` chỉ bảo đảm cho chữ Latin và dấu câu thông dụng.

## 2. Căn chỉnh, điểm và biện pháp chống che giấu lỗi (C2, D-25)

Cho E (n token mong đợi, sau khi chọn biến thể) và A (m token trả lời):

| Đại lượng | Định nghĩa |
|---|---|
| `lcs` | Độ dài dãy con chung dài nhất (khớp có thứ tự) |
| `den` | `max(n, m)` |
| `exact` | E bằng A từng token |
| `missing`, `extra` | `n - lcs`, `m - lcs` |
| `accuracy` | `lcs/den`, chỉ là chẩn đoán từng phần |
| `targetErrors` | Số target (learningTargets) có ít nhất một token mong đợi không khớp |
| `criticalTargetErrors` | Trong số đó, target có `focusTypes` chứa `ielts_answer_candidate`, `number`, `date_time` hoặc `price` |

Quy tắc bắt buộc: giao diện và báo cáo MUST NOT hiển thị `accuracy` một mình. Phải kèm `exact` hoặc số lỗi, và `criticalTargetErrors` khi lớn hơn 0. Thành công của mục chỉ là `exact` (mục 10). Không có điểm gần đúng cho sai chính tả, thiếu `s`/`ed` (D-24).

Các vector chứng minh điểm từng phần không che giấu lỗi nặng: một số sai trong 25 token `LCS-001` (24/25, không exact, 1 lỗi critical); hai giá tiền sai `LCS-002` (13/15, 2 lỗi critical); đảo ngược toàn câu `LCS-003` (1/6); thêm sáu từ thừa `LCS-004` (6/12); thiếu từ cuối `LCS-005`; lỗi đuôi số nhiều chỉ là lỗi thường `LCS-006`. Phản hồi từng token dùng backtrace xác định (khớp, rồi missing khi `L[i-1][j] >= L[i][j-1]`, còn lại extra); nhãn trong ca mơ hồ (từ lặp) không ảnh hưởng điểm (`L3-012`, `L3-013`).

## 3. Dạng thay thế đã duyệt (C3)

Chỉ `allowedForms` (target) và `acceptedForms` (Answer Spotter) có `approvalState = teacher_approved` được dùng khi chấm (`L2-004`, `L3-004`, `AS-016`, `AS-040`). Mỗi dạng gắn với một span, thử từng tổ hợp (tối đa 256, vượt thì tham lam trái sang phải) và chọn độ chính xác cao nhất, rồi `lcs` cao hơn, rồi ưu tiên bản gốc (`L3-010`). Không có tương đương toàn cục: `it’s got` chỉ có `it has` khi được khai (`L2-005`, `L2-006`); `I will` không thay `I’ll` (`L3-014`); số, tiền, đơn vị, ngày chỉ qua dạng đã duyệt (`NUM-010` đến `NUM-013`, `L2-009` đến `L2-016`). Dạng chỉ áp dụng ở L2, L3, L4, không ở L1.

## 4. Level 1 (C4)

Token mong đợi từ `cleanText` câu. Điểm theo mục 2 trên văn bản thẻ đã đặt, so theo văn bản (thẻ giống chữ hoán đổi được, `L1-006`, `L1-011`). Distractor đặt vào là token thừa (`L1-003`, `L1-005`). `place` chỉ có hiệu lực với thẻ còn trong kho (nhấp đúp đặt một lần, `L1-008`); `remove` trả thẻ về vị trí gốc (`L1-009`); `move` đổi chỗ (`L1-010`). Check khi chưa đặt thẻ bị từ chối (`L1-007`, `L1-012`). Thứ tự xáo thẻ: PRNG có hạt giống xác định, không bao giờ trùng thứ tự đúng khi n > 1; điểm không phụ thuộc thứ tự xáo.

## 5. Level 2 (C5)

Mỗi blank chấm riêng theo vị trí (`L2-007`); điểm mục là `Σlcs/Σden` qua các blank; `exact` khi mọi blank exact. Check cần ít nhất một blank không trống (`L2-008`, D-12). Từ lặp xác định bằng `occurrence` (`L2-021`). Không gần đúng (`L2-019`, `L2-022`). Target không có token (độ dài 0) làm mục không hợp lệ (D-29).

## 6. Level 3 (C6)

Mục 2 và 3 trên `cleanText`. Dấu câu trong câu bị bỏ (`L3-009`). Đầu vào bị từ chối: trống, quá dài (`L3-017`, `L3-018`). Ký tự điều khiển bị loại và đánh dấu (`L3-019`). Văn bản giống HTML chỉ là chữ (`L3-016`). Level 3 không bỏ nhãn người nói (`SPK-012`).

## 7. Level 4 (C7) và nhãn người nói (C8, D-13)

Văn bản mong đợi là nối token các câu theo thứ tự audio; nhãn người nói, `(Qn)`, dòng gạch nối không có trong đó. Xuống dòng và dấu câu bị bỏ (`L4-001`); thiếu cả một câu thì căn chỉnh lại (`L4-002`, `sentenceMatchedAll`); sai thứ tự câu bị phạt (`L4-004`).

Bỏ nhãn người nói (chỉ L4, cài đặt `ignoreSpeakerLabels`, mặc định bật, cần giáo viên phê duyệt):

| Quy tắc | Vector |
|---|---|
| Nhãn đã biết là `rawLabel` hoặc `displayName` của người nói trong metadata bài, so sánh không phân biệt hoa thường, bỏ khoảng trắng thừa | `SPK-001`, `SPK-002`, `SPK-009` |
| Chỉ ở đầu dòng (cho phép khoảng trắng và tab trước), theo sau là dấu hai chấm | `SPK-003`, `SPK-013` |
| Chữ có dấu hai chấm khác (`Note:`) không phải nhãn đã biết | `SPK-004` |
| Nhãn giữa dòng hoặc không có dấu hai chấm không bị bỏ | `SPK-005`, `SPK-006` |
| Người nói không có trong metadata không bị bỏ | `SPK-010` |
| Tắt cài đặt thì không bỏ gì | `SPK-007` |
| Bảo vệ: nếu chính văn bản mong đợi bắt đầu bằng nhãn đó và dấu hai chấm thì giữ | `SPK-008` |
| Dòng chỉ có nhãn không tạo đáp án rỗng hợp lệ | `SPK-011`, `SPK-014` |

## 8. Hint và Reveal

Hint tích lũy; nội dung hint là chính sách giao diện (engine có thang mặc định nhưng không thuộc vector). Reveal hiện đáp án đầy đủ.

## 9. Answer Spotter (C9, D-27)

| Quy tắc | Vector |
|---|---|
| Độc lập chỉ `choose_option` hoặc `type_answer`; `select_span_in_text` chỉ ở post-check. Mục sai không hợp lệ, không chấm | `AS-041`, `AS-042`, `AS-043`, `AS-044`, `AS-045` |
| So khớp giá trị: toàn chuỗi bằng đáp án hoặc dạng đã duyệt. Không số học, không đồng nghĩa, không gốc từ. `£35` khớp `35` chỉ khi duyệt `symbol_optional` | `AS-028` đến `AS-040` |
| Khác dictation: đáp án đơn nhị phân (không `lcs`), có giới hạn từ và số (`exceeds_word_limit`, `number_not_allowed`) | `AS-003`, `AS-007` |
| Danh sách (target_detection): tách theo `,` `;` xuống dòng, mỗi ứng viên khớp một lần, điểm `khớp/max(số ứng viên, số mục gõ)` | `AS-011` đến `AS-016` |
| Post-check chỉ cho `reviewed`, không bao giờ có `independentCredit` | `AS-022` |
| Mở khóa post-check theo `postCheckReviewUnlock` | `AS-023` đến `AS-026` |
| Nhãn nguồn: AI-authored, Teacher-authored, hoặc Official chỉ khi `officialClaim` đầy đủ (nguồn, `official_source_confirmed`, `rightsAttested`, vai trò, thời điểm) | `AS-046` đến `AS-049` |
| Payload học sinh của mục độc lập không chứa dữ liệu mang đáp án trước khi kiểm tra | `AS-027` (cần giao diện) |

## 10. Lần thử, kết quả, độc lập, bằng chứng (C10, D-12, D-14, D-18)

Các chiều tách biệt, không gộp một trạng thái:

| Chiều | Giá trị | Định nghĩa |
|---|---|---|
| Attempt | `kind = scored` hoặc `post_reveal` | Check không trống. Sau Reveal thì là `post_reveal` (không bao giờ tính vào hoàn thành, điểm đầu hay bằng chứng) |
| `firstAttempt` | `{num, den, exact, independent}` hoặc rỗng | Lần thử `scored` đầu tiên; bất biến suốt đời mục (`EXP-012`). Rỗng nếu Reveal trước mọi Check |
| `independence` | `independent`, `assisted`, rỗng | `assisted` nếu có hint trước lần thử đầu; hint sau lần đầu không đổi (`EXP-010`) |
| `outcome` | `succeeded`, `reviewed`, `in_progress`, `not_started` | `succeeded`: có lần thử `scored` exact. `reviewed`: có Reveal và chưa từng exact |
| `attempted` | boolean | Có ít nhất một lần thử `scored`. Chỉ Reveal thì không (`ATT-005`, `EXP-009`) |
| `status` (tên Rev1) | `independent_success`, `improved_after_practice`, `reviewed`, `in_progress`, `not_started` | Suy ra từ trên để tương thích |
| `currentPractice` | điểm của lần `scored` gần nhất | |

Check trống (không còn token sau làm sạch và bỏ nhãn) không phải lần thử và không dùng lần đầu (`ATT-011`, `L1-007`, `AS-006`). Check lặp: cùng chuỗi token đã chuẩn hóa với Check ngay trước và không có hint, reveal hay Check trống xen giữa thì bỏ qua (`ATT-012`, `EXP-011`); sau hint thì là lần thử mới (`ATT-013`). Vector: `ATT-001` đến `ATT-013`, `EXP-007` đến `EXP-013`.

## 11. Phơi nhiễm và bằng chứng thành thạo (C11, D-16)

Dữ liệu tối thiểu: với mỗi câu, lớp phơi nhiễm cao nhất từ `none < tokens_shown (L1) < context_shown (L2) < answer_shown (Reveal, post-check)`; L3 và L4 không để lộ văn bản (`EXD-003`). Engine tự suy ra trong phiên (`EXD-001`, `EXD-002`, `EXD-004`, `EXD-008`, `EXD-009`). Host có thể cung cấp `priorExposure` (gộp theo giá trị lớn nhất, `EXD-005`) và cờ `exposureHistoryComplete`; thiếu lịch sử thì lớp là `unknown` khi chưa thấy gì (`EXD-006`, `EXD-007`).

`evidence` (chỉ khi `outcome = succeeded`):

| Điều kiện | `evidence` | Vector |
|---|---|---|
| Lần đầu exact, độc lập, `exposure = none` và lịch sử đầy đủ | `novel_independent` | `EXP-001` |
| Như trên nhưng lịch sử chưa được xác nhận đầy đủ, hoặc `unknown` | `independent_unverified_novelty` | `EXP-002`, `EXP-003` |
| Lần đầu exact, độc lập, đã thấy token, ngữ cảnh hay đáp án | `practice_success` | `EXP-004` đến `EXP-006` |
| Lần đầu exact nhưng `assisted` | `assisted_success` | `EXP-007` |
| Thành công sau lần thử sai | `practice_success` | `EXP-008` |
| Còn lại | `none` | `EXP-009` |

## 12. Tổng hợp điểm (C12, D-19, D-29)

Đơn vị mỗi mục: số token mong đợi `expectedDen` (L1 đến L4, ngoài biến thể) hoặc 1 (đáp án đơn), số ứng viên (danh sách). Mục có `expectedDen = 0` là không hợp lệ, loại khỏi mọi mẫu số (`AGS-004`); tất cả không hợp lệ thì mọi chỉ số là rỗng, không phải 0 hay 100% (`AGS-005`).

| Chỉ số | Công thức |
|---|---|
| `attemptedAccuracy` | `Σ first.num / Σ first.den` trên mục đã `attempted`; rỗng nếu không có |
| `completionRate` | mục `attempted` / mục hợp lệ |
| `assignmentScore` | `Σ first.num / (Σ first.den của mục attempted + Σ expectedDen của mục chưa attempted)`. Chỉ báo cáo khi bài về nhà đã được máy chủ xác nhận nộp; trước đó là `projectedAssignmentScore`; luyện tập tự do không có |
| `practiceAccuracy` | như `attemptedAccuracy` nhưng dùng `current` |
| `reviewedOnly` | số mục chỉ Reveal (tính là chưa attempted) |
| Nhiều cấp | Mỗi cấp tính theo token. `overall.itemWeightedAssignmentScore` là trung bình phân số của từng mục (chưa làm = 0); `overall.unitWeightedAssignmentScore` trộn đơn vị nên chỉ tham khảo |

Điểm dùng `firstAttempt`, không bao giờ dùng lần tốt nhất (`AGS-010`). Ví dụ: 2 mục đúng 6/6 trên 10 mục: `attemptedAccuracy` 100%, `assignmentScore` 12/60 = 20%, `completionRate` 20% (`AGS-001`). Hai chỉ số đầu MUST NOT được trình bày thay thế cho nhau. Vector: `AGS-001` đến `AGS-011`, `AGG-001`, `AGG-002`.

## 13. Phiên, nộp bài, luyện tập tự do (C13, D-20, D-21, D-22)

| Sự kiện | Quy tắc | Kết quả | Vector |
|---|---|---|---|
| `submit_requested` | Luyện tập tự do: không áp dụng. Còn mục chưa làm mà chưa xác nhận: hỏi lại, không đổi trạng thái | `not_applicable_free_practice`, `needs_confirmation:N` | `NAV-004`, `NAV-008`, `SUB-012` |
| `submit_requested` xác nhận | Trạng thái `submit_pending`, khóa chỉnh sửa; KHÔNG BAO GIỜ là đã nộp | `submit_pending`, `locked_pending_submit` | `SUB-001`, `SUB-008`, `SUB-009` |
| `server_ack` đúng khóa, `accepted` hoặc `duplicate`, có `submissionId` | Chỉ lúc này mới `submitted` | `submitted` | `NAV-004`, `SUB-005` |
| `server_ack` sai khóa, không có yêu cầu, thiếu `submissionId`, trạng thái lạ | Bỏ qua | `mismatched_ack_ignored`, `unexpected_ack_ignored`, `invalid_ack_ignored` | `SUB-003`, `SUB-004`, `SUB-007` |
| `server_ack` `rejected` hoặc `submit_failed` | Về `draft`, dữ liệu nguyên vẹn, gửi lại bằng khóa mới | `submit_rejected`, `draft_restored` | `SUB-002`, `SUB-006`, `NAV-005` |
| Sau `submitted` | Bài về nhà bị khóa; ack lặp vô hại | `locked_after_submit`, `already_submitted` | `NAV-007`, `SUB-005` |
| `startFreePractice` | Chỉ sau khi đã nộp; ghi riêng, không đổi bài nộp | `free_practice_started`, `recorded_practice` | `SUB-010`, `SUB-011` |
| `saveDraft`, `resume` | Chỉ dữ liệu mục; không bao giờ là bài nộp; phiên bản đang làm được giữ | `draft_saved`, `resumed` | `NAV-003`, `NAV-006`, `SUB-013` |

Bỏ qua, quay lại, mở lại mục: lần thử đầu vẫn là lần đầu (`NAV-001`, `NAV-002`). Check trống không ghi gì (`NAV-009`).

## 14. Engine lai, xác định và ranh giới (D-31, D-32)

| Chủ đề | Quy tắc |
|---|---|
| Nội dung | Chỉ nạp tệp đã qua validator (JS); câu `pending_verification`, bị tắt hoặc không có không bao giờ thành bài |
| Mặc định cơ học (Transcript Only hoặc thiếu mục) | Chọn đều theo thứ tự audio: L1 câu 6 đến 14 token (tối đa 10); L2 một blank mỗi câu, ưu tiên token có chữ số rồi từ nội dung dài nhất (tối đa 10); L3 câu 4 đến 22 token (tối đa 10); L4 cửa sổ 2 đến 5 câu liền nhau cùng phía dòng ngắt, 25 đến 80 từ (tối đa 4); Answer Spotter không bao giờ tự sinh |
| Xác định | Mọi lựa chọn ngẫu nhiên dùng PRNG có hạt giống; cùng hạt giống và đầu vào cho cùng kết quả |
| Phiên | Là hàm thuần của nhật ký sự kiện: phát lại cùng nhật ký cho cùng trạng thái |
| Không có | Âm thanh, mạng, backend, định danh học sinh trong engine |
| Host cung cấp | Phiên bản nội dung, `priorExposure`, xác nhận máy chủ (`server_ack`), thời gian |

## 15. Sổ quyết định (đề xuất, chưa được giáo viên phê duyệt)

Chi tiết, tình trạng so với đề xuất gốc và tác động ở `scoring-decision-matrix.md`.

| Mã | Chủ đề |
|---|---|
| D-12 | Check trống không phải lần thử |
| D-13 | Bỏ nhãn người nói đã biết ở đầu dòng (chỉ Level 4) |
| D-14 | Hint trước lần đầu làm lần đầu thành `assisted` |
| D-15 | Làm sạch và giới hạn đầu vào (4000 code point) |
| D-16 | Phơi nhiễm và phân loại bằng chứng |
| D-17 | Ký hiệu có nghĩa được giữ; ký hiệu lẻ bị bỏ |
| D-18 | Check lặp cùng đáp án bị bỏ qua |
| D-19 | Chỉ số tổng hợp tách biệt (attempted, assignment, completion) |
| D-20 | Nộp bài chỉ thành công khi có xác nhận máy chủ |
| D-21 | Phiên bản nội dung ghim trong phiên |
| D-22 | Bài về nhà khóa sau nộp, luyện tập tự do tách biệt |
| D-23 | Không chấm hoa thường |
| D-24 | Không tín nhiệm gần đúng |
| D-25 | Điểm LCS kèm exact và lỗi target |
| D-26 | Blank L2 theo vị trí |
| D-27 | Answer Spotter: tập đáp án đã duyệt, hợp lệ mục, nhãn nguồn |
| D-28 | Mở khóa post-check |
| D-29 | Mẫu số, mục không hợp lệ, Reveal-only |
| D-30 | Số, tiền, đơn vị: không tương đương tự động |
| D-31 | Ranh giới engine lai và mặc định cơ học |
| D-32 | Xác định (PRNG, nhật ký sự kiện) |

Quyết định Rev1 D-01 đến D-11 giữ nguyên và chưa giải quyết (D-08: ba span Cambridge chưa xác minh).
