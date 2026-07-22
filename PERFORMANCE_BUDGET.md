# Box Inc. Performance Budget

Sebagai game HTML5 yang ditargetkan untuk platform ringan (seperti Yandex Games), performa adalah fitur utama. Dokumen ini mendefinisikan batasan maksimal (budget) agar game tetap berjalan lancar (60 FPS) di *low-end devices*.

Setiap penambahan fitur atau aset di *Sprint* mendatang TIDAK BOLEH melebihi batas di bawah ini.

## Target Metrics

| Metric | Budget | Deskripsi |
| :--- | :--- | :--- |
| **Target FPS** | 60 | Minimum 60 FPS stabil saat tidak *merging*. Drop ke 50 FPS hanya ditoleransi saat *merge explosion* masif. |
| **Bundle Size** | < 3 MB | Ukuran total JS + CSS setelah *minify* + gzip. (Penting untuk kecepatan load). |
| **Loading Time** | < 2 detik | Waktu dari klik "Play" di Yandex sampai Canvas selesai merender grid. |
| **Memory (RAM)** | < 150 MB | *Heap memory* maksimal yang digunakan selama *gameplay* (termasuk *garbage collection* headroom). |
| **Draw Calls** | < 100 | Batasan *WebGL draw calls* per frame. Gunakan *Texture Atlas* jika mendekati batas. |
| **Active Tweens** | < 300 | Jumlah maksimal animasi *tween* aktif (idle, coin float, dll) di satu waktu. |
| **Particles** | < 200 | Jumlah maksimal partikel aktif dalam satu waktu (*Particle Pool*). |
| **Pool Misses** | 0 | Objek (Box, Text, Particle) HARUS diambil dari *Pool*. *Miss* (instansiasi baru di tengah frame) = Pelanggaran berat. |

---

## Developer Guidelines
1. **Pengecekan Rutin**: Gunakan `CTRL+D` untuk membuka Debug Overlay dan pantau FPS, Memory, dan Pool Size.
2. **Profiling Build**: Jalankan `npm run profile` untuk melihat komposisi *bundle size* (menggunakan Vite plugin atau build stats).
3. **Optimisasi Wajib**:
   - Teks *income* yang mengambang harus di-*pool* dan di-*aggregate*.
   - Animasi UI gunakan Tween terpusat yang bisa dimatikan (*Reduced Motion*).
   - Jangan gunakan shader kompleks.
