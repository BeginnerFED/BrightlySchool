import { useState, useEffect, useMemo, useRef } from 'react';
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { format, startOfWeek, addDays, addWeeks, parseISO, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';

// Haftalık konu planlayıcısı: ay takvimi görünümünde her haftanın üzerinde o haftanın
// konusu yazılır/düzenlenir; değişiklikler tek seferde weekly_themes tablosuna kaydedilir.
// Konular etkinliklerden tamamen bağımsızdır (hafta kopyalama konulara dokunmaz).
export default function WeeklyThemesModal({ isOpen, onClose, onSaved, focusWeekStart }) {
  const { language } = useLanguage();
  const locale = language === 'tr' ? tr : enUS;

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  // themes: sunucudaki kayıtlı değerler (fetch'lerde aralık boşaltılıp merge edilir)
  // drafts: SADECE kullanıcının dokunduğu haftalar (ay değişince kaybolmaz)
  const [themes, setThemes] = useState({});
  const [drafts, setDrafts] = useState({});
  const [editingWeekKey, setEditingWeekKey] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedRangeKey, setLoadedRangeKey] = useState(null); // Başarıyla yüklenen aralık (hata durumunda ızgara gizlenir)
  const [retryCounter, setRetryCounter] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [error, setError] = useState(null);
  const flashTimerRef = useRef(null);

  // Ay kısayolu (ay adına tıklayınca açılan seçici)
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const monthPickerRef = useRef(null);
  const monthTitleRef = useRef(null);

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const currentWeekKey = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Görünen ayın takvim ızgarası: ayın ilk gününü içeren haftadan son gününü içeren haftaya
  const weeks = useMemo(() => {
    const firstMonday = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const lastMonday = startOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    const list = [];
    let monday = firstMonday;
    while (monday <= lastMonday) {
      list.push({
        key: format(monday, 'yyyy-MM-dd'),
        days: Array.from({ length: 7 }, (_, i) => addDays(monday, i))
      });
      monday = addWeeks(monday, 1);
    }
    return list;
  }, [viewMonth]);

  const rangeKey = weeks.length > 0 ? `${weeks[0].key}_${weeks[weeks.length - 1].key}` : '';

  // Bir haftanın ekranda görünen değeri
  const valueOf = (key) => (drafts[key] !== undefined ? drafts[key] : (themes[key] || ''));

  // Kaydedilmemiş değişiklikler (tüm aylar dahil — drafts seyrek tutulur)
  const dirtyKeys = useMemo(() => {
    return Object.keys(drafts).filter(key => drafts[key].trim() !== (themes[key] || '').trim());
  }, [themes, drafts]);

  const hasUnsavedChanges = dirtyKeys.length > 0;
  const themedWeekCount = weeks.filter(week => valueOf(week.key).trim()).length;

  // Modal açılınca sıfırla; odak haftası varsa onun ayına git ve o haftayı düzenlemeye aç,
  // yoksa içinde bulunduğumuz ayı göster
  useEffect(() => {
    if (!isOpen) return;
    setDrafts({});
    setError(null);
    setSaveFlash(false);
    clearTimeout(flashTimerRef.current);
    setLoadedRangeKey(null);
    setIsMonthPickerOpen(false);
    if (focusWeekStart) {
      // Haftanın ait olduğu ay = perşembesinin ayı
      setViewMonth(startOfMonth(addDays(parseISO(focusWeekStart), 3)));
      setEditingWeekKey(focusWeekStart);
    } else {
      setViewMonth(startOfMonth(new Date()));
      setEditingWeekKey(null);
    }
  }, [isOpen, focusWeekStart]);

  // Bileşen kaldırılırken bekleyen flash zamanlayıcısını temizle
  useEffect(() => () => clearTimeout(flashTimerRef.current), []);

  // Ay seçici dışına tıklanınca kapat (PublicCalendar'daki filtre paneli deseni)
  useEffect(() => {
    if (!isMonthPickerOpen) return;
    const handleClickOutside = (event) => {
      if (
        monthPickerRef.current &&
        !monthPickerRef.current.contains(event.target) &&
        monthTitleRef.current &&
        !monthTitleRef.current.contains(event.target)
      ) {
        setIsMonthPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMonthPickerOpen]);

  // Görünen aralığın kayıtlı konularını getir (drafts'a asla dokunmadan themes'e merge et)
  useEffect(() => {
    if (!isOpen || weeks.length === 0) return;

    let cancelled = false;
    const fetchedRangeKey = `${weeks[0].key}_${weeks[weeks.length - 1].key}`;
    const fetchThemes = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('weekly_themes')
          .select('week_start, theme')
          .gte('week_start', weeks[0].key)
          .lte('week_start', weeks[weeks.length - 1].key);

        if (fetchError) throw fetchError;
        if (cancelled) return;

        const fetched = {};
        (data || []).forEach(row => {
          fetched[row.week_start] = row.theme;
        });
        // Aralıktaki eski anahtarları düşür, sonra sunucu satırlarını yaz —
        // böylece başka bir oturumda silinen konular ekranda hayalet olarak kalmaz
        setThemes(prev => {
          const next = { ...prev };
          weeks.forEach(week => {
            delete next[week.key];
          });
          Object.assign(next, fetched);
          return next;
        });
        setLoadedRangeKey(fetchedRangeKey);
      } catch (err) {
        console.error('Haftalık konular getirilirken hata:', err);
        if (!cancelled) {
          setError(language === 'tr' ? 'Konular yüklenirken bir hata oluştu' : 'An error occurred while loading themes');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchThemes();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, weeks, retryCounter]);

  // Kaydedilmemiş değişiklik varsa kapatmadan önce onay iste
  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        language === 'tr'
          ? 'Kaydedilmemiş değişiklikler var. Yine de kapatmak istiyor musunuz?'
          : 'You have unsaved changes. Close anyway?'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  const navigateMonth = (delta) => {
    setEditingWeekKey(null);
    setViewMonth(prev => addMonths(prev, delta));
  };

  const goToCurrentMonth = () => {
    setEditingWeekKey(null);
    setIsMonthPickerOpen(false);
    setViewMonth(startOfMonth(new Date()));
  };

  const toggleMonthPicker = () => {
    if (!isMonthPickerOpen) setPickerYear(viewMonth.getFullYear());
    setIsMonthPickerOpen(open => !open);
  };

  const selectMonth = (monthIndex) => {
    setEditingWeekKey(null);
    setViewMonth(new Date(pickerYear, monthIndex, 1));
    setIsMonthPickerOpen(false);
  };

  const handleDraftChange = (key, value) => {
    setSaveFlash(false);
    setDrafts(prev => ({ ...prev, [key]: value }));
  };

  // Esc: bu haftanın taslağını at, kayıtlı değere geri dön
  const cancelEdit = (key) => {
    setDrafts(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setEditingWeekKey(null);
  };

  // Değişiklikleri kaydet: dolu olanlar upsert edilir, boşaltılan mevcut kayıtlar silinir
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const upserts = [];
      const deletions = [];

      dirtyKeys.forEach(key => {
        const nextValue = drafts[key].trim();
        if (nextValue) {
          upserts.push({ week_start: key, theme: nextValue });
        } else if (themes[key] !== undefined) {
          deletions.push(key);
        }
      });

      if (upserts.length > 0) {
        const { error: upsertError } = await supabase
          .from('weekly_themes')
          .upsert(upserts, { onConflict: 'week_start' });
        if (upsertError) throw upsertError;
      }

      if (deletions.length > 0) {
        const { error: deleteError } = await supabase
          .from('weekly_themes')
          .delete()
          .in('week_start', deletions);
        if (deleteError) throw deleteError;
      }

      // Yerel durumu kaydedilen değerlerle eşitle
      setThemes(prev => {
        const next = { ...prev };
        upserts.forEach(row => {
          next[row.week_start] = row.theme;
        });
        deletions.forEach(key => {
          delete next[key];
        });
        return next;
      });
      setDrafts({});

      clearTimeout(flashTimerRef.current);
      setSaveFlash(true);
      flashTimerRef.current = setTimeout(() => setSaveFlash(false), 2000);

      if (onSaved) onSaved();
    } catch (err) {
      console.error('Haftalık konular kaydedilirken hata:', err);
      setError(language === 'tr' ? 'Konular kaydedilirken bir hata oluştu' : 'An error occurred while saving themes');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const isGridReady = !isLoading && loadedRangeKey === rangeKey;

  return (
    <>
      {/* Overlay (takvimin loading overlay'i z-50 olduğu için z-50) */}
      <div
        className="fixed inset-0 bg-black bg-opacity-25 z-50 flex items-center justify-center"
        onClick={handleClose}
      >
        {/* Modal */}
        <div
          className="bg-white dark:bg-[#121621] rounded-2xl shadow-xl w-full max-w-xl mx-4 overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#d2d2d7] dark:border-[#2a3241]">
            <div>
              <h2 className="font-medium text-lg text-[#1d1d1f] dark:text-white leading-tight">
                {language === 'tr' ? 'Haftalık Konular' : 'Weekly Themes'}
              </h2>
              <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                {language === 'tr'
                  ? 'Bir haftanın konusunu yazmak için üzerine tıklayın'
                  : 'Click on a week to set its theme'}
              </p>
            </div>
            <button
              onClick={handleClose}
              aria-label={language === 'tr' ? 'Kapat' : 'Close'}
              className="text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#86868b] dark:hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Ay Navigasyonu */}
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => navigateMonth(-1)}
                aria-label={language === 'tr' ? 'Önceki ay' : 'Previous month'}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#d2d2d7] dark:border-[#2a3241] text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:border-[#0071e3] dark:hover:border-[#0071e3] transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigateMonth(1)}
                aria-label={language === 'tr' ? 'Sonraki ay' : 'Next month'}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#d2d2d7] dark:border-[#2a3241] text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:border-[#0071e3] dark:hover:border-[#0071e3] transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="relative text-center">
              <button
                ref={monthTitleRef}
                onClick={toggleMonthPicker}
                className="inline-flex items-center gap-1 text-base font-semibold text-[#1d1d1f] dark:text-white leading-tight capitalize hover:text-[#0071e3] dark:hover:text-[#0071e3] transition-colors"
              >
                {format(viewMonth, 'LLLL yyyy', { locale })}
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 text-[#a1a1a6] dark:text-[#6e6e73] transition-transform duration-200 ${
                    isMonthPickerOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isGridReady && (
                <div className="text-[11px] text-[#6e6e73] dark:text-[#86868b]">
                  {language === 'tr'
                    ? `${themedWeekCount}/${weeks.length} hafta planlandı`
                    : `${themedWeekCount}/${weeks.length} weeks planned`}
                </div>
              )}

              {/* Ay Seçici */}
              {isMonthPickerOpen && (
                <div
                  ref={monthPickerRef}
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 w-64 bg-white dark:bg-[#121621] border border-[#d2d2d7] dark:border-[#2a3241] rounded-xl shadow-xl p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => setPickerYear(y => y - 1)}
                      aria-label={language === 'tr' ? 'Önceki yıl' : 'Previous year'}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1d2535] transition-colors"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                      {pickerYear}
                    </span>
                    <button
                      onClick={() => setPickerYear(y => y + 1)}
                      aria-label={language === 'tr' ? 'Sonraki yıl' : 'Next year'}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1d2535] transition-colors"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {Array.from({ length: 12 }, (_, monthIndex) => {
                      const isSelected =
                        viewMonth.getFullYear() === pickerYear && viewMonth.getMonth() === monthIndex;
                      const now = new Date();
                      const isCurrentMonth =
                        now.getFullYear() === pickerYear && now.getMonth() === monthIndex;
                      return (
                        <button
                          key={monthIndex}
                          onClick={() => selectMonth(monthIndex)}
                          className={`h-9 rounded-lg text-sm capitalize transition-colors ${
                            isSelected
                              ? 'bg-[#0071e3] text-white font-medium'
                              : isCurrentMonth
                                ? 'text-[#0071e3] font-medium hover:bg-gray-100 dark:hover:bg-[#1d2535]'
                                : 'text-[#1d1d1f] dark:text-white hover:bg-gray-100 dark:hover:bg-[#1d2535]'
                          }`}
                        >
                          {format(new Date(pickerYear, monthIndex, 1), 'LLL', { locale })}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={goToCurrentMonth}
              className="h-8 px-3 rounded-lg border border-[#d2d2d7] dark:border-[#2a3241] text-sm font-medium text-[#1d1d1f] dark:text-white hover:border-[#0071e3] dark:hover:border-[#0071e3] transition-colors"
            >
              {language === 'tr' ? 'Bugün' : 'Today'}
            </button>
          </div>

          {/* Ay Takvimi */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {!isGridReady && !isLoading ? (
              // Aralık yüklenemedi: kayıtlı konular görünmeden inputları göstermek
              // mevcut konuların fark edilmeden üzerine yazılmasına yol açar
              <div className="py-16 flex flex-col items-center gap-3">
                <ExclamationCircleIcon className="w-8 h-8 text-red-500" />
                <span className="text-sm text-[#6e6e73] dark:text-[#86868b] text-center">
                  {language === 'tr' ? 'Konular yüklenirken bir hata oluştu' : 'An error occurred while loading themes'}
                </span>
                <button
                  onClick={() => setRetryCounter(count => count + 1)}
                  className="px-4 py-2 bg-[#1d1d1f] dark:bg-[#0071e3] text-white text-sm font-medium rounded-lg hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none transition-all duration-200"
                >
                  {language === 'tr' ? 'Tekrar Dene' : 'Retry'}
                </button>
              </div>
            ) : (
              <div className="border border-[#d2d2d7] dark:border-[#2a3241] rounded-xl overflow-hidden">
                {/* Gün Başlıkları */}
                <div className="grid grid-cols-7 border-b border-[#d2d2d7] dark:border-[#2a3241] bg-gray-50 dark:bg-[#1d2535]/40">
                  {weeks[0].days.map(day => (
                    <div
                      key={day.toISOString()}
                      className="h-8 flex items-center justify-center text-[11px] font-medium text-[#6e6e73] dark:text-[#86868b] capitalize"
                    >
                      {format(day, 'EEE', { locale })}
                    </div>
                  ))}
                </div>

                {/* Haftalar */}
                {weeks.map(week => {
                  const isCurrentWeek = week.key === currentWeekKey;
                  const isEditing = editingWeekKey === week.key;
                  const value = valueOf(week.key);
                  const isDirty = dirtyKeys.includes(week.key);

                  return (
                    <div
                      key={week.key}
                      className={`border-b border-[#d2d2d7] dark:border-[#2a3241] last:border-b-0 ${
                        isCurrentWeek ? 'bg-blue-50/40 dark:bg-[#0071e3]/5' : ''
                      }`}
                    >
                      {/* Haftanın Konusu — yüklenene dek kapalı, hazır olunca yumuşakça açılır */}
                      <div
                        className={`px-1.5 overflow-hidden transition-all duration-300 ease-out ${
                          isGridReady ? 'h-[38px] pt-1.5 opacity-100' : 'h-0 pt-0 opacity-0'
                        }`}
                      >
                        {!isGridReady ? null : isEditing ? (
                          <div className="relative">
                            <input
                              type="text"
                              autoFocus
                              value={value}
                              onChange={(e) => handleDraftChange(week.key, e.target.value)}
                              onBlur={() => setEditingWeekKey(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingWeekKey(null);
                                else if (e.key === 'Escape') cancelEdit(week.key);
                              }}
                              maxLength={80}
                              placeholder={language === 'tr' ? 'Haftanın konusu' : 'Theme for this week'}
                              className="w-full h-8 pl-2.5 pr-8 rounded-lg border border-[#0071e3] bg-white dark:bg-[#121621] text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#a1a1a6] dark:placeholder:text-[#6e6e73] focus:ring-2 focus:ring-[#0071e3]/25 outline-none"
                            />
                            {value.length > 0 && (
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleDraftChange(week.key, '')}
                                aria-label={language === 'tr' ? 'Temizle' : 'Clear'}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md bg-gray-100 dark:bg-[#252d3f] border border-[#e5e5ea] dark:border-[#2a3241] text-[#8e8e93] dark:text-[#86868b] hover:bg-gray-200 dark:hover:bg-[#2f3950] hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
                              >
                                <XMarkIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`group h-8 rounded-lg border flex items-center transition-colors ${
                              value.trim()
                                ? 'bg-gray-50 dark:bg-[#1d2535]/60 border-[#e5e5ea] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                                : 'border-dashed border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setEditingWeekKey(week.key)}
                              className="flex-1 h-full px-2.5 flex items-center gap-2 text-left min-w-0"
                            >
                              {value.trim() ? (
                                <span className="text-sm font-medium text-[#1d1d1f] dark:text-white truncate">
                                  {value}
                                </span>
                              ) : (
                                <span className="text-sm text-[#a1a1a6] dark:text-[#6e6e73]">
                                  {language === 'tr' ? '+ Konu ekle' : '+ Add theme'}
                                </span>
                              )}
                              {isDirty && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                                  title={language === 'tr' ? 'Kaydedilmemiş değişiklik' : 'Unsaved change'}
                                ></span>
                              )}
                            </button>
                            {value.trim() && (
                              <button
                                type="button"
                                onClick={() => handleDraftChange(week.key, '')}
                                aria-label={language === 'tr' ? 'Konuyu sil' : 'Remove theme'}
                                title={language === 'tr' ? 'Konuyu sil' : 'Remove theme'}
                                className="mr-1.5 w-5 h-5 flex items-center justify-center rounded-md bg-gray-100 dark:bg-[#252d3f] border border-[#e5e5ea] dark:border-[#2a3241] text-[#8e8e93] dark:text-[#86868b] hover:bg-gray-200 dark:hover:bg-[#2f3950] hover:text-[#1d1d1f] dark:hover:text-white shrink-0 opacity-0 group-hover:opacity-100 transition duration-150"
                              >
                                <XMarkIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Gün Numaraları */}
                      <div className="grid grid-cols-7 px-1.5 py-1.5">
                        {week.days.map(day => {
                          const inMonth = day.getMonth() === viewMonth.getMonth();
                          const isToday = format(day, 'yyyy-MM-dd') === todayKey;
                          return (
                            <div key={day.toISOString()} className="h-8 flex items-center justify-center">
                              <span
                                className={`w-7 h-7 flex items-center justify-center rounded-full text-[13px] ${
                                  isToday
                                    ? 'bg-[#0071e3] text-white font-semibold'
                                    : inMonth
                                      ? 'text-[#1d1d1f] dark:text-white'
                                      : 'text-[#c7c7cc] dark:text-[#3d4657]'
                                }`}
                              >
                                {format(day, 'd')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#d2d2d7] dark:border-[#2a3241] flex items-center justify-between gap-3">
            <div className="min-w-0">
              {error && isGridReady ? (
                <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                  <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{error}</span>
                </div>
              ) : hasUnsavedChanges ? (
                <span className="text-xs text-[#6e6e73] dark:text-[#86868b]">
                  {language === 'tr'
                    ? `${dirtyKeys.length} kaydedilmemiş değişiklik`
                    : `${dirtyKeys.length} unsaved ${dirtyKeys.length === 1 ? 'change' : 'changes'}`}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleClose}
                disabled={isSaving}
                className="px-4 py-2 text-[#1d1d1f] dark:text-white bg-transparent border border-[#d2d2d7] dark:border-[#2a3241] text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-[#1d2535]/70 focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {language === 'tr' ? 'Kapat' : 'Close'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
                className={`px-4 py-2 text-white text-sm font-medium rounded-lg focus:outline-none transition-all duration-200 flex items-center gap-2 disabled:cursor-not-allowed ${
                  saveFlash
                    ? 'bg-green-600'
                    : 'bg-[#1d1d1f] dark:bg-[#0071e3] hover:bg-black dark:hover:bg-[#0077ed] disabled:opacity-50'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{language === 'tr' ? 'Kaydediliyor...' : 'Saving...'}</span>
                  </>
                ) : saveFlash ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    <span>{language === 'tr' ? 'Kaydedildi' : 'Saved'}</span>
                  </>
                ) : (
                  <span>{language === 'tr' ? 'Kaydet' : 'Save'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
