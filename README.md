# XIYU API PRIVATE — Vercel

Migrasi API dari Cloudflare Worker ke Vercel Functions. Dashboard mobile-first berada di `public/index.html`.

## Endpoint

- `POST /api/send` — mengirim magic link.
- `POST /api/verif` — memverifikasi magic link lalu meneruskan alur aktivasi Premium dari source.
- `POST /api/verify` — alias untuk `/api/verif`.
- `GET /api/health` — status server.
- `GET /api/info` — informasi dan daftar endpoint.
- `GET /api/stats` — statistik layanan.
- `GET /api/history` — status riwayat.

## Request SEND

```json
{ "email": "user@example.com" }
```

## Request VERIF

```json
{
  "email": "user@example.com",
  "magicLink": "PASTE_MAGIC_LINK_FROM_EMAIL",
  "orderId": "XIYU CODEX"
}
```

`orderId` bersifat opsional. Generator mengikuti source Worker: tanpa prefix menggunakan `AixiCodex-GPA....`; jika prefix disediakan, formatnya `prefix-GPA....`, kecuali prefix itu sendiri sudah memuat `GPA.`.

## Environment Variables (opsional)

Konfigurasi bawaan source dipertahankan di `api/_firebase.js`. Untuk mengganti nilai tanpa mengedit source, isi Environment Variables pada Vercel:

- `FIREBASE_API_KEY`
- `AM_VERIFY_URL`
- `AM_PURCHASE_TOKEN`
- `FIREBASE_INSTANCE_ID_TOKEN`

Jika variabel tidak diisi, fungsi memakai nilai default yang dibawa dari source Worker. Jangan publikasikan variabel rahasia di dashboard/browser.

## Deploy

1. Import repository ke Vercel.
2. Framework preset: Other.
3. Root Directory: folder proyek ini.
4. Deploy.
5. Tes `GET /api/health`, kemudian uji SEND dan VERIF dengan email serta magic link yang valid.
