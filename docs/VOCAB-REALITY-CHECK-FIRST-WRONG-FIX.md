# Reality Check first-wrong lock — fix and Preview V5

Task `docs/CODEX-FIX-REALITY-CHECK-FIRST-WRONG-LOCK.md`, baseline `e865587a05042513aa3c7e1ef45eb61e7a75935d`, `lorenkids795/mini-drills`, branch `feature/vocab-lab`.

## Kết luận và phân biệt bằng chứng

Core hiện có không tự chốt một câu mới sau một lần sai: test passenger với một click thật ghi `tries=1`, `wrong=[0]`, `done=false`, một answer event và hai đáp án còn lại vẫn chọn được. Đây là hành vi đúng.

**Có lỗi giao diện tái hiện được từ ZIP V4 đã audit.** Ở 768/1280px, click đáp án sai đầu tiên → vẽ lại toàn bộ host, thêm Try again làm thay đổi cách xuống dòng và tự scroll feedback → đáp án B dịch vào tọa độ cũ của A. Click dồn ở cùng điểm rơi vào B. Vì DOM button bị tạo mới, browser có thể trả `detail=1` cho lần kích hoạt sau, nên chỉ lọc double-click bằng detail không đủ. B là đáp án đúng của passenger: hai answer events `[0,1]` làm core chốt `needs_practice` (assisted) đúng theo số events, dù đây không phải hai lựa chọn có chủ ý của người dùng. Bằng chứng: `baseline-probe.json` chứa record sau click đầu, events/tọa độ và attempts sau chuỗi click.

User xác nhận dùng Cloudflare UI-only Preview, Tester A. **Không đọc được snapshot localStorage gốc của phiên Cloudflare đó**, không truy vấn production/Firebase hoặc sửa dữ liệu người dùng. Tab local có sẵn ở Word 1 không chứa câu đã báo lỗi. Vì vậy không khẳng định giáo viên đã trả lời hai lần, cũng không khẳng định biết chính xác chuỗi events của phiên gốc. Phân biệt rõ lỗi chuyển vị trí đã tái hiện với trường hợp resume record có attempts cũ hoặc reveal đã lưu.

## Sửa có phạm vi

- Khi vẫn ở cùng câu, giữ nguyên DOM của ba nút đáp án; chỉ cập nhật trạng thái disabled/result/revision và vùng feedback phía sau. Dành sẵn chỗ cho Try again để câu trả lời không xuống dòng lại.
- Bỏ tự scroll/focus lại khi cập nhật feedback trong cùng câu. Tọa độ/chiều cao của cả ba nút và scroll position được kiểm tra bất biến sau lần sai đầu tiên và chuỗi click/tap cùng điểm. Các đáp án còn lại chọn được ngay, không có timeout/debounce làm chặn retry có chủ ý.
- Bỏ qua nút disabled/detached, click burst, cùng Event được dispatch lại; ràng buộc action với batch/sense/revision. Pointer/keyboard activation ở revision cũ bị bỏ qua sau khi state đã đồng bộ. Chặn default của Enter/Space auto-repeat.
- Core idempotent cho operation IDs answer/hint/reveal đã có: replay không tăng revision/tries/attempts; ID trùng nhưng payload khác bị từ chối. UI không lưu/sync thêm khi core trả no-op. Firestore adapter giữ nguyên transaction lease/idempotency sẵn có.
- Không đổi luật chấm: sai đầu tiên = một lượt, clue trung tính, không Next/terminal feedback; sai rồi đúng = assisted needs_practice; hai sai thật = terminal needs_practice; đúng đầu không hint = verified. Hint/reveal phải là action riêng và có type riêng trong lịch sử.

Không xóa/reset, sửa ngầm tries/evidence hoặc “chữa” lịch sử cũ. Reload snapshot first-wrong giữ nguyên retry state; snapshot terminal cũ vẫn terminal. Nếu Tester A đang ở một câu đã khóa từ V4, dùng Next để hoàn tất batch rồi **Revise a classification → passenger** để kiểm tra lại có chủ ý; thao tác review sẵn có giữ các attempts lịch sử.

## QA và dữ liệu lưu

