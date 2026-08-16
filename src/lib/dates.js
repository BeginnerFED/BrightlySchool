// Tarih dönüşümlerinin tek yeri.

// Bir Date'i "YYYY-MM-DD" olarak, YEREL güne göre yazar.
//
// toISOString() kullanmak yanlış: o değeri UTC'ye çevirir. Kyiv UTC+2/+3
// olduğu için gece yarısıyla sabah 02:00-03:00 arasında seçilen bir gün
// bir ÖNCEKİ güne düşüyordu — kullanıcı seçtiğinden farklı bir tarih
// kaydediliyor, ekranda da öyle görünüyordu, hiçbir uyarı çıkmıyordu.
export const toDateOnly = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d)) return null
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

// Ders sayım döneminin başlangıcını belirler.
//
// Sayım kuralı: bir ders, event_date >= package_start_date ise bu döneme
// sayılır. Takvim bileşeni seçilen günü 00:00 olarak döndürüyor; oysa
// uzatma genelde o günkü ders YAPILDIKTAN sonra giriliyor. 00:00 yazılırsa
// o gün zaten harcanmış ders yeni kotadan İKİNCİ KEZ sayılır.
//
// Bu yüzden:
//   - seçilen gün BUGÜNSE  → şu an (o güne kadar yapılan dersler eski döneme kalır)
//   - seçilen gün İLERİDEYSE → o günün 00:00'ı (o günün tüm dersleri yeni döneme girer)
export const resolvePeriodStart = (selectedDate) => {
  const d = selectedDate instanceof Date ? selectedDate : new Date(selectedDate)
  if (isNaN(d)) return null

  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()

  if (sameDay) return now
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}
