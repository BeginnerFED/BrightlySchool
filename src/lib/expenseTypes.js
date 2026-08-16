// Gider kalemlerinin TEK kaynağı.
//
// Önceden bu liste sekiz ayrı yerde tekrar tanımlıydı: pasta grafiği renkleri,
// filtre listesi, filtre etiketleri, seçili filtre etiketi, tablo kartı
// stilleri, grafik ipucu etiketleri ve iki modalın seçenek listesi. Bir kalem
// eklemek sekiz yeri değiştirmek demekti ve zaten ayrışmışlardı — aynı kalem
// pasta grafiğinde yeşil, tabloda turuncuydu; Ukraynaca modda etiket yerine
// Türkçe slug görünüyordu.
//
// value alanı veritabanındaki expense_type değeridir ve CHECK kısıtıyla
// zorlanır. Buraya kalem eklerken/çıkarırken migration da gerekir.
//
// card.bg / card.text Tailwind sınıflarıdır ve BİREBİR yazılmalıdır —
// çalışma anında birleştirilen sınıf adlarını Tailwind taramada göremez.
export const EXPENSE_TYPES = [
  {
    value: 'kira', uk: 'Оренда', en: 'Rent', color: '#0071e3',
    card: { bg: 'from-[#0071e3]/5 to-[#38bdf8]/5', text: 'text-[#0071e3]' }
  },
  {
    value: 'elektrik', uk: 'Електрика', en: 'Electricity', color: '#f59e0b',
    card: { bg: 'from-[#f59e0b]/5 to-[#f97316]/5', text: 'text-[#f59e0b]' }
  },
  {
    value: 'su', uk: 'Вода', en: 'Water', color: '#06b6d4',
    card: { bg: 'from-[#06b6d4]/5 to-[#22d3ee]/5', text: 'text-[#06b6d4]' }
  },
  {
    value: 'maas', uk: 'Зарплата', en: 'Salary', color: '#6366f1',
    card: { bg: 'from-[#6366f1]/5 to-[#818cf8]/5', text: 'text-[#6366f1]' }
  },
  {
    value: 'malzeme', uk: 'Матеріали', en: 'Materials', color: '#f43f5e',
    card: { bg: 'from-[#f43f5e]/5 to-[#fb7185]/5', text: 'text-[#f43f5e]' }
  },
  {
    value: 'mutfak', uk: 'Кухня', en: 'Kitchen', color: '#14b8a6',
    card: { bg: 'from-[#14b8a6]/5 to-[#2dd4bf]/5', text: 'text-[#14b8a6]' }
  },
  {
    value: 'ev-urunleri', uk: 'Господарські товари', en: 'Household products', color: '#8b5cf6',
    card: { bg: 'from-[#8b5cf6]/5 to-[#a78bfa]/5', text: 'text-[#8b5cf6]' }
  },
  {
    value: 'temizlik', uk: 'Прибирання', en: 'Cleaning', color: '#22c55e',
    card: { bg: 'from-[#22c55e]/5 to-[#4ade80]/5', text: 'text-[#22c55e]' }
  },
  {
    value: 'reklam', uk: 'Реклама', en: 'Advertising', color: '#ec4899',
    card: { bg: 'from-[#ec4899]/5 to-[#f472b6]/5', text: 'text-[#ec4899]' }
  },
  {
    value: 'diger', uk: 'Інше', en: 'Other', color: '#6b7280',
    card: { bg: 'from-[#6b7280]/5 to-[#9ca3af]/5', text: 'text-[#6b7280]' }
  },
];

const BY_VALUE = Object.fromEntries(EXPENSE_TYPES.map(type => [type.value, type]));

// Bilinmeyen değerde "Інше" değil, değerin kendisi döner: veritabanında
// listede olmayan bir kalem varsa sessizce "Diğer" gibi görünmesin.
export const getExpenseLabel = (value, language) => {
  const type = BY_VALUE[value];
  if (!type) return value;
  return language === 'uk' ? type.uk : type.en;
};

export const getExpenseColor = (value) => BY_VALUE[value]?.color || '#94a3b8';

export const getExpenseCard = (value) => BY_VALUE[value]?.card || BY_VALUE.diger.card;
