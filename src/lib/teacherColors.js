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
