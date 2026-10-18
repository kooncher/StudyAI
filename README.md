# เรดาร์ AI ป.โท (เวอร์ชัน Vercel)

เว็บแอปรวมข่าวและเปเปอร์ AI ล่าสุดสำหรับนักศึกษา CSAI ของ NIDA

- **ข่าว** ดึงจาก RSS ของ TechCrunch, The Verge, MIT Technology Review, Google AI Blog, Hugging Face Blog และ Blognone (คัดเฉพาะข่าว AI)
- **เปเปอร์** ดึงจาก arXiv API หมวด cs.AI, cs.CL (NLP), cs.CV (Computer Vision) และ cs.LG (Machine Learning)
- **รีเฟรชอัตโนมัติทุก 30 นาที** ด้วย ISR ของ Vercel ไม่ต้องมีฐานข้อมูลหรือ cron
- **ผูกกับวิชาใน CSAI** ทุกรายการแท็กวิชาให้อัตโนมัติด้วยคำสำคัญ ไม่เสียค่าใช้จ่าย
- **บันทึก / อ่านแล้ว** เก็บในเบราว์เซอร์ของเครื่องนั้นๆ (ยังไม่ซิงก์ข้ามเครื่อง)
- **ปุ่ม "อธิบายเชิงลึก (ไทย)"** ใช้ Claude API เปิดเมื่อใส่ `ANTHROPIC_API_KEY`
- ใช้บน iPad ได้ กด Share → **Add to Home Screen** แล้วจะเปิดเต็มจอเหมือนแอป

---

## วิธี deploy ขึ้น Vercel

### ทางที่ 1: ผ่าน GitHub (แนะนำ เพราะแก้โค้ดแล้ว deploy ให้เองทุกครั้ง)

1. สร้าง repository ใหม่บน GitHub (เช่น `ai-radar-csai`) แล้วอัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้
   ```bash
   cd ai-radar-web
   git init
   git add .
   git commit -m "first version"
   git branch -M main
   git remote add origin https://github.com/<ชื่อผู้ใช้>/ai-radar-csai.git
   git push -u origin main
   ```
2. เข้า https://vercel.com แล้วล็อกอินด้วย GitHub
3. กด **Add New… → Project** แล้วเลือก repository `ai-radar-csai`
4. Vercel จะรู้เองว่าเป็น Next.js ไม่ต้องแก้ค่าอะไร กด **Deploy**
5. รอประมาณ 1 นาที จะได้ลิงก์ เช่น `ai-radar-csai.vercel.app`

### ทางที่ 2: ผ่าน Vercel CLI (เร็ว ไม่ต้องใช้ GitHub)

```bash
cd ai-radar-web
npm install
npx vercel        # ครั้งแรกจะให้ล็อกอินและตั้งชื่อโปรเจกต์
npx vercel --prod # deploy ขึ้นลิงก์จริง
```

---

## เปิดปุ่ม "อธิบายเชิงลึก (ไทย)" (ไม่บังคับ)

1. สร้าง API key ที่ https://console.anthropic.com (ต้องเติมเครดิตก่อน คิดตามการใช้งาน)
2. ใน Vercel เข้าโปรเจกต์ → **Settings → Environment Variables**
3. เพิ่ม `ANTHROPIC_API_KEY` = key ที่ได้มา
4. (ไม่บังคับ) เพิ่ม `ANTHROPIC_MODEL` ถ้าอยากเปลี่ยนโมเดล ค่าเริ่มต้นคือ `claude-haiku-5-5` ซึ่งถูกและเร็ว
5. เข้า **Deployments** แล้วกด **Redeploy** ปุ่มจะขึ้นทันที

> **ข้อควรรู้เรื่องค่าใช้จ่าย:** ลิงก์ Vercel เปิดได้สาธารณะ ใครมีลิงก์ก็กดปุ่มอธิบายได้และใช้เครดิตของคุณ
> API นี้รับเฉพาะคำขอจากหน้าเว็บของตัวเองแล้ว แต่ถ้าจะแชร์ลิงก์ให้คนอื่น ควรตั้งวงเงินรายเดือนใน Anthropic Console ไว้ด้วย
> หรือเปิด **Vercel Authentication** (Settings → Deployment Protection) ให้เข้าได้เฉพาะคุณ

---

## รันบนเครื่องตัวเอง

```bash
npm install
npm run dev                 # เปิด http://localhost:3000 ดึงข้อมูลจริง
MOCK_FEEDS=1 npm run dev    # ใช้ข้อมูลตัวอย่าง ไม่ต้องต่ออินเทอร์เน็ต
npm run test:parse          # ทดสอบตัวแปลง RSS / arXiv
```

---

## แก้ไขต่อเอง

| อยากทำ | ไฟล์ |
|---|---|
| เพิ่ม/ลบแหล่งข่าว RSS | `lib/sources.ts` → `NEWS_FEEDS` |
| เปลี่ยนหมวด arXiv | `lib/sources.ts` → `ARXIV_CATEGORIES` |
| ปรับกฎการผูกวิชาหรือหมวดข่าว | `lib/classify.ts` |
| เปลี่ยนความถี่รีเฟรช | `app/page.tsx` → `revalidate` (วินาที) |
| ปรับหน้าตา สี ฟอนต์ | `app/globals.css` |
| ปรับคำสั่งที่ส่งให้ Claude | `app/api/explain/route.ts` |

## โครงสร้าง

```
app/
  page.tsx              หน้าแรก ดึงข้อมูลฝั่งเซิร์ฟเวอร์ (ISR 30 นาที)
  api/explain/route.ts  เรียก Claude API แบบ streaming (key อยู่ฝั่งเซิร์ฟเวอร์)
  layout.tsx            ฟอนต์, metadata สำหรับ iPad
  manifest.ts, icon.tsx, apple-icon.tsx   ไอคอนสำหรับ Add to Home Screen
components/Dashboard.tsx   หน้าจอทั้งหมด (แท็บ ตัวกรอง บันทึก อ่านแล้ว)
lib/sources.ts             ดึงและแปลง RSS / arXiv
lib/classify.ts            แท็กวิชาและหมวดด้วยคำสำคัญ
lib/mock.ts                ข้อมูลตัวอย่าง
```

## ขั้นต่อไปที่ทำได้

- **ซิงก์บันทึก/อ่านแล้วข้ามเครื่อง** เพิ่ม Supabase (มีแพ็กเกจฟรี) + ล็อกอิน
- **สรุปภาษาไทยอัตโนมัติทุกรายการ** ใช้ Vercel Cron เรียก Claude วันละครั้งแล้วเก็บผลลงฐานข้อมูล จะได้ไม่ต้องเรียกซ้ำทุกครั้งที่มีคนเปิด
- **เพิ่มแหล่งไทย** เช่น ข่าว AI ของหน่วยงานรัฐ หรือ RSS ของวารสารใน ThaiJO
