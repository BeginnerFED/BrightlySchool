import { supabase } from './supabase';

// Bir öğrencinin ders kullanımını getirir. Dönüş: { [registrationId]: usage }
//
// İŞ KURALLARI (okul sahibinin kararı):
// - Kullanılan = SADECE 'attended' (Katıldı) + 'no_show' (Gelmedi).
//   'scheduled' henüz harcanmamış hak; 'makeup' telafi, hak yakmaz;
//   'postponed' ve 'cancelled' de yakmaz.
// - Sayım güncel döneme bakar: yalnızca dersin tarihi package_start_date ve
//   SONRASI olan satırlar sayılır. Uzatma yapılınca başlangıç tarihi ileri
//   alınır, sayaç böylece sıfırlanır.
// - Toplam hak, kaydın lesson_count değeridir.
//
// Sayım veritabanındaki get_lesson_usage() RPC'sine yaptırılır. İki sebebi var:
//
// 1) DOĞRULUK. Öğretmen yalnızca kendi derslerini görebilir. Sayımı istemcide
//    yapsaydık öğrencinin BAŞKA öğretmenin dersinde yaktığı haklar sorguya hiç
//    gelmez, öğretmen kalan dersi olduğundan fazla görürdü. RPC RLS'i baypas
//    edip doğru sayar ama yalnızca sayı döner.
// 2) Toplama sunucuda yapıldığı için PostgREST'in 1000 satır sınırı sorun değil.
//
// DİKKAT: yukarıdaki kurallar RPC'nin içinde de yazılı. Biri değişirse
// diğeri de değişmek zorunda.
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
    const total = registration.lesson_count ?? 0;

    // RPC'nin döndürmediği kayıt = çağıranın görme hakkı yok. Sayaçlar
    // sıfırlanır ki çağıran taraf undefined ile karşılaşmasın; ama bu durumda
    // "kalan = tam kota" görünür, yani görülemeyen öğrenci dolu kota gibi
    // okunur. Kotaya dayanıp karar veren yerler bunu bilmeli.
    const visible = Boolean(row);
    const counts = {
      attended: row?.attended ?? 0,
      noShow: row?.no_show ?? 0,
      makeup: row?.makeup ?? 0,
      scheduled: row?.scheduled ?? 0,
      postponed: row?.postponed ?? 0
    };
    const used = counts.attended + counts.noShow;

    usageMap[registration.id] = {
      visible,
      total,
      used,
      remaining: Math.max(total - used, 0),
      ...counts
    };
  });

  return usageMap;
};
