// Takvim rengi ders TİPİNE değil, dersi VEREN KİŞİYE bağlı.
//
// Eskiden renk 'ingilizce' (mor) / 'duyusal' (turuncu) ayrımından geliyordu.
// Okul yalnızca İngilizce ders verdiği için o ayrım anlamını yitirdi; artık
// aynı renkler kişilere karşılık geliyor: mor Yulia'nın, turuncu diğer
// öğretmenin.
//
// Renk TÜRETİLMİYOR, profiles.color kolonunda saklanıyor (teacher_colors
// migration'ı). Sıraya veya kimlik hash'ine dayansaydı üçüncü bir öğretmen
// eklendiğinde mevcut renkler kayabilirdi.
//
// Buradaki liste yalnızca Ayarlar > Öğretmenler ekranındaki seçeneklerdir.
export const TEACHER_COLOR_OPTIONS = [
  '#8b5cf6', // mor    — mevcut "İngilizce" rengi, Yulia
  '#f97316', // turuncu — mevcut "Duyusal" rengi, ikinci öğretmen
  '#0071e3', // mavi
  '#34c759', // yeşil
  '#ff2d55', // pembe
  '#14b8a6', // turkuaz
]

// profiles.color NOT NULL, yani kayıt varsa renk de vardır. Bu değer yalnızca
// kayıt henüz yüklenmediğinde ya da ders sahibi profil listesinde
// bulunamadığında (öğretmen görüşü kendi dışındakileri okuyamaz) kullanılır.
export const DEFAULT_TEACHER_COLOR = '#6b7280'

// Beyaz zemin üzerinde OKUNUR bir tona indirilmiş kart rengi.
//
// Takvim kartındaki "özel ders / ikili ders" rozeti ters çevrilmiş: beyaz
// zemin, kartın renginde yazı. Rengi doğrudan kullanmak yetmiyor — palet
// renklerinin çoğu beyaz üzerinde okunmuyor (ölçüldü: turuncu 2.80,
// yeşil 2.22, turkuaz 2.49; küçük metin eşiği 4.5).
//
// Renk yine KARTTAN türetiliyor, yalnızca kontrast yetene kadar
// siyaha doğru karıştırılıyor. Böylece palete yarın yeni bir renk
// eklense de rozet kendiliğinden okunur kalır.
const luminance = ({ r, g, b }) => {
  const [lr, lg, lb] = [r, g, b]
    .map(v => v / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

const contrastWithWhite = (rgb) => 1.05 / (luminance(rgb) + 0.05)

export const readableOnWhite = (hex, target = 4.5) => {
  const match = /^#([0-9a-f]{6})$/i.exec(hex || '')
  if (!match) return '#374151' // biçim beklenmedikse koyu nötr

  const int = parseInt(match[1], 16)
  const base = { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }

  // Siyaha doğru adım adım karıştır; ilk yeterli tonda dur.
  for (let k = 1; k >= 0; k -= 0.05) {
    const rgb = {
      r: Math.round(base.r * k),
      g: Math.round(base.g * k),
      b: Math.round(base.b * k),
    }
    if (contrastWithWhite(rgb) >= target) {
      return '#' + [rgb.r, rgb.g, rgb.b].map(v => v.toString(16).padStart(2, '0')).join('')
    }
  }
  return '#000000'
}

// Ders kartlarında ve rozetlerde gösterilecek ad + renk.
// teacherId çözülemezse renk nötr gri, ad genel "Викладач" olur — böylece
// kart boş görünmez ve kimin dersi olduğu yanlış gösterilmez.
export const getTeacherDetails = (teacherId, teacherById, language) => {
  const teacher = teacherId ? teacherById[teacherId] : null
  return {
    color: teacher?.color || DEFAULT_TEACHER_COLOR,
    label: teacher?.full_name || (language === 'uk' ? 'Викладач' : 'Teacher'),
  }
}
