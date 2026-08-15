import { supabase } from './supabase';

// Ücretsiz katılım: ödeme alınmayan, ders kotası olmayan paket türü
export const FREE_PACKAGE_TYPE = 'ucretsiz';

export const isFreePackage = (packageType) => packageType === FREE_PACKAGE_TYPE;

// Paket tipine göre toplam ders hakkı
export const PACKAGE_LESSON_TOTALS = {
  'hafta-1': 4,
  'hafta-2': 8,
  'hafta-3': 12,
  'hafta-4': 16,
  'tek-seferlik': 1
};

export const getPackageLessonTotal = (packageType) => {
  // Ücretsizde kota kavramı yok (null), bilinmeyen tipler 0
  if (isFreePackage(packageType)) return null;
  return PACKAGE_LESSON_TOTALS[packageType] || 0;
};

// Bir öğrencinin ders kullanımını hesaplar.
// İş kuralları (sahibin kararı):
// - Kullanılan = SADECE 'attended' (Katıldı) + 'no_show' (Gelmedi).
//   'scheduled' henüz harcanmamış hak; 'makeup' planlı devamsızlık telafisi, hak yakmaz;
//   'postponed'/'cancelled' yakmaz.
// - Sayım güncel paket dönemine bakar: yalnızca dersin event_date'i
//   package_start_date ve SONRASI olan satırlar sayılır (uzatma yapılınca sayaç sıfırlanır).
// - Ücretsiz katılımda kota yoktur: total/remaining null döner, sayım dönem-kapsamına girmez
//   (paket dönemi kavramı yok; ücretliden dönüştürülmüşse eski başlangıç tarihi geçmişi keserdi).
// rows: [{ status, events: { event_date } | null }] — events null ise (silinmiş etkinlik) sayılmaz.
export const computeLessonUsage = (registration, rows) => {
  const free = isFreePackage(registration.package_type);
  const total = getPackageLessonTotal(registration.package_type);
  const periodStart = !free && registration.package_start_date
    ? new Date(registration.package_start_date)
    : null;

  const counts = {
    attended: 0,
    noShow: 0,
    makeup: 0,
    scheduled: 0,
    postponed: 0
  };

  (rows || []).forEach(row => {
    if (!row.events || !row.events.event_date) return;
    if (periodStart && new Date(row.events.event_date) < periodStart) return;

    switch (row.status) {
      case 'attended': counts.attended += 1; break;
      case 'no_show': counts.noShow += 1; break;
      case 'makeup': counts.makeup += 1; break;
      case 'scheduled': counts.scheduled += 1; break;
      case 'postponed': counts.postponed += 1; break;
      default: break;
    }
  });

  const used = counts.attended + counts.noShow;

  return {
    isFree: free,
    total,
    used,
    remaining: free ? null : Math.max(total - used, 0),
    ...counts
  };
};

// Birden çok kayıt için ders kullanımını getirir. Dönüş: { [registrationId]: usage }
//
// Sayım veritabanındaki get_lesson_usage() RPC'sine yaptırılır. Bunun iki sebebi var:
//
// 1) DOĞRULUK. Öğretmen yalnızca kendi derslerini görebilir. Sayımı istemcide
//    yapsaydık öğrencinin BAŞKA öğretmenin dersinde yaktığı haklar sorguya hiç
//    gelmez, öğretmen kalan dersi olduğundan fazla görürdü. RPC RLS'i baypas edip
//    doğru sayar ama yalnızca sayı döner — kimin nerede olduğunu göstermez.
// 2) Eski kod PostgREST'in 1000 satır sınırına takılmamak için sayfalama yapıyordu;
//    toplama sunucuda yapıldığı için o döngü tamamen kalktı.
//
// Sayım kuralları (attended+no_show, paket dönemi, ücretsizde kota yok) RPC ile
// computeLessonUsage arasında AYNI olmalı — biri değişirse diğeri de değişmeli.
export const fetchLessonUsageMap = async (registrations) => {
  const usageMap = {};
  if (!registrations || registrations.length === 0) return usageMap;

  const ids = registrations.map(reg => reg.id);

  const { data, error } = await supabase.rpc('get_lesson_usage', {
    p_registration_ids: ids
  });
  if (error) throw error;

  const byRegistration = Object.fromEntries(
    (data || []).map(row => [row.registration_id, row])
  );

  registrations.forEach(registration => {
    const row = byRegistration[registration.id];
    const free = isFreePackage(registration.package_type);
    const total = getPackageLessonTotal(registration.package_type);

    // RPC'nin döndürmediği kayıt = çağıranın görme hakkı yok.
    // Sayaçlar sıfırlanır, böylece çağıran taraf undefined ile karşılaşmaz.
    const counts = {
      attended: row?.attended ?? 0,
      noShow: row?.no_show ?? 0,
      makeup: row?.makeup ?? 0,
      scheduled: row?.scheduled ?? 0,
      postponed: row?.postponed ?? 0
    };
    const used = counts.attended + counts.noShow;

    usageMap[registration.id] = {
      isFree: free,
      total,
      used,
      remaining: free ? null : Math.max(total - used, 0),
      ...counts
    };
  });

  return usageMap;
};
