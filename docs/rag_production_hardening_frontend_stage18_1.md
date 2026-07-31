# RAG Production Hardening Frontend — Stage 18.1

## Tuzatilgan muammo

`/knowledge-base` sahifasida oldingi muvaffaqiyatli joblar mavjud bo‘lsa, monitoring paneli mount bo‘lishi bilan `onCompleted` callbackni chaqirar edi. Parent `reload()` to‘liq loading holatiga o‘tib panelni unmount qilardi; remountdan keyin callback yana ishlardi. Natijada sahifa uzluksiz reload ko‘rinishida qolardi.

## Yechim

- Joblarning dastlabki holati baseline sifatida qabul qilinadi.
- Callback faqat yangi job terminal statusga (`succeeded`, `failed`, `cancelled`) o‘tganda ishlaydi.
- Background yangilanishlar `quiet reload` orqali bajariladi va butun sahifa loading holatiga o‘tmaydi.
- Parallel monitoring so‘rovlari `loadInFlightRef` bilan cheklanadi.
- Quiet reload xatosi mavjud sahifani ErrorState bilan almashtirmaydi.
