// Veli telefonundan WhatsApp bağlantısı üretir.
//
// Kayıt formu rakam dışındaki karakterleri siliyor ama BİÇİM DOĞRULAMIYOR.
// Bu yüzden veritabanında üç ayrı biçim bulunabiliyor:
//   "0671234567"      → yerel, baştaki sıfırlı
//   "671234567"       → yerel, sıfırsız
//   "380671234567"    → ülke kodlu
//   "00380671234567"  → uluslararası çıkış kodlu
//
// Eskiden hepsine koşulsuz "380" ekleniyordu; ülke kodlu kayıtlarda
// "380380..." çıkıyor ve WhatsApp bunu geçersiz numara diye reddediyordu.
// Uygulama tarafında hiçbir hata görünmediği için fark edilmiyordu.
//
// Not: Ukrayna mobil kodlarının hiçbiri 38 ile başlamaz (39, 50, 63, 66,
// 67, 68, 73, 9x). Yani "380" ile başlayan bir numarayı ülke kodlu saymak
// güvenli — yerel bir numarayla karışmaz.
export const toWhatsAppNumber = (phone) => {
  let digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''

  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('380')) return digits

  return '380' + digits.replace(/^0+/, '')
}

// Hazır mesajla birlikte tam bağlantı.
export const buildWhatsAppLink = (phone, message) =>
  `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(message)}`
