# AGENTS.md — QUY TẮC LÀM VIỆC CHO AI AGENT

> Quy tắc bắt buộc áp dụng cho tất cả AI Agent làm việc trong repository.
> Người dùng là người quyết định; Agent là người triển khai.

---

## 1. NGUYÊN TẮC CỐT LÕI

Agent PHẢI:

- Tuân thủ yêu cầu của người dùng, requirement, kiến trúc và coding convention hiện tại.
- Tuân thủ thiết kế Figma đối với UI.
- Chỉ thực hiện thay đổi nhỏ nhất cần thiết cho task.
- Bảo toàn chức năng hiện có.
- Kiểm tra code sau khi thay đổi.
- Báo cáo rõ ràng những gì đã thực hiện.

Agent KHÔNG ĐƯỢC tự ý:

- Thay đổi architecture, framework, database, API, authentication hoặc state management.
- Thay đổi business logic hoặc luật cuộc thi.
- Refactor code không thuộc task.
- Sửa bug không liên quan.
- Tạo file/dependency mới nếu không cần thiết.
- Xóa hoặc ghi đè code đang hoạt động.
- Thay đổi file ngoài phạm vi khi chưa được cho phép.

### Thứ tự ưu tiên khi instruction mâu thuẫn

1. Yêu cầu trực tiếp của người dùng.
2. Requirement chính thức của project.
3. `AGENTS.md`.
4. Kiến trúc hiện tại.
5. Coding convention.
6. Sở thích của Agent.

---

## 2. TRƯỚC KHI CODE

Trước mọi task, Agent PHẢI:

1. Đọc `AGENTS.md`.
2. Đọc và hiểu yêu cầu hiện tại.
3. Xác định phạm vi thay đổi.
4. Kiểm tra các file/module liên quan.
5. Tìm kiếm code hiện có trước khi tạo mới.
6. Kiểm tra dependency và architecture liên quan.

Không bắt đầu code khi chưa hiểu task.

### Xác định phạm vi

```text
TASK:
Đang yêu cầu làm gì?

FILES TO MODIFY:
Những file nào được phép sửa?

FILES TO READ:
Những file nào chỉ được đọc để tham khảo?

EXPECTED RESULT:
Sau khi hoàn thành điều gì phải đúng?
```

Nếu người dùng chỉ rõ file cần sửa, ưu tiên tuyệt đối các file đó.

---

## 3. PHẠM VI THAY ĐỔI

Chỉ được sửa:

1. File người dùng yêu cầu; hoặc
2. File khác thực sự bắt buộc để hoàn thành task.

Không sửa file khác chỉ vì:

- Có thể refactor.
- Có thể tối ưu.
- Code chưa đẹp.
- Agent thích cách khác.
- Muốn "dọn code".

Nếu phát hiện cần sửa file ngoài phạm vi:

> Dừng và báo người dùng lý do, ảnh hưởng và file cần sửa. Không tự ý tiếp tục.

### Nguyên tắc

> **MAKE THE SMALLEST CORRECT CHANGE.**

---

## 4. CODE & ARCHITECTURE

### Không tạo code trùng lặp

Trước khi tạo:

- Component
- Service
- Store
- Hook
- Composable
- Utility
- API client
- Type
- Helper

PHẢI tìm kiếm repository trước.

Ưu tiên sử dụng code hiện có thay vì tạo implementation mới.

### Single Source of Truth

Logic quan trọng phải có một nơi quản lý chính.

Ví dụ:

- Score
- Timer
- Buzzer
- Team
- Competition State
- Question
- Round State

Không để nhiều component tự duy trì các phiên bản logic khác nhau.

Nếu project đã có store/service quản lý logic, phải sử dụng hệ thống đó.

### State

Trước khi sửa state phải xác định:

- State thuộc về ai?
- Ai tạo?
- Ai đọc?
- Ai được phép thay đổi?
- Component/module nào phụ thuộc?

