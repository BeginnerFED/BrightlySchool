import { useState, useEffect, useRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ukLocale from '@fullcalendar/core/locales/uk';
import enLocale from '@fullcalendar/core/locales/en-gb';
import { PlusIcon, UserGroupIcon, UsersIcon, UserIcon, DocumentDuplicateIcon, CalendarDaysIcon, ArrowTopRightOnSquareIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import CreateEvent from '../components/CreateEvent';
import UpdateEventSheet from '../components/UpdateEventSheet';
import CalendarLessonPreview from '../components/CalendarLessonPreview';
import CopyWeekModal from '../components/CopyWeekModal';
import WeeklyThemesModal from '../components/WeeklyThemesModal';
import ExtendModal from '../components/ExtendModal';
import { supabase } from '../lib/supabase';
import { fetchLessonUsageMap } from '../lib/lessonUsage';
import Toast from '../components/ui/Toast';
import '../styles/calendar.css';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import uk from 'date-fns/locale/uk';
import enUS from 'date-fns/locale/en-US';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import ActionNotification from '../components/ActionNotification';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTeachers, buildTeacherMap } from '../hooks/useTeachers';
import { getTeacherDetails, readableOnWhite } from '../lib/teacherColors';

// Takvim ızgarası. Tek yerde duruyor çünkü hem FullCalendar'a veriliyor hem de
// hover vurgusunun hesabında kullanılıyor — ayrışırlarsa vurgu, tıklamanın
// seçeceği yerden farklı bir yeri gösterir.
const SLOT_MINUTES = 30;   // bir saat kutusunun süresi
const SNAP_MINUTES = 15;   // tıklamanın oturduğu ızgara
const SNAPS_PER_SLOT = SLOT_MINUTES / SNAP_MINUTES;
const toDuration = (minutes) =>
  `00:${String(minutes).padStart(2, '0')}:00`;

// Custom hook to monitor screen width
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    // Update state when screen size changes
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Remove event listener when component unmounts
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

const Calendar = () => {
  const { language } = useLanguage();
  const { isOwner } = useAuth();
  // Herkes icin acik: ogretmen kendi dersinin rengini kendi profilinden
  // cozer. RLS ona yalnizca kendi satirini dondurur.
  const { teachers } = useTeachers();
  // Sahip tüm dersleri görür; bu filtre kimin takvimine baktığını seçmesini sağlar.
  // '' = herkes. Öğretmende hiç gösterilmez (zaten yalnızca kendi derslerini görür).
  const [teacherFilter, setTeacherFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateSheetOpen, setIsUpdateSheetOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState({
    hour: '00',
    minute: '00'
  });
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({
    message: '',
    type: 'success',
    isVisible: false
  });
  const [currentWeekRange, setCurrentWeekRange] = useState(null);
  const calendarRef = useRef(null);
  const calendarWrapRef = useRef(null);
  const [previewEventId, setPreviewEventId] = useState(null);
  const previewTimerRef = useRef(null);

  // States for Copy Week Modal
  const [isCopyWeekModalOpen, setIsCopyWeekModalOpen] = useState(false);
  const [hasConflictsInTargetWeek, setHasConflictsInTargetWeek] = useState(false);
  const [copyWeekLoading, setCopyWeekLoading] = useState(false);
  const [currentWeekEvents, setCurrentWeekEvents] = useState([]);

  // Hafta kopyalama ön kontrolü: kopyalanan haftadaki ders hakkı bitmiş öğrenciler
  const [precheckStudents, setPrecheckStudents] = useState([]);
  const [precheckLoading, setPrecheckLoading] = useState(false);
  const [extendTargetRegistration, setExtendTargetRegistration] = useState(null);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);

  // Action notification state variables
  const [isActionNotificationVisible, setIsActionNotificationVisible] = useState(false);
  const [actionNotificationMessage, setActionNotificationMessage] = useState('');
  const [targetWeekForNavigation, setTargetWeekForNavigation] = useState(null);

  // Haftalık konular (weekly themes) state'leri
  const [isThemesModalOpen, setIsThemesModalOpen] = useState(false);
  const [themesModalFocusWeek, setThemesModalFocusWeek] = useState(null);
  const [weekThemes, setWeekThemes] = useState({}); // { 'yyyy-MM-dd' (Pazartesi) -> konu }
  const [initialView] = useState(() => window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek');
  const [currentViewType, setCurrentViewType] = useState(initialView);
  const [calendarTitle, setCalendarTitle] = useState('');
  const themesRequestIdRef = useRef(0); // Geç gelen yanıtın günceli ezmemesi için

  const { width } = useWindowSize();
  const showLessonPreview = width >= 1024 && currentViewType !== 'dayGridMonth';

  // Koltuk işgal eden ve kopyalanmaya değer katılımcı statüleri.
  // İptal ve erteleme burada YOK: o satırlar derste durur ama öğrenci
  // fiilen o derste değildir.
  const ACTIVE_PARTICIPANT_STATUSES = ['scheduled', 'makeup', 'attended'];

  // Determine color and icon based on event type
  // Renk ve etiket artık dersi VEREN KİŞİDEN geliyor, ders tipinden değil
  // (bkz. src/lib/teacherColors.js). Okul yalnızca İngilizce ders verdiği
  // için tip ayrımı anlamını yitirdi.
  const teacherById = useMemo(() => buildTeacherMap(teachers), [teachers]);

  // Fetch events
  const fetchEvents = async (start, end) => {
    try {
      if (!start || !end) return;

      setIsLoading(true);

      let eventsQuery = supabase
        .from('events')
        .select('*, event_participants(registration_id, status)')
        .eq('is_active', true)
        .gte('event_date', start.toISOString())
        .lt('event_date', end.toISOString())
        .order('event_date', { ascending: true });

      // Filtre sorguya konuluyor, render anına değil: ay görünümü gruplanmış
      // ayrı bir kaynak kullandığı için render anında filtrelemek iki görünüm
      // arasında tutarsızlık yaratırdı.
      if (teacherFilter) {
        eventsQuery = eventsQuery.eq('teacher_id', teacherFilter);
      }

      const { data: eventsData, error: eventsError } = await eventsQuery;

      if (eventsError) throw eventsError;

      // Get registered students
      const registrationIds = eventsData
        .flatMap(event => event.event_participants)
        .map(participant => participant.registration_id);

      // registrationIds boş ise boşuna sorgu atma
      let studentMap = {};
      if (registrationIds.length > 0) {
        const { data: studentsData, error: studentsError } = await supabase
          .from('my_students')
          .select('id, student_name')
          .in('id', registrationIds);

        if (studentsError) throw studentsError;

        // Match student names with IDs
        studentMap = Object.fromEntries(
          studentsData.map(student => [student.id, student.student_name])
        );
      }

      // Convert events to FullCalendar format
      // Renk BURADA GÖMÜLMÜYOR. Öğretmen listesi derslerden sonra gelirse
      // kartlar varsayılan gride takılı kalıyordu: renk fetch anındaki
      // teacherById'den okunuyor ve etkinlik nesnesine yazılıyordu.
      // Artık renk çizim anında (coloredEvents) hesaplanıyor.
      const formattedEvents = eventsData.map(event => {
        // İptal edilen ve ertelenen katılımcılar koltuk işgal etmez —
        // herkese açık takvimdeki public_event_capacity görünümüyle aynı küme.
        const activeParticipants = event.event_participants
          .filter(p => ACTIVE_PARTICIPANT_STATUSES.includes(p.status));
        const students = activeParticipants
          .map(participant => studentMap[participant.registration_id])
          .filter(Boolean);

        return {
          id: event.id,
          start: event.event_date,
          end: new Date(new Date(event.event_date).getTime() + 60 * 60 * 1000),
          extendedProps: {
            ageGroup: event.age_group,
            currentCapacity: students.length,
            maxCapacity: event.max_capacity,
            topic: event.topic,
            teacherId: event.teacher_id,
            students,
            originalEvent: event // Store original event data for copying
          }
        };
      });

      setEvents(formattedEvents);
    } catch (error) {
      console.error(language === 'uk' ? 'Помилка завантаження занять:' : 'Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Görünen aralıktaki haftalık konuları getir (week_start bir date kolonu,
  // bu yüzden anahtarlar her zaman lokal 'yyyy-MM-dd' formatında — toISOString kullanılmaz)
  const fetchWeekThemes = async (start, end) => {
    try {
      if (!start || !end) return;

      const requestId = ++themesRequestIdRef.current;
      const from = format(startOfWeek(start, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const to = format(end, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('weekly_themes')
        .select('week_start, theme')
        .gte('week_start', from)
        .lt('week_start', to);

      if (error) throw error;

      // Bu arada daha yeni bir istek başladıysa bu yanıtı yok say
      if (requestId !== themesRequestIdRef.current) return;

      const themeMap = {};
      (data || []).forEach(row => {
        themeMap[row.week_start] = row.theme;
      });
      setWeekThemes(themeMap);
    } catch (error) {
      // Konu sorgusu başarısız olsa da takvim çalışmaya devam etmeli
      console.error(language === 'uk' ? 'Помилка завантаження тем тижня:' : 'Error fetching weekly themes:', error);
    }
  };

  // Ay görünümünde dersleri gün + ÖĞRETMEN kırılımında toplar.
  // Eskiden kırılım ders tipiydi; tip kalkınca aynı günün tüm dersleri tek
  // baloncukta toplanır, hangi öğretmene ait olduğu kaybolurdu.
  const groupEventsByDayAndType = (events) => {
    const groupedByDayAndType = {};

    events.forEach(event => {
      const date = new Date(event.start);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      // teacher_id boş olamaz (NOT NULL) ama nesne anahtarı olarak
      // undefined'a düşmesin diye yine de sabitleniyor.
      const groupKey = event.extendedProps.teacherId || 'unassigned';

      if (!groupedByDayAndType[dateKey]) {
        groupedByDayAndType[dateKey] = {};
      }

      if (!groupedByDayAndType[dateKey][groupKey]) {
        groupedByDayAndType[dateKey][groupKey] = {
          count: 0,
          events: [],
          typeDetails: event.extendedProps.typeDetails,
          color: event.backgroundColor
        };
      }

      groupedByDayAndType[dateKey][groupKey].count += 1;
      groupedByDayAndType[dateKey][groupKey].events.push(event);
    });

    // Convert groups to FullCalendar format
    const groupedEvents = [];

    Object.keys(groupedByDayAndType).forEach(dateKey => {
      const [year, month, day] = dateKey.split('-').map(Number);

      Object.keys(groupedByDayAndType[dateKey]).forEach(groupKey => {
        const group = groupedByDayAndType[dateKey][groupKey];
        const date = new Date(year, month, day);

        groupedEvents.push({
          id: `group-${dateKey}-${groupKey}`,
          title: `${group.count} ${group.typeDetails.label}`,
          start: date,
          backgroundColor: group.color,
          borderColor: group.color,
          display: 'block',
          extendedProps: {
            isGrouped: true,
            count: group.count,
            teacherId: groupKey === 'unassigned' ? null : groupKey,
            typeDetails: group.typeDetails,
            originalEvents: group.events
          }
        });
      });
    });

    return groupedEvents;
  };

  // Renk ve etiket çizim anında, güncel öğretmen listesinden hesaplanıyor.
  // Böylece profiller derslerden sonra gelse bile kartlar kendiliğinden
  // doğru renge geçiyor — yeniden veri çekmeye gerek kalmıyor.
  const coloredEvents = useMemo(() => events.map(event => {
    const typeDetails = getTeacherDetails(event.extendedProps.teacherId, teacherById, language);
    return {
      ...event,
      // Kart içeriğini renderEventContent çiziyor; title yine de öğretmenin
      // adı olsun ki ham 'ingilizce' değeri sızmasın.
      title: typeDetails.label,
      backgroundColor: typeDetails.color,
      borderColor: typeDetails.color,
      extendedProps: { ...event.extendedProps, typeDetails }
    };
  }), [events, teacherById, language]);

  const groupedEvents = useMemo(
    () => groupEventsByDayAndType(coloredEvents),
    [coloredEvents]
  );

  // Resolve from the current events so edited lessons and teacher colors stay fresh.
  const previewEvent = coloredEvents.find(event => event.id === previewEventId) || null;

  const cancelPreviewTimer = () => window.clearTimeout(previewTimerRef.current);
  const clearLessonPreview = () => {
    cancelPreviewTimer();
    setPreviewEventId(null);
  };

  useEffect(() => () => window.clearTimeout(previewTimerRef.current), []);

  const previewLesson = (event) => {
    cancelPreviewTimer();
    if (showLessonPreview && !event.extendedProps.isGrouped) {
      // Ignore cards crossed briefly on the way to reading the preview.
      previewTimerRef.current = window.setTimeout(() => setPreviewEventId(event.id), 120);
    }
  };

  const openLessonDetails = (eventId) => {
    setSelectedEvent(eventId);
    setIsUpdateSheetOpen(true);
  };


  // Load events when component mounts and when new events are added
  // Filtre değişince görünürdeki aralığı yeniden çek. datesSet ilk yüklemeyi
  // zaten yapıyor, o yüzden ilk render atlanıyor.
  //
  const filterMountedRef = useRef(false);
  useEffect(() => {
    if (!filterMountedRef.current) { filterMountedRef.current = true; return; }
    const api = calendarRef.current?.getApi();
    if (!api) return;
    fetchEvents(api.view.activeStart, api.view.activeEnd);
  }, [teacherFilter]);

  // İmlecin üzerinde olduğu saat kutusunu vurgula.
  // Salt CSS ile yapılamıyor: saat satırları (.fc-timegrid-slots) ile gün
  // sütunları (.fc-timegrid-cols) ayrı katmanlar, sütunlar üstte olduğu için
  // satırlar hover almıyor — kesişimi CSS bilemiyor, burada hesaplanıyor.
  useEffect(() => {
    const root = calendarWrapRef.current;
    if (!root) return;
    // Vurgu, "buraya tıklayınca ders açılır" önizlemesi. Öğretmen ders
    // açamadığı için ona gösterilmesi yanlış vaat oluyordu: takvim
    // düzenlenebilir görünüyor ama tıklama hiçbir şey yapmıyordu.
    if (!isOwner) return;

    // Vurgu doğrudan sarmalayıcıya konuluyor (sarmalayıcı zaten position:relative).
    // Sütunun kendi katmanlarına yerleştirmek onların konumlanmasına ve
    // z-index sırasına bağımlı hale getiriyordu; koordinatları burada hesaplamak
    // o varsayımların hepsini ortadan kaldırıyor.
    const highlight = document.createElement('div');
    highlight.className = 'fc-slot-hover';
    highlight.style.display = 'none';
    root.appendChild(highlight);

    const hide = () => { highlight.style.display = 'none'; };

    // closest() ve sabit yükseklik aritmetiği yerine gerçek elemanların
    // koordinatları ölçülüp imlecin hangisinin içinde olduğu bulunuyor:
    // FullCalendar'ın katman yapısı ve sınıf adları hakkında varsayım kalmasın.
    const onMove = (event) => {
      const x = event.clientX;
      const y = event.clientY;

      const cols = root.querySelectorAll('.fc-timegrid-col:not(.fc-timegrid-axis)');
      const lanes = root.querySelectorAll('.fc-timegrid-slot-lane');
      if (!cols.length || !lanes.length) return hide();

      let colRect = null;
      for (const col of cols) {
        const r = col.getBoundingClientRect();
        if (x >= r.left && x < r.right && y >= r.top && y < r.bottom) { colRect = r; break; }
      }
      if (!colRect) return hide();

      let laneRect = null;
      for (const lane of lanes) {
        const r = lane.getBoundingClientRect();
        if (y >= r.top && y < r.bottom) { laneRect = r; break; }
      }
      if (!laneRect) return hide();

      // Etkinlik kartının üzerindeyken vurgu gösterme — kartın arkasında
      // yanıp sönen bir kutu kirli duruyor
      const over = document.elementFromPoint(x, y);
      if (!over?.closest('.fc-timegrid-body') || over.closest('.fc-event')) return hide();

      // Saat kutusu 30 dk ama tıklama 15 dk ızgarasına oturuyor. Kutunun
      // tamamını vurgulamak, tıklandığında seçilecek yerden farklı bir yeri
      // göstermek olurdu — bu yüzden kutu snap bantlarına bölünüyor.
      const bandHeight = laneRect.height / SNAPS_PER_SLOT;
      const band = Math.min(
        SNAPS_PER_SLOT - 1,
        Math.max(0, Math.floor((y - laneRect.top) / bandHeight))
      );

      const rootRect = root.getBoundingClientRect();
      const viewport = root.querySelector('.calendar-scroll').getBoundingClientRect();
      const scroller = over.closest('.fc-scroller')?.getBoundingClientRect();
      const left = Math.max(colRect.left, viewport.left);
      const right = Math.min(colRect.right, viewport.right);
      const bandTop = laneRect.top + band * bandHeight;
      const top = Math.max(bandTop, scroller?.top ?? bandTop);
      const bottom = Math.min(bandTop + bandHeight, scroller?.bottom ?? bandTop + bandHeight);
      if (right <= left || bottom <= top) return hide();
      highlight.style.display = 'block';
      highlight.style.left = `${left - rootRect.left}px`;
      highlight.style.width = `${right - left}px`;
      highlight.style.top = `${top - rootRect.top}px`;
      highlight.style.height = `${bottom - top}px`;
    };

    // Dinleyici document üzerinde: sarmalayıcıya ulaşmayan bir olay kalmasın
    document.addEventListener('mousemove', onMove);
    window.addEventListener('scroll', hide, true);
    return () => {
      document.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', hide, true);
      if (highlight.parentNode) highlight.parentNode.removeChild(highlight);
    };
  }, [currentViewType, isOwner]);

  // Keep cards within their time slots; hovering updates the separate preview rail.
  const renderEventContent = (eventInfo) => {
    const { typeDetails, currentCapacity, maxCapacity, ageGroup, students, topic, isGrouped, count } = eventInfo.event.extendedProps;
    const cardStyle = {
      '--lesson-color': typeDetails.color,
      '--lesson-ink': readableOnWhite(typeDetails.color, 5.5)
    };

    if (isGrouped) {
      return (
        <div className="grouped-event-card" style={cardStyle} title={`${typeDetails.label}: ${count}`}>
          <span className="grouped-event-teacher">{typeDetails.label}</span>
          <span className="grouped-event-count">{count}</span>
        </div>
      );
    }

    const time = format(eventInfo.event.start, 'HH:mm');
    const capacityLabel = maxCapacity === 1
      ? (language === 'uk' ? 'Індивідуальне' : 'Private lesson')
      : maxCapacity === 2
        ? (language === 'uk' ? 'Парне заняття' : 'Paired lesson')
        : (language === 'uk' ? 'Учні' : 'Students');
    const CapacityIcon = maxCapacity === 1 ? UserIcon : maxCapacity === 2 ? UsersIcon : UserGroupIcon;
    const summary = [
      `${time} · ${typeDetails.label}`,
      ageGroup,
      `${capacityLabel}: ${currentCapacity}/${maxCapacity}`,
      topic,
      students?.join(', ')
    ].filter(Boolean).join('\n');

    return (
      <div className="lesson-card" style={cardStyle} aria-label={summary}>
        <span className="lesson-time">{time}</span>
        <span className="lesson-teacher">{typeDetails.label}</span>
        <span className="lesson-grade">{ageGroup}</span>
        <span className={`lesson-capacity${maxCapacity <= 2 ? ' is-private' : ''}`} aria-label={`${capacityLabel}: ${currentCapacity}/${maxCapacity}`}>
          <CapacityIcon aria-hidden="true" />
          <span>{currentCapacity}/{maxCapacity}</span>
          {maxCapacity <= 2 && <span className="lesson-kind">{capacityLabel}</span>}
        </span>
        {topic && <span className="lesson-topic">{topic}</span>}
        {students?.length > 0 && <span className="lesson-students">{students.join(', ')}</span>}
      </div>
    );
  };

  // Tarih seçildiğinde
  const handleDateSelect = (selectInfo) => {
    // Seçilen tarih ve saati al
    const selectedDateTime = new Date(selectInfo.startStr);
    const selectedHour = selectedDateTime.getHours().toString().padStart(2, '0');
    const selectedMinute = selectedDateTime.getMinutes().toString().padStart(2, '0');

    // Seçilen dakikayı en yakın 15'in katına yuvarla (00, 15, 30, 45)
    const roundedMinute = Math.round(selectedMinute / 15) * 15;
    const formattedMinute = (roundedMinute === 60 ? 0 : roundedMinute).toString().padStart(2, '0');

    setSelectedDate(selectInfo.startStr);

    // Ay görünümünde (dayGridMonth) ise dakika seçilmesin
    const isMonthView = selectInfo.view.type === 'dayGridMonth';

    // Seçilen saat bilgisini de sakla
    setSelectedTime({
      hour: selectedHour,
      minute: isMonthView ? '' : formattedMinute
    });

    setIsModalOpen(true);
  };

  // Modal'ı kapat
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
    setSelectedTime({
      hour: '00',
      minute: '00'
    });
  };

  // Toast gösterme fonksiyonu
  const showToast = (message, type = 'success') => {
    setToast({
      message,
      type,
      isVisible: true
    });
  };

  // Toast kapatma fonksiyonu
  const closeToast = () => {
    setToast(prev => ({
      ...prev,
      isVisible: false
    }));
  };

  // Etkinlik oluşturulduğunda
  const handleCreateEvent = async (formData) => {
    try {
      if (!formData || !formData.date) {
        throw new Error(language === 'uk' ? 'Некоректні дані форми' : 'Invalid form data');
      }

      // Tarih ve saat bilgisini birleştir
      const eventDateTime = new Date(formData.date);
      if (isNaN(eventDateTime.getTime())) {
        throw new Error(language === 'uk' ? 'Некоректний формат дати' : 'Invalid date format');
      }

      eventDateTime.setHours(parseInt(formData.time.hour) || 0);
      eventDateTime.setMinutes(parseInt(formData.time.minute) || 0);

      // Aynı saatte başka etkinlik var mı kontrol et
      const { data: existingEvents, error: checkError } = await supabase
        .from('events')
        .select('id, event_date, teacher_id')
        .eq('is_active', true)
        // Çakışma AYNI ÖĞRETMEN için geçerli. Öğretmen ataması derse
        // taşındığından iki öğretmen aynı saatte paralel ders verebilir;
        // teacher_id'ye bakmayan eski kontrol bunu engelliyordu.
        .eq('teacher_id', formData.teacherId);

      if (checkError) throw checkError;

      // Aynı tarih ve saatte etkinlik var mı kontrol et
      const conflictingEvent = existingEvents.find(event => {
        const existingDate = new Date(event.event_date);
        return (
          existingDate.getFullYear() === eventDateTime.getFullYear() &&
          existingDate.getMonth() === eventDateTime.getMonth() &&
          existingDate.getDate() === eventDateTime.getDate() &&
          existingDate.getHours() === eventDateTime.getHours() &&
          existingDate.getMinutes() === eventDateTime.getMinutes()
        );
      });

      if (conflictingEvent) {
        throw new Error(
          language === 'uk'
            ? 'У цього викладача вже є заняття в цей час. Оберіть інший час.'
            : 'This teacher already has a lesson at this time. Please select a different time.'
        );
      }

      // Form verilerini kontrol et
      const eventData = {
        event_date: eventDateTime.toISOString(),
        age_group: formData.ageGroup || '',
        // Dersi kimin verdiği artık derste tutuluyor (öğrencide değil).
        // Kolonun DEFAULT'u auth.uid(); açıkça yazmazsak ders her zaman
        // formu açan kişiye yazılırdı.
        teacher_id: formData.teacherId,
        max_capacity: formData.maxCapacity,
        topic: formData.topic?.trim() || null,
        current_capacity: 0 // Başlangıçta 0 olmalı, trigger katılımcılar eklendiğinde bu değeri arttıracak
      };

      // Zorunlu alanları kontrol et
      if (!eventData.age_group || !eventData.teacher_id) {
        throw new Error(language === 'uk' ? 'Не заповнені обовʼязкові поля' : 'Required fields are missing');
      }

      // Supabase'e etkinlik kaydetme işlemi
      const { data: eventResult, error: eventError } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (eventError) throw eventError;

      if (!eventResult) {
        throw new Error(language === 'uk' ? 'Не вдалося створити заняття' : 'Event creation failed');
      }

      // Katılımcıları ekle
      if (Array.isArray(formData.students) && formData.students.length > 0) {
        const participantInserts = formData.students.map(student => ({
          event_id: eventResult.id,
          registration_id: student.value
        }));

        const { error: participantError } = await supabase
          .from('event_participants')
          .insert(participantInserts);

        if (participantError) throw participantError;
      }

      // Başarı mesajı göster
      showToast(
        language === 'uk' ? 'Заняття успішно створено' : 'Event created successfully',
        'success'
      );

      // Etkinlikleri yeniden yükle - mevcut görünüm aralığında
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        await fetchEvents(calendarApi.view.activeStart, calendarApi.view.activeEnd);
      }
      handleCloseModal();
    } catch (error) {
      console.error(language === 'uk' ? 'Помилка створення заняття:' : 'Error creating event:', error);
      showToast(error.message, 'error');
    }
  };

  // Etkinliğe tıklandığında
  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;

    // Gruplandırılmış etkinlik ise ve ay görünümündeyse, hafta görünümüne geç
    if (event.extendedProps.isGrouped && clickInfo.view.type === 'dayGridMonth') {
      const calendarApi = clickInfo.view.calendar;
      calendarApi.changeView('timeGridWeek', event.start);
      return;
    }

    // Gruplandırılmış değilse etkinlik düzenleme sheet'ini aç
    if (!event.extendedProps.isGrouped) {
      setSelectedEvent(event.id);
      setIsUpdateSheetOpen(true);
    }
  };

  // Görünüm değiştiğinde
  const handleViewDidMount = (viewInfo) => {
    const calendar = viewInfo.view.calendar;

    // Mevcut görünümün başlangıç tarihini sakla (hafta kopyalama için)
    setCurrentWeekRange(viewInfo.view.currentStart);

    // Hangi etkinlik kümesinin çizileceğini artık `events` prop'u belirliyor
    // (aşağıda currentViewType'a göre seçiliyor). Burada kaynakları elle
    // değiştirmek işe yaramıyordu: prop her değiştiğinde FullCalendar
    // kaynakları kendi prop'undan yeniden kuruyor ve ay görünümündeki
    // gruplama sessizce eziliyordu.
    calendar.setOption('editable', viewInfo.view.type === 'dayGridMonth' ? false : isOwner);

    // Mevcut görünümdeki etkinlikleri sakla (hafta kopyalama için)
    if (viewInfo.view.type === 'timeGridWeek') {
      const start = viewInfo.view.currentStart;
      const end = viewInfo.view.currentEnd;

      // Geçerli hafta içindeki etkinlikleri filtrele - düzeltilmiş sürüm
      const eventsInCurrentWeek = events.filter(event => {
        const eventDate = new Date(event.start);

        // Date.getTime() kullanarak milisaniye cinsinden karşılaştırma
        return eventDate.getTime() >= start.getTime() &&
          eventDate.getTime() < end.getTime();
      });

      setCurrentWeekEvents(eventsInCurrentWeek);
    }
  };

  // Etkinlik sürüklendiğinde
  const handleEventDrop = async (dropInfo) => {
    try {
      const event = dropInfo.event;
      const newDate = event.start;

      // Update event in Supabase
      const { error } = await supabase
        .from('events')
        .update({ event_date: newDate.toISOString() })
        .eq('id', event.id);

      if (error) {
        dropInfo.revert();
        throw error;
      }

      // Show success message
      showToast(
        language === 'uk' ? 'Заняття успішно перенесено' : 'Event moved successfully',
        'success'
      );

      // Reload events - mevcut görünüm aralığında
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        await fetchEvents(calendarApi.view.activeStart, calendarApi.view.activeEnd);
      }
    } catch (error) {
      console.error(
        language === 'uk' ? 'Помилка перенесення заняття:' : 'Error moving event:',
        error
      );
      showToast(
        language === 'uk' ? 'Помилка під час перенесення заняття' : 'An error occurred while moving the event',
        'error'
      );
      dropInfo.revert();
    }
  };

  // Kopyalanan haftadaki derslerde yer alan benzersiz kayıt id'lerini çıkarır.
  // NOT: currentWeekEvents KULLANILMAZ — enjekte edilen kopyalama butonu ilk render'ın
  // closure'ını tuttuğu için o state modal açılırken güvenilir değil. Buradaki `events`
  // her zaman güncel (fonksiyon render sırasında yeniden oluşuyor).
  const getWeekRegistrationIds = (weekStart) => {
    if (!weekStart) return [];
    const start = new Date(weekStart);
    const end = addDays(start, 7);

    const ids = new Set();
    events.forEach(event => {
      const eventDate = new Date(event.start);
      if (eventDate < start || eventDate >= end) return;

      const participants = event.extendedProps?.originalEvent?.event_participants || [];
      participants.forEach(participant => {
        if (participant.registration_id) ids.add(participant.registration_id);
      });
    });

    return [...ids];
  };

  // Ön kontrol: haftadaki öğrencilerden ders hakkı bitmiş olanları getirir.
  // Kopyalamayı ASLA engellemez; hata durumunda liste boş kalır.
  const fetchCopyWeekPrecheck = async (registrationIds) => {
    if (!registrationIds || registrationIds.length === 0) {
      setPrecheckStudents([]);
      return;
    }

    try {
      setPrecheckLoading(true);

      // my_students görünümü: öğretmen için de DOLU döner. Taban tablo
      // kullanılsaydı öğretmene boş liste dönerdi ve modal "kotası biten
      // öğrenci yok" derdi — oysa gerçek "bakmama izin verilmedi" olurdu.
      const { data: registrations, error } = await supabase
        .from('my_students')
        .select('*')
        .in('id', registrationIds)
        .eq('is_active', true);

      if (error) throw error;

      const usageMap = await fetchLessonUsageMap(registrations || []);

      // visible: RPC'nin döndürmediği kayıt = çağıranın görme hakkı yok.
      // O durumda sayaçlar sıfırdır ve "kalan = tam kota" görünür; kotası
      // bitmiş sanıp listeye almamak için ayrıca kontrol ediliyor.
      const exhausted = (registrations || [])
        .filter(registration => {
          const usage = usageMap[registration.id];
          return usage && usage.visible && usage.remaining === 0;
        })
        .map(registration => ({ ...registration, usage: usageMap[registration.id] }))
        .sort((a, b) => a.student_name.localeCompare(b.student_name, 'uk'));

      setPrecheckStudents(exhausted);
    } catch (error) {
      console.error('Hafta kopyalama ön kontrolü yapılırken hata:', error);
      setPrecheckStudents([]);
    } finally {
      setPrecheckLoading(false);
    }
  };

  // Ön kontrol listesinden uzatma modalını aç (Registration.jsx'teki guard'ların aynısı).
  // Yalnızca sahip çağırır — uzatma finansal kayıt yazar.
  // Liste my_students görünümünden geldiği için ödeme kolonları yok;
  // uzatma için tam kaydı burada ayrıca çekiyoruz.
  const handleExtendFromPrecheck = async (student) => {
    const { data: registration, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', student.id)
      .single();

    if (error || !registration) {
      showToast(
        language === 'uk' ? 'Не вдалося завантажити запис' : 'Could not load the record',
        'error'
      );
      return;
    }

    if (registration.payment_status === 'beklemede') {
      showToast(
        language === 'uk'
          ? "Для продовження статус оплати не може бути «Очікує»"
          : "Payment status cannot be 'Pending' for extension",
        'error'
      );
      return;
    }
    setExtendTargetRegistration(registration);
    setIsExtendModalOpen(true);
  };

  // Ön kontrolü modal açılınca çalıştır. Effect kullanılıyor çünkü handleCopyWeekClick
  // enjekte edilen butondan bayat closure ile çağrılıyor (orada `events` boş görünür).
  useEffect(() => {
    if (!isCopyWeekModalOpen || !currentWeekRange) return;
    fetchCopyWeekPrecheck(getWeekRegistrationIds(currentWeekRange));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCopyWeekModalOpen, currentWeekRange, events]);

  // Haftayı kopyalama işlevi
  const handleCopyWeekClick = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const view = calendarApi.view;

      // Hafta görünümünde değilse, hafta görünümüne geç
      if (view.type !== 'timeGridWeek') {
        calendarApi.changeView('timeGridWeek');

        // Görünüm değiştikten sonra modalı açmak için kısa bir gecikme ekle
        setTimeout(() => {

          // Gecikme sonrası yeni görünümdeki etkinlikleri kontrol et
          const updatedView = calendarApi.view;
          const start = updatedView.currentStart;
          const end = updatedView.currentEnd;

          // Geçerli hafta içindeki etkinlikleri filtrele - düzeltilmiş sürüm
          const updatedCurrentWeekEvents = events.filter(event => {
            const eventDate = new Date(event.start);

            // Date.getTime() kullanarak milisaniye cinsinden karşılaştırma
            return eventDate.getTime() >= start.getTime() &&
              eventDate.getTime() < end.getTime();
          });

          console.log(`Kopyalanacak etkinlikler: ${updatedCurrentWeekEvents.length} adet`);
          setCurrentWeekEvents(updatedCurrentWeekEvents);
          setCurrentWeekRange(start);
          setIsCopyWeekModalOpen(true);
        }, 500); // 300 yerine 500ms daha güvenli olabilir
        return;
      }

      // Güncellenen mevcut hafta etkinliklerini kontrol et - düzeltilmiş sürüm
      const start = view.currentStart;
      const end = view.currentEnd;

      const updatedCurrentWeekEvents = events.filter(event => {
        const eventDate = new Date(event.start);

        // Date.getTime() kullanarak milisaniye cinsinden karşılaştırma
        return eventDate.getTime() >= start.getTime() &&
          eventDate.getTime() < end.getTime();
      });

      console.log(`Kopyalanacak etkinlikler: ${updatedCurrentWeekEvents.length} adet. Hafta: ${format(start, 'yyyy-MM-dd')} - ${format(end, 'yyyy-MM-dd')}`);

      // events dizisinin boş olup olmadığını kontrol et
      if (events.length === 0) {
        console.warn('DİKKAT: Genel etkinlik listesi boş!');
      }

      // Debug: Tüm etkinliklerin tarihlerini kontrol et
      if (updatedCurrentWeekEvents.length === 0 && events.length > 0) {
        console.log('Neden etkinlik bulunamadı? Tüm etkinlik tarihleri:');
        events.forEach((event, index) => {
          console.log(`Etkinlik ${index}: ${new Date(event.start).toISOString()} (${event.extendedProps.typeDetails?.label})`);
        });

        console.log(`Aranan tarih aralığı: ${start.toISOString()} - ${end.toISOString()}`);
      }

      setCurrentWeekEvents(updatedCurrentWeekEvents);
      setCurrentWeekRange(start);
      setIsCopyWeekModalOpen(true);
    }
  };

  // Kopya modalını kapat
  const handleCloseCopyWeekModal = () => {
    setIsCopyWeekModalOpen(false);
    setHasConflictsInTargetWeek(false);
  };

  // Haftayı kopyalama işlemini gerçekleştir
  // excludedRegistrationIds: ön kontrol listesinden "Виключити" denen öğrenciler.
  // Dersler yine kopyalanır, sadece bu öğrenciler katılımcı olarak eklenmez.
  const handleCopyWeek = async (targetWeekStart, excludedRegistrationIds = []) => {
    try {
      setCopyWeekLoading(true);

      console.log(`Kopyalama başlıyor. Etkinlik sayısı: ${currentWeekEvents.length}`);
      console.log(`Mevcut hafta: ${currentWeekRange ? new Date(currentWeekRange).toISOString() : 'undefined'}`);
      console.log(`Hedef hafta: ${targetWeekStart.toISOString()}`);

      // Kopyalanacak hafta boşsa, komple events'tan kontrol edelim
      if (!currentWeekEvents || currentWeekEvents.length === 0) {
        // Son bir kurtarma denemesi - mevcut takvim görünümünü manuel olarak kontrol et
        if (calendarRef.current) {
          const calendarApi = calendarRef.current.getApi();
          const view = calendarApi.view;

          if (view.type === 'timeGridWeek') {
            const start = view.currentStart;
            const end = view.currentEnd;

            // Geçerli hafta içindeki etkinlikleri filtrele - son deneme
            const rescueEvents = events.filter(event => {
              const eventDate = new Date(event.start);

              // Sadece gün, ay, yıl karşılaştırması yapalım
              const eventDay = eventDate.getDate();
              const eventMonth = eventDate.getMonth();
              const eventYear = eventDate.getFullYear();

              // Tarih aralığındaki günleri kontrol et
              for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                if (d.getDate() === eventDay &&
                  d.getMonth() === eventMonth &&
                  d.getFullYear() === eventYear) {
                  return true;
                }
              }
              return false;
            });

            console.log(`Son deneme kurtarma: ${rescueEvents.length} etkinlik bulundu`);

            if (rescueEvents.length > 0) {
              // Kurtarma başarılı, bu etkinlikleri kullan
              setCurrentWeekEvents(rescueEvents);

              // Bu değişkeni kullanarak devam et
              const currentWeekEventsToUse = rescueEvents;

              // Hedef haftanın bitiş tarihini hesapla
              const targetWeekEnd = addDays(new Date(targetWeekStart), 7);

              // Hedef haftadaki mevcut etkinlikleri getir
              const { data: existingEventsInTargetWeek, error: existingEventsError } = await supabase
                .from('events')
                // Çakışma aynı öğretmen için geçerli (bkz. ders oluşturma)
                .select('event_date, teacher_id')
                .eq('is_active', true)
                .gte('event_date', targetWeekStart.toISOString())
                .lt('event_date', targetWeekEnd.toISOString());

              if (existingEventsError) throw existingEventsError;

              // Günlerin farkını hesapla (bir hafta sonra olacak)
              const daysDiff = Math.round((targetWeekStart - new Date(currentWeekRange)) / (1000 * 60 * 60 * 24));

              // Başarıyla kopyalanan etkinlik sayacı
              let successCount = 0;
              let conflictCount = 0;

              // Her etkinlik için kopyalama işlemi
              for (const event of currentWeekEventsToUse) {
                // Etkinliğin yeni tarihini hesapla
                const eventDate = new Date(event.start);
                const newEventDate = addDays(eventDate, daysDiff);

                // Hedef tarihte zaten etkinlik var mı kontrol et (saat ve dakika bazında)
                const hasConflict = existingEventsInTargetWeek.some(existingEvent => {
                  const existingEventDate = new Date(existingEvent.event_date);
                  return (
                    existingEvent.teacher_id === event.extendedProps.teacherId &&
                    existingEventDate.getFullYear() === newEventDate.getFullYear() &&
                    existingEventDate.getMonth() === newEventDate.getMonth() &&
                    existingEventDate.getDate() === newEventDate.getDate() &&
                    existingEventDate.getHours() === newEventDate.getHours() &&
                    existingEventDate.getMinutes() === newEventDate.getMinutes()
                  );
                });

                // Çakışma varsa bu etkinliği atla
                if (hasConflict) {
                  conflictCount++;
                  continue;
                }

                // Orijinal etkinlik verisini al
                const originalEvent = event.extendedProps.originalEvent;

                if (!originalEvent) continue;

                // Yeni etkinlik verisi oluştur
                const newEventData = {
                  event_date: newEventDate.toISOString(),
                  age_group: originalEvent.age_group,
                  topic: originalEvent.topic,
                  max_capacity: originalEvent.max_capacity,
                  // Sahiplik kaynaktan taşınır: aksi halde teacher_id'nin
                  // DEFAULT auth.uid() değeri devreye girer ve Yulia bir
                  // öğretmenin haftasını kopyalayınca dersler ona geçerdi.
                  teacher_id: originalEvent.teacher_id,
                  current_capacity: 0 // Başlangıçta 0 olmalı, trigger katılımcılar eklendiğinde bu değeri arttıracak
                };

                // Etkinliği veritabanına ekle
                const { data: newEvent, error: newEventError } = await supabase
                  .from('events')
                  .insert([newEventData])
                  .select()
                  .single();

                if (newEventError) throw newEventError;

                // Katılımcıları kopyala (hariç tutulanlar atlanır)
                if (originalEvent.event_participants && originalEvent.event_participants.length > 0) {
                  const participantInserts = originalEvent.event_participants
                    // Yalnızca AKTİF katılımcılar kopyalanır (bkz. ana yol)
                    .filter(participant => ACTIVE_PARTICIPANT_STATUSES.includes(participant.status))
                    .filter(participant => !excludedRegistrationIds.includes(participant.registration_id))
                    .map(participant => ({
                      event_id: newEvent.id,
                      registration_id: participant.registration_id
                    }));

                  if (participantInserts.length > 0) {
                    const { error: participantError } = await supabase
                      .from('event_participants')
                      .insert(participantInserts);

                    if (participantError) throw participantError;
                  }
                }

                successCount++;
              }

              // Tüm etkinlikler kopyalandı
              setCopyWeekLoading(false);
              setIsCopyWeekModalOpen(false);

              // Başarı mesajı göster
              if (successCount > 0) {
                let message = `Скопійовано занять: ${successCount}`;
                if (conflictCount > 0) {
                  message += `, пропущено через накладання: ${conflictCount}`;
                }
                setToast({
                  message,
                  type: 'success',
                  isVisible: true
                });

                // Etkinlikleri yeniden yükle
                await fetchEvents();

                // Takvim görünümünü kopyalanan haftaya çevirme işlemi yerine bildirim göster
                setTargetWeekForNavigation(targetWeekStart);
                setActionNotificationMessage(`Заняття скопійовано на ${format(targetWeekStart, 'dd MMMM yyyy', { locale: uk })} - ${format(addDays(targetWeekStart, 6), 'dd MMMM yyyy', { locale: uk })}.`);
                setIsActionNotificationVisible(true);
              } else if (conflictCount > 0) {
                setToast({
                  message: `Копіювання завершено, але ${conflictCount} занять не скопійовано через накладання`,
                  type: 'warning',
                  isVisible: true
                });
              } else {
                setToast({
                  message: 'Немає занять для копіювання',
                  type: 'error',
                  isVisible: true
                });
              }

              return; // Kurtarma başarılı, işlemi tamamla ve çık
            }
          }
        }

        showToast('На цьому тижні немає занять для копіювання', 'error');
        setCopyWeekLoading(false);
        setIsCopyWeekModalOpen(false);
        return;
      }

      // Hedef haftanın bitiş tarihini hesapla
      const targetWeekEnd = addDays(new Date(targetWeekStart), 7);

      // Hedef haftadaki mevcut etkinlikleri getir
      const { data: existingEventsInTargetWeek, error: existingEventsError } = await supabase
        .from('events')
        // Çakışma aynı öğretmen için geçerli (bkz. ders oluşturma)
        .select('event_date, teacher_id')
        .eq('is_active', true)
        .gte('event_date', targetWeekStart.toISOString())
        .lt('event_date', targetWeekEnd.toISOString());

      if (existingEventsError) throw existingEventsError;

      // Günlerin farkını hesapla (bir hafta sonra olacak)
      const daysDiff = Math.round((targetWeekStart - new Date(currentWeekRange)) / (1000 * 60 * 60 * 24));

      // Başarıyla kopyalanan etkinlik sayacı
      let successCount = 0;
      let conflictCount = 0;

      // Her etkinlik için kopyalama işlemi
      for (const event of currentWeekEvents) {
        // Etkinliğin yeni tarihini hesapla
        const eventDate = new Date(event.start);
        const newEventDate = addDays(eventDate, daysDiff);

        // Hedef tarihte zaten etkinlik var mı kontrol et (saat ve dakika bazında)
        const hasConflict = existingEventsInTargetWeek.some(existingEvent => {
          const existingEventDate = new Date(existingEvent.event_date);
          return (
            existingEvent.teacher_id === event.extendedProps.teacherId &&
            existingEventDate.getFullYear() === newEventDate.getFullYear() &&
            existingEventDate.getMonth() === newEventDate.getMonth() &&
            existingEventDate.getDate() === newEventDate.getDate() &&
            existingEventDate.getHours() === newEventDate.getHours() &&
            existingEventDate.getMinutes() === newEventDate.getMinutes()
          );
        });

        // Çakışma varsa bu etkinliği atla
        if (hasConflict) {
          conflictCount++;
          continue;
        }

        // Orijinal etkinlik verisini al
        const originalEvent = event.extendedProps.originalEvent;

        if (!originalEvent) continue;

        // Yeni etkinlik verisi oluştur
        const newEventData = {
          event_date: newEventDate.toISOString(),
          age_group: originalEvent.age_group,
          topic: originalEvent.topic,
          max_capacity: originalEvent.max_capacity,
          // Sahiplik kaynaktan taşınır (yukarıdaki kurtarma yolundaki gibi)
          teacher_id: originalEvent.teacher_id,
          current_capacity: 0 // Başlangıçta 0 olmalı, trigger katılımcılar eklendiğinde bu değeri arttıracak
        };

        // Etkinliği veritabanına ekle
        const { data: newEvent, error: newEventError } = await supabase
          .from('events')
          .insert([newEventData])
          .select()
          .single();

        if (newEventError) throw newEventError;

        // Katılımcıları kopyala (hariç tutulanlar atlanır)
        if (originalEvent.event_participants && originalEvent.event_participants.length > 0) {
          const participantInserts = originalEvent.event_participants
            // Yalnızca AKTİF katılımcılar kopyalanır. İptal/erteleme
            // satırları da kopyalanınca, arşivlenen öğrenci hedef haftada
            // 'scheduled' olarak geri diriliyordu — arşivleme boşa gidiyordu.
            .filter(participant => ACTIVE_PARTICIPANT_STATUSES.includes(participant.status))
            .filter(participant => !excludedRegistrationIds.includes(participant.registration_id))
            .map(participant => ({
              event_id: newEvent.id,
              registration_id: participant.registration_id
            }));

          if (participantInserts.length > 0) {
            const { error: participantError } = await supabase
              .from('event_participants')
              .insert(participantInserts);

            if (participantError) throw participantError;
          }
        }

        successCount++;
      }

      // Tüm etkinlikler kopyalandı
      setCopyWeekLoading(false);
      setIsCopyWeekModalOpen(false);

      // Başarı mesajı göster
      if (successCount > 0) {
        let message = `Скопійовано занять: ${successCount}`;
        if (conflictCount > 0) {
          message += `, пропущено через накладання: ${conflictCount}`;
        }
        setToast({
          message,
          type: 'success',
          isVisible: true
        });

        // Etkinlikleri yeniden yükle - mevcut görünüm aralığında
        if (calendarRef.current) {
          const calendarApi = calendarRef.current.getApi();
          await fetchEvents(calendarApi.view.activeStart, calendarApi.view.activeEnd);
        }

        // Takvim görünümünü kopyalanan haftaya çevirme işlemi yerine bildirim göster
        setTargetWeekForNavigation(targetWeekStart);
        setActionNotificationMessage(`Заняття скопійовано на ${format(targetWeekStart, 'dd MMMM yyyy', { locale: uk })} - ${format(addDays(targetWeekStart, 6), 'dd MMMM yyyy', { locale: uk })}.`);
        setIsActionNotificationVisible(true);
      } else if (conflictCount > 0) {
        setToast({
          message: `Копіювання завершено, але ${conflictCount} занять не скопійовано через накладання`,
          type: 'warning',
          isVisible: true
        });
      } else {
        setToast({
          message: 'Немає занять для копіювання',
          type: 'error',
          isVisible: true
        });
      }
    } catch (error) {
      console.error('Hafta kopyalanırken hata:', error);
      setCopyWeekLoading(false);
      setIsCopyWeekModalOpen(false);
      showToast('Помилка під час копіювання тижня: ' + error.message, 'error');
    }
  };

  // Hedef haftaya gitme işlemi
  const navigateToTargetWeek = () => {
    if (targetWeekForNavigation && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(targetWeekForNavigation);
    }
  };

  // Show a saved weekly theme beside the date controls, without an empty banner.
  const activeWeekKey = currentWeekRange
    ? format(startOfWeek(new Date(currentWeekRange), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    : null;
  const activeWeekTheme = activeWeekKey ? weekThemes[activeWeekKey] : null;
  const showWeekTheme = (currentViewType === 'timeGridWeek' || currentViewType === 'timeGridDay') && activeWeekKey;

  return (
    <div className="calendar-page text-[#1d1d1f] dark:text-[#f5f5f7]">
      <header className="calendar-page-header">
        <div className="calendar-heading">
          <h1>{language === 'uk' ? 'Календар' : 'Calendar'}</h1>
          {isOwner && teachers.length > 0 && (
            <select
              value={teacherFilter}
              onChange={(e) => {
                clearLessonPreview();
                setTeacherFilter(e.target.value);
              }}
              aria-label={language === 'uk' ? 'Викладач' : 'Teacher'}
              className="calendar-teacher-filter"
            >
              <option value="">{language === 'uk' ? 'Усі викладачі' : 'All teachers'}</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name || (language === 'uk' ? 'Викладач' : 'Teacher')}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="calendar-header-actions">
          <a
            href="/BrightlySchool/#/rozklad"
            target="_blank"
            rel="noopener noreferrer"
            className="calendar-secondary-button"
          >
            <CalendarDaysIcon aria-hidden="true" />
            <span>{language === 'uk' ? 'Публічний календар' : 'Public Calendar'}</span>
            <ArrowTopRightOnSquareIcon aria-hidden="true" />
          </a>
          {isOwner && <button
            onClick={() => {
              setThemesModalFocusWeek(null);
              setIsThemesModalOpen(true);
            }}
            className="calendar-secondary-button"
          >
            <BookOpenIcon aria-hidden="true" />
            <span>{language === 'uk' ? 'Теми тижнів' : 'Weekly Themes'}</span>
          </button>}
          {isOwner && <button
            onClick={() => {
              setSelectedDate(null);
              setSelectedTime({ hour: '', minute: '' });
              setIsModalOpen(true);
            }}
            className="calendar-primary-button"
          >
            <PlusIcon aria-hidden="true" />
            <span>{language === 'uk' ? 'Нове заняття' : 'New Event'}</span>
          </button>}
        </div>
      </header>

      <div ref={calendarWrapRef} className="calendar-panel relative">
        <div className="calendar-toolbar">
          <div className="calendar-navigation">
            <div className="flex items-center gap-1">
              <button className="calendar-icon-button" onClick={() => calendarRef.current?.getApi().prev()} aria-label={language === 'uk' ? 'Попередній період' : 'Previous period'}>
                <ChevronLeftIcon aria-hidden="true" />
              </button>
              <button className="calendar-today-button" onClick={() => calendarRef.current?.getApi().today()}>
                {language === 'uk' ? 'Сьогодні' : 'Today'}
              </button>
              <button className="calendar-icon-button" onClick={() => calendarRef.current?.getApi().next()} aria-label={language === 'uk' ? 'Наступний період' : 'Next period'}>
                <ChevronRightIcon aria-hidden="true" />
              </button>
            </div>
            <h2 className="calendar-range-title" aria-live="polite">{calendarTitle}</h2>
          </div>
          {showWeekTheme && activeWeekTheme && (
            <div className="calendar-toolbar-theme" title={`${language === 'uk' ? 'Тема тижня' : 'Weekly Theme'}: ${activeWeekTheme}`}>
              <BookOpenIcon aria-hidden="true" />
              <span>{activeWeekTheme}</span>
              {isOwner && <button
                onClick={() => {
                  setThemesModalFocusWeek(activeWeekKey);
                  setIsThemesModalOpen(true);
                }}
                aria-label={language === 'uk' ? 'Редагувати тему тижня' : 'Edit weekly theme'}
              >
                {language === 'uk' ? 'Редагувати' : 'Edit'}
              </button>}
            </div>
          )}
          <div className="calendar-toolbar-tools">
            {isOwner && currentViewType === 'timeGridWeek' && (
              <button className="calendar-copy-button" onClick={handleCopyWeekClick} disabled={copyWeekLoading}>
                <DocumentDuplicateIcon aria-hidden="true" />
                <span>{language === 'uk' ? 'Копіювати тиждень' : 'Copy week'}</span>
              </button>
            )}
            <div className="calendar-view-switch" role="group" aria-label={language === 'uk' ? 'Вигляд календаря' : 'Calendar view'}>
              {[
                ['dayGridMonth', language === 'uk' ? 'Місяць' : 'Month'],
                ['timeGridWeek', language === 'uk' ? 'Тиждень' : 'Week'],
                ['timeGridDay', language === 'uk' ? 'День' : 'Day']
              ].map(([view, label]) => (
                <button key={view} aria-pressed={currentViewType === view} onClick={() => calendarRef.current?.getApi().changeView(view)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                {language === 'uk' ? 'Завантаження...' : 'Loading...'}
              </span>
            </div>
          </div>
        )}

        <div className={`calendar-content${showLessonPreview ? ' has-preview' : ''}`}>
          <div
            className="calendar-schedule"
            onFocusCapture={(event) => {
              const lessonId = event.target.closest('[data-lesson-id]')?.dataset.lessonId;
              if (showLessonPreview && lessonId) {
                cancelPreviewTimer();
                setPreviewEventId(lessonId);
              }
            }}
          >
            {currentViewType === 'timeGridWeek' && width < (showLessonPreview ? 1700 : 1400) && (
              <p className="calendar-scroll-hint">
                {language === 'uk' ? 'Гортайте вбік, щоб переглянути всі дні' : 'Scroll sideways to see all days'}
              </p>
            )}
            <div className="calendar-scroll" tabIndex={currentViewType === 'timeGridWeek' ? 0 : undefined} role="region" aria-label={language === 'uk' ? 'Розклад занять' : 'Lesson schedule'}>
              <div className={`calendar-grid${currentViewType === 'timeGridWeek' ? ' is-week' : ''}`}>
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView={initialView}
                  headerToolbar={false}
                  locale={language === 'uk' ? ukLocale : enLocale}
                  // Ders açma ve sürükleme yalnızca sahipte; öğretmen kendi takvimini
                  // görür ve yoklama alır. Veritabanı da aynı kuralı uyguluyor
                  // (events_insert_owner / events_update_owner).
                  selectable={isOwner}
                  select={handleDateSelect}
                  // Ay görünümünde gün+öğretmen kırılımında toplanmış kartlar,
                  // diğer görünümlerde tek tek dersler
                  events={currentViewType === 'dayGridMonth' ? groupedEvents : coloredEvents}
                  eventClick={handleEventClick}
                  eventMouseEnter={({ event }) => previewLesson(event)}
                  eventMouseLeave={cancelPreviewTimer}
                  eventDidMount={({ event, el }) => {
                    if (!event.extendedProps.isGrouped) {
                      el.dataset.lessonId = event.id;
                    el.setAttribute('role', 'button');
                    }
                  }}
                  eventContent={renderEventContent}
                  viewDidMount={handleViewDidMount}
                  editable={isOwner && currentViewType !== 'dayGridMonth'}
                  eventDurationEditable={false}
                  slotEventOverlap={false}
                  eventDrop={handleEventDrop} // Drag-and-drop handler
                  dragScroll={true} // Auto-scroll during dragging
                  snapDuration={toDuration(SNAP_MINUTES)} // tıklamanın oturduğu ızgara
                  eventDragStart={(info) => info.el.classList.add('event-dragging')} // Add class when dragging starts
                  eventDragStop={(info) => info.el.classList.remove('event-dragging')} // Remove class when dragging ends
                  droppable={true} // For external dragging (can be used in the future)
                  dropAccept=".fc-event" // Accept only events
                  height="auto"
                  firstDay={1}
                  slotMinTime="09:00:00"
                  // 23:00 üst sınır: 22:00'de başlayan ders de takvimde görünsün
                  slotMaxTime="23:00:00"
                  expandRows={true}
                  stickyHeaderDates={true}
                  dayMaxEvents={3}
                  eventTimeFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  }}
                  allDaySlot={false}
                  slotDuration={toDuration(SLOT_MINUTES)}
                  slotLabelInterval="01:00"
                  slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                  dayHeaderContent={(info) => info.view.type === 'dayGridMonth' ? info.text : (
                    <div className={`calendar-day-heading${isSameDay(info.date, new Date()) ? ' is-today' : ''}`}>
                      <span className="calendar-day-name">{format(info.date, 'EEE', { locale: language === 'uk' ? uk : enUS })}</span>
                      <span className="calendar-day-number">{format(info.date, 'dd')}</span>
                    </div>
                  )}
                  datesSet={(dateInfo) => {
                    fetchEvents(dateInfo.start, dateInfo.end);
                    setCurrentWeekRange(dateInfo.start); // Update current week range for copy function
                    fetchWeekThemes(dateInfo.start, dateInfo.end);
                    setCurrentViewType(dateInfo.view.type);
                    setCalendarTitle(dateInfo.view.title);
                    clearLessonPreview();
                  }}
                  eventClassNames={({ event }) => [
                    'calendar-lesson',
                    ...(showLessonPreview && event.id === previewEventId ? ['is-previewed'] : [])
                  ]}
                />
              </div>
            </div>
          </div>
          {showLessonPreview && (
            <CalendarLessonPreview
              event={isLoading ? null : previewEvent}
              language={language}
              weekTheme={previewEvent ? weekThemes[format(startOfWeek(new Date(previewEvent.start), { weekStartsOn: 1 }), 'yyyy-MM-dd')] : null}
              onOpen={openLessonDetails}
            />
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      <CreateEvent
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleCreateEvent}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
      />

      {/* Etkinlik Düzenleme Sheet */}
      <UpdateEventSheet
        isOpen={isUpdateSheetOpen}
        onClose={() => setIsUpdateSheetOpen(false)}
        onSuccess={(message, type = 'success') => {
          setToast({
            message,
            type,
            isVisible: true
          });
          if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            fetchEvents(calendarApi.view.activeStart, calendarApi.view.activeEnd);
          }
        }}
        eventId={selectedEvent}
      />

      {/* Hafta Kopyalama Modal */}
      <CopyWeekModal
        isOpen={isCopyWeekModalOpen}
        onClose={handleCloseCopyWeekModal}
        onConfirm={handleCopyWeek}
        currentWeekStart={currentWeekRange}
        hasConflicts={hasConflictsInTargetWeek}
        precheckStudents={precheckStudents}
        precheckLoading={precheckLoading}
        onExtendStudent={isOwner ? handleExtendFromPrecheck : null}
      />

      {/* Paket Uzatma Modal — CopyWeekModal'ın KARDEŞİ olarak monte edilir.
          İçine konulsaydı her tıklama CopyWeekModal'ın overlay'ine sızıp onu kapatırdı.
          z-50 (ExtendModal) > z-40 (CopyWeekModal) olduğu için üstte çıkar.
          Uzatma finansal kayıt yazar — öğretmende hiç monte edilmez. */}
      {isOwner && (
        <ExtendModal
          isOpen={isExtendModalOpen}
          onClose={() => setIsExtendModalOpen(false)}
          onSuccess={() => {
            // ExtendModal onClose'u onSuccess'ten ÖNCE çağırdığı için kaydı burada
            // null'lamıyoruz. Uzatma sonrası liste yenilenir (uzatılan öğrenci düşer).
            fetchCopyWeekPrecheck(getWeekRegistrationIds(currentWeekRange));
          }}
          registration={extendTargetRegistration}
        />
      )}

      {/* Haftalık Konular Modal */}
      <WeeklyThemesModal
        isOpen={isThemesModalOpen}
        onClose={() => setIsThemesModalOpen(false)}
        focusWeekStart={themesModalFocusWeek}
        onSaved={() => {
          if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            fetchWeekThemes(calendarApi.view.activeStart, calendarApi.view.activeEnd);
          }
        }}
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={closeToast}
      />

      {/* Action Notification */}
      <ActionNotification
        isVisible={isActionNotificationVisible}
        message={actionNotificationMessage}
        actionText={language === 'uk' ? "Перейти до скопійованого тижня" : "Go to Copied Week"}
        onAction={navigateToTargetWeek}
        onClose={() => setIsActionNotificationVisible(false)}
      />
    </div>
  );
};

export default Calendar;
