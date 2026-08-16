// Ödeme yöntemlerinin TEK kaynağı.
//
// Etiketler altı ayrı yerde tekrar tanımlıydı ve bazı yerlerde hiç
// tanımlanmamıştı: gelir/gider tablosunda ham veritabanı değeri baş harfi
// büyütülerek basılıyordu ("Nakit", "Kart"), Registration'da 'belirlenmedi'
// Ukraynaca modda olduğu gibi görünüyordu.
//
// value alanı veritabanındaki payment_method değeridir ve CHECK kısıtıyla
// zorlanır (registrations, financial_records, extension_history, expenses).
export const PAYMENT_METHODS = [
  { value: 'banka', uk: 'Банк', en: 'Bank' },
  { value: 'nakit', uk: 'Готівка', en: 'Cash' },
  { value: 'kart', uk: 'Картка', en: 'Card' },
  { value: 'belirlenmedi', uk: 'Не визначено', en: 'Not specified' },
];

const BY_VALUE = Object.fromEntries(PAYMENT_METHODS.map(m => [m.value, m]));

// Bilinmeyen değerde değerin kendisi döner — sessizce yanlış bir etiket
// göstermektense ham değer görünsün, hata fark edilsin.
export const getPaymentMethodLabel = (value, language) => {
  const method = BY_VALUE[value];
  if (!method) return value;
  return language === 'uk' ? method.uk : method.en;
};

// Giderlerde 'belirlenmedi' kullanılmıyor (CHECK kısıtı yalnızca
// banka/nakit/kart kabul ediyor)
export const EXPENSE_PAYMENT_METHODS = PAYMENT_METHODS.filter(
  m => m.value !== 'belirlenmedi'
);