Không tự ý chuyển Global State ↔ Local State nếu không có lý do rõ ràng.

### Architecture

Không tự ý:

- Đổi framework.
- Đổi state management.
- Đổi router.
- Đổi database.
- Đổi API architecture.
- Đổi WebSocket architecture.
- Đổi authentication.
- Di chuyển toàn bộ source.
- Tạo architecture mới.

Nếu architecture hiện tại có vấn đề, báo và đề xuất trước.

---

## 5. UI / FIGMA

Figma là source of truth cho UI/UX.

Phải tôn trọng:

- Layout
- Màu sắc
- Typography / Font
- Spacing
- Border radius
- Shadow
- Component
- Animation
- State
- Responsive behavior

Không tự ý thay đổi UI với lý do "đẹp hơn".

Nếu Figma và code mâu thuẫn, hỏi người dùng trước khi quyết định.

---

## 6. BUSINESS LOGIC

Business requirement và luật cuộc thi là bắt buộc.

Không tự ý thay đổi:

- Điểm số.
- Thời gian.
- Luật bấm chuông.
- Luật trả lời.
- Luật chướng ngại vật.
- Ngôi sao hy vọng.
- Luật cộng/trừ điểm.
- Điều kiện thắng.
- Logic nghiệp vụ.

Nếu requirement mâu thuẫn hoặc không rõ và có thể ảnh hưởng behavior:

> **PHẢI HỎI — KHÔNG ĐƯỢC ĐOÁN.**

---

## 7. API / BACKEND / REALTIME

Trước khi sửa API phải kiểm tra:

- API hiện tại.
- Service.
- Request / Response.
- Type.
- Error handling.
- Authentication.
- Authorization.

Không tạo API client trùng lặp và không tự ý thay đổi API contract.

Nếu project dùng WebSocket/realtime:

- Tuân thủ architecture hiện tại.
- Không tạo connection không cần thiết.
- Không tạo realtime state riêng nếu đã có hệ thống trung tâm.

---

## 8. DEPENDENCY

Không tự ý cài dependency mới.

Trước khi thêm package:

1. Kiểm tra dependency hiện có.
2. Kiểm tra khả năng dùng code hiện tại.
3. Nếu vẫn thực sự cần package mới, báo người dùng:
   - Package.
   - Lý do.
   - Giải pháp hiện tại đã kiểm tra.
   - Ảnh hưởng.

Không tự ý upgrade package/framework.

---

## 9. ERROR & SECURITY

### Error handling

Không âm thầm bỏ qua lỗi.

Không viết:

```ts
try {
  ...
} catch {
}
```

nếu không có lý do rõ ràng.

Lỗi phải được:

- Xử lý rõ ràng.
- Giữ thông tin cần thiết để debug.
- Hiển thị phù hợp cho người dùng nếu cần.

### Security

KHÔNG được:

- Hard-code API key/password.
- Commit secret.
- Đưa secret vào frontend.
- Tắt authentication/authorization.
- Bỏ qua security check.
- Bỏ qua validation quan trọng.

Nếu phát hiện vấn đề bảo mật, báo người dùng.

---

## 10. TESTING

Sau khi hoàn thành task, chạy các kiểm tra phù hợp với project:

- Lint
- Type check
- Unit test
- Integration test
- Build

Không chạy những kiểm tra không tồn tại trong project.

Không báo `DONE` nếu chưa kiểm tra.

Nếu test/build fail, báo:

```text
COMMAND:
<command>

RESULT:
FAILED

ERROR:
<error>

CAUSE:
- Task change
- Existing issue
- Unknown
```

Nếu lỗi có sẵn và không liên quan task:

> Không tự ý sửa. Báo lỗi và giữ nguyên file.

---

## 11. GIT — COMMIT & PUSH

### Trước khi commit

PHẢI chạy:

```bash
git status
git diff
git branch --show-current
```

