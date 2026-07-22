# AI Mentor frontend integratsiyasi

## Qo‘shilgan qatlamlar

- `src/types/ai-mentor.ts` — backend response va payload TypeScript turlari.
- `src/api/ai-mentor.ts` — student JWT bilan ishlaydigan AI Mentor API client.
- `src/app/(student)/student/mentor/page.tsx` — backendga ulangan diagnostika, reja, progress va chat UI.

## Frontend oqimi

1. Sahifa ochilganda diagnostik savollar, so‘nggi diagnostika, joriy reja va faol chat backenddan olinadi.
2. Diagnostika savollari backenddagi `answer_type` va `options_json` bo‘yicha dinamik chiziladi.
3. Majburiy javoblar to‘ldirilgach diagnostika sessiyasi yaratiladi va javoblar yuboriladi.
4. Yakunlangan diagnostika asosida mock AI reja yaratiladi.
5. Reja vazifalari `completed` yoki `pending` holatiga o‘tkaziladi va progress qayta olinadi.
6. Xabar yuborilganda faol chat bo‘lmasa avtomatik chat sessiyasi yaratiladi.
7. “Yangi chat” eski faol chatni yopadi; uning tarixi backendda saqlanadi.
8. Yangi reja yaratilganda avvalgi rejaga bog‘langan faol chat yopiladi.

## Lokal tekshiruv

Backend va frontendni parallel ishga tushiring:

```powershell
# Backend
uvicorn app.main:app --reload

# Frontend
npm run dev
```

Talaba profili bilan kirib `/student/mentor` sahifasida quyidagi oqimni tekshiring:

```text
10 ta savol → reja yaratish → vazifani bajarildi qilish → chatga xabar yuborish → sahifani yangilash
```

Sahifa yangilangandan keyin diagnostika, reja progressi va chat tarixi qayta tiklanishi kerak.
