# Yulia School — Devir Notu

Bu proje, **HelloKido** yönetim panelinin (`C:\Users\HP\Desktop\Avocode\Avocode`) yeni bir müşteri
için alınmış **bağımsız kopyasıdır**. Ortak kod yok, ortak veritabanı yok — iki sistem tamamen ayrı yaşar.
Kullanıcı: Buğra. Müşteri: eşinin arkadaşı, **Ukrayna**'dan kullanacak.

Kod 15.08.2026'da kopyalandı; HelloKido'nun o tarihteki tüm özelliklerini içerir.

---

## 1. Mevcut durum

### ✅ Tamamlandı
- Kod kopyalandı (git geçmişi olmadan, temiz başlangıç), `main` dalında 2 commit
- GitHub reposu: **github.com/BeginnerFED/YuliaSchool** — push edildi
- GitHub Pages **GitHub Actions** kaynağıyla ayarlandı, ilk deploy **başarılı**
- Canlı adres: **https://beginnerfed.github.io/YuliaSchool/**
- GitHub repository secrets eklendi: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OPENROUTER_API_KEY`
- Yeni Supabase projesi oluşturuldu (Frankfurt, ayrı organizasyon, ücretsiz plan)
- `.env` yerelde hazır ve yeni projeye bağlı
- Base path 5 yerde `/YuliaSchool/` olarak ayarlandı

### ❌ Henüz yapılmadı — sıradaki işler
1. **Supabase MCP'yi yeni organizasyona yetkilendir** (aşağıda)
2. **`supabase/schema.sql` dosyasını yeni projeye uygula** — veritabanı şu an BOŞ
3. **Yönetici kullanıcısı oluştur** (Supabase → Authentication → Users → Add user)
4. `npm install` (node_modules kopyalanmadı)
5. Marka değişiklikleri — kullanıcı adım adım söyleyecek

---

## 2. Supabase bilgileri

| | |
|---|---|
| Proje adı | Yulia School |
| Project ref | `rhvqtmtvmhwsnokgfrke` |
| URL | https://rhvqtmtvmhwsnokgfrke.supabase.co |
| Bölge | Central EU (Frankfurt) |
| Plan | Free (ayrı organizasyon: "Yulia") |

Anon key `.env` dosyasında mevcut. **Service role key, secret key ve veritabanı şifresi bu dosyada
bilinçli olarak yazılmadı** — repo herkese açık olabilir. Gerekirse Supabase panelinden alınır.

> ⚠️ Bu üç gizli anahtar sohbet geçmişine yapıştırıldı. Canlıya çıkmadan önce Supabase panelinden
> **yenilenmeleri** önerilir.

### MCP kurulumu (ilk iş)
Bu projede Supabase MCP, **"Yulia" organizasyonuna** yetkili olmalı. Mevcut bağlantı eski
organizasyona ("Bugra Davut") bağlıysa yeni projeye erişemez — şema uygulanamaz.

Etkileşimli oturumda `/mcp` komutuyla Supabase sunucusunu yeniden yetkilendir ve **Yulia**
organizasyonunu seç. Yetkilendikten sonra `list_projects` ile `rhvqtmtvmhwsnokgfrke` görünmeli.

---

## 3. Veritabanı şeması

`supabase/schema.sql` — 505 satır, HelloKido'nun canlı veritabanından birebir çıkarıldı.
İçindekiler: **9 tablo, 18 CHECK kısıtı, 7 yabancı anahtar, 30 indeks, 7 fonksiyon, 6 trigger,
9 RLS açma satırı, 34 politika.**

Boş projede baştan sona bir kez çalıştırılır. Sonra doğrulama:

```sql
SELECT
  (SELECT count(*) FROM pg_tables WHERE schemaname='public') AS tablo,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') AS fonksiyon,
  (SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal) AS trigger,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public') AS politika;
