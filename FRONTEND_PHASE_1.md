# Frontend — 1-bosqich yangilanishlari

## Qo‘shildi
- O‘qituvchi menyusiga `Analytics` bo‘limi.
- Guruh, talaba, tajriba turi va topshiriq rejimi bo‘yicha dinamik filtrlar.
- Natijalar dinamikasi, guruhlar taqqoslanishi, donut, radar va heatmap diagrammalari.
- Har bir diagrammani PNG yoki JPEG ko‘rinishida yuklab olish.
- Avtomatik ilmiy-metodik xulosa bloki.
- Talaba menyusiga `AI Mentor` bo‘limi.
- Diagnostik savollar, 4 haftalik shaxsiy reja va demo chat.
- AI Mentor reja va chatini brauzer `localStorage`ida saqlash.
- Google Fonts bog‘liqligi olib tashlandi; offline build ishlaydi.
- API xatolarini xavfsiz o‘qish uchun umumiy helper.

## Paketlar
- Next.js: 16.2.10
- Axios: 1.18.1
- eslint-config-next: 16.2.10

## Tekshiruv
- `npm run lint` — muvaffaqiyatli.
- `npm run build` — muvaffaqiyatli.

## Lokal ishga tushirish
1. `.env.example` asosida `.env.local` yarating.
2. `npm install`
3. `npm run dev`
4. Brauzerda `http://localhost:3000`

Eslatma: Analytics va AI Mentor hozir frontend demo ma’lumotlari bilan ishlaydi. Keyingi bosqichda ular real FastAPI endpointlariga ulanadi.
