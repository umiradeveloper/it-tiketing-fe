# Frontend — IT Tiketing UMIRA

Next.js 15 (App Router) + Tailwind. Semua request ke `/api/v1/*` di-proxy ke backend (`API_INTERNAL_URL`), sehingga cookie sesi tetap same-origin.

```bash
cp .env.example .env.local
npm install
npm run dev       # http://localhost:3000 (backend harus sudah jalan)
```

- `src/app/` halaman (login, dashboard, tiket, knowledge base, aset, akses & onboarding, laporan, administrasi)
- `src/components/` komponen UI, termasuk sumbu SLA (`ui.tsx`) dan logo (`brand.tsx`)
- `src/shared/` konstanta bersama (salinan yang sama ada di backend)

Lihat README di folder induk untuk panduan lengkap.
