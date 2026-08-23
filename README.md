# Cuộc thi tri thức

Hệ thống website phục vụ toàn bộ quá trình tổ chức và vận hành cuộc thi: sơ khảo online, 4 đội, điều khiển MC, chuông, mảnh ghép, bảng điểm realtime và kết quả chung cuộc.

## Chạy trên máy

Cần [Node.js](https://nodejs.org/) 18 trở lên.

```bash
cd cuoc-thi
npm run setup
npm run dev
```

- Giao diện: http://localhost:5173
- API / Socket: http://localhost:3001
- PIN ban tổ chức mặc định: `2026`

## Luồng sử dụng

### 1. Vòng sơ khảo (thí sinh)

- Vào **Thí sinh** → đăng ký (họ tên, mã số, trường, lớp).
- 30 câu trắc nghiệm, 15 phút, đếm ngược, ghi nhận từng đáp án.
- Hết giờ tự nộp. Hệ thống chấm điểm, lưu kết quả, xếp hạng (điểm cao hơn, thời gian làm bài ngắn hơn).
- 16 thí sinh đứng đầu được đánh dấu xuất sắc.

### 2. Ban tổ chức / Quản trị

Mở **Quản trị** (PIN `2026`):

- Mở / đóng cửa sơ khảo.
- Xem bảng điểm, chọn **Top 16 + chia 4 đội** (kiểu rắn cho công bằng).
- Đổi tên đội, gán lại thành viên.
- Sửa câu hỏi sơ khảo và vòng chính.
- Tải hình ảnh / video gợi ý.
- Nút **Tạo thí sinh demo** để thử nhanh nếu chưa có 16 người thật.

### 3. Ngày thi chính (4 đội)

Mở 3 cửa sổ / 3 máy:

| Vai trò | Đường dẫn |
|---|---|
| Màn hình khán giả / LED | `/man-hinh` |
| Bàn điều khiển MC | `/mc` |
| Chuông từng đội | `/chuong` |
| Thí sinh ghi đáp án (vòng 1) | `/vong-1` |

MC điều khiển:

- Khởi động → Vượt chướng ngại vật → Tăng tốc → Về đích
- Hiện câu hỏi, đồng hồ, đúng/sai (tính điểm tự động)
- Chuông giành quyền trả lời
- Mảnh ghép, ô trung tâm, đoán từ khóa CNV
- Ngôi sao hy vọng (Về đích)
- Kết quả cuối cuộc thi

## Thể lệ điểm (vòng chính)

- **Khởi động:** mỗi câu đúng 10 điểm, mỗi đội 60 giây / 6 câu. Thí sinh trong đội ghi đáp án tại `/vong-1`, MC chấm trên bàn điều khiển.
- **Vượt CNV:** từ khóa bị che bởi 5 mảnh ghép (4 góc + 1 trung tâm), gợi ý số chữ cái (không tính dấu cách). Màn hình chính hiển thị 4 hàng ngang dưới dạng ô tròn từng ký tự (kiểu Olympia): hàng mở hiện chữ, hàng khóa hiện ✕. Đội chọn hàng ngang, đúng +10 và mở mảnh tương ứng; sai thì đội khác giành quyền — đúng +10, sai −20 và mảnh bị khóa vĩnh viễn. Ô trung tâm chỉ mở khi cả 4 góc đã xử lý xong; đoán từ khóa 60/50/40/30/20 tùy lúc đoán.
- **Tăng tốc:** đúng và nhanh nhất 40-30-20-10. Đội nhập đáp án trên trang chuông.
- **Về đích:** gói 10/20/30; ngôi sao nhân đôi (sai thì trừ gấp đôi).

## Dữ liệu

Lưu tại `server/data/db.json`. Câu hỏi mẫu:

- `server/data/questions-so-khao.json` — 30 câu sơ khảo
- `server/data/questions-main.json` — các vòng chính

Media tải lên nằm ở `server/uploads`.
