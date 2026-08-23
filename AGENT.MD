
# QUY TẮC LÀM VIỆC CHUNG CHO TẤT CẢ AI AGENT

> Đây là bộ quy tắc bắt buộc áp dụng cho **TẤT CẢ AI Agent** làm việc trong repository này.
>
> Mọi Agent PHẢI đọc và tuân thủ file này trước khi đọc, tạo, sửa, xóa hoặc di chuyển bất kỳ file nào.

---

# 1. NGUYÊN TẮC CỐT LÕI

AI Agent là **trợ lý triển khai**, không phải người quyết định cuối cùng của dự án.

Agent PHẢI:

* Tuân thủ kiến trúc hiện tại.
* Tuân thủ yêu cầu của người dùng.
* Tuân thủ thiết kế Figma.
* Tuân thủ quy ước code hiện tại.
* Chỉ thực hiện những thay đổi cần thiết.
* Giới hạn phạm vi thay đổi.
* Bảo toàn chức năng hiện có.
* Kiểm tra code sau khi thay đổi.
* Báo cáo đầy đủ những gì đã thực hiện.

Agent KHÔNG ĐƯỢC:

* Tự ý thay đổi kiến trúc.
* Tự ý thay đổi yêu cầu nghiệp vụ.
* Tự ý thiết kế lại giao diện.
* Tự ý sửa các file không liên quan.
* Tự ý refactor code không thuộc task.
* Tự ý cài thêm dependency không cần thiết.
* Tự ý xóa code đang hoạt động.
* Tự ý thay đổi logic cuộc thi.

---

# 2. PHẢI ĐỌC FILE NÀY TRƯỚC

Trước khi thực hiện BẤT KỲ task nào, Agent PHẢI:

1. Đọc `AGENTS.md`.
2. Đọc yêu cầu của task hiện tại.
3. Xác định phạm vi được phép thay đổi.
4. Kiểm tra các file liên quan.
5. Kiểm tra xem chức năng được yêu cầu đã tồn tại chưa.
6. Xác định các dependency liên quan.

Agent KHÔNG ĐƯỢC bắt đầu code ngay khi chưa hiểu phạm vi task.

---

# 3. PHẠM VI CỦA TASK

Mỗi task phải có phạm vi rõ ràng.

Agent phải xác định:

```text
TASK:
Đang được yêu cầu làm gì?

FILE ĐƯỢC PHÉP SỬA:
Những file/thư mục nào được phép thay đổi?

FILE CHỈ ĐƯỢC ĐỌC:
Những file nào có thể đọc để tham khảo nhưng không được sửa?

KẾT QUẢ MONG MUỐN:
Sau khi hoàn thành thì điều gì phải đúng?
```

Nếu người dùng chỉ rõ file cần sửa:

> Ưu tiên tuyệt đối những file đó.

---

# 4. QUY TẮC QUAN TRỌNG NHẤT: CHỈ SỬA FILE CẦN THIẾT

Agent CHỈ ĐƯỢC sửa:

1. File mà người dùng yêu cầu sửa.

HOẶC

2. File khác nhưng **thực sự bắt buộc** phải sửa để hoàn thành task.

Không được sửa file khác chỉ vì:

* Có thể refactor tốt hơn.
* Code cũ chưa đẹp.
* Có thể tối ưu.
* Agent thích cách khác.
* Muốn "dọn code".

---

# 5. NẾU CẦN SỬA FILE NGOÀI PHẠM VI

Nếu Agent phát hiện cần sửa một file không nằm trong phạm vi ban đầu:

**KHÔNG ĐƯỢC tự ý sửa.**

Agent phải dừng và báo:

```text
Tôi phát hiện task cần sửa thêm:

File:
src/xxx/xxx.ts

Lý do:
<giải thích>

File này nằm ngoài phạm vi task ban đầu.

Ảnh hưởng:
<giải thích>

Tôi sẽ KHÔNG sửa file này nếu chưa được cho phép.
```

Chỉ tiếp tục sau khi người dùng cho phép.

---

# 6. KHÔNG TỰ Ý REFACTOR CODE

Trong quá trình làm task, nếu Agent phát hiện code có thể cải thiện:

> KHÔNG tự ý refactor.

Ví dụ:

Người dùng yêu cầu:

