# Handoff v2: Scoring contract, JS validator, Hybrid Engine (work in progress)

Prompt gốc: CLAUDE_Dictation_Lab_Scoring_JS_Validator_Hybrid_Engine.md. Bản v2 này cập nhật sau snapshot đầu (wip-scoring-js-engine.zip, không bị sửa).

## Đã xong và đã kiểm chứng
| Hạng mục | Vị trí | Kết quả đã chạy |
|---|---|---|
| Hợp đồng chấm điểm v1, ma trận quyết định D-12..D-32 | pkg/dictation-scoring-contract-v1.md, pkg/scoring-decision-matrix.md | Hoàn chỉnh |
| Golden tests v2 (242 vector: 112 giữ, 22 đổi, 108 mới) | pkg/golden-tests/ | Python oracle 238 đạt, 4 cần UI; mutation 32/32 |
| Golden gốc 134 vector bảo toàn | pkg/golden-tests-original/ | Không sửa |
| JS validator | pkg/js-validator/ | 12 test đạt; semantic khớp Python 533/533; schema khớp Ajv 533/533; 82/82 mã |
| Hybrid Engine (MỚI) | pkg/hybrid-engine/ | 13 test đạt; 238/238 vector oracle-checkable đạt trên engine JS; 4 vector UI NOT RUN |

Lệnh: `cd pkg/golden-tests && python3 dictation-golden-test-runner.py` (thêm `--adapter "node ../hybrid-engine/test/golden-adapter.js"` để chạy engine JS qua giao thức adapter); `cd pkg/js-validator && npm test`; `cd pkg/hybrid-engine && npm test`.

## Còn thiếu
- JS validator: README (khác biệt đã biết: Python bỏ qua date-time, ECMA $ không khớp trước newline cuối, isdigit xấp xỉ, toLowerCase), browser-example.html, chạy parity riêng với 2 ví dụ Cambridge (không đưa vào gói).
- Hybrid Engine: README, homework stub riêng (hiện là reducer trong session.js), kiểm thử hiển thị UI (4 vector).
- Tài liệu cuối: dictation-scoring-changelog.md, golden-tests/hand-review-notes.md, golden README v2, qa-results.md, handoff cho Codex, START-HERE, ZIP cuối, xác minh lại từ bản giải nén.

## Lưu ý trung thực
Chưa có engine production trong sản phẩm. D-12..D-32 chỉ là đề xuất, chưa được giáo viên duyệt. Ba span Cambridge s014, s028, s033 vẫn chưa xác minh (D-08).