Xác nhận:

- Đúng branch.
- Chỉ có thay đổi thuộc task.
- Không ghi đè thay đổi của người dùng/Agent khác.
- Không có secret.
- Không có file ngoài phạm vi.
- Code đã được kiểm tra.

### Commit

Chỉ stage đúng file thuộc task.

Không dùng:

```bash
git add .
```

nếu working tree có thay đổi ngoài task.

Ưu tiên:

```bash
git add <file1> <file2> ...
```

Commit message dùng Conventional Commits:

```text
feat: <feature>
fix: <bug>
refactor: <refactor>
docs: <documentation>
test: <test>
chore: <maintenance>
```

Không dùng message chung chung như:

```text
update
changes
fix
done
final
```

### Auto Commit

Khi người dùng đã ủy quyền cho Agent tự commit:

```text
IMPLEMENT
    ↓
TEST / LINT / TYPECHECK / BUILD
    ↓
PASS?
 ├── NO  → STOP + REPORT
 └── YES
        ↓
git status
git diff
git branch --show-current
        ↓
git add <đúng file>
        ↓
git commit
```

Chỉ commit khi tất cả kiểm tra cần thiết PASS.

### Push main

Khi người dùng đã ủy quyền push main và task đã PASS:

```bash
git push origin main
```

Chỉ push khi:

- Task hoàn thành.
- Kiểm tra PASS.
- Commit chỉ chứa thay đổi của task.
- Không có conflict.
- Không có thay đổi không rõ nguồn gốc.
- Đúng repository và branch.

TUYỆT ĐỐI KHÔNG dùng:

```bash
git push --force
git push -f
git reset --hard
git clean -fd
```

Không xóa branch hoặc ghi đè code của người khác.

### Remote main có thay đổi

Nếu push bị từ chối:

```bash
git fetch origin
git status
```

Không force push.

Nếu đồng bộ có nguy cơ conflict hoặc ảnh hưởng code người khác:

> DỪNG và báo người dùng.

### Sau khi push

Kiểm tra:

```bash
git status
git log -1
```

Báo:

```text
## GIT

Branch: <branch>
Commit: <hash>
Message: <message>
Push: SUCCESS / FAILED
Remote: origin/main
```

Nếu push fail, không force push.

---

## 12. MULTI-AGENT

Giả định repository có thể được nhiều Agent sử dụng đồng thời.

Agent phải:

- Tôn trọng module boundary.
- Không sửa module của Agent khác.
- Không refactor toàn project.
- Không tự ý sửa shared code.
- Không tự ý thay đổi interface dùng chung.

Ví dụ:

```text
src/core/
src/components/
src/rounds/round1/
src/rounds/round2/
src/rounds/round3/
src/rounds/round4/
```

Agent của Round 1 không tự ý sửa Round 2/3/4.

### Shared code

Nếu task cần sửa shared code ngoài phạm vi:

> Báo người dùng trước và chờ cho phép.

---

## 13. FILE & DOCUMENTATION

### File mới

Trước khi tạo file:

> Chức năng này có thể đặt trong file hiện tại không?

Ưu tiên cấu trúc hiện tại.

Chỉ tạo file mới khi:

- Thực sự cần.
- Làm architecture rõ ràng.
- Phù hợp convention.

### Documentation

Feature quan trọng nên cập nhật documentation về:

- Feature làm gì.
- Code nằm ở đâu.
- Data flow.
- Logic quan trọng.
- Cách custom.
- Giới hạn.
- Module liên quan.

Không cần documentation cho thay đổi cực kỳ nhỏ.

### Thay đổi lớn

Trước thay đổi lớn hoặc thay đổi architecture, phải trình bày:

1. Hệ thống hiện tại hoạt động thế nào?
2. Vấn đề là gì?
3. Giải pháp đề xuất?
4. File nào cần sửa?
5. Module nào bị ảnh hưởng?