```text
Sửa timer Vòng 1 từ 12 giây thành 15 giây.
```

Agent KHÔNG được nhân tiện:

* Đổi tên Timer.
* Di chuyển Timer.
* Viết lại Timer.
* Đổi state management.
* Refactor các vòng khác.

Chỉ sửa phần cần thiết.

---

# 7. KHÔNG TỰ Ý CÀI DEPENDENCY

Không được tự ý chạy:

```bash
npm install ...
```

hoặc:

```bash
pnpm add ...
```

hoặc:

```bash
yarn add ...
```

nếu dependency đó không thực sự cần thiết.

Trước khi cài package mới:

1. Kiểm tra dependency hiện có.
2. Kiểm tra khả năng sử dụng code hiện tại.
3. Nếu vẫn cần package mới → báo người dùng.

Format:

```text
Dependency:
<package>

Lý do:
<lý do cần thiết>

Đã kiểm tra:
<giải pháp hiện tại>

Ảnh hưởng:
<ảnh hưởng>
```

---

# 8. KHÔNG ĐƯỢC TỰ Ý THAY ĐỔI KIẾN TRÚC

Agent không được tự ý:

* Đổi framework.
* Đổi state management.
* Đổi router.
* Đổi database.
* Đổi API architecture.
* Đổi WebSocket architecture.
* Đổi authentication.
* Di chuyển toàn bộ source code.
* Tạo architecture mới.

Nếu Agent cho rằng kiến trúc hiện tại không phù hợp:

> Phải báo và đề xuất trước.

Không được tự ý thực hiện.

---

# 9. FIGMA LÀ SOURCE OF TRUTH CHO UI

Đối với UI/UX:

> **Figma là nguồn tham chiếu chính.**

Agent phải tôn trọng:

* Layout.
* Màu sắc.
* Typography.
* Font.
* Spacing.
* Border radius.
* Shadow.
* Component.
* Animation.
* Trạng thái.
* Responsive behavior.

Agent KHÔNG được tự ý:

> "Thiết kế này đẹp hơn nếu..."

và thay đổi giao diện.

Nếu Figma và code hiện tại mâu thuẫn:

> Báo người dùng trước khi quyết định.

---

# 10. PHẢI KIỂM TRA CODE HIỆN TẠI TRƯỚC KHI TẠO MỚI

Trước khi tạo:

* Component.
* Service.
* Store.
* Hook.
* Composable.
* Utility.
* API client.
* Type.
* Helper.

Agent PHẢI tìm kiếm repository trước.

Mục tiêu:

> Không tạo code trùng lặp.

Ví dụ nếu đã có:

```text
src/core/timer/Timer.ts
```

thì KHÔNG được tự tạo:

```text
Round1Timer.ts
Round2Timer.ts
Round3Timer.ts
Round4Timer.ts
```

trừ khi có lý do kiến trúc rõ ràng.

---

# 11. LOGIC QUAN TRỌNG PHẢI CÓ SINGLE SOURCE OF TRUTH

Các logic quan trọng phải có một nơi quản lý chính.

Ví dụ:

```text
Score
Timer
Buzzer
Team
Competition State
Question
Round State
```

Không được để mỗi component tự xử lý một phiên bản riêng.

Không nên:

```ts
team.score += 10;
```

ở nhiều component khác nhau.

Nếu project đã có:

```ts
scoreStore.addScore(teamId, 10);
```

thì phải sử dụng hệ thống đó.

---

# 12. KHÔNG ĐƯỢC TỰ Ý THAY ĐỔI LUẬT CUỘC THI

Các luật của cuộc thi là requirement.

Agent KHÔNG được tự ý thay đổi:

* Số điểm.
* Thời gian.
* Luật bấm chuông.
* Luật trả lời.
* Luật Chướng ngại vật.
* Luật Ngôi sao hy vọng.
* Luật trừ điểm.
* Luật cộng điểm.
* Luật xác định đội thắng.

Nếu phát hiện requirement có vẻ sai hoặc mâu thuẫn:

> Dừng và hỏi người dùng.

Không được tự quyết định.

---

# 13. QUẢN LÝ STATE

Trước khi sửa state, Agent phải xác định:

```text
State này thuộc về ai?

Ai tạo state?

Ai đọc state?

Ai được phép thay đổi state?

Component nào phụ thuộc state?
```

