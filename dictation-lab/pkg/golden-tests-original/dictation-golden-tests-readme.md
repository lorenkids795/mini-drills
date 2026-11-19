# Golden tests cho chấm điểm, phản hồi và phiên của Dictation Lab

Đi kèm `dictation-golden-scoring-spec.md`. Toàn bộ dữ liệu là tổng hợp, an toàn để công khai.

## 1. Bộ dữ liệu

| Thành phần | Nội dung |
|---|---|
| `dictation-golden-tests/baseline-harbour-museum.rev1.json` | Baseline: một tệp import schema 1.1 hợp lệ (21 câu, 12 target, 7 mục L1, 8 L2, 9 L3, 3 L4, 8 Answer Spotter). Dạng thay thế đã `teacher_approved` bằng dữ liệu tổng hợp để kiểm thử chấm. Qua validator Rev1 với `eligible_for_teacher_preview` |
| `dictation-golden-tests/vectors/*.json` | 134 vector trong 9 tệp, mỗi tệp một nhóm |
| `dictation-golden-tests/vector-schema.json` | Schema của phong bì vector |
| `dictation-golden-tests/example-adapter-protocol-demo.py` | Ví dụ giao thức adapter (chạy oracle, không phải engine thật) |
| `dictation-golden-test-runner.py` | Runner |

| Nhóm vector | Tệp | Số lượng |
|---|---|---|
| Chuẩn hóa và token hóa | `tokenize.json` | 14 |
| Level 1 (sắp thẻ và thao tác thẻ) | `l1.json` | 13 |
| Level 2 (blank) | `l2.json` | 24 |
| Level 3 | `l3.json` | 21 |
| Level 4 | `l4.json` | 7 |
| Answer Spotter | `answer-spotter.json` | 27 |
| Lần thử, hint, reveal, trạng thái, tổng hợp | `attempts.json` | 15 |
| Điều hướng, bản nháp, nộp bài | `session.json` | 10 |
| An toàn và hiển thị | `safety.json` | 3 |

68 vector gắn nhãn `adversarial`, 2 vector gắn `known_limitation` (hành vi được ghim lại có chủ đích, xem D-17).

## 2. Định dạng một vector

```json
{
  "id": "L2-006",
  "title": "it is is NOT equivalent to it’s got: earns only the shared token",
  "kind": "l2Blanks",
  "requires": "oracle",
  "tags": ["adversarial"],
  "decisionRefs": [],
  "input": {"itemId": "l2-003", "answers": ["it is", "stairs"]},
  "expected": {"perBlank": [{"lcs": 1, "den": 2, "exact": false, "variant": "alt:It has"}, {"lcs": 1, "den": 1, "exact": true}], "num": 2, "den": 3, "exact": false}
}
```

Quy tắc so sánh: mọi khóa trong `expected` phải có trong kết quả với giá trị bằng nhau (danh sách phải cùng độ dài). Kết quả có thể có thêm khóa. `requires: oracle` nghĩa là oracle tham chiếu tính lại được; `engine_ui` nghĩa là chỉ engine hay giao diện thật kiểm thử được.

## 3. Chạy

```text
pip install jsonschema                          # tùy chọn
python dictation-golden-test-runner.py          # integrity + baseline + oracle + mutation self-check
python dictation-golden-test-runner.py --adapter "COMMAND"    # thêm: so sánh engine thật qua adapter
```

Python 3.9 trở lên. Không cần mạng, không tốn phí.

## 4. Runner kiểm tra gì (và không kiểm tra gì)

| Nhóm | Ý nghĩa | Tình trạng |
|---|---|---|
| integrity | Vector là JSON hợp lệ, đúng phong bì schema, id duy nhất, tham chiếu `itemId` và `sentenceId` tồn tại, mọi `decisionRefs` được khai trong spec, mọi vector id được trích trong spec có thật, tối thiểu 40 vector và 12 vector adversarial | Chạy ngay |
| baseline | Baseline qua schema và validator ngữ nghĩa Rev1, không lỗi, `eligible_for_teacher_preview` | Chạy ngay |
| oracle | Mọi vector `requires: oracle` được tính lại bằng oracle tham chiếu và khớp giá trị mong đợi viết tay | Chạy ngay. KHÔNG phải kiểm thử engine production |
| mutation | 18 lỗi cố ý được gieo vào oracle (phân biệt hoa thường, bỏ phạt từ thừa, chấp nhận dạng chưa duyệt, bỏ qua reveal...). Bộ vector phải phát hiện được từng lỗi | Chạy ngay. Hiện phát hiện 18 trên 18 |
| adapter | So sánh engine thật với từng vector | NOT RUN cho tới khi có `--adapter` |
| engine_ui | 4 vector cần giao diện hay engine thật (payload học sinh, render an toàn) | NOT RUN cho tới khi có adapter hoặc kiểm thử giao diện |