Thay đổi architecture phải chờ người dùng xác nhận.

---

## 14. TASK BLOCKED

Nếu không thể tiếp tục an toàn:

> **KHÔNG ĐƯỢC ĐOÁN.**

Dừng và báo:

```text
## TASK BLOCKED

### Lý do
<reason>

### Vấn đề
<problem>

### Quyết định cần người dùng
<decision>

### File có khả năng cần sửa
- <file>

### Rủi ro
<risk>

Đang chờ xác nhận.
```

---

## 15. FINAL CHECKLIST

Trước khi kết thúc task:

- [ ] Đã đọc `AGENTS.md`.
- [ ] Đã hiểu task.
- [ ] Đúng phạm vi.
- [ ] Chỉ sửa file cần thiết.
- [ ] Không refactor ngoài phạm vi.
- [ ] Không thêm dependency không cần thiết.
- [ ] Không thay đổi business rule ngoài yêu cầu.
- [ ] Không phá architecture hiện tại.
- [ ] Không phá UI/Figma ngoài yêu cầu.
- [ ] Không có secret/security issue.
- [ ] Đã chạy test/lint/typecheck/build phù hợp.
- [ ] Đã kiểm tra `git diff`.
- [ ] Đã kiểm tra `git status`.
- [ ] Commit đúng file nếu được ủy quyền.
- [ ] Push `origin/main` nếu được ủy quyền và mọi kiểm tra PASS.
- [ ] Đã báo cáo kết quả.

---

## 16. BÁO CÁO TASK

Mỗi task phải kết thúc bằng:

```text
## BÁO CÁO TASK

### Task
<Mô tả>

### Trạng thái
DONE / PARTIAL / BLOCKED

### File đã sửa
- <file>
- <file>

### File đã tạo
- <file>
- Không có

### File đã xóa
- <file>
- Không có

### Dependency
- <package>
- Không có

### Thay đổi chính
- <change>

### Kiểm thử
- Lint: PASS / FAIL / N/A
- Type Check: PASS / FAIL / N/A
- Test: PASS / FAIL / N/A
- Build: PASS / FAIL / N/A

### Lỗi đã biết
- Không có
- <error>

### Lỗi có sẵn không liên quan
- Không có
- <error>

### Git
- Commit: <hash / N/A>
- Push: SUCCESS / FAILED / N/A

### Ghi chú
<important information>
```

---

# QUY TẮC VÀNG

> **CHỈ SỬA ĐÚNG THỨ ĐƯỢC YÊU CẦU.**

> **MAKE THE SMALLEST CORRECT CHANGE.**

> **KHÔNG SỬA FILE KHÔNG CẦN THIẾT.**

> **KHÔNG TỰ Ý THAY ĐỔI ARCHITECTURE.**

> **KHÔNG TỰ Ý THAY ĐỔI BUSINESS LOGIC.**

> **KHÔNG TỰ Ý REFACTOR CODE KHÔNG LIÊN QUAN.**

> **KHÔNG CHE GIẤU THAY ĐỔI HOẶC LỖI.**

> **LUÔN KIỂM TRA CODE TRƯỚC KHI KẾT THÚC.**

> **CHỈ COMMIT/PUSH CODE ĐÃ ĐƯỢC KIỂM TRA.**

> **KHÔNG FORCE PUSH HOẶC THAO TÁC CÓ THỂ LÀM MẤT DỮ LIỆU.**

> **KHI KHÔNG CHẮC CHẮN → HỎI NGƯỜI DÙNG.**

---

## FINAL PRINCIPLE

```text
USER        = DECISION MAKER
AGENT       = IMPLEMENTER
AGENTS.md   = COMMON RULES
GIT         = CHANGE PROTECTION
TEST        = VERIFICATION
```

Mục tiêu:

> **Tạo ra thay đổi nhỏ nhất, đúng yêu cầu nhất, dễ kiểm tra nhất và không phá code hiện có.**
