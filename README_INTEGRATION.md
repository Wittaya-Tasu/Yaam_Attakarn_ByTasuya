# กาลชะตา Tab V1.0 — Drop-in module

สร้างจาก `กาลชะตา_ข้อกำหนดสำหรับพัฒนา_V1.15.md` เพื่อเพิ่ม Tab **กาลชะตา** ใน WebApp ยามอัฐกาล โดย **แยก state ออกจากระบบเดิมอย่างเด็ดขาด**

## ไฟล์หลัก
- `kala-tab.js` — UI/state ของกาลชะตา อยู่ใน closure ของ `mountKalaChataTab()` ไม่มี global state
- `kala-tab.css` — mobile-first; อ้างอิง iPhone 16 Plus (~430 CSS px)
- `js/*.js` — engine จาก V1.15
- `data/lunar-month-boundaries.json` — ข้อมูลจันทรคติ 1924–2128 จากเอกสาร V1.15
- `tests/kala-tests.mjs` — regression tests จาก V1.15
- `demo.html` — ตัวอย่างการวาง 2 Tab โดย Tab ยามเดิมเป็น placeholder

## วิธีเชื่อมเข้า WebApp เดิม
1. คง DOM/JS ของ “ยามอัฐกาลเดิม” ไว้เหมือนเดิม
2. เพิ่มปุ่ม Tab `กาลชะตา` และ panel ใหม่ `<div id="kala-root"></div>`
3. โหลด `kala-tab.css`
4. ใน module script:

```js
import { mountKalaChataTab } from './kala-tab.js';
const kalaApp = mountKalaChataTab(document.getElementById('kala-root'));
```

`kalaApp` มี state ของตัวเอง ไม่ใช้ state / selected category / active yarm / timer ของ WebApp เดิม

## State isolation
- `live`, `input`, `model`, `chosenYam`, `selectedMeaning`, `exporting`, `timer` อยู่ภายใน `mountKalaChataTab`
- คลิกยามในกาลชะตา เปลี่ยนเฉพาะ `chosenYam` ของกาลชะตา
- ทักษาคำนวณจาก `calendar.seeds.day` เท่านั้น ไม่ใช้ `chosenYam.number`
- เปลี่ยนวันเวลา คำนวณ calendar → chart → yam → taksa ใหม่ และล้าง `chosenYam`
- การเลือกความหมายตามภพไม่หยุด live และไม่เปลี่ยนวันเวลา/ยาม/ทักษา

## iPhone 16 Plus
- ปุ่มและ input สูงอย่างน้อย 44px
- Layout จอแคบเรียง: แผนผัง → ยาม → ทักษา → ความหมาย
- แผนผังเลื่อนแนวนอน ไม่บีบ 7 คอลัมน์
- ตารางความหมายเลื่อนแนวนอน/แนวตั้ง และหัวคอลัมน์ sticky
- รองรับ safe-area และ `viewport-fit=cover`

## การทดสอบ
รันผ่าน local server / GitHub Pages (ไม่ควรเปิด `demo.html` ด้วย `file://` เพราะ JSON ถูกโหลดด้วย fetch)

```bash
npm test
```
