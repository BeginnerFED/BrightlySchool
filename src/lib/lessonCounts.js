// Satın alınabilecek ders sayılarının TEK kaynağı.
//
// Okul ders paketi değil, doğrudan ders sayısı satıyor: çoğunlukla 8, bazen
// 4, 5 veya 7. Eskiden bu bir paket tipiydi ('hafta-2' gibi) ve tipten kotaya
// çeviren eşleme koddaydı; artık sayının kendisi saklanıyor.
//
// Veritabanı kısıtı 1-20 kabul ediyor. Buradaki liste yalnızca arayüzün
// sunduğu seçenekler — okul 10 ders satmaya başlarsa yalnızca bu dizi
// değişir, migration gerekmez.
export const LESSON_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]

export const DEFAULT_LESSON_COUNT = 8

// Kalan ders bu sayının altına inince ana sayfada uyarı kartında görünür.
// 0 dahil: kotası bitmiş öğrenci kartlardan kaybolmamalı.
export const LOW_LESSON_THRESHOLD = 2

// "8 занять" / "8 lessons" — sayı her dilde aynı, yalnızca birim değişiyor.
//
// Ukraynacada "заняття" (nötr) sayıya göre çekimleniyor: 1-4 için "заняття",
// 5 ve üstü için "занять". Arayüz 1-8 sunduğu için 20 üstü çekim kuralları
// (21, 22... yeniden "заняття"ya döner) burada ele alınmıyor.
export const formatLessonCount = (count, language) => {
  if (count === null || count === undefined) return '—'
  if (language === 'uk') {
    return `${count} ${count >= 1 && count <= 4 ? 'заняття' : 'занять'}`
  }
  return `${count} ${count === 1 ? 'lesson' : 'lessons'}`
}