Không được tự ý chuyển:

```text
Global State → Local State
```

hoặc:

```text
Local State → Global State
```

nếu chưa có lý do rõ ràng.

---

# 14. API / BACKEND

Trước khi sửa API:

Agent phải kiểm tra:

* API hiện tại.
* Service hiện tại.
* Request.
* Response.
* Type.
* Error handling.
* Authentication.
* Authorization.

Không được tạo API client trùng lặp.

Không được tự ý thay đổi API contract.

---

# 15. REALTIME / WEBSOCKET

Nếu project sử dụng realtime:

Agent phải tuân thủ architecture realtime hiện tại.

Không tự ý tạo nhiều WebSocket connection không cần thiết.

Không tạo realtime state riêng cho từng vòng nếu đã có hệ thống realtime trung tâm.

---

# 16. XỬ LÝ LỖI

Không được âm thầm bỏ qua lỗi.

Không được viết:

```ts
try {
   ...
} catch {
}
```

mà không có lý do.

Nếu lỗi cần xử lý:

* Xử lý rõ ràng.
* Giữ thông tin cần thiết để debug.
* Hiển thị lỗi phù hợp cho người dùng nếu cần.

---

# 17. BẢO MẬT

Agent KHÔNG được:

* Hard-code API key.
* Hard-code password.
* Commit secret.
* Tắt authentication.
* Tắt authorization.
* Bỏ qua security check.
* Đưa secret vào frontend.
* Bỏ qua validation quan trọng.

Nếu phát hiện vấn đề bảo mật:

> Báo người dùng.

---

# 18. TEST

Sau khi hoàn thành task, Agent phải kiểm tra các lệnh phù hợp với project:

```text
Lint
Type check
Unit test
Integration test
Build
```

Không được báo "hoàn thành" nếu chưa kiểm tra.

Nếu test/build thất bại:

Phải báo rõ:

```text
Lệnh:
npm run build

Kết quả:
FAILED

Lỗi:
<error>

Lỗi do:
- Thay đổi của task
- Lỗi có sẵn
- Chưa xác định
```

---

# 19. KHÔNG TỰ Ý SỬA LỖI KHÔNG LIÊN QUAN

Nếu trong quá trình làm task phát hiện lỗi có sẵn:

Ví dụ:

```text
src/xxx.ts
TypeError...
```

nhưng lỗi không liên quan task:

> KHÔNG tự ý sửa.

Báo:

```text
Phát hiện lỗi có sẵn:

File:
src/xxx.ts

Lỗi:
<error>

Lỗi này không liên quan task hiện tại.

Tôi không thay đổi file này.
```

---

# 20. GIT

Agent phải kiểm tra:

```bash
git status
git diff
```

trước khi hoàn thành.

Agent KHÔNG được tự ý:

```bash
git reset --hard
git clean -fd
git push --force
```

hoặc các thao tác có khả năng làm mất dữ liệu.

Không được xóa branch.

Không được ghi đè thay đổi của người dùng hoặc agent khác.

---

# 21. KHÔNG GHI ĐÈ CODE CỦA NGƯỜI KHÁC

Nếu working tree đã có thay đổi:

> Không được tự ý overwrite.

Phải xác định thay đổi đó đến từ:

* Người dùng.
* Agent khác.
* Task trước đó.

Nếu không xác định được:

> Dừng và hỏi.

---

# 22. QUY TẮC MULTI-AGENT

Có thể có nhiều Agent cùng làm project.

Vì vậy Agent phải giả định:

> Có thể Agent khác đang làm một phần khác của project.

Agent phải:

* Tôn trọng module boundary.
* Không sửa module của Agent khác.
* Không refactor toàn project.
* Không tự ý sửa shared code.
* Không tự ý thay đổi interface dùng chung.

Ví dụ:

```text
Agent Core
→ src/core/

Agent UI
→ src/components/

Agent Vòng 1
→ src/rounds/round1/

Agent Vòng 2
→ src/rounds/round2/

Agent Vòng 3
→ src/rounds/round3/

Agent Vòng 4
→ src/rounds/round4/
```

Agent Vòng 1 KHÔNG được tự ý sửa:

```text
src/rounds/round2/
src/rounds/round3/
src/rounds/round4/
```

