// Ders kapasitesinin TEK kaynağı.
//
// Okul çoğunlukla 4 kişilik gruplarla çalışıyor. Talebe göre 1 kişilik
// (özel ders) veya 2 kişilik daha küçük gruplar da açılıyor — ücreti farklı
// olduğu için bu bir tercih, teknik bir sınır değil.
//
// Veritabanı kısıtı 1-20 kabul ediyor (events.valid_max_capacity).
// Buradaki liste yalnızca arayüzün sunduğu seçenekler: okul 8 kişilik grup
// açmaya başlarsa yalnızca bu dizi değişir, migration gerekmez.
export const CAPACITY_OPTIONS = [1, 2, 3, 4, 5, 6]

export const DEFAULT_CAPACITY = 4

// "4 місця" / "4 seats" — 1 kişilik ders "özel ders" olarak adlandırılıyor,
// çünkü okul için anlamı kontenjan değil ders türü.
export const formatCapacity = (capacity, language) => {
  if (capacity === 1) {
    return language === 'uk' ? 'Індивідуальне' : 'Private'
  }
  return language === 'uk' ? `${capacity} місця` : `${capacity} seats`
}
