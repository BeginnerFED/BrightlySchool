import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, eachDayOfInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon, AdjustmentsHorizontalIcon, MoonIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Kart gölgesi (tek yerden yönetilsin)
const CARD_SHADOW = 'shadow-[0_1px_2px_rgba(23,19,31,0.04),0_8px_24px_-8px_rgba(23,19,31,0.1)]';

// Filtrede gösterilen yaş grupları (5+ Yaş bilinçli olarak filtre dışı)
const AGE_GROUPS = ['12-18 Aylık', '18-24 Aylık', '24-36 Aylık', '3+ Yaş', '4+ Yaş'];
const EVENT_TYPES = [
  { value: 'ingilizce', label: 'İngilizce', color: '#8b5cf6' },
  { value: 'duyusal', label: 'Duyusal', color: '#f97316' },
  { value: 'ozel', label: 'Özel', color: '#059669' }
];

const PublicCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [weekTheme, setWeekTheme] = useState(null);
  const [themeWeekLoaded, setThemeWeekLoaded] = useState(null); // weekTheme'in ait olduğu haftanın anahtarı
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [filters, setFilters] = useState({
    ageGroup: '',
    eventType: ''
  });

  const latestThemeWeekRef = useRef(null); // Geç gelen konu yanıtının günceli ezmemesi için

  // Bottom sheet'i sürükleyerek kapatma (Apple usulü: sheet'in her yerinden).
  // 8px'lik dikey hareketten sonra sürükleme devralınır — düz dokunuşlar tıklama olarak kalır.
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const sheetDragStartRef = useRef(null);
  const sheetDragCapturedRef = useRef(false);

  const handleSheetPointerDown = (e) => {
    sheetDragStartRef.current = e.clientY;
    sheetDragCapturedRef.current = false;
  };

  const handleSheetPointerMove = (e) => {
    if (sheetDragStartRef.current === null) return;
    const delta = e.clientY - sheetDragStartRef.current;
    if (!sheetDragCapturedRef.current) {
      if (delta > 8) {
        sheetDragCapturedRef.current = true;
        setIsSheetDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      } else {
        return;
      }
    }
    setSheetDragY(Math.max(0, delta - 8));
  };

  const handleSheetPointerEnd = () => {
    if (sheetDragStartRef.current === null) return;
    const shouldClose = sheetDragCapturedRef.current && sheetDragY > 90;
    sheetDragStartRef.current = null;
    sheetDragCapturedRef.current = false;
    setIsSheetDragging(false);
    setSheetDragY(0);
    if (shouldClose) setIsFiltersVisible(false);
  };

  // Hafta değişimi "sayfa çevirme" animasyonu: gün şeridi kayarak çıkar,
  // yeni hafta karşı taraftan süzülerek gelir. Oklar ve kaydırma aynı animasyonu kullanır.
  const [stripAnim, setStripAnim] = useState({ x: '0px', animate: false });
  const [lastNavDirection, setLastNavDirection] = useState(0); // 1 = sonraki, -1 = önceki, 0 = ilk yükleme
  const [themeExitDir, setThemeExitDir] = useState(0); // Eski konu kartının çıkış yönü (hafta dönerken)
  const weekAnimatingRef = useRef(false);
  const stripDragRef = useRef(null);

  const changeWeek = (direction) => { // 1 = sonraki hafta, -1 = önceki hafta
    if (weekAnimatingRef.current) return;
    weekAnimatingRef.current = true;
    setLastNavDirection(direction);
    setThemeExitDir(direction); // Eski konu kartı da şeritle aynı yönde kayarak çıksın
    setStripAnim({ x: direction === 1 ? '-100%' : '100%', animate: true });
    setTimeout(() => {
      navigateWeek(direction === 1 ? 'next' : 'prev');
      // Yeni hafta artık ortadaki panel — şerit animasyonsuz merkeze döner
      setStripAnim({ x: '0px', animate: false });
      setThemeExitDir(0);
      weekAnimatingRef.current = false;
    }, 200);
  };

  // Şeridi parmakla sürükleme: 10px'lik yatay hareketten sonra devralınır,
  // dikey niyet algılanırsa bırakılır (sayfa kaydırması bozulmaz), dokunuşlar tıklama kalır.
  const handleStripPointerDown = (e) => {
    if (weekAnimatingRef.current) return;
    stripDragRef.current = { startX: e.clientX, startY: e.clientY, captured: false };
  };

  const handleStripPointerMove = (e) => {
    const drag = stripDragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.captured) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        drag.captured = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      } else if (Math.abs(dy) > 10) {
        stripDragRef.current = null;
        return;
      } else {
        return;
      }
    }
    setStripAnim({ x: `${dx}px`, animate: false });
  };

  const handleStripPointerEnd = (e) => {
    const drag = stripDragRef.current;
    stripDragRef.current = null;
    if (!drag || !drag.captured) return;
    const dx = e.clientX - drag.startX;
    if (dx < -60) {
      changeWeek(1);
    } else if (dx > 60) {
      changeWeek(-1);
    } else {
      setStripAnim({ x: '0px', animate: true });
    }
  };

  // Etkinlik türüne göre renk ve etiket (admin takvimiyle aynı renkler)
  const getEventTypeDetails = (type) => {
    const found = EVENT_TYPES.find(t => t.value === type);
    return found || { value: type, label: type, color: '#6b7280' };
  };

  useEffect(() => {
    fetchEvents();
  }, [currentWeek, filters]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

      // Haftanın konusu SADECE içinde bulunduğumuz hafta için gösterilir.
      // Diğer haftalarda sorgu hiç atılmaz — sadece arayüzde gizlemek yetmezdi,
      // veri yine ağ isteğinde gider ve dışarıdan okunabilirdi.
      const themeWeekKey = format(weekStart, 'yyyy-MM-dd');
      const currentWeekKey = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const isCurrentWeek = themeWeekKey === currentWeekKey;
      latestThemeWeekRef.current = themeWeekKey;

      // Promise.resolve sorguyu hemen başlatır; reject etmez, hata sonuç objesinde döner
      // — başarısız olsa da takvim çalışmaya devam eder
      const themePromise = isCurrentWeek
        ? Promise.resolve(
            supabase
              .from('weekly_themes')
              .select('theme')
              .eq('week_start', themeWeekKey)
              .maybeSingle()
          ).catch(err => ({ data: null, error: err }))
        : Promise.resolve({ data: null, error: null });

      let query = supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .gte('event_date', weekStart.toISOString())
        .lte('event_date', weekEnd.toISOString())
        .order('event_date', { ascending: true });

      if (filters.ageGroup) {
        query = query.eq('age_group', filters.ageGroup);
      }
      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Her etkinlik için aktif katılımcı sayısını getir
      const eventsWithActiveCapacity = await Promise.all(data.map(async (event) => {
        const { data: participants, error: participantsError } = await supabase
          .from('event_participants')
          .select('status')
          .eq('event_id', event.id);

        if (participantsError) throw participantsError;

        // Aktif statüdeki katılımcıları say (scheduled, makeup, attended)
        const activeCount = participants ?
          participants.filter(p => p.status === 'scheduled' || p.status === 'makeup' || p.status === 'attended').length :
          0;

        return {
          ...event,
          active_capacity: activeCount
        };
      }));

      setEvents(eventsWithActiveCapacity);

      // Konu yanıtını işle (yalnızca hâlâ görüntülenen haftaya aitse)
      const { data: themeRow, error: themeError } = await themePromise;
      if (latestThemeWeekRef.current === themeWeekKey) {
        if (themeError) {
          console.error('Haftanın konusu getirilirken hata:', themeError);
          setWeekTheme(null);
        } else {
          setWeekTheme(themeRow ? themeRow.theme : null);
        }
        setThemeWeekLoaded(themeWeekKey);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Hafta değişince: yeni hafta bugünü içeriyorsa bugünü seç;
  // değilse salıyı seç (pazartesi atölye kapalı, kullanıcıyı kapalı güne indirme)
  const navigateWeek = (direction) => {
    const newWeek = direction === 'next' ? addWeeks(currentWeek, 1) : subWeeks(currentWeek, 1);
    setCurrentWeek(newWeek);

    const weekStart = startOfWeek(newWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(newWeek, { weekStartsOn: 1 });
    const today = new Date();
    setSelectedDay(
      today >= weekStart && today <= weekEnd
        ? format(today, 'yyyy-MM-dd')
        : format(addDays(weekStart, 1), 'yyyy-MM-dd')
    );
  };

  // Haftanın günleri
  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek, { weekStartsOn: 1 }),
    end: endOfWeek(currentWeek, { weekStartsOn: 1 })
  });

  const getEventsForDay = (date) => {
    return events.filter(event =>
      format(new Date(event.event_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const selectedDate = weekDays.find(day => format(day, 'yyyy-MM-dd') === selectedDay) || weekDays[0];
  const selectedDayEvents = getEventsForDay(selectedDate);
  const isSelectedToday = format(selectedDate, 'yyyy-MM-dd') === todayKey;
  // Haftanın konusu yalnızca içinde bulunulan haftada gösterilir (diğer haftalarda
  // sorgu bile atılmıyor) — bu yüzden iskelet de sadece o haftada anlamlı
  const viewedWeekKey = format(weekDays[0], 'yyyy-MM-dd');
  const isViewingCurrentWeek = viewedWeekKey === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const hasActiveFilters = Boolean(filters.ageGroup || filters.eventType);
  const activeFilterCount = (filters.ageGroup ? 1 : 0) + (filters.eventType ? 1 : 0);

  // Hafta iki aya yayılıyorsa "Ağu – Eylül 2026" gibi göster
  const monthLabel =
    weekDays[0].getMonth() === weekDays[6].getMonth()
      ? format(weekDays[0], 'MMMM yyyy', { locale: tr })
      : `${format(weekDays[0], 'MMM', { locale: tr })} – ${format(weekDays[6], 'MMMM yyyy', { locale: tr })}`;

  // Carousel panelleri: yan haftaların günleri fetch beklemeden gerçek içerik olarak çizilir
  const prevWeekDays = weekDays.map(day => addWeeks(day, -1));
  const nextWeekDays = weekDays.map(day => addWeeks(day, 1));

  // Gün hapı — üç haftalık şeritte ortak; yan panellerde etkileşim kapalı
  const renderDayPill = (day, interactive) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const isSelected = interactive && dayKey === selectedDay;
    const isToday = dayKey === todayKey;
    const dayHasEvents = interactive && !loading && getEventsForDay(day).length > 0;

    return (
      <button
        key={dayKey}
        onClick={() => interactive && setSelectedDay(dayKey)}
        tabIndex={interactive ? 0 : -1}
        aria-label={format(day, 'd MMMM EEEE', { locale: tr })}
        aria-pressed={isSelected}
        className={`flex flex-col items-center rounded-[18px] py-3 transition-all duration-200 active:scale-95 ${
          isSelected
            ? 'bg-sky-600 shadow-[0_8px_20px_-6px_rgba(2,132,199,0.55)]'
            : isToday
              ? 'bg-sky-50 hover:bg-sky-100'
              : 'hover:bg-zinc-50'
        }`}
      >
        <span className={`text-[12px] font-semibold capitalize ${
          isSelected ? 'text-white/90' : 'text-zinc-500'
        }`}>
          {format(day, 'EEEEEE', { locale: tr })}
        </span>
        <span className={`text-[17px] font-semibold mt-0.5 ${
          isSelected ? 'text-white' : isToday ? 'text-sky-700' : 'text-zinc-900'
        }`}>
          {format(day, 'd')}
        </span>
        <span className={`w-1 h-1 rounded-full mt-1.5 transition-colors ${
          isSelected
            ? (dayHasEvents ? 'bg-white/90' : 'bg-transparent')
            : (dayHasEvents ? 'bg-pink-500' : 'bg-transparent')
        }`}></span>
      </button>
    );
  };

  // Sayfa web sitesinde iframe ile gösteriliyor — iframe içindeyken logo başlığını gizle
  const isEmbedded = window.self !== window.top;

  return (
    <div className="min-h-screen w-full bg-[#f5f7fa] font-['Euclid_Circular_A'] text-zinc-900">
      {/* Mikro animasyonlar */}
      <style>{`
        @keyframes pcFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
        .pc-fade-up { animation: pcFadeUp .3s ease-out both; }
        @keyframes pcSlideInRight {
          from { opacity: 0; transform: translateX(28px); }
          to { opacity: 1; transform: none; }
        }
        .pc-slide-right { animation: pcSlideInRight .3s ease-out both; }
        @keyframes pcSlideInLeft {
          from { opacity: 0; transform: translateX(-28px); }
          to { opacity: 1; transform: none; }
        }
        .pc-slide-left { animation: pcSlideInLeft .3s ease-out both; }
        @keyframes pcSlideOutLeft {
          to { opacity: 0; transform: translateX(-28px); }
        }
        .pc-slide-out-left { animation: pcSlideOutLeft .2s ease-in both; }
        @keyframes pcSlideOutRight {
          to { opacity: 0; transform: translateX(28px); }
        }
        .pc-slide-out-right { animation: pcSlideOutRight .2s ease-in both; }
        @keyframes pcFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .pc-fade-in { animation: pcFadeIn .25s ease-out both; }
        .pc-skeleton {
          position: relative;
          overflow: hidden;
          background-color: #f2f4f6;
        }
        .pc-skeleton::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent);
          animation: pcShimmer 1.6s ease-in-out infinite;
        }
        @keyframes pcShimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes pcShine {
          0%, 55% { transform: translateX(-160%) skewX(-20deg); }
          75%, 100% { transform: translateX(420%) skewX(-20deg); }
        }
        .pc-shine { animation: pcShine 4.5s ease-in-out infinite; }
        @keyframes pcOrbit {
          from { transform: rotate(0deg) translateX(var(--r)); }
          to { transform: rotate(360deg) translateX(var(--r)); }
        }
        @keyframes pcOrbitReverse {
          from { transform: rotate(360deg) translateX(var(--r)); }
          to { transform: rotate(0deg) translateX(var(--r)); }
        }
        @keyframes pcPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.85; }
        }
        /* Tek bir yavaş dönüş: atomun tamamı birlikte döner (halkalar birbirine göre
           sabit kalır). Her parçayı ayrı ayrı oynatmak görsel kaosa yol açıyordu. */
        @keyframes pcAtomSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Logo (iframe'de gizli, site zaten markayı gösteriyor) */}
      {!isEmbedded && (
        <div className="flex justify-center pt-5 pb-3" role="banner">
          <img
            src="https://hellokido.com/assets/img/logo/svgBG.svg"
            alt="HelloKido Logo"
            className="h-12"
          />
        </div>
      )}

      {/* Yüzen Panel: ay + gün seçici + haftanın konusu */}
      <div
        className={`mx-3 sm:max-w-lg sm:mx-auto rounded-[28px] bg-white shadow-[0_16px_40px_-16px_rgba(23,19,31,0.18)] ${isEmbedded ? 'mt-3' : ''}`}
      >
        <div className="px-4 pt-5 pb-5 sm:px-5">
          {/* Ay + kontroller */}
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[19px] font-semibold tracking-tight text-zinc-900 capitalize truncate min-w-0">{monthLabel}</h2>
            <div className="flex items-center shrink-0">
              <button
                onClick={() => changeWeek(-1)}
                aria-label="Önceki hafta"
                className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 transition-all"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => changeWeek(1)}
                aria-label="Sonraki hafta"
                className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 transition-all"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
              <div className="relative ml-0.5">
                <button
                  onClick={() => setIsFiltersVisible(true)}
                  aria-label="Filtreleri aç"
                  className={`w-9 h-9 flex items-center justify-center rounded-full active:scale-95 transition-all ${
                    hasActiveFilters
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <AdjustmentsHorizontalIcon className="w-5 h-5" />
                </button>
                {hasActiveFilters && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center bg-pink-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
                    {activeFilterCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Gün Seçici — carousel: sürüklerken yan haftanın günleri gerçek içerik olarak kayar */}
          <div
            className="mt-5 overflow-x-clip touch-pan-y"
            onPointerDown={handleStripPointerDown}
            onPointerMove={handleStripPointerMove}
            onPointerUp={handleStripPointerEnd}
            onPointerCancel={handleStripPointerEnd}
          >
            <div
              className="flex"
              style={{
                transform: `translateX(calc(-100% + ${stripAnim.x}))`,
                transition: stripAnim.animate ? 'transform 200ms ease-out' : 'none'
              }}
            >
              <div className="w-full shrink-0 grid grid-cols-7 gap-1 pointer-events-none" aria-hidden="true">
                {prevWeekDays.map(day => renderDayPill(day, false))}
              </div>
              <div className="w-full shrink-0 grid grid-cols-7 gap-1">
                {weekDays.map(day => renderDayPill(day, true))}
              </div>
              <div className="w-full shrink-0 grid grid-cols-7 gap-1 pointer-events-none" aria-hidden="true">
                {nextWeekDays.map(day => renderDayPill(day, false))}
              </div>
            </div>
          </div>

          {/* Haftanın Konusu — vitrin kartı. Sadece içinde bulunulan haftada; diğer
              haftalarda iskelet de gösterilmez (orada zaten hiç konu gelmeyecek).
              Yüklü konu görünen haftaya ait değilse (hafta yeni değişti, veri henüz
              gelmedi) eski konu bir an bile gösterilmez. */}
          {!isViewingCurrentWeek ? null : loading || themeWeekLoaded !== viewedWeekKey ? (
            <div className="pc-skeleton pc-fade-in mt-5 h-[84px] rounded-2xl"></div>
          ) : weekTheme ? (
            <div
              key={format(weekDays[0], 'yyyy-MM-dd')}
              className={`${
                themeExitDir === 1
                  ? 'pc-slide-out-left'
                  : themeExitDir === -1
                    ? 'pc-slide-out-right'
                    : lastNavDirection === 1
                      ? 'pc-slide-right'
                      : lastNavDirection === -1
                        ? 'pc-slide-left'
                        : 'pc-fade-up'
              } relative overflow-hidden mt-5 flex items-center gap-3.5 rounded-2xl bg-gradient-to-br from-sky-600 to-sky-500 px-4 py-3.5 shadow-[0_10px_24px_-8px_rgba(2,132,199,0.55)] cursor-default select-none transition-transform duration-200 hover:scale-[1.015] active:scale-[0.985]`}>
              {/* Periyodik ışık süpürmesi */}
              <div className="pc-shine pointer-events-none absolute inset-y-0 -left-1/4 w-1/3 bg-white/25 blur-md"></div>

              {/* Dönen atom animasyonu */}
              <div
                className="relative w-14 h-14 shrink-0"
                aria-hidden="true"
                style={{ animation: 'pcAtomSpin 24s linear infinite' }}
              >
                {/* Yörünge halkaları — birbirine göre sabit, hepsi birlikte döner */}
                <span className="absolute left-1/2 top-1/2 w-[52px] h-[20px] -translate-x-1/2 -translate-y-1/2 border border-white/35 rounded-[50%]"></span>
                <span className="absolute left-1/2 top-1/2 w-[52px] h-[20px] -translate-x-1/2 -translate-y-1/2 border border-white/35 rounded-[50%] rotate-[60deg]"></span>
                <span className="absolute left-1/2 top-1/2 w-[52px] h-[20px] -translate-x-1/2 -translate-y-1/2 border border-white/35 rounded-[50%] rotate-[-60deg]"></span>
                {/* Çekirdek */}
                <span className="absolute left-1/2 top-1/2 -ml-[5px] -mt-[5px] w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"></span>
                {/* Elektronlar — sakin hızlarda */}
                <span
                  className="absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] w-1.5 h-1.5 rounded-full bg-yellow-300 shadow-[0_0_6px_rgba(253,224,71,0.9)]"
                  style={{ '--r': '22px', animation: 'pcOrbit 4.5s linear infinite' }}
                ></span>
                <span
                  className="absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] w-1.5 h-1.5 rounded-full bg-pink-300 shadow-[0_0_6px_rgba(249,168,212,0.9)]"
                  style={{ '--r': '18px', animation: 'pcOrbitReverse 6s linear infinite' }}
                ></span>
                <span
                  className="absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.9)]"
                  style={{ '--r': '13px', animation: 'pcOrbit 7.5s linear infinite' }}
                ></span>
              </div>
              <div className="min-w-0 relative">
                <div className="text-[12px] font-semibold text-white/90 leading-tight">
                  Haftanın Konusu
                </div>
                <div className="text-[18px] font-bold tracking-tight text-white leading-snug break-words">
                  {weekTheme}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Seçili Günün Programı */}
      <main className="max-w-lg mx-auto px-4 sm:px-0 pt-6 pb-10" role="main">
        {error ? (
          <div className={`bg-white rounded-[20px] ${CARD_SHADOW} p-8 text-center`}>
            <p className="text-sm font-semibold">Bir şeyler ters gitti</p>
            <p className="text-[13px] text-zinc-500 mt-1">Lütfen sayfayı yenileyip tekrar deneyin.</p>
          </div>
        ) : (
          <>
            {/* Gün başlığı */}
            <div className="flex items-center justify-between px-1 mb-3.5">
              <h3 className="text-[17px] font-semibold tracking-tight capitalize">
                {format(selectedDate, 'EEEE, d MMMM', { locale: tr })}
              </h3>
              {isSelectedToday && (
                <span className="text-[13px] font-semibold text-sky-700">Bugün</span>
              )}
            </div>

            {loading ? (
              // Skeleton: gerçek kart boyutlarında, kademeli
              <div className="space-y-3">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className={`bg-white rounded-[20px] ${CARD_SHADOW} p-4 flex items-center gap-4`}
                  >
                    <div className="pc-skeleton w-14 h-14 rounded-2xl shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="pc-skeleton h-4 w-28 rounded-md"></div>
                      <div className="pc-skeleton h-3 w-20 rounded-md"></div>
                    </div>
                    <div className="pc-skeleton h-7 w-16 rounded-full shrink-0"></div>
                  </div>
                ))}
              </div>
            ) : selectedDayEvents.length === 0 ? (
              // Boş gün
              <div className={`pc-fade-up bg-white rounded-[20px] ${CARD_SHADOW} px-6 py-12 text-center`}>
                <div className="w-14 h-14 rounded-2xl bg-[#f5f7fa] flex items-center justify-center mx-auto">
                  <MoonIcon className="w-6 h-6 text-zinc-300" />
                </div>
                <p className="text-[15px] font-semibold text-zinc-800 mt-4">Atölyemiz bugün kapalı</p>
                <p className="text-[13px] text-zinc-500 mt-1">Diğer günlere göz atabilirsiniz</p>
              </div>
            ) : (
              // Etkinlik kartları (gün değişince yumuşak giriş)
              <div key={selectedDay} className="space-y-3">
                {selectedDayEvents.map((event, index) => {
                  const typeDetails = getEventTypeDetails(event.event_type);
                  // Aktif katılımcı sayısına göre kalan kontenjanı hesapla
                  const availableSpots = 6 - event.active_capacity;
                  const hasSpots = availableSpots > 0;

                  return (
                    <div
                      key={event.id}
                      style={{ animationDelay: `${index * 60}ms` }}
                      className={`pc-fade-up bg-white rounded-[20px] ${CARD_SHADOW} p-4 flex items-center gap-4`}
                    >
                      {/* Saat karosu — tür renginde */}
                      <div
                        className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0"
                        style={{ backgroundColor: `${typeDetails.color}14`, color: typeDetails.color }}
                      >
                        <span className="text-[15px] font-bold leading-none tabular-nums tracking-tight">
                          {format(new Date(event.event_date), 'HH:mm')}
                        </span>
                        <span className="text-[10px] font-medium opacity-70 mt-1">60 dk</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[16px] font-semibold tracking-tight leading-tight truncate">
                          {typeDetails.label}
                        </div>
                        <div className="text-[13px] font-medium text-zinc-600 mt-1">
                          {event.age_group}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 ${
                          hasSpots
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-zinc-100 text-zinc-400'
                        }`}
                      >
                        {hasSpots ? `${availableSpots} boş yer` : 'Dolu'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Filtre Bottom Sheet */}
      <div className={`fixed inset-0 z-50 ${isFiltersVisible ? '' : 'pointer-events-none'}`}>
        {/* Overlay */}
        <div
          onClick={() => setIsFiltersVisible(false)}
          className={`absolute inset-0 bg-zinc-900/50 backdrop-blur-[2px] transition-opacity duration-300 ${
            isFiltersVisible ? 'opacity-100' : 'opacity-0'
          }`}
        ></div>

        {/* Sheet */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filtreler"
          className="absolute inset-x-0 bottom-0 sm:max-w-lg sm:mx-auto bg-white rounded-t-[28px] shadow-[0_-8px_40px_rgba(23,19,31,0.15)] touch-none"
          style={{
            transform: isFiltersVisible ? `translateY(${sheetDragY}px)` : 'translateY(100%)',
            transition: isSheetDragging ? 'none' : 'transform 300ms ease-out'
          }}
          onPointerDown={handleSheetPointerDown}
          onPointerMove={handleSheetPointerMove}
          onPointerUp={handleSheetPointerEnd}
          onPointerCancel={handleSheetPointerEnd}
        >
          {/* Tutamaç */}
          <div className="flex justify-center pt-3 cursor-grab select-none">
            <div className="w-10 h-1 rounded-full bg-zinc-200"></div>
          </div>

          <div className="px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {/* Başlık */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[19px] font-semibold tracking-tight">Filtreler</h3>
              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <button
                    onClick={() => setFilters({ ageGroup: '', eventType: '' })}
                    className="text-[13px] font-semibold text-sky-600 hover:text-sky-700 transition-colors"
                  >
                    Sıfırla
                  </button>
                )}
                <button
                  onClick={() => setIsFiltersVisible(false)}
                  aria-label="Filtreleri kapat"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 active:scale-95 transition-all"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Yaş Grubu */}
            <div className="mb-6">
              <div className="text-[13px] font-semibold text-zinc-900 mb-2.5">Yaş Grubu</div>
              <div className="flex flex-wrap gap-2">
                {['', ...AGE_GROUPS].map(group => (
                  <button
                    key={group || 'all'}
                    onClick={() => setFilters(prev => ({ ...prev, ageGroup: group }))}
                    className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all active:scale-95 ${
                      filters.ageGroup === group
                        ? 'bg-sky-600 text-white'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    {group || 'Tümü'}
                  </button>
                ))}
              </div>
            </div>

            {/* Etkinlik Tipi */}
            <div className="mb-7">
              <div className="text-[13px] font-semibold text-zinc-900 mb-2.5">Etkinlik Tipi</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, eventType: '' }))}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all active:scale-95 ${
                    filters.eventType === ''
                      ? 'bg-sky-600 text-white'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  Tümü
                </button>
                {EVENT_TYPES.filter(type => type.value !== 'ozel').map(type => (
                  <button
                    key={type.value}
                    onClick={() => setFilters(prev => ({ ...prev, eventType: type.value }))}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-all active:scale-95 ${
                      filters.eventType === type.value
                        ? 'bg-sky-600 text-white'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: type.color }}
                    ></span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sonuç Butonu */}
            <button
              onClick={() => setIsFiltersVisible(false)}
              className="w-full h-[52px] rounded-2xl bg-sky-600 text-white text-[15px] font-semibold hover:bg-sky-700 active:scale-[0.98] transition-all shadow-[0_8px_20px_-6px_rgba(2,132,199,0.5)]"
            >
              {loading ? 'Yükleniyor…' : `${events.length} etkinlik göster`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicCalendar;