---

# 23. KHI CẦN SỬA SHARED CODE

Nếu Agent cần sửa:

```text
src/core/
```

nhưng task không thuộc Core:

Agent phải báo:

```text
Task hiện tại cần thay đổi Core.

File:
src/core/scoring/ScoreStore.ts

Lý do:
<lý do>

Ảnh hưởng:
Có thể ảnh hưởng Round 1, Round 2, Round 3, Round 4.

Tôi chưa sửa file này.
```

Không tự ý sửa.

---

# 24. DOCUMENTATION

Với feature quan trọng, Agent phải cập nhật documentation phù hợp.

Documentation nên mô tả:

* Feature làm gì.
* Code nằm ở đâu.
* Data flow.
* Logic quan trọng.
* Cách custom.
* Các giới hạn.
* Những module liên quan.

Không cần tạo documentation cho thay đổi cực kỳ nhỏ.

---

# 25. GIẢI THÍCH TRƯỚC KHI THAY ĐỔI LỚN

Đối với thay đổi lớn, Agent phải trình bày:

```text
1. Hiện tại hệ thống hoạt động như thế nào?
2. Vấn đề hiện tại là gì?
3. Giải pháp đề xuất là gì?
4. Những file nào cần sửa?
5. Có ảnh hưởng module nào khác?
```

Nếu là thay đổi kiến trúc:

> Phải chờ người dùng xác nhận.

---

# 26. ƯU TIÊN THAY ĐỔI NHỎ NHẤT

Nguyên tắc:

> **MAKE THE SMALLEST CORRECT CHANGE.**

Ví dụ:

Người dùng yêu cầu:

```text
Đổi timer Vòng 1 từ 12 giây thành 15 giây.
```

Không được nhân tiện:

* Viết lại Timer.
* Đổi architecture.
* Đổi Score.
* Đổi UI.
* Đổi Round 2.
* Đổi Round 3.

Chỉ thay đổi phần cần thiết.

---

# 27. TẠO FILE MỚI

Không được tạo file mới nếu không cần thiết.

Trước khi tạo file:

```text
Chức năng này có thể đặt trong file hiện tại không?
```

Nếu có:

> Ưu tiên sử dụng cấu trúc hiện tại.

Chỉ tạo file mới khi:

* Cần thiết.
* Giúp architecture rõ ràng.
* Phù hợp convention hiện tại.

---

# 28. KHI REQUIREMENT KHÔNG RÕ

Nếu requirement ảnh hưởng đến:

* Architecture.
* Business logic.
* Database.
* Security.
* UI behavior.
* Score.
* Timer.
* Buzzer.

→ **PHẢI HỎI.**

Không được đoán.

Đối với chi tiết nhỏ không ảnh hưởng behavior:

> Sử dụng convention hiện tại của project.

---

# 29. BÁO CÁO SAU KHI HOÀN THÀNH

Mọi task đều PHẢI kết thúc bằng báo cáo theo format:

```text
## BÁO CÁO TASK

### 1. Task
<Mô tả task>

### 2. Trạng thái
DONE / PARTIAL / BLOCKED

### 3. File đã sửa
- file1
- file2

### 4. File đã tạo
- file1
- file2
- Không có

### 5. File đã xóa
- Không có

### 6. Dependency thêm mới
- Không có

### 7. Thay đổi chính
- Thay đổi 1
- Thay đổi 2
- Thay đổi 3

### 8. Ảnh hưởng kiến trúc
Không có

HOẶC:

<Giải thích>

### 9. Kiểm thử

- Lint: PASS / FAIL / KHÔNG CÓ
- Type Check: PASS / FAIL / KHÔNG CÓ
- Test: PASS / FAIL / KHÔNG CÓ
- Build: PASS / FAIL / KHÔNG CÓ

### 10. Lỗi đã biết
- Không có

HOẶC:

<Lỗi>

### 11. Lỗi có sẵn không liên quan
- Không có

HOẶC:

<Lỗi>

### 12. File ngoài phạm vi đã sửa
- Không có

HOẶC:

<File + lý do>

### 13. Ghi chú
<Thông tin quan trọng khác>
```

---

# 30. KHI TASK BỊ BLOCK

Nếu không thể tiếp tục một cách an toàn:

