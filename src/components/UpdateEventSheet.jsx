import React, { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { supabase } from '../lib/supabase'
import AttendanceList from './AttendanceList'
import { useTeachers } from '../hooks/useTeachers'
import { useAuth } from '../context/AuthContext'
import { GRADE_OPTIONS } from '../lib/ageGroups'
import { 
  XMarkIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  UsersIcon,
  TagIcon,
  AcademicCapIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import DatePicker, { registerLocale } from 'react-datepicker'
import { uk } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import Select from 'react-select'

// Türkçe lokalizasyonu kaydet
registerLocale('uk', uk)

export default function UpdateEventSheet({ isOpen, onClose, onSuccess, eventId }) {
  const { language } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  // Yalnızca ilk veri yüklemesi için. isLoading kaydetme sırasında da true
  // olduğundan iskelet ona bağlanamıyor; ayrı tutuluyor.
  const [isFetching, setIsFetching] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [students, setStudents] = useState([])
  const [eventData, setEventData] = useState(null)
  const [formData, setFormData] = useState({
    date: new Date(),
    time: {
      hour: '',
      minute: ''
    },
    ageGroup: '',
    teacherId: '',
    students: []
  })
  const [isCopyMode, setIsCopyMode] = useState(false)
  // Kopyalama tarihi varsayilan olarak YARIN. Kaynak dersin kendi tarihi
  // olsaydi ve kullanici tarihi degistirmeden gonderseydi, saat/dakika da
  // ayni oldugu icin bire bir ayni anda ikinci bir ders olusurdu.
  const [copyDate, setCopyDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d
  })
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudents, setSelectedStudents] = useState([])
  const dropdownRef = useRef(null)

  // Dersi veren kişi burada değiştirilebiliyor (yalnızca sahip)
  const { teachers } = useTeachers(isOpen)
  // Öğretmen dersi düzenleyemez/silemez; yalnızca görür ve yoklama alır.
  const { isOwner } = useAuth()

  // Saat ve dakika seçenekleri
  // 09-22 arasi 14 saat: 7 sutunlu izgarada tam iki satir.
  // Takvim 09:00-23:00 gosteriyor ki 22:00'de baslayan ders de gorunsun
  // (bkz. Calendar.jsx slotMinTime/slotMaxTime).
  const hours = ['09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22']
  const minutes = ['00', '15', '30', '45']

  // Etkinlik verilerini ve katılımcıları getir
  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId || !isOpen) return;

      // Panel açıkken başka bir derse tıklanırsa da iskelet dönsün;
      // yoksa bir an önceki dersin verisi görünüyor.
      setIsFetching(true);
      setIsLoading(true);
      try {
        // Etkinlik verilerini getir
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (eventError) throw eventError;
        setEventData(event);

        // Etkinliğe kayıtlı katılımcıları getir - ilişkisel sorgu yerine manuel işlem
        const { data: participants, error: participantsError } = await supabase
          .from('event_participants')
          .select('registration_id')
          .eq('event_id', eventId);

        if (participantsError) throw participantsError;
        
        // Etkinliğin tarih bilgilerini ayarla
        const eventDate = new Date(event.event_date);
        
        // Kopyalama modu için varsayılan tarihi etkinliğin kendi tarihi olarak ayarla
        // Kaynak dersin ERTESI gunu. Kaynagin kendi tarihi yazilirsa,
        // saat de degismedigi icin "Kopyala" bire bir ayni derste ikinci
        // bir kayit olusturuyor; yukarida bunun icin konan varsayilani
        // da eziyordu.
        const suggestedCopyDate = new Date(eventDate);
        suggestedCopyDate.setDate(suggestedCopyDate.getDate() + 1);
        setCopyDate(suggestedCopyDate);
        
        // Katılımcı yoksa boş bir dizi ile devam et
        if (!participants || participants.length === 0) {
          setFormData({
            date: eventDate,
            time: {
              hour: eventDate.getHours().toString().padStart(2, '0'),
              minute: eventDate.getMinutes().toString().padStart(2, '0')
            },
            ageGroup: event.age_group,
            teacherId: event.teacher_id,
            students: []
          });
          
          setSelectedStudents([]);
          return;
        }
        
        // Katılımcıların registration_id'lerini çıkar
        const registrationIds = participants.map(p => p.registration_id);
        
        // Kayıt bilgilerini çek
        const { data: registrations, error: registrationsError } = await supabase
          .from('my_students')
          .select('id, student_name, student_age, parent_name')
          .in('id', registrationIds);
          
        if (registrationsError) throw registrationsError;

        // Kayıtlı katılımcıları düzenle
        const eventStudents = registrations.map(reg => ({
          value: reg.id,
          label: reg.student_name,
          parent: reg.parent_name,
          age: reg.student_age
        }));

        // Form verilerini güncelle
        setFormData({
          date: eventDate,
          time: {
            hour: eventDate.getHours().toString().padStart(2, '0'),
            minute: eventDate.getMinutes().toString().padStart(2, '0')
          },
          ageGroup: event.age_group,
          teacherId: event.teacher_id,
          students: eventStudents
        });

        setSelectedStudents(eventStudents);
      } catch (error) {
        console.error('Etkinlik verileri getirilirken hata:', error.message);
      } finally {
        // Sıra önemli: iskelet, formu dolduran setFormData'dan SONRA kalkar.
        setIsLoading(false);
        setIsFetching(false);
      }
    };

    fetchEventData();
  }, [eventId, isOpen]);

  // Tüm öğrencileri getir
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase
          .from('my_students')
          .select('id, student_name, student_age, parent_name')
          .eq('is_active', true)
          .order('student_name');

        if (error) throw error;

        const formattedStudents = data.map(student => ({
          value: student.id,
          label: student.student_name,
          parent: student.parent_name,
          age: student.student_age
        }));

        setStudents(formattedStudents);
      } catch (error) {
        console.error('Öğrenciler getirilirken hata:', error.message);
      }
    };

    if (isOpen) {
      fetchStudents();
    }
  }, [isOpen]);

  // Dropdown dışına tıklandığında kapanması için
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Öğrenci seçme/kaldırma işlemi
  const toggleStudent = (student) => {
    const isSelected = selectedStudents.some(s => s.value === student.value);
    if (isSelected) {
      setSelectedStudents(selectedStudents.filter(s => s.value !== student.value));
    } else {
      setSelectedStudents([...selectedStudents, student]);
    }
    setFormData(prev => ({ 
      ...prev, 
      students: isSelected ? 
        selectedStudents.filter(s => s.value !== student.value) : 
        [...selectedStudents, student] 
    }));
  };

  // Arama filtrelemesi ve sıralama
  const filteredStudents = students.filter(student =>
    student.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.parent || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    // Seçili öğrencileri üste taşı
    const aSelected = selectedStudents.some(s => s.value === a.value);
    const bSelected = selectedStudents.some(s => s.value === b.value);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    // Seçili değillerse alfabetik sırala
    return a.label.localeCompare(b.label);
  });

  // Custom Dropdown Component
  const CustomDropdown = () => (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="relative w-full h-[45px] sm:h-[50px] pl-12 pr-4 flex items-center justify-between rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all text-sm sm:text-base cursor-pointer"
      >
        <span className="truncate">
          {selectedStudents.length > 0 
            ? `Обрано дітей: ${selectedStudents.length}` 
            : language === 'uk' ? 'Оберіть дитину...' : 'Select students...'}
        </span>
        <svg className="shrink-0 size-3.5 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7 15 5 5 5-5"/>
          <path d="m7 9 5-5 5 5"/>
        </svg>
      </button>

      {isDropdownOpen && (
        <div className="absolute left-0 right-0 mt-2 z-50 w-full max-h-72 bg-white dark:bg-[#121621] border border-[#d2d2d7] dark:border-[#2a3241] rounded-xl shadow-lg overflow-hidden">
          {/* Search Input */}
          <div className="sticky top-0 p-2 bg-white dark:bg-[#121621] border-b border-[#d2d2d7] dark:border-[#2a3241]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6e73] dark:text-[#86868b]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onKeyDown={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                autoFocus
                placeholder={language === 'uk' ? 'Пошук...' : 'Search...'}
                className="w-full h-9 pl-9 pr-4 rounded-lg border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] dark:focus:border-[#0071e3] transition-colors text-sm cursor-pointer"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-[calc(18rem-48px)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
            {filteredStudents.map((student) => {
              const isSelected = selectedStudents.some(s => s.value === student.value);
              return (
                <div
                  key={student.value}
                  onClick={() => toggleStudent(student)}
                  className={`
                    flex items-center justify-between px-4 py-2 cursor-pointer
                    ${isSelected 
                      ? 'bg-gray-100 dark:bg-[#1d2535]' 
                      : 'hover:bg-gray-50 dark:hover:bg-[#1d2535]/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <div className={`
                      w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors
                      ${isSelected 
                        ? 'border-[#1d1d1f] bg-[#1d1d1f] dark:border-[#0071e3] dark:bg-[#0071e3]' 
                        : 'border-[#d2d2d7] dark:border-[#2a3241]'
                      }
                    `}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="2 6 5 9 10 3"></polyline>
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                        {student.label}
                      </div>
                      <div className="text-xs text-[#6e6e73] dark:text-[#86868b]">
                        {student.parent}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[#0071e3] dark:text-[#0071e3] ml-4">
                    {student.age}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // Modal kapandığında formu sıfırla
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        date: new Date(),
        time: {
          hour: '',
          minute: ''
        },
        ageGroup: '',
        teacherId: '',
        students: []
      });
      setSelectedStudents([]); // Seçili öğrencileri sıfırla
      setSearchTerm(''); // Arama terimini de sıfırla
      setEventData(null);
      setIsCopyMode(false); // Kopyalama modunu sıfırla
      setIsFetching(true);   // sonraki açılış iskeletle başlasın
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      setCopyDate(nextDay);
    }
  }, [isOpen]);

  // Form değişikliklerini izle
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Form geçerliliğini kontrol et
  const isFormValid = () => {
    const { ageGroup, teacherId, date, time } = formData;
    const requiredFields = [ageGroup, teacherId, date, time.hour, time.minute];
    
    return requiredFields.every(field => field && field !== '');
  };

  // Form gönderme
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsLoading(true);
    try {
      // Form verilerini hazırla
      const eventDateTime = new Date(isCopyMode ? copyDate : formData.date);
      eventDateTime.setHours(parseInt(formData.time.hour) || 0);
      eventDateTime.setMinutes(parseInt(formData.time.minute) || 0);
      eventDateTime.setSeconds(0, 0);

      // Kopyalama kaynak dersin uzerine dusmemeli. Cakisma sorgusu kaynak
      // dersi .neq('id', eventId) ile disladigi icin bu durum oradan
      // yakalanmiyordu ve ayni anda iki ders olusuyordu.
      if (isCopyMode && eventData) {
        const sourceDate = new Date(eventData.event_date);
        if (sourceDate.getTime() === eventDateTime.getTime()) {
          throw new Error('Оберіть іншу дату — заняття вже існує в цей час.');
        }
      }

      // Aynı saatte başka etkinlik var mı kontrol et
      const { data: existingEvents, error: checkError } = await supabase
        .from('events')
        .select('id, event_date, teacher_id')
        .eq('is_active', true)
        // Çakışma AYNI ÖĞRETMEN için geçerli; iki öğretmen paralel ders verebilir
        .eq('teacher_id', formData.teacherId)
        .neq('id', eventId);

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
        throw new Error('У цього викладача вже є заняття в цей час. Оберіть інший час.');
      }

      if (isCopyMode) {
        // Kopyalama modu - yeni etkinlik oluştur
        const newEventData = {
          event_date: eventDateTime.toISOString(),
          age_group: formData.ageGroup,
          // Tür artık arayüzde seçilmiyor; kopyada kaynağınki korunuyor
          event_type: eventData.event_type,
          custom_description: eventData.custom_description,
          max_capacity: eventData.max_capacity,
          // Kopyada da formda seçili öğretmen geçerli
          teacher_id: formData.teacherId,
          current_capacity: 0 // Başlangıçta katılımcı olmayacak, katılımcılar ayrıca eklenecek
        };

        // Yeni etkinlik oluştur
        const { data: newEvent, error: createError } = await supabase
          .from('events')
          .insert(newEventData)
          .select()
          .single();

        if (createError) throw createError;

        // Katılımcıları yeni etkinliğe ekle
        if (Array.isArray(formData.students) && formData.students.length > 0) {
          const participantInserts = formData.students.map(student => ({
            event_id: newEvent.id,
            registration_id: student.value
          }));

          const { error: participantError } = await supabase
            .from('event_participants')
            .insert(participantInserts);

          if (participantError) throw participantError;
        }

        // Başarılı mesajı göster
        if (onSuccess) {
          onSuccess('Заняття успішно скопійовано');
        }
      } else {
        // ############ GÜNCELLEME MODU BAŞLANGICI ############

        // 1. Mevcut katılımcıların ID'lerini al
        const { data: currentParticipants, error: fetchCurrentError } = await supabase
          .from('event_participants')
          .select('registration_id')
          .eq('event_id', eventId);
        
        if (fetchCurrentError) throw fetchCurrentError;
        const currentParticipantIds = new Set(currentParticipants.map(p => p.registration_id));

        // 2. Yeni (formdaki) katılımcı ID'lerini al
        const newParticipantIds = new Set(formData.students.map(s => s.value));

        // 3. Farkları hesapla
        const participantsToDelete = [...currentParticipantIds].filter(id => !newParticipantIds.has(id));
        const participantsToAdd = [...newParticipantIds].filter(id => !currentParticipantIds.has(id));
        // Korunacaklara dokunmuyoruz

        // 4. Silinecek katılımcıları sil
        if (participantsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('event_participants')
            .delete()
            .eq('event_id', eventId)
            .in('registration_id', participantsToDelete);
          
          if (deleteError) {
            console.error("Katılımcılar silinirken hata:", deleteError);
            throw deleteError; // Hata durumunda işlemi durdur
          }
        }

        // 5. Eklenecek katılımcıları ekle
        if (participantsToAdd.length > 0) {
          const inserts = participantsToAdd.map(regId => ({
            event_id: eventId,
            registration_id: regId
            // status: 'scheduled' (varsayılan)
          }));
          
          const { error: insertError } = await supabase
            .from('event_participants')
            .insert(inserts);
          
          if (insertError) {
            console.error("Katılımcılar eklenirken hata:", insertError);
            // Eklenenleri geri almak zor olabilir, hatayı loglayıp devam edilebilir veya işlem durdurulabilir.
            throw insertError; 
          }
        }

        // 6. Ana etkinlik bilgilerini güncelle
        // event_type ve custom_description bilerek yazılmıyor: tür artık
        // arayüzde seçilmiyor, dokunulmayan kolon olduğu gibi kalır.
        const updatedEventData = {
          event_date: eventDateTime.toISOString(),
          age_group: formData.ageGroup,
          teacher_id: formData.teacherId,
          updated_at: new Date().toISOString()
          // Not: current_capacity trigger tarafından otomatik güncelleniyor
        };

        const { error: updateEventError } = await supabase
          .from('events')
          .update(updatedEventData)
          .eq('id', eventId);

        if (updateEventError) throw updateEventError;

        // Başarılı mesajı göster
        if (onSuccess) {
          onSuccess('Заняття успішно оновлено');
        }
        // ############ GÜNCELLEME MODU SONU ############
      }
      
      onClose();
    } catch (error) {
      console.error('Etkinlik işlemi sırasında hata:', error.message);
      if (onSuccess) {
        onSuccess(language === 'uk' ? `Помилка: ${error.message}` : `Error: ${error.message}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Etkinliği silme fonksiyonu
  const handleDeleteEvent = async () => {
    setIsDeleting(true);
    try {
      // Etkinliği sil
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (deleteError) throw deleteError;

      // Başarılı mesajı göster
      if (onSuccess) {
        onSuccess('Заняття успішно видалено');
      }
      
      // Paneli kapat
      onClose();
    } catch (error) {
      console.error('Etkinlik silme işlemi sırasında hata:', error.message);
      if (onSuccess) {
        onSuccess(language === 'uk' ? `Помилка: ${error.message}` : `Error: ${error.message}`, 'error');
      }
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  // Skeleton yükleme komponenti
  // Panelin gerçek düzenini taklit eden sakin iskelet. Eskiden her parçanın
  // kendi çerçevesi vardı ve yükleme bitince ekran zıplıyordu.
  const SkeletonLoading = () => (
    <div className="space-y-5">
      {/* Tarih */}
      <div className="h-4 w-16 rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />
      <div className="h-[50px] w-full rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />

      {/* Saat */}
      <div className="h-4 w-14 mt-5 rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />
      <div className="flex gap-2">
      <div className="h-[50px] flex-1 rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />
      <div className="h-[50px] flex-1 rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />
      </div>

      {/* Öğrenciler */}
      <div className="h-4 w-28 mt-5 rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />
      <div className="h-[50px] w-full rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />

      {/* Sınıf */}
      <div className="h-4 w-14 mt-5 rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />
      <div className="h-[50px] w-full rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />

      {/* Öğretmen */}
      <div className="h-4 w-20 mt-5 rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />
      <div className="flex gap-2">
      <div className="h-[45px] flex-1 rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />
      <div className="h-[45px] flex-1 rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />
      </div>

      {/* Yoklama */}
      <div className="h-4 w-24 mt-6 rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />
      <div className="space-y-2">
      <div className="h-11 w-full rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />
      <div className="h-11 w-full rounded-lg bg-gray-100 dark:bg-[#242b3d] animate-pulse" />
      </div>
    </div>
  );

  // Render edilecek içerik
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-25 z-40" onClick={onClose}></div>
      )}

      {/* Silme Onay Modalı */}
      {isDeleteModalOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setIsDeleteModalOpen(false)}></div>
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-[#121621] p-6 rounded-2xl shadow-xl z-50">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                <TrashIcon className="h-7 w-7 text-red-600 dark:text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-white mb-2">Видалити заняття</h3>
              <p className="text-[#6e6e73] dark:text-[#86868b]">
                Видалити це заняття? Цю дію не можна скасувати — усіх записаних на нього дітей також буде відʼєднано.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 text-[#1d1d1f] dark:text-white bg-transparent border border-[#d2d2d7] dark:border-[#2a3241] text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-[#1d2535]/70 focus:outline-none transition-all duration-200"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 focus:outline-none transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Видалення...</span>
                  </>
                ) : (
                  <span>Так, видалити</span>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Slide-in panel */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white dark:bg-[#121621] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-6 flex-1 overflow-auto relative">
          {/* Modal açıkken form üzerine overlay ekleyerek interaksiyonu engellemek için */}
          {isDeleteModalOpen && (
            <div className="absolute inset-0 bg-white/50 dark:bg-[#121621]/50 z-10" />
          )}
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">
              {/* Öğretmen düzenleyemez; başlık "düzenle" demesin */}
              {isCopyMode ? 'Копіювати заняття' : (isOwner ? 'Редагувати заняття' : 'Заняття')}
            </h2>
            <button 
              onClick={onClose}
              className="text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#86868b] dark:hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {isFetching ? (
            <SkeletonLoading />
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col h-auto">
              <div className="flex-1">
                {/* Normal form alanları */}
                {/* Ders bilgilerini yalnızca sahip düzenler. Öğretmen bu
                    paneli açtığında sadece yoklama listesini görür — DB de
                    aynı kuralı uyguluyor (events_update_owner). */}
                {isOwner && (<>
                {/* Tarih Seçimi */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#424245] dark:text-[#86868b] mb-2">
                    {isCopyMode ? 'Дата оригінального заняття' : 'Дата'}
                  </label>
                  <div className="relative">
                    <CalendarDaysIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6e6e73] dark:text-[#86868b] z-10 pointer-events-none" />
                    <DatePicker
                      portalId="root"
                      selected={formData.date}
                      onChange={date => setFormData(prev => ({ ...prev, date }))}
                      dateFormat="d MMMM yyyy"
                      locale="uk"
                      minDate={new Date()}
                      className={`w-full h-[45px] sm:h-[50px] pl-12 pr-4 rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all text-sm sm:text-base cursor-pointer ${isCopyMode ? 'opacity-70' : ''}`}
                      disabled={isCopyMode}
                    />
                  </div>
                  {isCopyMode && (
                    <p className="mt-1 text-xs text-[#6e6e73] dark:text-[#86868b]">
                      Дату оригінального заняття не можна змінити в режимі копіювання.
                    </p>
                  )}
                </div>

                {/* Saat Seçimi */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#424245] dark:text-[#86868b] mb-2">
                    Час
                  </label>
                  <div className="relative flex items-center gap-2">
                    <div className="flex-1 relative">
                      <ClockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6e6e73] dark:text-[#86868b] z-10 pointer-events-none" />
                      <select
                        name="hour"
                        value={formData.time.hour}
                        onChange={(e) => setFormData(prev => ({ ...prev, time: { ...prev.time, hour: e.target.value } }))}
                        className="w-full h-[45px] sm:h-[50px] pl-12 pr-4 rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all text-sm sm:text-base appearance-none cursor-pointer"
                      >
                        {hours.map(hour => (
                          <option key={hour} value={hour}>{hour}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 relative">
                      <select
                        name="minute"
                        value={formData.time.minute}
                        onChange={(e) => setFormData(prev => ({ ...prev, time: { ...prev.time, minute: e.target.value } }))}
                        className="w-full h-[45px] sm:h-[50px] px-4 rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all text-sm sm:text-base appearance-none cursor-pointer"
                      >
                        {minutes.map(minute => (
                          <option key={minute} value={minute}>{minute}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dersi veren öğretmen — kart rengi de bu kişiden geliyor */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#424245] dark:text-[#86868b] mb-2">
                    {language === 'uk' ? 'Викладач' : 'Teacher'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {teachers.map(teacher => {
                      const active = formData.teacherId === teacher.id
                      return (
                        <button
                          key={teacher.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, teacherId: teacher.id }))}
                          className={`h-[45px] px-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                            active
                              ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                              : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: teacher.color }} />
                          <span className="truncate">{teacher.full_name || teacher.email}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Öğrenci Seçimi - MOVED BETWEEN SAAT AND YAŞ GRUBU */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#424245] dark:text-[#86868b] mb-2">
                    Учасники
                  </label>
                  <div className="relative">
                    <UsersIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6e6e73] dark:text-[#86868b] z-10 pointer-events-none" />
                    <CustomDropdown />
                  </div>
                  {selectedStudents.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedStudents.map(student => (
                        <div 
                          key={student.value}
                          className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-[#1d2535] rounded-lg text-xs text-[#1d1d1f] dark:text-white"
                        >
                          <span>{student.label}</span>
                          <button 
                            type="button"
                            onClick={() => toggleStudent(student)}
                            className="text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Yaş Grubu */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#424245] dark:text-[#86868b] mb-2">
                    Клас
                  </label>
                  <div className="relative">
                    <AcademicCapIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6e6e73] dark:text-[#86868b] z-10 pointer-events-none" />
                    <select
                      name="ageGroup"
                      value={formData.ageGroup}
                      onChange={handleInputChange}
                      className="w-full h-[45px] sm:h-[50px] pl-12 pr-4 rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all text-sm sm:text-base appearance-none cursor-pointer"
                    >
                      {GRADE_OPTIONS.map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                </div>



                {/* Kopyalama Modu Toggle */}
                <div className="mb-2 mt-6 p-4 border border-[#d2d2d7] dark:border-[#2a3241] rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DocumentDuplicateIcon className="w-5 h-5 text-[#6e6e73] dark:text-[#86868b]" />
                      <span className="text-sm font-medium text-[#424245] dark:text-[#86868b]">
                        Копіювати це заняття
                      </span>
                    </div>
                    <label className="inline-flex relative items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isCopyMode}
                        onChange={() => setIsCopyMode(!isCopyMode)}
                      />
                      <div className={`
                        w-11 h-6 bg-gray-200 rounded-full peer 
                        dark:bg-gray-700 peer-checked:after:translate-x-full 
                        after:content-[''] after:absolute after:top-0.5 after:left-[2px] 
                        after:bg-white after:rounded-full after:h-5 after:w-5 
                        after:transition-all peer-checked:bg-[#1d1d1f] dark:peer-checked:bg-[#0071e3]
                      `}></div>
                    </label>
                  </div>
                </div>

                {/* Kopyalama için Tarih Seçimi - MOVED HERE */}
                {isCopyMode && (
                  <div className="mt-4 mb-2">
                    <label className="block text-sm font-medium text-[#424245] dark:text-[#86868b] mb-2">
                      Дата копіювання
                    </label>
                    <div className="relative">
                      <CalendarDaysIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6e6e73] dark:text-[#86868b] z-10 pointer-events-none" />
                      <DatePicker
                        portalId="root"
                        selected={copyDate}
                        onChange={date => setCopyDate(date)}
                        dateFormat="d MMMM yyyy"
                        locale="uk"
                        minDate={new Date()}
                        className="w-full h-[45px] sm:h-[50px] pl-12 pr-4 rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all text-sm sm:text-base cursor-pointer"
                      />
                    </div>
                    <p className="mt-2 text-xs text-[#6e6e73] dark:text-[#86868b]">
                      Заняття буде скопійовано на цю дату з тими самими даними та учасниками.
                    </p>
                  </div>
                )}

                </>)}

                {/* Yoklama — öğretmenin ders hakkı sayacını işletebilmesi için
                    tek yeri burası. Statü güncellemesi RLS ile kendi dersleriyle
                    sınırlı; sahip her derste alabilir. */}
                {!isCopyMode && eventId && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-[#424245] dark:text-[#86868b] mb-3">
                      {language === 'uk' ? 'Відвідуваність' : 'Attendance'}
                    </label>
                    <AttendanceList eventId={eventId} />
                  </div>
                )}

              </div>
            </form>
          )}
        </div>
        
        {/* Sabit altlık butonlar */}
        <div className="p-4 border-t border-[#d2d2d7] dark:border-[#2a3241] mt-auto">
          <div className="flex w-full gap-3">
            {/* Silme ve kaydetme yalnızca sahipte */}
            {isOwner && !isCopyMode && (
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={isLoading || isDeleting}
                  className="w-12 h-12 flex items-center justify-center text-red-500 dark:text-red-400 bg-transparent border border-[#d2d2d7] dark:border-[#2a3241] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1d2535]/70 focus:outline-none transition-all duration-200"
                  aria-label="Видалити заняття"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  Видалити заняття
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading || isDeleteModalOpen}
              className={`flex-1 h-12 px-4 text-[#1d1d1f] dark:text-white bg-transparent border border-[#d2d2d7] dark:border-[#2a3241] text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-[#1d2535]/70 focus:outline-none transition-all duration-200 ${(isLoading || isDeleteModalOpen) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Скасувати
            </button>
            {isOwner && <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !isFormValid() || isDeleteModalOpen}
              className={`flex-1 h-12 px-4 bg-[#1d1d1f] dark:bg-[#0071e3] text-white text-sm font-medium rounded-lg focus:outline-none transition-all duration-200 flex items-center justify-center gap-2 ${isLoading ? 'opacity-60 bg-gray-600 dark:bg-[#0071e3]/70 cursor-not-allowed' : isFormValid() && !isDeleteModalOpen ? 'hover:bg-black dark:hover:bg-[#0077ed]' : 'opacity-50 cursor-not-allowed'}`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{isCopyMode ? 'Копіювання...' : 'Оновлення...'}</span>
                </>
              ) : (
                isCopyMode ? 'Копіювати' : 'Оновити'
              )}
            </button>}
          </div>
        </div>
      </div>
    </>
  )
} 