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

// Birden çok kayıt için ders kullanımını TEK toplu sorguyla getirir.
// Dönüş: { [registrationId]: usage }
// PostgREST'in 1000 satır sınırına takılmamak için sayfalamalı çeker
// (mevcut kodda bu sınır ~550 satırın sessizce düşmesine yol açıyordu).
export const fetchLessonUsageMap = async (registrations) => {
  const usageMap = {};
  if (!registrations || registrations.length === 0) return usageMap;

  const ids = registrations.map(reg => reg.id);

  // Sunucu tarafı tarih filtresi: en erken paket başlangıcından itibaren çek.
  // Kayıtlardan biri ücretsizse veya start'ı yoksa filtre atlanır — aksi halde
  // ücretsiz öğrencinin kayıt gününden önceki dersleri sunucuda elenir ve
  // istatistik sayaçları sıfırlanırdı (istemci tarafı kapsam yine uygulanır).
  const startDates = registrations
    .map(reg => reg.package_start_date)
    .filter(Boolean)
    .map(date => new Date(date));
  const hasUnscopedRegistration = registrations.some(
    reg => !reg.package_start_date || isFreePackage(reg.package_type)
  );
  const minStart = !hasUnscopedRegistration && startDates.length > 0
    ? new Date(Math.min(...startDates.map(date => date.getTime())))
    : null;

  const PAGE_SIZE = 1000;
  const allRows = [];
  let from = 0;

  for (;;) {
    let query = supabase
      .from('event_participants')
      .select('status, registration_id, events!inner(event_date)')
      .in('registration_id', ids)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);

    if (minStart) {
      query = query.gte('events.event_date', minStart.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    allRows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // Satırları kayda göre grupla
  const rowsByRegistration = {};
  allRows.forEach(row => {
    if (!rowsByRegistration[row.registration_id]) {
      rowsByRegistration[row.registration_id] = [];
    }
    rowsByRegistration[row.registration_id].push(row);
  });

  // Satırı olmayan kayıtlar da haritada yer alır (remaining = total)
  registrations.forEach(registration => {
    usageMap[registration.id] = computeLessonUsage(
      registration,
      rowsByRegistration[registration.id] || []
    );
  });

  return usageMap;
};
