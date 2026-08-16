import React, { useState, useEffect } from 'react';
import { FiClock, FiUsers, FiCalendar, FiInfo, FiPhone, FiDollarSign, FiPackage } from 'react-icons/fi';
import { FaWhatsapp, FaHryvnia, FaCheck } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { fetchLessonUsageMap } from '../lib/lessonUsage';
import { format } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';
import Masonry from 'react-masonry-css';
import {
  ArrowPathIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

// Velilere giden WhatsApp mesajlarında kullanılan stüdyo bilgileri.
// TEK YER: mesaj metinlerinin içine gömmek yerine buradan besleniyor.
// Müşteriden gerçek değerler alınınca burası doldurulacak.
const STUDIO_NAME = 'Brightly School';
const STUDIO_ADDRESS = '[адреса студії]';
const STUDIO_MAP_URL = '[посилання на карту]';
const LESSON_DURATION = '45-60 хв';

const Home = () => {
  const { t, language } = useLanguage();
  const [tomorrowEvents, setTomorrowEvents] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [expiringSoonPackages, setExpiringSoonPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingToday, setIsLoadingToday] = useState(true);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [sentMessages, setSentMessages] = useState({});
  const [updatingLessonId, setUpdatingLessonId] = useState(null);
  const [lessonUsage, setLessonUsage] = useState({}); // registration_id -> kalan ders bilgisi

  // LocalStorage'dan verileri yükle ve eski tarihleri temizle
  const cleanupOldData = () => {
    const savedMessages = JSON.parse(localStorage.getItem('sentWhatsAppMessages') || '{}');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatı

    // Bugünden önceki tüm tarihleri temizle
    const updatedMessages = {};
    for (const date in savedMessages) {
      if (date >= today) {
        updatedMessages[date] = savedMessages[date];
      }
    }

    localStorage.setItem('sentWhatsAppMessages', JSON.stringify(updatedMessages));
    return updatedMessages;
  };

  // Mesaj durumunu kontrol et
  const isMessageSent = (participantId) => {
    const today = new Date().toISOString().split('T')[0];
    return sentMessages[today]?.includes(participantId) || false;
  };

  // Mesaj durumunu değiştir
  const toggleMessageSent = (participantId, event) => {
    // Tıklama olayı olduğunda event parametresini durdurmamız gerekecek
    if (event) {
      // Burada yalnızca propagasyonu durdur, ancak varsayılan davranışı engelleme
      // çünkü WhatsApp'a gitsin istiyoruz
      event.stopPropagation(); // Event yayılımını engelle
    }

    const today = new Date().toISOString().split('T')[0];
    const updatedMessages = { ...sentMessages };

    if (!updatedMessages[today]) {
      updatedMessages[today] = [];
    }

    // Sadece ekle, zaten tıklama olayı WhatsApp'a yönlendirmek için
    if (!updatedMessages[today].includes(participantId)) {
      updatedMessages[today].push(participantId);
    }

    setSentMessages(updatedMessages);
    localStorage.setItem('sentWhatsAppMessages', JSON.stringify(updatedMessages));

    // Bu fonksiyon artık href'in çalışmasını engellemeyecek
  };

  // Yeni fonksiyon: Sadece mesaj gönderildi olarak işaretle (silme yapma)
  const addMessageSent = (participantId) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedMessages = { ...sentMessages };

    if (!updatedMessages[today]) {
      updatedMessages[today] = [];
    }

    // Eğer zaten mesaj gönderilmişse, tekrar ekleme
    if (!updatedMessages[today].includes(participantId)) {
      updatedMessages[today].push(participantId);
      setSentMessages(updatedMessages);
      localStorage.setItem('sentWhatsAppMessages', JSON.stringify(updatedMessages));
    }
  };

  // Component mount olduğunda lokalden verileri yükle
  useEffect(() => {
    const currentMessages = cleanupOldData();
    setSentMessages(currentMessages);
  }, []);

  // Yarınki dersleri ve katılımcıları çeken fonksiyon
  const fetchTomorrowEvents = async () => {
    setIsLoading(true);

    // Yarının başlangıç ve bitiş tarihlerini hesapla
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    try {
      // Yarınki dersleri sorgula
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', tomorrowStart.toISOString())
        .lte('event_date', tomorrowEnd.toISOString())
        .eq('is_active', true)
        .order('event_date', { ascending: true });

      if (eventsError) throw eventsError;

      // Her ders için katılımcıları getir - ilişkisel sorgu yerine manuel işlemler yapacağız
      const eventsWithParticipants = await Promise.all(events.map(async (event) => {
        // 1. Önce event_participants tablosundan katılımcıları çek - TÜM STATÜLER
        const { data: participants, error: participantsError } = await supabase
          .from('event_participants')
          .select('*')
          .eq('event_id', event.id)
          .order('created_at');

        if (participantsError) throw participantsError;

        // Katılımcı yoksa, hemen boş bir dizi döndür
        if (!participants || participants.length === 0) {
          return {
            ...event,
            participants: []
          };
        }

        // 2. Katılımcıların registration_id'lerini çıkar
        const registrationIds = participants.map(p => p.registration_id);

        // 3. Bu registration_id'ler için registrations tablosundan bilgileri çek
        const { data: registrations, error: registrationsError } = await supabase
          .from('registrations')
          .select('id, student_name, student_age, parent_name, parent_phone, package_type, package_start_date')
          .in('id', registrationIds);

        if (registrationsError) throw registrationsError;

        // 4. Kayıt bilgilerini katılımcılarla birleştir
        const participantsWithDetails = participants.map(participant => {
          const registration = registrations.find(r => r.id === participant.registration_id);
          return {
            ...participant,
            registrations: registration // Yapı önceki ile uyumlu olması için "registrations" olarak bırakıyoruz
          };
        });

        return {
          ...event,
          participants: participantsWithDetails || []
        };
      }));

      setTomorrowEvents(eventsWithParticipants);
      await refreshLessonUsageForEvents(eventsWithParticipants);
    } catch (error) {
      console.error('Yarınki dersler çekilirken hata oluştu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Bugünkü dersleri ve katılımcıları çeken fonksiyon
  const fetchTodayEvents = async () => {
    setIsLoadingToday(true);

    // Bugünün başlangıç ve bitiş tarihlerini hesapla
    const today = new Date();

    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    try {
      // Bugünkü dersleri sorgula
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', todayStart.toISOString())
        .lte('event_date', todayEnd.toISOString())
        .eq('is_active', true)
        .order('event_date', { ascending: true });

      if (eventsError) throw eventsError;

      // Her ders için katılımcıları getir - ilişkisel sorgu yerine manuel işlemler yapacağız
      const eventsWithParticipants = await Promise.all(events.map(async (event) => {
        // 1. Önce event_participants tablosundan katılımcıları çek - TÜM STATÜLER
        const { data: participants, error: participantsError } = await supabase
          .from('event_participants')
          .select('*')
          .eq('event_id', event.id)
          .order('created_at');

        if (participantsError) throw participantsError;

        // Katılımcı yoksa, hemen boş bir dizi döndür
        if (!participants || participants.length === 0) {
          return {
            ...event,
            participants: []
          };
        }

        // 2. Katılımcıların registration_id'lerini çıkar
        const registrationIds = participants.map(p => p.registration_id);

        // 3. Bu registration_id'ler için registrations tablosundan bilgileri çek
        const { data: registrations, error: registrationsError } = await supabase
          .from('registrations')
          .select('id, student_name, student_age, parent_name, parent_phone, package_type, package_start_date')
          .in('id', registrationIds);

        if (registrationsError) throw registrationsError;

        // 4. Kayıt bilgilerini katılımcılarla birleştir
        const participantsWithDetails = participants.map(participant => {
          const registration = registrations.find(r => r.id === participant.registration_id);
          return {
            ...participant,
            registrations: registration // Yapı önceki ile uyumlu olması için "registrations" olarak bırakıyoruz
          };
        });

        return {
          ...event,
          participants: participantsWithDetails || []
        };
      }));

      setTodayEvents(eventsWithParticipants);
      await refreshLessonUsageForEvents(eventsWithParticipants);
    } catch (error) {
      console.error('Bugünkü dersler çekilirken hata oluştu:', error);
    } finally {
      setIsLoadingToday(false);
    }
  };

  // Ödemesi bekleyen kayıtları çeken fonksiyon
  const fetchPendingPayments = async () => {
    setIsLoadingPayments(true);

    try {
      // Ödemesi beklemede olan kayıtları çek
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('payment_status', 'beklemede')
        .neq('package_type', 'ucretsiz') // Ücretsiz katılımlarda ödeme beklenmez
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingPayments(data || []);
    } catch (error) {
      console.error('Bekleyen ödemeler çekilirken hata oluştu:', error);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  // Yakında sona erecek paketleri çeken fonksiyon
  const fetchExpiringSoonPackages = async () => {
    setIsLoadingPackages(true);

    try {
      // Bitiş tarihine 7 gün kalan paketleri çek
      const today = new Date();
      const cutoffDate = new Date(today);
      cutoffDate.setDate(today.getDate() + 7); // Önümüzdeki 7 gün içinde bitecek olanlar

      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .lte('package_end_date', cutoffDate.toISOString())
        .gte('package_end_date', today.toISOString()) // Bugün ve sonrası (zaten bitmiş olanları gösterme)
        .neq('package_type', 'ucretsiz') // Ücretsiz katılımda paket bitiş tarihi uygulanmaz
        .order('package_end_date', { ascending: true });

      if (error) throw error;

      setExpiringSoonPackages(data || []);
    } catch (error) {
      console.error('Bitiş tarihi yaklaşan paketler çekilirken hata oluştu:', error);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  // Etkinliklerdeki benzersiz kayıtlar için kalan ders haritasını günceller (tek toplu sorgu)
  const refreshLessonUsageForEvents = async (eventsWithParticipants) => {
    try {
      const uniqueRegistrations = [];
      const seenIds = new Set();
      eventsWithParticipants.forEach(event => {
        event.participants.forEach(participant => {
          const registration = participant.registrations;
          if (registration && registration.id && !seenIds.has(registration.id)) {
            seenIds.add(registration.id);
            uniqueRegistrations.push(registration);
          }
        });
      });

      if (uniqueRegistrations.length === 0) return;

      const usageMap = await fetchLessonUsageMap(uniqueRegistrations);
      setLessonUsage(prev => ({ ...prev, ...usageMap }));
    } catch (error) {
      // Rozet gösterilemese de ders listeleri çalışmaya devam etmeli
      console.error('Kalan ders bilgisi getirilirken hata oluştu:', error);
    }
  };

  // Kalan ders rozeti (kullanılan = katıldı + gelmedi, güncel paket dönemi — bkz. src/lib/lessonUsage.js)
  const renderRemainingBadge = (participant) => {
    const usage = lessonUsage[participant.registration_id];
    if (!usage) return null;

    // Ücretsiz katılımda kota yok — eşik kontrollerinden ÖNCE (null <= 0 true döner)
    if (usage.isFree) {
      return (
        <span className="inline-flex items-center w-fit mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 ring-inset bg-gray-400/10 text-gray-700 ring-gray-500/20 dark:bg-gray-400/10 dark:text-gray-300 dark:ring-gray-400/20">
          {language === 'en' ? 'Free' : 'Безкоштовно'}
        </span>
      );
    }

    const colorClass = usage.remaining <= 0
      ? 'bg-red-400/10 text-red-700 ring-red-500/20 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20'
      : usage.remaining <= 2
        ? 'bg-amber-400/10 text-amber-700 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20'
        : 'bg-emerald-400/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20';

    return (
      <span className={`inline-flex items-center w-fit mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 ring-inset ${colorClass}`}>
        {language === 'en'
          ? `${usage.remaining} lessons left`
          : `Залишилось занять: ${usage.remaining}`}
      </span>
    );
  };

  // Ders statüsünü güncelleyen fonksiyon
  const updateLessonStatus = async (participant, newStatus) => {
    const lessonId = participant.id;
    try {
      setUpdatingLessonId(lessonId);

      // Optimistik UI güncellemesi - API çağrısından önce UI'ı güncelle
      // Bu sayede sayfa yeniden yüklenmeyecek ve kullanıcı aynı yerde kalacak
      setTodayEvents(prevEvents => {
        return prevEvents.map(event => {
          // Etkinliğin katılımcıları arasında güncellenen katılımcıyı bul
          const updatedParticipants = event.participants.map(participant => {
            if (participant.id === lessonId) {
              // Sadece ilgili katılımcının durumunu güncelle
              return { ...participant, status: newStatus };
            }
            return participant;
          });

          // Etkinliği güncellenen katılımcılarla birlikte döndür
          return { ...event, participants: updatedParticipants };
        });
      });

      // Optimistik güncelleme sonrası, backend'i güncelle
      const { error } = await supabase
        .from('event_participants')
        .update({ status: newStatus })
        .eq('id', lessonId);

      if (error) {
        // Hata durumunda, eski verileri geri getirmek için fetchTodayEvents() çağrılabilir
        console.error('Ders statüsü güncellenirken hata oluştu:', error);
        fetchTodayEvents(); // Sadece hata durumunda yeniden verileri çek
      } else if (participant.registrations) {
        // Katıldı/Gelmedi kalan dersi etkiler — sadece bu kaydın kullanımını yenile
        // (delta yerine hedefli refetch: kota aşımındaki 0'a sabitleme delta ile yanlış sonuç verir)
        const usageMap = await fetchLessonUsageMap([participant.registrations]);
        setLessonUsage(prev => ({ ...prev, ...usageMap }));
      }

    } catch (error) {
      console.error('Ders statüsü güncellenirken hata oluştu:', error);
      fetchTodayEvents(); // Sadece hata durumunda yeniden verileri çek
    } finally {
      setUpdatingLessonId(null);
    }
  };

  useEffect(() => {
    fetchTomorrowEvents();
    fetchTodayEvents();
    fetchPendingPayments();
    fetchExpiringSoonPackages();
  }, []);

  // Format date based on selected language
  const formatDate = (date, formatStr) => {
    return format(date, formatStr, { locale: language === 'uk' ? uk : enUS });
  };

  // Etkinlik türüne göre renkler
  const eventTypeColors = {
    'ingilizce': 'bg-[#0071e3]/10 text-[#0071e3] ring-1 ring-[#0071e3]/20',
    'duyusal': 'bg-[#ac39ff]/10 text-[#ac39ff] ring-1 ring-[#ac39ff]/20',
    'ozel': 'bg-[#ff9500]/10 text-[#ff9500] ring-1 ring-[#ff9500]/20'
  };

  // Event type labels with translations
  const eventTypeLabels = {
    'ingilizce': language === 'en' ? 'English' : 'Англійська',
    'duyusal': language === 'en' ? 'Sensory' : 'Сенсорика',
    'ozel': language === 'en' ? 'Special Event' : 'Індивідуальне заняття'
  };

  // Etkinlik türüne göre ikonlar
  const eventTypeIcons = {
    'ingilizce': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg>,
    'duyusal': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>,
    'ozel': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
  };

  // Yarın için tarih formatını hazırla
  const tomorrowDateString = formatDate(
    new Date(new Date().setDate(new Date().getDate() + 1)),
    'd MMMM EEEE'
  );

  // Bugün için tarih formatını hazırla
  const todayDateString = formatDate(new Date(), 'd MMMM EEEE');

  // Masonry breakpoints
  const breakpointColumns = {
    default: 4,
    1536: 3,
    1280: 2,
    768: 1,
    640: 1
  };

  // Duruma göre renk ve etiket tanımlamaları ekleyelim
  const statusColors = {
    'scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-300 dark:border-blue-800/50',
    'attended': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-300 dark:border-green-800/50',
    'no_show': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-300 dark:border-red-800/50',
    'canceled': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border border-gray-300 dark:border-gray-800/50',
    'makeup': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-300 dark:border-purple-800/50',
    'postponed': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50'
  };

  const statusLabels = {
    'scheduled': { uk: 'Заплановано', en: 'Scheduled' },
    'attended': { uk: 'Відвідав', en: 'Joined' },
    'no_show': { uk: 'Не зʼявився', en: 'Absent' },
    'canceled': { uk: 'Скасовано', en: 'Canceled' },
    'makeup': { uk: 'Відпрацювання', en: 'Makeup' },
    'postponed': { uk: 'Перенесено', en: 'Delayed' }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between h-auto sm:h-16 px-6 border-b border-[#d2d2d7] dark:border-[#2a3241] py-4 sm:py-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl font-medium text-[#1d1d1f] dark:text-white">
            {language === 'en' ? 'Home' : 'Головна'}
          </h1>
        </div>
        <div className="flex items-center">
          <div className="text-sm text-[#6e6e73] dark:text-[#86868b]">
            {language === 'en' ? 'Today: ' : 'Сьогодні: '}
            <span className="font-semibold text-[#1d1d1f] dark:text-white">
              {formatDate(new Date(), 'd MMMM yyyy')}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Yarınki Dersler Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center self-start sm:self-center">
              <CalendarDaysIcon className="h-4 w-4 text-[#0071e3]" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center">
              <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">
                {language === 'en' ? 'Tomorrow\'s Lessons' : 'Завтрашні заняття'}
              </h2>
              <span className="text-sm text-[#6e6e73] dark:text-[#86868b] capitalize sm:ml-2">
                ({tomorrowDateString})
              </span>
            </div>
          </div>
          <button
            onClick={fetchTomorrowEvents}
            className="flex items-center gap-1.5 text-[#0071e3] hover:text-[#0077ED] text-sm font-medium"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>{language === 'en' ? 'Refresh' : 'Оновити'}</span>
          </button>
        </div>

        {isLoading ? (
          // Loading State
          <Masonry
            breakpointCols={breakpointColumns}
            className="flex -ml-6 w-auto"
            columnClassName="pl-6"
          >
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="mb-6 bg-white dark:bg-[#121621] rounded-xl p-5 border border-[#d2d2d7] dark:border-[#2a3241] relative overflow-hidden"
              >
                {/* Kart Başlığı */}
                <div className="flex items-start justify-between pb-4 border-b border-[#d2d2d7] dark:border-[#2a3241]">
                  <div>
                    <div className="h-[18px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-32 relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                    </div>
                    <div className="h-[16px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-20 mt-1.5 relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                    </div>
                  </div>
                  <div className="h-[26px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-lg w-24 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                  </div>
                </div>

                {/* Placeholder İçerik */}
                <div className="mt-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                      <div className="flex-1 h-5 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Masonry>
        ) : tomorrowEvents.length === 0 ? (
          // Boş State
          <div className="text-center py-12 bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241]">
            <CalendarDaysIcon className="w-12 h-12 mx-auto text-[#86868b] mb-4" />
            <h3 className="text-lg font-medium text-[#1d1d1f] dark:text-white mb-1">
              {language === 'en' ? 'No lessons for tomorrow' : 'На завтра занять немає'}
            </h3>
            <p className="text-sm text-[#6e6e73] dark:text-[#86868b] max-w-md mx-auto">
              {language === 'en'
                ? 'There are no lessons scheduled for tomorrow. You can add new lessons from the Calendar page.'
                : 'На завтра не заплановано жодного заняття. Нове заняття можна додати в календарі.'}
            </p>
          </div>
        ) : (
          // Dersler
          <Masonry
            breakpointCols={breakpointColumns}
            className="flex -ml-6 w-auto"
            columnClassName="pl-6"
          >
            {tomorrowEvents.map((event) => (
              <div
                key={event.id}
                className="mb-6 group bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] hover:shadow-lg dark:hover:shadow-[#0071e3]/10 transition-all duration-200 relative overflow-hidden"
              >
                <div className="p-5">
                  {/* Kart Başlığı */}
                  <div className="flex items-start justify-between pb-4 border-b border-[#d2d2d7] dark:border-[#2a3241]">
                    <div>
                      <h3 className="text-[15px] font-medium text-[#1d1d1f] dark:text-white flex items-center gap-2">
                        {formatDate(new Date(event.event_date), 'HH:mm')}
                        <span className="text-[#6e6e73] dark:text-[#86868b]">|</span>
                        {event.age_group}
                      </h3>
                      <p className="text-[13px] text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                        {language === 'en' ? 'Capacity: ' : 'Місць: '}
                        {event.participants.filter(p => p.status === 'scheduled' || p.status === 'makeup' || p.status === 'attended').length}/6
                      </p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium ${eventTypeColors[event.event_type]}`}>
                      {eventTypeIcons[event.event_type]}
                    </div>
                  </div>

                  {/* Açıklama (varsa) */}
                  {event.custom_description && (
                    <div className="mt-4 mb-4 text-[13px] text-[#424245] dark:text-[#86868b] bg-[#f5f5f7] dark:bg-[#1c1c1e]/40 p-3 rounded-lg">
                      <div className="flex gap-2">
                        <FiInfo className="w-[18px] h-[18px] shrink-0 text-[#0071e3]" />
                        <p>{event.custom_description}</p>
                      </div>
                    </div>
                  )}

                  {/* Katılımcılar */}
                  <div className="mt-4">
                    <h4 className="text-[13px] font-medium text-[#1d1d1f] dark:text-white flex items-center gap-1.5 mb-3">
                      <FiUsers className="w-4 h-4 text-[#0071e3]" />
                      {language === 'en' ? 'Participants' : 'Учасники'}
                    </h4>

                    {event.participants.length === 0 ? (
                      <p className="text-[13px] text-[#6e6e73] dark:text-[#86868b] italic">
                        {language === 'en' ? 'No participants yet' : 'Учасників ще немає'}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {event.participants.map((participant) => (
                          <div
                            key={participant.id}
                            className="p-3 bg-[#f5f5f7] dark:bg-[#1c1c1e]/40 rounded-lg"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-[#0071e3]/10 flex items-center justify-center text-[#0071e3] text-xs font-medium">
                                    {participant.registrations.student_name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">
                                        {participant.registrations.student_name}
                                        <span className="ml-1.5 text-[11px] text-[#6e6e73] dark:text-[#86868b] font-normal">
                                          ({participant.registrations.student_age})
                                        </span>
                                      </p>
                                    </div>
                                    <p className="text-[11px] text-[#6e6e73] dark:text-[#86868b]">
                                      {language === 'en' ? 'Parent: ' : 'Батьки: '}{participant.registrations.parent_name}
                                    </p>
                                    {renderRemainingBadge(participant)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Statü Etiketi */}
                                <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center justify-center ${statusColors[participant.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                                  {statusLabels[participant.status]?.[language] || participant.status}
                                </span>

                                {/* WhatsApp butonu - sadece scheduled durumdaki öğrenciler için gösterilsin */}
                                {participant.status === 'scheduled' && (
                                  <a
                                    href={`https://wa.me/380${participant.registrations.parent_phone.replace(/\D/g, '').replace(/^0+/, '')}?text=${encodeURIComponent(`Доброго дня, ${participant.registrations.parent_name}!
Ми дуже раді, що ваша дитина приєднається до нашого заняття. Ось деталі запису:
* Дата заняття: ${format(new Date(event.event_date), 'd MMMM yyyy', { locale: uk })} (завтра)
* Час: ${format(new Date(event.event_date), 'HH:mm', { locale: uk })}
* Заняття: ${eventTypeLabels[event.event_type]}
* Місце: ${STUDIO_ADDRESS}
* Карта: ${STUDIO_MAP_URL}
* Тривалість: ${LESSON_DURATION}
Ми подбали про безпеку дітей під час заняття. Будь ласка, вдягніть дитину у зручний одяг і візьміть із собою пляшечку води та невеликий перекус. Радимо також взяти змінний одяг або фартух для творчості.
Якщо потрібно скасувати запис, повідомте нас, будь ласка, за день до заняття. Просимо приходити вчасно.
Якщо у вас виникнуть запитання, звертайтеся до нас.
З нетерпінням чекаємо на вас із дитиною!
З любовʼю,
${STUDIO_NAME}`)}`}
                                    onClick={(e) => toggleMessageSent(participant.id, e)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-8 h-8 rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] hover:bg-[#e5e5e5] dark:hover:bg-[#3a4251] flex items-center justify-center text-[#34c759] border border-[#d2d2d7] dark:border-[#2a3241] transition-colors relative"
                                    title={language === 'en' ? 'Send Reminder via WhatsApp' : 'Надіслати нагадування у WhatsApp'}
                                  >
                                    <FaWhatsapp className="w-4 h-4" />
                                    {isMessageSent(participant.id) && (
                                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-white dark:bg-[#2a3241] rounded-full flex items-center justify-center border border-[#d2d2d7] dark:border-[#1c1c1e]">
                                        <FaCheck className="w-2 h-2 text-[#34c759]" />
                                      </div>
                                    )}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </Masonry>
        )}

        {/* Bugünkü Dersler Header */}
        <div className="flex items-center justify-between mb-6 mt-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ff9500]/10 border border-[#ff9500]/20 flex items-center justify-center self-start sm:self-center">
              <FiClock className="h-4 w-4 text-[#ff9500]" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center">
              <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">
                {language === 'en' ? 'Today\'s Lessons' : 'Сьогоднішні заняття'}
              </h2>
              <span className="text-sm text-[#6e6e73] dark:text-[#86868b] capitalize sm:ml-2">
                ({todayDateString})
              </span>
            </div>
          </div>
          <button
            onClick={fetchTodayEvents}
            className="flex items-center gap-1.5 text-[#ff9500] hover:text-[#ffA520] text-sm font-medium"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>{language === 'en' ? 'Refresh' : 'Оновити'}</span>
          </button>
        </div>

        {isLoadingToday ? (
          // Loading State
          <Masonry
            breakpointCols={breakpointColumns}
            className="flex -ml-6 w-auto"
            columnClassName="pl-6"
          >
            {[...Array(2)].map((_, index) => (
              <div
                key={index}
                className="mb-6 bg-white dark:bg-[#121621] rounded-xl p-5 border border-[#d2d2d7] dark:border-[#2a3241] relative overflow-hidden"
              >
                {/* Kart Başlığı */}
                <div className="flex items-start justify-between pb-4 border-b border-[#d2d2d7] dark:border-[#2a3241]">
                  <div>
                    <div className="h-[18px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-32 relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                    </div>
                    <div className="h-[16px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-20 mt-1.5 relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                    </div>
                  </div>
                  <div className="h-[26px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-lg w-24 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                  </div>
                </div>

                {/* Placeholder İçerik */}
                <div className="mt-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                      <div className="flex-1 h-5 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Masonry>
        ) : todayEvents.length === 0 ? (
          // Boş State
          <div className="text-center py-12 bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241]">
            <FiClock className="w-12 h-12 mx-auto text-[#86868b] mb-4" />
            <h3 className="text-lg font-medium text-[#1d1d1f] dark:text-white mb-1">
              {language === 'en' ? 'No lessons for today' : 'На сьогодні занять немає'}
            </h3>
            <p className="text-sm text-[#6e6e73] dark:text-[#86868b] max-w-md mx-auto">
              {language === 'en'
                ? 'There are no lessons scheduled for today. You can add new lessons from the Calendar page.'
                : 'На сьогодні не заплановано жодного заняття. Нове заняття можна додати в календарі.'}
            </p>
          </div>
        ) : (
          // Dersler
          <Masonry
            breakpointCols={breakpointColumns}
            className="flex -ml-6 w-auto"
            columnClassName="pl-6"
          >
            {todayEvents.map((event) => (
              <div
                key={event.id}
                className="mb-6 group bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#ff9500] dark:hover:border-[#ff9500] hover:shadow-lg dark:hover:shadow-[#ff9500]/10 transition-all duration-200 relative overflow-hidden"
              >
                <div className="p-5">
                  {/* Kart Başlığı */}
                  <div className="flex items-start justify-between pb-4 border-b border-[#d2d2d7] dark:border-[#2a3241]">
                    <div>
                      <h3 className="text-[15px] font-medium text-[#1d1d1f] dark:text-white flex items-center gap-2">
                        {formatDate(new Date(event.event_date), 'HH:mm')}
                        <span className="text-[#6e6e73] dark:text-[#86868b]">|</span>
                        {event.age_group}
                      </h3>
                      <p className="text-[13px] text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                        {language === 'en' ? 'Capacity: ' : 'Місць: '}
                        {event.participants.filter(p => p.status === 'scheduled' || p.status === 'makeup' || p.status === 'attended').length}/6
                      </p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium ${eventTypeColors[event.event_type]}`}>
                      {eventTypeIcons[event.event_type]}
                    </div>
                  </div>

                  {/* Açıklama (varsa) */}
                  {event.custom_description && (
                    <div className="mt-4 mb-4 text-[13px] text-[#424245] dark:text-[#86868b] bg-[#f5f5f7] dark:bg-[#1c1c1e]/40 p-3 rounded-lg">
                      <div className="flex gap-2">
                        <FiInfo className="w-[18px] h-[18px] shrink-0 text-[#ff9500]" />
                        <p>{event.custom_description}</p>
                      </div>
                    </div>
                  )}

                  {/* Katılımcılar */}
                  <div className="mt-4">
                    <h4 className="text-[13px] font-medium text-[#1d1d1f] dark:text-white flex items-center gap-1.5 mb-3">
                      <FiUsers className="w-4 h-4 text-[#ff9500]" />
                      {language === 'en' ? 'Participants' : 'Учасники'}
                    </h4>

                    {event.participants.length === 0 ? (
                      <p className="text-[13px] text-[#6e6e73] dark:text-[#86868b] italic">
                        {language === 'en' ? 'No participants yet' : 'Учасників ще немає'}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {event.participants.map((participant) => (
                          <div
                            key={participant.id}
                            className="p-3 bg-[#f5f5f7] dark:bg-[#1c1c1e]/40 rounded-lg"
                          >
                            <div className="flex flex-col">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-[#ff9500]/10 flex items-center justify-center text-[#ff9500] text-xs font-medium">
                                      {participant.registrations.student_name.charAt(0)}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">
                                          {participant.registrations.student_name}
                                          <span className="ml-1.5 text-[11px] text-[#6e6e73] dark:text-[#86868b] font-normal">
                                            ({participant.registrations.student_age})
                                          </span>
                                        </p>
                                      </div>
                                      <p className="text-[11px] text-[#6e6e73] dark:text-[#86868b]">
                                        {language === 'en' ? 'Parent: ' : 'Батьки: '}{participant.registrations.parent_name}
                                      </p>
                                      {renderRemainingBadge(participant)}
                                    </div>
                                  </div>
                                </div>
                                {/* Statü Etiketi - Sağ Üst Köşeye Taşındı */}
                                <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center justify-center ${statusColors[participant.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                                  {statusLabels[participant.status]?.[language] || participant.status}
                                </span>
                              </div>

                              {/* Statü Butonları - Planlandı butonu kaldırıldı */}
                              <div className="grid grid-cols-2 sm:flex sm:flex-row items-center justify-center gap-2 mt-1 w-full">
                                <button
                                  onClick={() => updateLessonStatus(participant, 'attended')}
                                  disabled={updatingLessonId === participant.id}
                                  className={`flex-1 px-3 py-1 text-[11px] font-medium rounded-full border transition ${participant.status === 'attended'
                                      ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300 dark:bg-[#1c1c1e]/40 dark:text-gray-300 dark:border-gray-700'
                                    }`}
                                >
                                  {language === 'en' ? 'Joined' : 'Відвідав'}
                                </button>
                                <button
                                  onClick={() => updateLessonStatus(participant, 'no_show')}
                                  disabled={updatingLessonId === participant.id}
                                  className={`flex-1 px-3 py-1 text-[11px] font-medium rounded-full border transition ${participant.status === 'no_show'
                                      ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:bg-[#1c1c1e]/40 dark:text-gray-300 dark:border-gray-700'
                                    }`}
                                >
                                  {language === 'en' ? 'Absent' : 'Не зʼявився'}
                                </button>
                                <button
                                  onClick={() => updateLessonStatus(participant, 'postponed')}
                                  disabled={updatingLessonId === participant.id}
                                  className={`flex-1 px-3 py-1 text-[11px] font-medium rounded-full border transition ${participant.status === 'postponed'
                                      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 dark:bg-[#1c1c1e]/40 dark:text-gray-300 dark:border-gray-700'
                                    }`}
                                >
                                  {language === 'en' ? 'Delayed' : 'Перенесено'}
                                </button>
                                <button
                                  onClick={() => updateLessonStatus(participant, 'makeup')}
                                  disabled={updatingLessonId === participant.id}
                                  className={`flex-1 px-3 py-1 text-[11px] font-medium rounded-full border transition ${participant.status === 'makeup'
                                      ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 dark:bg-[#1c1c1e]/40 dark:text-gray-300 dark:border-gray-700'
                                    }`}
                                >
                                  {language === 'en' ? 'Makeup' : 'Відпрацювання'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </Masonry>
        )}

        {/* Dashboard Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          {/* Bekleyen Ödemeler Bölümü */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center">
                  <FaHryvnia className="h-4 w-4 text-[#0071e3]" />
                </div>
                <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">
                  {language === 'en' ? 'Pending Payments' : 'Очікувані платежі'}
                </h2>
              </div>
              <button
                onClick={fetchPendingPayments}
                className="flex items-center gap-1.5 text-[#0071e3] hover:text-[#0077ED] text-sm font-medium"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <span>{language === 'en' ? 'Refresh' : 'Оновити'}</span>
              </button>
            </div>

            {isLoadingPayments ? (
              // Loading State
              <div className="bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241]">
                <div className="p-5 border-b border-[#d2d2d7] dark:border-[#2a3241]">
                  <div className="h-[18px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-48 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                  </div>
                </div>

                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-5 flex items-center justify-between border-b border-[#d2d2d7] dark:border-[#2a3241] last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                      <div>
                        <div className="h-5 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-40 mb-1.5 relative overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                        </div>
                        <div className="h-4 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-24 relative overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-full w-8 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingPayments.length === 0 ? (
              // Boş State
              <div className="text-center py-12 bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241]">
                <FaHryvnia className="w-12 h-12 mx-auto text-[#86868b] mb-4" />
                <h3 className="text-lg font-medium text-[#1d1d1f] dark:text-white mb-1">
                  {language === 'en' ? 'No pending payments' : 'Немає очікуваних платежів'}
                </h3>
                <p className="text-sm text-[#6e6e73] dark:text-[#86868b] max-w-md mx-auto">
                  {language === 'en' ? 'All registration payments seem to be completed.' : 'Усі платежі сплачено.'}
                </p>
              </div>
            ) : (
              // Bekleyen Ödemeler Listesi
              <div className="bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] overflow-hidden">
                <div className="p-4 sm:px-6 border-b border-[#d2d2d7] dark:border-[#2a3241] bg-[#f5f5f7] dark:bg-[#1c1c1e]/40">
                  <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                    {language === 'en' ? `Total ${pendingPayments.length} pending payments` : `Всього очікуваних платежів: ${pendingPayments.length}`}
                  </h3>
                </div>

                <div className="max-h-[350px] overflow-y-auto">
                  {pendingPayments.map((registration) => (
                    <div
                      key={registration.id}
                      className="p-4 sm:px-6 py-4 flex items-center justify-between border-b border-[#d2d2d7] dark:border-[#2a3241] last:border-b-0 hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c1e]/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#ff9500]/10 flex items-center justify-center text-[#ff9500] text-sm font-medium">
                          {registration.student_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white flex items-center gap-2">
                            {registration.student_name}
                            <span className="text-[13px] text-[#6e6e73] dark:text-[#86868b] font-normal">
                              ({registration.student_age})
                            </span>
                          </p>
                          <p className="text-[13px] text-[#6e6e73] dark:text-[#86868b]">
                            {language === 'en' ? 'Parent: ' : 'Батьки: '}{registration.parent_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/380${registration.parent_phone.replace(/\D/g, '').replace(/^0+/, '')}?text=${encodeURIComponent(`Доброго дня, ${registration.parent_name}! Нагадуємо, що очікуємо оплату за ${registration.student_name}. Дякуємо!`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] hover:bg-[#e5e5e5] dark:hover:bg-[#3a4251] flex items-center justify-center text-[#34c759] border border-[#d2d2d7] dark:border-[#2a3241] transition-colors"
                          title={language === 'en' ? 'Send Payment Reminder via WhatsApp' : 'Надіслати нагадування про оплату у WhatsApp'}
                        >
                          <FaWhatsapp className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Paket Süresi Bitmeye Yaklaşanlar Bölümü */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ac39ff]/10 border border-[#ac39ff]/20 flex items-center justify-center">
                  <FiPackage className="h-4 w-4 text-[#ac39ff]" />
                </div>
                <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">
                  {language === 'en' ? 'Packages Expiring Soon' : 'Абонементи, що завершуються'}
                </h2>
              </div>
              <button
                onClick={fetchExpiringSoonPackages}
                className="flex items-center gap-1.5 text-[#ac39ff] hover:text-[#b54aff] text-sm font-medium"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <span>{language === 'en' ? 'Refresh' : 'Оновити'}</span>
              </button>
            </div>

            {isLoadingPackages ? (
              // Loading State
              <div className="bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241]">
                <div className="p-5 border-b border-[#d2d2d7] dark:border-[#2a3241]">
                  <div className="h-[18px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-48 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                  </div>
                </div>

                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-5 flex items-center justify-between border-b border-[#d2d2d7] dark:border-[#2a3241] last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                      <div>
                        <div className="h-5 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-40 mb-1.5 relative overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                        </div>
                        <div className="h-4 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-24 relative overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-full w-8 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : expiringSoonPackages.length === 0 ? (
              // Boş State
              <div className="text-center py-12 bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241]">
                <FiPackage className="w-12 h-12 mx-auto text-[#86868b] mb-4" />
                <h3 className="text-lg font-medium text-[#1d1d1f] dark:text-white mb-1">
                  {language === 'en' ? 'No packages expiring in the next 7 days' : 'Немає абонементів, що завершуються протягом 7 днів'}
                </h3>
                <p className="text-sm text-[#6e6e73] dark:text-[#86868b] max-w-md mx-auto">
                  {language === 'en' ? 'There are no packages expiring in the next 7 days.' : 'Немає абонементів, що завершуються протягом 7 днів.'}
                </p>
              </div>
            ) : (
              // Yakında Bitecek Paketler Listesi
              <div className="bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] overflow-hidden">
                <div className="p-4 sm:px-6 border-b border-[#d2d2d7] dark:border-[#2a3241] bg-[#f5f5f7] dark:bg-[#1c1c1e]/40">
                  <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                    {language === 'en'
                      ? `Total ${expiringSoonPackages.length} upcoming package expiration${expiringSoonPackages.length !== 1 ? 's' : ''}`
                      : `Всього абонементів, що завершуються: ${expiringSoonPackages.length}`}
                  </h3>
                </div>

                <div className="max-h-[350px] overflow-y-auto">
                  {expiringSoonPackages.map((registration) => {
                    // Kalan gün sayısını hesapla
                    const endDate = new Date(registration.package_end_date);
                    const today = new Date();
                    const diffTime = Math.abs(endDate - today);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    // Aciliyet seviyesine göre renk belirle
                    let urgencyColor = "text-[#34c759]"; // Yeşil (daha çok zaman var)
                    if (diffDays <= 3) {
                      urgencyColor = "text-[#ff3b30]"; // Kırmızı (çok az zaman kaldı)
                    } else if (diffDays <= 7) {
                      urgencyColor = "text-[#ff9500]"; // Turuncu (az zaman kaldı)
                    }

                    return (
                      <div
                        key={registration.id}
                        className="p-4 sm:px-6 py-4 flex items-center justify-between border-b border-[#d2d2d7] dark:border-[#2a3241] last:border-b-0 hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c1e]/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#ac39ff]/10 flex items-center justify-center text-[#ac39ff] text-sm font-medium">
                            {registration.student_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white flex items-center gap-2">
                              {registration.student_name}
                              <span className="text-[13px] text-[#6e6e73] dark:text-[#86868b] font-normal">
                                ({registration.student_age})
                              </span>
                            </p>
                            <div className="flex items-center gap-2">
                              <p className={`text-[13px] ${urgencyColor} font-medium`}>
                                {language === 'en' ? `${diffDays} day${diffDays !== 1 ? 's' : ''} left` : `Залишилось днів: ${diffDays}`}
                              </p>
                              <span className="text-[11px] text-[#6e6e73] dark:text-[#86868b]">
                                ({formatDate(endDate, 'd MMMM yyyy')})
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://wa.me/380${registration.parent_phone.replace(/\D/g, '').replace(/^0+/, '')}?text=${encodeURIComponent(`Доброго дня, ${registration.parent_name}! Нагадуємо, що абонемент для ${registration.student_name} завершується ${format(endDate, 'd MMMM yyyy', { locale: uk })}. Дякуємо!`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] hover:bg-[#e5e5e5] dark:hover:bg-[#3a4251] flex items-center justify-center text-[#34c759] border border-[#d2d2d7] dark:border-[#2a3241] transition-colors"
                            title={language === 'en' ? 'Send Package Expiration Info via WhatsApp' : 'Надіслати інформацію про завершення абонемента у WhatsApp'}
                          >
                            <FaWhatsapp className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 