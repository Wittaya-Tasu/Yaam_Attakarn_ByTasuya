# Patch เชื่อม Tab กาลชะตาเข้ากับ WebApp ยามอัฐกาล

ไฟล์นี้เป็น patch สำหรับ repository `Wittaya-Tasu/Yaam_Attakarn_ByTasuya`

แทนที่/เพิ่มไฟล์ดังนี้:
- แทนที่ `index.html`
- แทนที่ `sw.js`
- เพิ่ม `js/tab-controller.js`

ไฟล์โมดูลกาลชะตาที่มีอยู่ใน repository แล้ว (`kala-tab.js`, `kala-tab.css`, `js/calendar-engine.js`, `js/chart-engine.js`, `js/kala-engine.js`, `js/relation-engine.js`, `js/house-meanings.js`, `data/lunar-month-boundaries.json`) ให้คงไว้

หลัง deploy จะเห็น Tab 2 ปุ่มใต้หัวข้อแอป:
`ยามอัฐกาล | กาลชะตา`

บน iPhone 16 Plus ปุ่มสูงอย่างน้อย 46px และหน้า กาลชะตา ใช้ layout mobile-first ของ `kala-tab.css`