- **304 PASS**: 60 Node tests (6 ca Reality Check mới), 244 assertions regression hiện có; `lm-check.js` PASS. 20 lệnh cuối đều PASS, lưu ở `FINAL-TEST-RESULTS.txt`.
- 24 ca app/static × 12/20 × 390/768/1280 × light/dark: click sai đơn chỉ một answer, không Needs practice/Next, hai lựa chọn còn lại enabled; DOM/tọa độ nút không đổi; click dồn cùng điểm không tạo lượt thứ hai; retry đúng có chủ ý được nhận ngay.
- 40 ca input/restore: rapid touch, Enter/repeat, cùng Event bị replay, reload/cùng câu, view/account switch, snapshot legacy, terminal cũ không sửa, sai rồi đúng, hai sai, đúng đầu, hint/reveal rõ ràng, stale activation PASS. Admin/tester trong app thật và fixture Tester A/B trong static được kiểm tra.
- Firestore doubles 12/20: chỉ một document `student_attempts` sau một action/replay Event; watch/sync giữ nút ổn định; retry operation cũ không thêm write. Không chạm collection Writing/XP/Mission. Dùng mock UID và local fixture, không dùng học sinh thật.
- `reality-screenshots/results.json`: QA-only counters, saved record/attempts, click coordinates và trace trước/sau. Đây là dữ liệu fixture, **không phải lịch sử Cloudflare của giáo viên**. Không thêm debug counters vào learner UI.
- Các regression 20/12, mixed batch, legacy 12, Undo, pause/resume, question-version snapshots, Mission, Library, role/UID guards, multi-tab, Writing và responsive PASS. Ảnh Reality first-wrong: 24 ảnh; thêm các folder regression như trước.
- Static HTTPS-origin mô phỏng: 0 unexpected external/production requests, không Firebase/auth/backend; WS/XHR/EventSource/beacon bị chặn; fixture GET bỏ cookies và không theo redirect API. Allowlist/CSP/network guard giữ nguyên.
- Test reduced-motion cũ được sửa để đọc node đang kết nối trong cùng JS evaluation, tránh race khi timer đổi thẻ làm handle cũ detached; không đổi hành vi animation.

## Audit / handoff

Root index/Writing, Library integration, Standard 20/Quick 12, progress schema/keys, Vocab store, Mission/content, approved P1/pending P2, auth/backend/rules/config, nested `mini-drills/`, preview shell/guards/builder không đổi. Runtime chỉ sửa `vocab-lab.js`, `vocab-lab-core.js`, `vocab-lab.css`. Không thêm secret markers; diff check PASS.

`ui-only-static-v5.zip`: **17 file static**, đúng root ZIP, so từng byte với output/manifest. So V4 chỉ đổi `vocab-lab.js`, `vocab-lab-core.js`, `vocab-lab.css`, `manifest.json`; 13 file còn lại giữ nguyên byte. ZIP 97940 bytes, SHA-256 `a9339b42d63f972c114fa337c58c7353d0ecedea4f2c14a1edd04c18c06061a9`.

ZIP mới để giáo viên upload thủ công sau khi duyệt vào project Direct Upload `mini-drills-vocab-ui-preview`; Git push không cập nhật project đó. Không merge main, deploy hoặc đổi Cloudflare. Không thực hiện Firebase emulator/live auth; trước app production vẫn cần staging/emulator và reconcile main/Writing mới như các handoff trước.

## File thay đổi

- `docs/VOCAB-REALITY-CHECK-FIRST-WRONG-FIX.md`
- `docs/VOCAB-UI-PREVIEW-V5-MANIFEST.json`
- `tests/vocab-lab-ui.browser.js`
- `tests/vocab-reality.browser.js`
- `tests/vocab-reality.test.js`
- `vocab-lab-core.js`
- `vocab-lab.css`
- `vocab-lab.js`

Ảnh: `screenshots.html`; bằng chứng: `baseline-probe.json`, `fixed-probe.json`, `reality-screenshots/results.json`, `scope-audit.json`, `preview-v5-manifest.json`, `FINAL-TEST-RESULTS.txt`. ZIP V1–V4 được giữ nguyên.
