# Round 2 - Contestant Interface

## 1. Mục tiêu

Đây là giao diện dành cho thí sinh trong Vòng 2.

Giao diện không có quyền điều khiển game.
Mọi trạng thái của game do Backend quyết định và frontend chỉ render theo state.

---

## 2. Layout

Giao diện gồm 4 khu vực chính:

┌─────────────────────────────────────────────┐
│ HEADER                                      │
│ Logo | Vòng 2 | Tên đội | Điểm              │
├─────────────────────────────────────────────┤
│                                             │
│ QUESTION AREA                               │
│                                             │
│ Hình ảnh                                    │
│ Câu hỏi                                     │
│                                             │
├──────────────────────┬──────────────────────┤
│ ANSWER AREA          │ GAME STATUS          │
│                      │                      │
│ Input answer         │ Timer                │
│ Submit               │ Current state        │
│                      │                      │
├──────────────────────┴──────────────────────┤
│ ROW SELECTION                               │
│ [01] [02] [03] [04]                        │
│ [05] [06] [07] [08]                        │
└─────────────────────────────────────────────┘