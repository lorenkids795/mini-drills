# Quyết định cần duyệt — Main Baseline Recovery

Đã xác minh hồi quy tại `8d9cf77`: 10 bộ test giống hệt nhau PASS **106/106** trên commit cha, nhưng FAIL trên main hiện tại. Gate release Writing còn Pending là đúng, không phải lỗi cần bỏ qua.

**Đề xuất đã kiểm thử:** patch Admin 22 dòng thay đổi, tách “Add teacher” và “Create tester”; test Admin **1/9 → 9/9**, baseline tổng **12/23 → 13/23 lệnh PASS**. Không thêm lỗi. Chỉ có trong worktree thử; chưa áp dụng vào source thật.

Các phê duyệt cần thiết cho bước tiếp theo:

1. Cho phép triển khai patch Admin đã đính kèm vào một checkout tích hợp riêng, kèm QA browser/auth trước khi đề xuất phát hành. Không phải phê duyệt sửa trực tiếp main hay deploy.
2. Cho phép mở các phạm vi khôi phục riêng: **Reading** (generation/review/import/preview), **Homework external/mixed**, rồi **Homework Assistant** có kiểm tra phân quyền. Hiện mới có kế hoạch sửa từng nhóm; chưa có patch đã kiểm chứng cho các nhóm này.
3. Với cleanup, chỉ cho phép bản thử **preview/dry-run** trước. Khôi phục quyền xóa và mọi thao tác dữ liệu thật cần quyết định riêng; không thực hiện trong audit.
4. Nếu tiếp tục tích hợp Writing, duyệt phạm vi áp dụng gate hẹp đã có và quyết định có khôi phục focused lesson layout hay không. Chính sách **học sinh thường Coming Soon; Admin/roster Tester được preview** đã chốt, không hỏi lại. Việc đổi fixture test phải giữ nguyên assertion học tập/tiến độ và test chặn học sinh thường.
5. Review nội dung vẫn tách biệt: **152 mục Unit 2, 165 mục Unit 0** đang Pending; **102 mục Vocab** vẫn chờ duyệt. Không tự Approve/Publish.

Tích hợp tổng thể vẫn **BLOCKED**: còn 9 nhóm lỗi nguồn trong bản thử Admin và gate editorial, chưa kiểm chứng auth/IAM staging thật. Không yêu cầu giáo viên kiểm thử thủ công thay cho QA tự động.

Chi tiết, ma trận QA và diff: [MAIN-BASELINE-RECOVERY-AUDIT.md](MAIN-BASELINE-RECOVERY-AUDIT.md).