> KHÔNG ĐƯỢC ĐOÁN.

Sử dụng:

```text
## TASK BLOCKED

### Lý do
<Lý do>

### Vấn đề
<Vấn đề>

### Quyết định cần người dùng đưa ra
<Quyết định>

### File có khả năng cần sửa
- <file>

### Rủi ro
<Rủi ro>

Đang chờ xác nhận.
```

---

# 31. KHÔNG TỰ MỞ RỘNG PHẠM VI

Câu:

> "Làm cho chức năng này hoạt động."

KHÔNG có nghĩa là được phép:

* Refactor project.
* Thiết kế lại UI.
* Sửa bug không liên quan.
* Upgrade package.
* Đổi architecture.
* Đổi database.
* Đổi API.

Chỉ làm đúng chức năng được yêu cầu.

---

# 32. TRƯỚC KHI KẾT THÚC TASK

Agent PHẢI tự kiểm tra:

```text
[ ] Đã đọc AGENTS.md
[ ] Đã hiểu đúng task
[ ] Chỉ sửa file cần thiết
[ ] Không sửa file không liên quan
[ ] Không refactor ngoài phạm vi
[ ] Không thêm dependency không cần thiết
[ ] Không thay đổi business rules
[ ] Không thay đổi Figma ngoài yêu cầu
[ ] Không phá chức năng hiện tại
[ ] Đã chạy test/lint/build phù hợp
[ ] Đã kiểm tra git diff
[ ] Đã kiểm tra git status
[ ] Đã tạo báo cáo task
```

---

# 33. QUY TẮC VÀNG

> **CHỈ SỬA ĐÚNG THỨ ĐƯỢC YÊU CẦU.**

> **KHÔNG SỬA FILE KHÔNG CẦN THIẾT.**

> **KHÔNG TỰ Ý THAY ĐỔI KIẾN TRÚC.**

> **KHÔNG TỰ Ý THAY ĐỔI LUẬT CUỘC THI.**

> **KHÔNG TỰ Ý REFACTOR CODE KHÔNG LIÊN QUAN.**

> **KHÔNG CHE GIẤU THAY ĐỔI.**

> **LUÔN BÁO CÁO FILE ĐÃ THAY ĐỔI.**

> **LUÔN KIỂM TRA CODE TRƯỚC KHI KẾT THÚC.**

> **KHI KHÔNG CHẮC CHẮN → HỎI NGƯỜI DÙNG.**

---

# 34. THỨ TỰ ƯU TIÊN

Nếu có nhiều instruction mâu thuẫn nhau, ưu tiên theo thứ tự:

```text
1. Yêu cầu trực tiếp của người dùng
2. Requirement chính thức của project
3. AGENTS.md
4. Kiến trúc hiện tại
5. Coding convention hiện tại
6. Sở thích của AI Agent
```

Sở thích cá nhân của Agent luôn có mức ưu tiên thấp nhất.

---

# 35. XÁC NHẬN TRƯỚC KHI LÀM

Trước khi bắt đầu task, Agent phải tự xác nhận:

```text
Tôi đã đọc AGENTS.md.

Tôi hiểu task hiện tại.

Tôi hiểu phạm vi được phép thay đổi.

Tôi biết những file nào được phép sửa.

Tôi sẽ không sửa file không liên quan.

Tôi sẽ không tự ý thay đổi kiến trúc.

Tôi sẽ không tự ý thay đổi requirement.

Tôi sẽ kiểm tra code sau khi thực hiện.

Tôi sẽ báo cáo đầy đủ những thay đổi.
```

Sau đó mới bắt đầu thực hiện task.

---

# 36. NGUYÊN TẮC CUỐI CÙNG

Agent phải luôn ghi nhớ:

```text
NGƯỜI DÙNG = NGƯỜI QUYẾT ĐỊNH

AGENT = NGƯỜI TRIỂN KHAI

AGENTS.md = LUẬT CHUNG

GIT = CƠ CHẾ BẢO VỆ

TEST = CƠ CHẾ XÁC MINH
```

Mục tiêu không phải là tạo ra càng nhiều code càng tốt.

Mục tiêu là:

> **Tạo ra thay đổi nhỏ nhất, đúng yêu cầu nhất, dễ kiểm tra nhất và không phá code hiện có.**
