# AI Mentor Markdown va RAG manbalari UI

AI Mentor chatidagi haqiqiy RAG javoblari `assistant_message.metadata_json.rag` orqali manbalarni oladi.

## Ko‘rsatish sharti

`Topilgan manbalar` bloki faqat quyidagi holatda chiqariladi:

- xabar roli `assistant`;
- `rag.used_for_answer = true`;
- `rag.sources` ichida kamida bitta yaroqli manba mavjud.

Mock yoki provider fallback javobida `used_for_answer = false` bo‘lsa, manbalar ko‘rsatilmaydi.

## UI tarkibi

Har bir manba uchun:

- `[Manba N]` bilan mos raqam;
- hujjat sarlavhasi;
- bo‘lim yoki sahifa mavjud bo‘lsa joylashuv;
- cosine similarity score foiz ko‘rinishida;
- ochib-yopiladigan excerpt.

Streaming tugagandagi `done` event vaqtinchalik assistant xabarini backenddagi to‘liq xabar bilan almashtiradi. Shu sabab manbalar javob tugagach paydo bo‘ladi va sahifa yangilanganda chat tarixidan qayta tiklanadi.


## Markdown render

Assistant javoblari raw HTML ishlatmasdan, React elementlari orqali xavfsiz render qilinadi. Qo‘llab-quvvatlanadi:

- qalin va kursiv matn;
- tartibli va tartibsiz ro‘yxatlar;
- sarlavhalar;
- inline va fenced code;
- blockquote;
- faqat `http`, `https` va `mailto` havolalar.

Talaba xabarlari oddiy matn sifatida qoladi. Streaming vaqtida noto‘liq Markdown ham xavfsiz ko‘rsatiladi.