Thông điệp cuối của runner luôn nói rõ: `PRODUCTION ENGINE: NOT RUN` khi chưa có adapter. Một kết quả PASS khi đó chỉ có nghĩa là dữ liệu kiểm thử toàn vẹn và nhất quán với đặc tả.

## 5. Giao thức adapter (cho Codex)

Mỗi vector: runner khởi động `COMMAND`, ghi một dòng JSON vào stdin `{"kind": "...", "input": {...}, "baseline": "<tên baseline>"}` rồi đọc một dòng JSON từ stdout: `{"result": {...}}` hoặc `{"unsupported": true}`. Mã thoát phải là 0. Adapter nên là một lớp mỏng gọi mã chấm điểm và mã phiên thật (ví dụ một script Node), đọc baseline từ `dictation-golden-tests/`. Có thể trả `unsupported` cho kiểu chưa triển khai; runner đếm riêng.

| `kind` | `input` chính | `result` cần trả (tập con khóa trong `expected`) |
|---|---|---|
| `tokenize` | `text` | `tokens` |
| `l1Arrangement` | `itemId`, `placed` | `lcs`, `den`, `exact`, `usedDistractor` hoặc `rejected` |
| `l1Events` | `tiles`, `expectedText`, `events` | `pool`, `placed`, `check` |
| `l2Blanks` | `itemId`, `answers`, `mutations` | `perBlank`, `num`, `den`, `exact` |
| `scoreSentence` | `sentenceId` hoặc `itemId` hoặc `expectedText`; `answer` hoặc `answerRepeat` | `lcs`, `den`, `exact`, `variant`, `missing`, `extra`, `sentenceMatchedAll`, `sanitized`, `tokens` hoặc `rejected` |
| `scoreAnswerSpotter` | `itemId`, `response` | `correct`, `num`, `den`, `distractorChosen`, `rejected`, hoặc kết quả xem lại |
| `reviewUnlock` | `setting`, `pairedItemState` | `unlocked` |
| `attemptSequence` | `exposure`, `events` | `attempts`, `firstAttempt`, `status`, `masteryEvidence`, `currentPractice` |
| `aggregate` | `items` | `firstAttemptScore`, bộ đếm |
| `session` | `mode`, `version`, `items`, `events` | `results`, `final` |

`mutations` trong input (ví dụ `{"op": "forms_state", "value": "proposed"}`) yêu cầu adapter xem mọi dạng thay thế là chưa duyệt trong bản sao baseline.

## 6. Giới hạn đã biết

| Giới hạn | Ghi chú |
|---|---|
| Không có engine production để kiểm thử | Runner nói rõ NOT RUN |
| Oracle và giá trị mong đợi cùng do một tác giả viết | Giảm rủi ro bằng giá trị mong đợi viết tay trước khi chạy, và mutation self-check; nhưng một hiểu sai chung về quy tắc vẫn có thể lọt. Cần Codex và giáo viên rà soát spec |
| Chuyển chữ thường | Oracle dùng `str.lower()` của Python; JavaScript `toLowerCase()` có thể khác ở vài ký tự hiếm. Vector chỉ phủ Latin và dấu câu phổ biến |
| Chỉ dùng văn bản BMP trong baseline | Offset của baseline là code point; trùng UTF-16 trong baseline này. Quy tắc UTF-16 của Rev1 vẫn áp dụng cho dữ liệu thật |
| Thao tác giao diện (kéo thả, phím tắt, trình phát, A–B loop, tốc độ) | Chưa có vector; thuộc kiểm thử giao diện của Codex |
| Xáo thẻ ngẫu nhiên | Không có vector xác định; chỉ yêu cầu hành vi trong spec |
