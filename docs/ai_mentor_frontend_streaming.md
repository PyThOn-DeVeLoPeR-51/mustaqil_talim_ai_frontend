# AI Mentor frontend streaming

## Endpoint

Frontend chat endi `POST /api/v1/ai-mentor/chat/sessions/{session_id}/messages/stream` endpointidan foydalanadi.

Browser `EventSource` POST body va JWT yubora olmagani uchun `fetch()` + `ReadableStream` orqali SSE parse qilinadi.

## UI oqimi

1. Talaba xabari optimistik tarzda darhol ko‘rinadi.
2. Assistant uchun `AI javob yozmoqda...` placeholder paydo bo‘ladi.
3. Har bir `delta` kelishi bilan matn ekranga qo‘shiladi.
4. `fallback.replace=true` bo‘lsa partial provider matni tozalanadi va zaxira javob yangidan yig‘iladi.
5. `done` eventida vaqtinchalik assistant xabari backenddan kelgan haqiqiy DB yozuvi bilan almashtiriladi.
6. Network/stream xatosida chat backenddan qayta yuklanib, saqlangan tarix tiklanadi.

Eski non-streaming API funksiyasi backward compatibility uchun `src/api/ai-mentor.ts` ichida saqlanadi.
