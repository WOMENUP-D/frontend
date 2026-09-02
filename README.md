# WomanUP — Frontend

Milliy raqamli rivojlantirish ekotizimi. Ayol-qizlarni har tomonlama rivojlantirish milliy dasturi, 1-bosqich: **WomanUP portali**.

> Har bir ayol uchun individual rivojlanish trayektoriyasi.

Bu repozitoriyada portalning **veb-ilovasi** joylashgan: Next.js (App Router),
TypeScript, Tailwind. Mobile-first (360px+), i18n birinchi kundan —
uz-Latn asosiy, uz-Cyrl / ru / en tayyor.

API alohida repozitoriyada: https://github.com/WOMENUP-D/backend

Texnik topshiriq (TZ) va strategik hujjat ochiq repozitoriyaga chiqarilmagan.

---

## Nima qilinadi

Foydalanuvchi yo'li — bitta uzluksiz sikl:

```
WomanUP ID → Diagnostika → Development Score → AI reja → Dasturlar
     → Imkoniyatlar (Edu-Job / Invest HUB / Tijorat markazi) → Natija → KPI
```

| Blok | Holati |
|------|--------|
| OTP ro'yxatdan o'tish, JWT, 8 rolli RBAC | ✅ ishlaydi |
| Profil, maqsadlar, consent boshqaruvi | ✅ ishlaydi |
| Diagnostika + Development Score (8 o'lchov, 0–100) | ✅ ishlaydi |
| AI individual reja + rule-based fallback | ✅ ishlaydi |
| Dasturlar katalogi, enrollment, progress, sertifikat | ✅ ishlaydi |
| AI Navigator (RAG + guardrails + eskalatsiya) | ✅ ishlaydi (bilim bazasi to'ldirilishi kerak) |
| Imkoniyatlar, arizalar, skill-gap tahlili | ✅ ishlaydi |
| Mentorlik | ✅ ishlaydi |
| Integratsiya gateway (outbox + consent gate) | ✅ ishlaydi (hamkor API'lari ulanishi kerak) |
| Notification engine (in-app / email / SMS / push) | ✅ ishlaydi (provayder adapterlari kerak) |
| Admin dashboard, KPI, CSV eksport, audit | ✅ ishlaydi |
| Frontend | 🟡 skelet (API klienti tayyor, ekranlar yo'q) |

---

## Demo versiyani ishga tushirish

Avval API'ni ko'taring — https://github.com/WOMENUP-D/backend dagi ko'rsatmaga qarang. Keyin:

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL ni API manziliga qarating
npm run dev                  # yoki: npm run build && npm start
```

Ochiladi: **http://localhost:3000**

`.env.local` ichidagi barcha `NEXT_PUBLIC_*` qiymatlari brauzerga chiqadi — bu
normal. Firebase service-account **maxfiy kalitini** u yerga hech qachon
qo'ymang: u faqat API tomonida turadi.

### Demo hisoblari

| Rol | Telefon | Nimani ko'rsatadi |
|---|---|---|
| Foydalanuvchi | `+998900000002` | Diagnostika topshirilgan, ball hisoblangan, kurs boshlangan |
| Administrator | `+998900000001` | Boshqaruv paneli, KPI, hududiy qamrov |

SMS provayderi ulanmagani uchun tasdiqlash kodi demo rejimida ekranning o'zida
ko'rsatiladi. Istalgan boshqa `+998` raqami bilan yangi hisob ochish ham mumkin —
u holda diagnostikadan boshlab butun yo'lni o'tasiz.

### Demo'da nimani ko'rsatish mumkin

1. **Kirish** — telefon raqami va bir martalik kod, parolsiz.
2. **Diagnostika** — 24 savol, 8 o'lchov; yakunda Development Score va eng zaif yo'nalishlar.
3. **Individual reja** — tizim reja taklif qiladi; u **siz tasdiqlaguningizcha faol emas**.
4. **Dasturlar** — 12 kurs, filtr va qidiruv, kartochka standarti, kursga yozilish.
5. **Imkoniyatlar** — 10 ta vakansiya/grant/savdo; ko'nikma mosligi foizi va yetishmayotgan ko'nikmalar.
6. **Rozilik to'sig'i** — rozilik bermasdan ariza yuborib bo'lmaydi (API 403 qaytaradi).
7. **AI Navigator** — javob faqat tasdiqlangan manbalardan; zo'ravonlik mavzusi modelga umuman yuborilmay, odamga eskalatsiya qilinadi.
8. **RBAC** — oddiy foydalanuvchi `/admin` ga kira olmaydi (403).
9. **Boshqaruv paneli** — 128 foydalanuvchi, 14 hudud, MVP KPI to'plami.

### Demo cheklovlari — ochiq aytilgan

| Cheklov | Sabab |
|---|---|
| SMS yuborilmaydi, kod ekranda | Provayder shartnomasi yo'q |
| AI matn generatsiya qilmaydi | `ANTHROPIC_API_KEY` sozlanmagan. Navigator tasdiqlangan manbadan **to'g'ridan-to'g'ri parcha** keltiradi, hech narsa o'ylab topilmaydi. Reja qoidalar asosida tuziladi |
| Hamkor platformalar mock | Edu-Job, Invest HUB va Tijorat markazining sandbox URL/kalitlari yo'q. Arizalar outbox'ga yoziladi va yetkazishga urinadi |
| Statistika shartli | 128 foydalanuvchi generatsiya qilingan, real ma'lumot emas |

`ANTHROPIC_API_KEY` ni `backend/.env` ga qo'shsangiz, AI reja va navigator to'liq
generativ rejimda ishlaydi — kodda hech narsa o'zgartirish shart emas.

---

## Arxitektura

```
frontend/
├── src/
│   ├── app/            App Router sahifalari (yangiliklar, dasturlar, kabinet, …)
│   ├── components/     qayta ishlatiladigan UI
│   ├── content/        statik matnlar
│   ├── i18n/           uz / uz-Cyrl / ru / en — bitta kalit, uch til yonma-yon
│   ├── services/       API klienti (portal.ts, api.ts, auth.ts)
│   └── utils/          format, translit va boshqalar
├── public/
├── Dockerfile
└── .github/workflows/ci.yml
```

**Prinsip:** UI matnlari kodda qattiq yozilmaydi — hammasi `src/i18n` orqali.
Foydalanuvchi nimani ko'rishi mumkinligi serverda hal qilinadi: yoshga mos
bo'lmagan post brauzerga umuman yetib kelmaydi, CSS bilan yashirilmaydi.

---

## Ishga tushirish

### Docker orqali

```bash
docker build -t womanup-frontend .
docker run -e NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 -p 3000:3000 womanup-frontend
```

Baza va API bilan birga ko'tarish uchun `docker-compose.yml` kerak — u barcha
servislarni tavsiflaydi va shu sababli bu repozitoriyada emas.

### Lokal

Talab: Node.js 20+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

### Tekshiruv

```bash
npx tsc --noEmit
npm run lint
npm run build
```

---

## Maxfiylik va xavfsizlik

«Shaxsga doir ma'lumotlar to'g'risida»gi qonun talablari kodga o'rnatilgan:

- **Consent gate** — hech qanday ma'lumot hamkor platformaga rozilik yozuvisiz chiqmaydi (`integration_gateway.queue_event` `ConsentMissingError` beradi).
- **Data minimisation** — hamkorlarga telefon, email, F.I.Sh., oilaviy holat va farzandlar soni **yuborilmaydi**; faqat psevdonim `womanup_id` va kasbiy maydonlar (`minimal_profile_payload`).
- **Append-only consent** — rozilikni qaytarib olish yangi yozuv qo'shadi, eskisi o'chirilmaydi; joriy holat = eng oxirgi yozuv.
- **PII scrubbing** — telefon, email, PINFL va karta raqamlari log'ga va AI prompt'iga tushishidan oldin tozalanadi.
- **Audit log** — insert-only; production'da bu jadvalga UPDATE/DELETE huquqi berilmasligi kerak.
- **Sensitive maydonlar** — `ProfileRead` sxemasida umuman yo'q, shuning uchun xodimlar marshruti orqali sizib chiqa olmaydi.
- **O'chirish huquqi** — `DELETE /users/me` identifikatorlarni tozalaydi, faoliyat tarixi anonim holda qoladi (KPI buzilmaydi).

### AI guardrails (TZ 06-bo'lim)

- Javoblar **faqat tasdiqlangan** bilim bazasidan (`is_approved=True` chunk'lar).
- Zo'ravonlik, o'ziga zarar, firibgarlik mavzulari **modelga yuborilmasdan** to'g'ridan-to'g'ri odamga eskalatsiya qilinadi.
- `AI_MIN_CONFIDENCE` dan past ishonchda tizim taxmin qilmaydi — «bilmayman» deydi.
- Har bir chaqiruv `ai_interactions` ga yoziladi: model versiyasi, prompt versiyasi, trace_id, manbalar, ishonch.
- AI **hech qachon qaror qabul qilmaydi**: reja foydalanuvchi tasdiqlaguncha faol emas; risk flag faqat koordinatorga signal, avtomatik sanksiya yo'q.

---

## Muhim texnik qarorlar

| Qaror | Sabab |
|---|---|
| Transactional outbox (`integration_events`) | Hamkor platforma ishlamayotganida foydalanuvchi arizasi yo'qolmaydi |
| Idempotency key hamma integratsiyada | Hamkor bir xil batch'ni qayta yuborsa dublikat yaratilmaydi |
| Enum qiymatlari `values_callable` bilan | Bazada `education_skills`, `EDUCATION_SKILLS` emas — API bilan mos |
| `str_enum` = `native_enum=False` | Yangi qiymat qo'shish uchun PostgreSQL enum migratsiyasi shart emas |
| Diagnostika savollari versiyalanadi | Instrument o'zgarsa ham eski ballar qayta hisoblanadi |
| Development Score: baseline / current / target | O'sish mutlaq idealga emas, boshlang'ich nuqtaga nisbatan o'lchanadi |
| AI ishlamasa — rule-based fallback reja | Xato ekrani o'rniga ishlaydigan reja |
| RAG vector bo'lmasa full-text search'ga tushadi | Embedding provayderi uzilganda navigator ishlashda davom etadi |

---

## Keyingi qadamlar

1. **SMS/email provayderi** — `notification_service.LoggingAdapter` o'rniga real adapter (pilotgacha majburiy).
2. **Embedding provayderi** — `llm_gateway.embed()` hozir `NotImplementedError`; data-residency yuridik tekshiruvidan keyin ulanadi.
3. **Bilim bazasi** — navigator javob berishi uchun tasdiqlangan kontent yuklanishi kerak (`POST /ai/knowledge` → `POST /ai/knowledge/{id}/approve`).
4. **Hamkor API kontraktlari** — Edu-Job, Invest HUB, Tijorat markazi bilan sandbox URL va OAuth2 client credentials.
5. **Diagnostika savollari** — `assessment_questions` jadvali bo'sh; metodologiya bilan to'ldirilishi kerak.
6. **Frontend** — 23 ta MVP ekrani, design system.
7. **Xavfsizlik qattiqlashtirish** — JWT revocation denylist (Redis), rate limiting, pentest.

Batafsil: [docs/architecture.md](docs/architecture.md) · [docs/data-model.md](docs/data-model.md) · [docs/api.md](docs/api.md)

---

## Boshqaruv

Loyiha boshqaruvchisi — **Durdona** (biznes talablar, prioritet, MVP qabuli).
Institutsional uy — O'zbekiston iqtisodiyot assambleyasi.