```
Beklenen: **9 / 7 / 6 / 34**

**Kritik:** Uygulama mantığının bir kısmı veritabanında yaşıyor — kontenjan sayacı trigger'ı,
ilk kayıt bilgilerini saklayan trigger, `delete_last_extension` RPC'si. Bunlar olmadan uygulama
sessizce bozulur. Hepsi bu dosyada var.

---

## 4. HelloKido'dan farklar (şu an)

| | HelloKido | Yulia School |
|---|---|---|
| Base path | `/hellokido/` | `/YuliaSchool/` |
| Supabase | jdiqfxvndliopckbyhfj | rhvqtmtvmhwsnokgfrke |
| Veri | ~300 kayıt, dolu | boş |
| Marka | Hello Kido | **hâlâ Hello Kido** ⚠️ |

Şema sabitleri (yaş grupları, ders türleri, paket kotaları, gider kategorileri) **birebir aynı**
bırakıldı — kullanıcı bunları sonra değiştirmek isteyebilir; DB CHECK kısıtlarında tanımlı oldukları
için değişiklik migration gerektirir.

### Değişmesi bekleyen marka noktaları
- `index.html` → sekme başlığı "Hello Kido"
- `src/components/Sidebar.jsx` → panel adı
- `src/pages/Login.jsx` → 2 yerde
- `src/pages/PublicCalendar.jsx` → logo `hellokido.com`'dan çekiliyor + marka renkleri
- `src/pages/Home.jsx` → WhatsApp hatırlatma mesajı: **adres, Google Maps linki, süre, imza** HelloKido'nun
- `src/pages/IdeaCenter.jsx` → OpenRouter `X-Title`
- Çalışma saatleri 09:00–19:00, **Pazartesi kapalı** varsayımı, ders süresi 60 dk, kontenjan 6

---

## 5. Bilinmesi gereken iş kuralları ve tuzaklar

Bunlar HelloKido'da acıyla öğrenildi, aynen geçerli:

- **Ders hakkı sayımı:** kullanılan = `attended` + `no_show` **sadece**. `scheduled` (planlandı),
  `makeup` (telafi), `postponed` (ertelendi) hak yakmaz. Sayım **güncel paket döneminden**
  (`package_start_date` sonrası) başlar — uzatma yapılınca sayaç sıfırlanır. Tek kaynak:
  `src/lib/lessonUsage.js`.
- **Ücretsiz katılım** (`package_type = 'ucretsiz'`): ödeme yok, kota yok, bitiş tarihi yok,
  uzatma yok. `remaining` **null** döner — `null <= 0` JS'te `true` olduğu için her eşik
  kontrolünde `isFree` dalı **önce** gelmeli.
- **Kontenjan 6** dört ayrı dosyada gömülü sabit; `events.max_capacity` (10) hiç kullanılmıyor
  ve hiçbir yerde kapasite zorlaması yok.
- **Hafta kopyalama:** `Calendar.jsx` içinde birbirinin aynısı **iki kopyalama yolu** var
  (kurtarma + normal). Kopyalama mantığına bir şey eklenirse **ikisine de** eklenmeli.
- **Bilinen hata:** Takvim başlığına DOM ile enjekte edilen kopyalama butonu ilk render'ın
  closure'ını tutuyor; oradan çağrılan kodda `events` boş görünür. Bu yüzden ön kontrol effect'ten
  besleniyor. Düzeltilmedi.
- **Herkese açık takvim** haftanın konusunu **yalnızca içinde bulunulan hafta** için gösterir;
  diğer haftalarda sorgu bile atılmaz (rakip atölyeler fikirleri görmesin diye — bilinçli karar).
- `weekly_themes.week_start` **Pazartesi olmak zorunda** (DB CHECK).
- `financial_records` ve `extension_history` CHECK kısıtları bilinçli olarak dar bırakıldı —
  ücretsiz kayda ödeme/uzatma yazmaya çalışan kod DB'de patlasın diye.
- Tarih anahtarları (`week_start` gibi `date` kolonlar) **daima yerel `yyyy-MM-dd`** formatında;
  `toISOString()` kullanılmaz (gün kayması yaratır).

---

## 6. Geliştirme ve yayın

```
npm install      # node_modules kopyalanmadı
npm run dev      # yerel geliştirme
npm run build    # üretim derlemesi
```

**Deploy:** `main` dalına push → GitHub Actions otomatik derler ve Pages'e yayınlar (~1-2 dk).
Anahtarlar repo secret'larından gelir, `.env` repoya girmez (gitignore'da).

**Kullanıcının çalışma tercihleri:**
- Her küçük değişiklikten sonra build alma; o dev sunucusunda kontrol eder, build en sonda bir kez.
- Adım adım ilerlemeyi sever — hepsini birden yapıp anlatma.
- Tasarımda "AI slop"tan nefret eder: degrade patlaması, emoji, BÜYÜK HARF etiketler yok.
  Sakin, yerel hisseden arayüz; mevcut tasarım diline sadık kal.
- Token maliyetine duyarlı: tasarım/UI turlarında çok ajanlı workflow çalıştırma.
