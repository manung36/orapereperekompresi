# OraPerePere — PDF Kompresi

Aplikasi web untuk mengompres file PDF langsung di browser. File tidak diunggah ke server mana pun — seluruh proses berjalan di perangkat pengguna.

## Fitur

- **Drag & drop / pilih file** PDF dengan pratinjau halaman pertama
- **3 tipe kompresi**: Extreme, Sedang, Low
- **Target ukuran instan**: Di bawah 1 MB dan Di bawah 4 MB (otomatis menyesuaikan kualitas agar mencapai target)
- Indikator progres per halaman
- Ringkasan hasil: ukuran awal, ukuran baru, dan persentase penghematan

## Teknologi

- [React](https://react.dev) + [Vite](https://vitejs.dev) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- Komponen bergaya [shadcn/ui](https://ui.shadcn.com) (Radix UI, CVA, clsx, tailwind-merge)
- [pdfjs-dist](https://github.com/mozilla/pdf.js) untuk merender halaman
- [pdf-lib](https://github.com/Hopding/pdf-lib) untuk menyusun ulang PDF

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

## Build produksi

```bash
npm run build
npm run preview
```

## Cara kerja kompresi

Setiap halaman PDF dirender menjadi gambar lalu disusun ulang menjadi PDF baru.
Mode kualitas mengatur skala resolusi dan kualitas JPEG; mode target ukuran melakukan
pencarian biner pada kualitas gambar agar hasil akhir berada tepat di bawah batas yang dipilih.

---

Made by Harun Azis
