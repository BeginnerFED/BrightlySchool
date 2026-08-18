// Para biçimlendirmesinin TEK kaynağı.
//
// Eskiden üç ayrı davranış vardı: gelir/gider sayfası her zaman iki ondalık
// basıyordu ("2 400,00"), kayıt kartları ise ham sayı yazıyordu ("2000 ₴") —
// binlik ayracı bile yoktu.
//
// Sembol neden Intl'e bırakılmıyor: style:'currency' ile uk-UA + UAH,
// ICU sürümüne göre bazen "грн" bazen "₴" üretiyor (tarayıcı ile Node'da
// farklı çıktı alındı). Sayıyı biçimlendirip sembolü sabit eklemek,
// ekranda ne göründüğünü öngörülebilir kılıyor.
const SYMBOL = '₴'

// Ondalık YALNIZCA gerçekten varsa. Okulun tutarları tam sayı (2000, 220),
// sürekli ",00" yazmak tabloyu gereksiz kalabalıklaştırıyordu.
const grouped = new Intl.NumberFormat('uk-UA', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

// Grafik ekseni gibi dar yerler için: 18400 -> "18,4 тис."
const compact = new Intl.NumberFormat('uk-UA', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const toNumber = (amount) => {
  const n = Number(amount)
  return Number.isFinite(n) ? n : 0
}

// "2 400 ₴" / "1 234,5 ₴"
export const formatMoney = (amount) => `${grouped.format(toNumber(amount))} ${SYMBOL}`

// Eksen etiketleri: sembolsüz ve kısaltılmış. Grafikteki her değer para
// olduğu için her çentiğe sembol basmak gürültü; tam değer ipucunda zaten var.
export const formatMoneyAxis = (amount) => compact.format(toNumber(amount))
