// Ders gruplarının TEK kaynağı.
//
// Eskiden aylık/yaş kırılımıydı ('12-18 міс.', '3+ р.' …) — o liste
// HelloKido'dan miras kalmıştı, orası bebek atölyesiydi. Brightly School
// okul çağındaki çocuklara İngilizce veriyor, doğru kırılım sınıf.
//
// Veritabanındaki CHECK kısıtı (events.valid_age_group) TAM OLARAK bu
// değerleri kabul ediyor. Buraya bir sınıf eklenirse migration da gerekir.
export const GRADE_OPTIONS = [
  '1 клас', '2 клас', '3 клас',
  '4 клас', '5 клас', '6 клас',
  '7 клас', '8 клас', '9 клас',
]

export const DEFAULT_GRADE = '1 клас'
