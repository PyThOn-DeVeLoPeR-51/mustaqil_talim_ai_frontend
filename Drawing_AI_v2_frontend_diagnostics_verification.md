# Drawing AI v2 Frontend Diagnostics Patch

## Maqsad

Swagger JSON bilan cheklanib qolmasdan, platformaning o‘zida AI baholagan chizmalarni vizual tekshirish uchun frontend diagnostika paneli qo‘shildi.

## O‘zgargan fayllar

- `src/components/drawing-ai/result-diagnostics.tsx` — yangi reusable diagnostika komponenti.
- `src/app/(dashboard)/submissions/page.tsx` — teacher natijalar dialogiga diagnostika paneli ulandi.
- `src/app/(student)/student/task/[id]/page.tsx` — student topshiriq detail sahifasiga diagnostika paneli ulandi.

## Diagnostika paneli nimalarni ko‘rsatadi?

- Talaba yuklagan original chizma preview.
- AI overlay preview.
- Etalon/reference chizma preview, agar response yoki task ichida mavjud bo‘lsa.
- Optional debug artefaktlar: visible/diff artefaktlari response ichida bo‘lsa.
- Umumiy ball, grade label, confidence, student_projections, reference_projections, elapsed_ms.
- `drawing_ai_v2` metadata: engine_version, scoring_version, criteria_locked, task_text_applied.
- Rubrika/mezonlar jadvali.
- `projection_boxes`, `reference_projection_boxes`, `visible_box` diagnostik JSON bloklari.
- To‘liq AI JSON.
- Avtomatik ogohlantirishlar: masalan, etalon rejimda `student_projections < 2` yoki overlay topilmasa.

## Baholash mantiqi

Frontend patch AI baholash algoritmiga yoki backend scoringga tegmaydi. Faqat backenddan kelgan mavjud `ResultRead` va `ai_json_result` ma’lumotlarini ko‘rsatadi.

## Sandbox tekshiruvi

- TypeScript parser tekshiruvi global `tsc` bilan bajarildi.
- Sandboxda `node_modules` mavjud emas edi.
- `npm install` registrydagi `zod-validation-error` tarball topilmagani sababli yakunlanmadi; bu kod patchiga bog‘liq emas.
- Global `tsc` tekshiruvida React/Next dependencylar yo‘qligi sababli `Cannot find module` xabarlari kutilgan holat bo‘ldi. Ulardan tashqari sintaksis/type xatolari topilmadi.

## Lokal tekshirish buyruqlari

```powershell
npm install
npm run lint
npm run build
npm run dev
```

Platformada teacher sifatida `/submissions` sahifasida submission detail ochiladi. Student sifatida `/student/task/[id]` sahifasida natija tafsilotlari ko‘riladi.
