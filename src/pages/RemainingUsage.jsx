import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { fetchLessonUsageMap } from '../lib/lessonUsage';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, XMarkIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';

const RemainingUsage = () => {
  const { language } = useLanguage();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [packageFilter, setPackageFilter] = useState('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [studentLessons, setStudentLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [studentDetails, setStudentDetails] = useState(null);
  const [visibleLessonsCount, setVisibleLessonsCount] = useState(10);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentLessons(selectedStudent.registration_id);
      fetchStudentDetails(selectedStudent.registration_id);
      setVisibleLessonsCount(10); // Reset visible lessons when selecting a new student
    }
  }, [selectedStudent]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      
      // First, fetch registrations that are active
      const { data: registrationsData, error: registrationsError } = await supabase
        .from('registrations')
        .select('*')
        .eq('is_active', true)
        .order('student_name');

      if (registrationsError) throw registrationsError;
      
      // If registrations found, fetch additional data to calculate usage statistics
      if (registrationsData && registrationsData.length > 0) {
        // Ders kullanımı ortak util'den: kullanılan = katıldı + gelmedi,
        // sayım güncel paket döneminden itibaren (bkz. src/lib/lessonUsage.js)
        const usageMap = await fetchLessonUsageMap(registrationsData);

        const processedStudents = registrationsData.map(registration => {
          const usage = usageMap[registration.id];

          return {
            registration_id: registration.id,
            student_name: registration.student_name,
            parent_name: registration.parent_name,
            package_type: registration.package_type,
            package_start_date: registration.package_start_date,
            package_end_date: registration.package_end_date,
            payment_status: registration.payment_status,
            is_active: registration.is_active,
            is_free: usage.isFree,
            remaining_lessons: usage.remaining,
            attended_lessons: usage.attended,
            no_show_lessons: usage.noShow,
            makeup_completed: usage.makeup,
            postponed_lessons: usage.postponed
          };
        });

        setStudents(processedStudents);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDetails = async (registrationId) => {
    try {
      // First get registration details
      const { data: registrationData, error: registrationError } = await supabase
        .from('registrations')
        .select('*')
        .eq('id', registrationId)
        .single();
      
      if (registrationError) throw registrationError;
      
      // Ders kullanımı ortak util'den (kullanılan = katıldı + gelmedi, dönem-kapsamlı)
      const usageMap = await fetchLessonUsageMap([registrationData]);
      const usage = usageMap[registrationData.id];

      // Construct student details object
      const studentDetails = {
        registration_id: registrationData.id,
        student_name: registrationData.student_name,
        parent_name: registrationData.parent_name,
        package_type: registrationData.package_type,
        package_start_date: registrationData.package_start_date,
        package_end_date: registrationData.package_end_date,
        payment_status: registrationData.payment_status,
        is_active: registrationData.is_active,
        is_free: usage.isFree,
        remaining_lessons: usage.remaining,
        attended_lessons: usage.attended,
        no_show_lessons: usage.noShow,
        makeup_completed: usage.makeup,
        postponed_lessons: usage.postponed
      };

      setStudentDetails(studentDetails);
    } catch (error) {
      console.error('Error fetching student details:', error);
    }
  };

  const fetchStudentLessons = async (registrationId) => {
    try {
      setLoadingLessons(true);
      
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          id,
          status,
          is_makeup,
          event_id,
          registration_id,
          makeup_for_id,
          postponed_to_id,
          postponed_from_id,
          makeup_notes,
          postponed_notes,
          cancellation_reason,
          cancellation_date,
          created_at
        `)
        .eq('registration_id', registrationId);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const eventIds = data.map(participant => participant.event_id);
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds);
          
        if (eventsError) throw eventsError;
        
        const mergedData = data.map(participant => {
          const event = eventsData.find(event => event.id === participant.event_id);
          return {
            ...participant,
            events: event || null
          };
        });
        
        const sortedData = mergedData.sort((a, b) => {
          if (!a.events || !b.events) return 0;
          return new Date(b.events.event_date) - new Date(a.events.event_date);
        });
        
        setStudentLessons(sortedData);
      } else {
        setStudentLessons([]);
      }
    } catch (error) {
      console.error('Error fetching student lessons:', error);
    } finally {
      setLoadingLessons(false);
    }
  };

  const updateLessonStatus = async (lessonId, newStatus) => {
    try {
      setStatusUpdateLoading(true);
      
      const updateData = { status: newStatus };
      
      const { error } = await supabase
        .from('event_participants')
        .update(updateData)
        .eq('id', lessonId);

      if (error) throw error;
      
      // Güncelleme sonrası verileri yenile
      await fetchStudents();
      await fetchStudentLessons(selectedStudent.registration_id);
      // Öğrenci detaylarını da yenile
      await fetchStudentDetails(selectedStudent.registration_id);
      
    } catch (error) {
      console.error('Error updating lesson status:', error);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleDetailClick = (student) => {
    setSelectedStudent(student);
    setShowDetailView(true);
  };

  const handleCloseDetail = () => {
    setShowDetailView(false);
    setSelectedStudent(null);
    setStudentDetails(null);
    setVisibleLessonsCount(10); // Reset visible lessons count
  };

  const handleFilterClick = () => {
    if (showDetailView) {
      setShowDetailView(false);
      setSelectedStudent(null);
      setStudentDetails(null);
      setVisibleLessonsCount(10); // Reset visible lessons count
    }
    setIsFilterSheetOpen(true);
  };

  const handleLoadMore = () => {
    setVisibleLessonsCount(prev => prev + 10);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.parent_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPackage = packageFilter === 'all' || student.package_type === packageFilter;
    
    return matchesSearch && matchesPackage;
  });

  // Format date with the correct locale
  const formatDate = (date, formatStr) => {
    return format(new Date(date), formatStr || 'dd.MM.yyyy', { locale: language === 'tr' ? tr : enUS });
  };

  // Translate package type
  const translatePackageType = (type) => {
    if (language === 'tr') {
      return type === 'ucretsiz' ? 'Ücretsiz Katılım'
        : type === 'hafta-1' ? 'Haftada 1'
        : type === 'hafta-2' ? 'Haftada 2'
        : type === 'hafta-3' ? 'Haftada 3'
        : type === 'hafta-4' ? 'Haftada 4'
        : 'Tek Seferlik';
    } else {
      return type === 'ucretsiz' ? 'Free Participation'
        : type === 'hafta-1' ? '1 Day/Week'
        : type === 'hafta-2' ? '2 Days/Week'
        : type === 'hafta-3' ? '3 Days/Week'
        : type === 'hafta-4' ? '4 Days/Week'
        : 'One Time';
    }
  };

  // Translate payment status
  const translatePaymentStatus = (status) => {
    if (language === 'tr') {
      return status === 'ucretsiz' ? 'Ücretsiz' : status === 'odendi' ? 'Ödendi' : 'Beklemede';
    } else {
      return status === 'ucretsiz' ? 'Free' : status === 'odendi' ? 'Paid' : 'Pending';
    }
  };

  // Translate lesson status
  const translateLessonStatus = (status) => {
    if (language === 'tr') {
      return status === 'scheduled' ? 'Planlandı' : 
        status === 'attended' ? 'Katıldı' : 
        status === 'no_show' ? 'Gelmedi' : 
        status === 'cancelled' ? 'İptal Edildi' : 
        status === 'makeup' ? 'Telafi Dersi' : 
        status === 'postponed' ? 'Ertelendi' : '';
    } else {
      return status === 'scheduled' ? 'Scheduled' : 
        status === 'attended' ? 'Joined' : 
        status === 'no_show' ? 'Absent' : 
        status === 'cancelled' ? 'Cancelled' : 
        status === 'makeup' ? 'Makeup' : 
        status === 'postponed' ? 'Delayed' : '';
    }
  };

  return (
    <div className={`flex flex-col ${showDetailView ? 'lg:mr-96' : ''} transition-all duration-300`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between h-auto sm:h-16 px-6 border-b border-[#d2d2d7] dark:border-[#2a3241] py-4 sm:py-0 gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium text-[#1d1d1f] dark:text-white">
            {language === 'tr' ? 'Kalan Kullanım' : 'Remaining Usage'}
            <span className="ml-2 text-sm font-normal text-[#6e6e73] dark:text-[#86868b]">
              ({filteredStudents.length})
            </span>
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          {/* Arama */}
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
            <input
              type="text"
              placeholder={language === 'tr' ? "Öğrenci veya veli ismi ara" : "Search student or parent name"}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 sm:h-8 pl-9 pr-4 rounded-lg text-sm border border-[#d2d2d7] dark:border-[#2a3241] bg-white/80 dark:bg-[#121621] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:ring-0 focus:border-[#0071e3] dark:focus:border-[#0071e3] transition-colors"
            />
          </div>

          {/* Filtre Butonu */}
          <button
            onClick={handleFilterClick}
            className="h-10 sm:h-8 px-3 bg-white dark:bg-[#121621] text-[#424245] dark:text-[#86868b] text-sm font-medium rounded-lg border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] focus:outline-none transition-colors flex items-center justify-center gap-2 relative"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
            {packageFilter !== 'all' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#0071e3] rounded-full ring-2 ring-white dark:ring-[#121621]" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Tablo */}
        <div className="bg-white dark:bg-[#161b2c] rounded-2xl shadow-lg overflow-hidden border border-[#d2d2d7] dark:border-[#2a3241]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#d2d2d7] dark:border-[#2a3241]">
                  <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                        {language === 'tr' ? 'Öğrenci' : 'Student'}
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b] opacity-75">
                        {language === 'tr' ? 'Veli' : 'Parent'}
                      </span>
                    </div>
                  </th>
                  <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                      {language === 'tr' ? 'Paket Türü' : 'Package Type'}
                    </span>
                  </th>
                  <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                      {language === 'tr' ? 'Kayıt Tarihi' : 'Start Date'}
                    </span>
                  </th>
                  <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                      {language === 'tr' ? 'Bitiş Tarihi' : 'End Date'}
                    </span>
                  </th>
                  <th className="py-4 px-6 text-center bg-[#f5f5f7]/50 dark:bg-[#161922]">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                      {language === 'tr' ? 'Kalan Ders' : 'Remaining'}
                    </span>
                  </th>
                  <th className="py-4 px-6 text-center bg-[#f5f5f7]/50 dark:bg-[#161922]">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                      {language === 'tr' ? 'Ödeme Durumu' : 'Payment Status'}
                    </span>
                  </th>
                  <th className="py-4 px-6 text-right bg-[#f5f5f7]/50 dark:bg-[#161922] w-[100px]">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                      {language === 'tr' ? 'İşlemler' : 'Actions'}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d2d2d7] dark:divide-[#2a3241]">
                {loading ? (
                  // Skeleton Loading
                  [...Array(5)].map((_, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                          <div className="h-4 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-32 relative overflow-hidden">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                          </div>
                          <div className="h-3 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-24 relative overflow-hidden">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-7 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-lg w-24 relative overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-24 relative overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-24 relative overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex justify-center">
                          <div className="h-6 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-full w-8 relative overflow-hidden">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex justify-center">
                          <div className="h-6 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-full w-20 relative overflow-hidden">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex justify-end">
                          <div className="h-8 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-lg w-16 relative overflow-hidden">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-full flex items-center justify-center mb-3">
                          <MagnifyingGlassIcon className="w-8 h-8 text-[#6e6e73] dark:text-[#86868b]" />
                        </div>
                        <p className="text-[#1d1d1f] dark:text-white font-medium mb-1">
                          {language === 'tr' ? 'Kayıt Bulunamadı' : 'No Records Found'}
                        </p>
                        <p className="text-sm text-[#6e6e73] dark:text-[#86868b]">
                          {searchTerm 
                            ? (language === 'tr' ? 'Arama kriterlerinize uygun kayıt bulunamadı.' : 'No records match your search criteria.') 
                            : (language === 'tr' ? 'Henüz kayıt eklenmemiş.' : 'No records have been added yet.')}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr
                      key={student.registration_id}
                      // Detay paneli açık olan öğrencinin satırı vurgulanır
                      className={`group ${
                        showDetailView && selectedStudent?.registration_id === student.registration_id
                          ? 'bg-[#0071e3]/[0.07] dark:bg-[#0071e3]/10 shadow-[inset_3px_0_0_0_#0071e3]'
                          : 'hover:bg-[#f5f5f7] dark:hover:bg-[#161922]'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                            {student.student_name}
                          </span>
                          <span className="text-xs text-[#6e6e73] dark:text-[#86868b]">
                            {student.parent_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-[#0071e3]/5 to-[#34d399]/5 dark:from-[#0071e3]/10 dark:to-[#34d399]/10 text-[#0071e3] group-hover:from-[#0071e3]/10 group-hover:to-[#34d399]/10 dark:group-hover:from-[#0071e3]/20 dark:group-hover:to-[#34d399]/20 transition-all">
                          {translatePackageType(student.package_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#424245] dark:text-[#86868b]">
                          {formatDate(student.package_start_date)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#424245] dark:text-[#86868b]">
                          {student.is_free
                            ? (language === 'tr' ? 'Süresiz' : 'Unlimited')
                            : formatDate(student.package_end_date)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-3 py-1.5 rounded-lg text-xs font-medium ring-1 ring-inset ${
                          student.is_free
                            ? 'bg-gray-400/10 text-gray-700 ring-gray-500/20 dark:bg-gray-400/10 dark:text-gray-300 dark:ring-gray-400/20'
                            : student.remaining_lessons <= 0
                            ? 'bg-red-400/10 text-red-700 ring-red-500/20 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20'
                            : student.remaining_lessons <= 2
                            ? 'bg-amber-400/10 text-amber-700 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20'
                            : 'bg-emerald-400/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20'
                        }`}>
                          {student.is_free
                            ? (language === 'tr' ? 'Ücretsiz' : 'Free')
                            : student.remaining_lessons}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-medium ring-1 ring-inset ${
                          student.payment_status === 'ucretsiz'
                            ? 'bg-gray-400/10 text-gray-700 ring-gray-500/20 dark:bg-gray-400/10 dark:text-gray-300 dark:ring-gray-400/20'
                            : student.payment_status === 'odendi'
                            ? 'bg-emerald-400/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20'
                            : 'bg-amber-400/10 text-amber-700 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20'
                        }`}>
                          {translatePaymentStatus(student.payment_status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDetailClick(student)}
                          className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium rounded-lg bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:bg-[#1d1d1f] dark:hover:bg-[#0071e3] hover:text-white dark:hover:text-white hover:border-[#1d1d1f] dark:hover:border-[#0071e3] focus:outline-none transition-all duration-200"
                        >
                          {language === 'tr' ? 'Detay' : 'Details'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Filter Sheet */}
      <div className={`
        fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-[#121621] shadow-xl transform transition-transform duration-300 ease-in-out z-50
        ${isFilterSheetOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Sheet Header */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-[#d2d2d7] dark:border-[#2a3241] shrink-0">
            <h2 className="text-lg font-medium text-[#1d1d1f] dark:text-white">
              {language === 'tr' ? 'Filtreler' : 'Filters'}
            </h2>
            <button
              onClick={() => setIsFilterSheetOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241]"
            >
              <XMarkIcon className="w-5 h-5 text-[#424245] dark:text-[#86868b]" />
            </button>
          </div>

          {/* Sheet Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Paket Türü */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                {language === 'tr' ? 'Paket Türü' : 'Package Type'}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPackageFilter('hafta-1')}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium
                    ${packageFilter === 'hafta-1'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Haftada 1' : '1 Day/Week'}
                </button>
                <button
                  onClick={() => setPackageFilter('hafta-2')}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium
                    ${packageFilter === 'hafta-2'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Haftada 2' : '2 Days/Week'}
                </button>
                <button
                  onClick={() => setPackageFilter('hafta-3')}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium 
                    ${packageFilter === 'hafta-3'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Haftada 3' : '3 Days/Week'}
                </button>
                <button
                  onClick={() => setPackageFilter('hafta-4')}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium 
                    ${packageFilter === 'hafta-4'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Haftada 4' : '4 Days/Week'}
                </button>
                <button
                  onClick={() => setPackageFilter('tek-seferlik')}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium 
                    ${packageFilter === 'tek-seferlik'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Tek Seferlik' : 'One Time'}
                </button>
                <button
                  onClick={() => setPackageFilter('ucretsiz')}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium
                    ${packageFilter === 'ucretsiz'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Ücretsiz' : 'Free'}
                </button>
              </div>
            </div>
          </div>

          {/* Sheet Footer */}
          <div className="px-6 py-4 border-t border-[#d2d2d7] dark:border-[#2a3241] shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setPackageFilter('all');
                  setIsFilterSheetOpen(false);
                }}
                className="flex-1 h-10 bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a3241] focus:outline-none"
              >
                {language === 'tr' ? 'Filtreleri Temizle' : 'Clear Filters'}
              </button>
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-1 h-10 bg-[#1d1d1f] dark:bg-[#0071e3] text-white font-medium rounded-xl hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none "
              >
                {language === 'tr' ? 'Uygula' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isFilterSheetOpen && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40"
          onClick={() => setIsFilterSheetOpen(false)}
        />
      )}

      {/* Detail Panel */}
      <div className={`
        fixed inset-y-0 right-0 w-full lg:w-96 bg-white dark:bg-[#121621] shadow-xl transform transition-transform duration-300 ease-in-out z-50
        border-l border-[#d2d2d7] dark:border-[#2a3241]
        ${showDetailView ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Panel Header */}
          <div className="flex items-center gap-3 px-6 h-16 border-b border-[#d2d2d7] dark:border-[#2a3241] shrink-0">
            <button
              onClick={handleCloseDetail}
              className="lg:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241]"
            >
              <ChevronLeftIcon className="w-5 h-5 text-[#424245] dark:text-[#86868b]" />
            </button>
            <h2 className="text-lg font-medium text-[#1d1d1f] dark:text-white">
              {language === 'tr' ? 'Öğrenci Detayı' : 'Student Details'}
            </h2>
            <button
              onClick={handleCloseDetail}
              className="hidden lg:block ml-auto p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241]"
            >
              <XMarkIcon className="w-5 h-5 text-[#424245] dark:text-[#86868b]" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedStudent && (
              <div className="space-y-6">
                {/* Temel Bilgiler */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white uppercase tracking-wider">
                    {language === 'tr' ? 'Temel Bilgiler' : 'Basic Information'}
                  </h3>
                  <div className="grid grid-cols-1 gap-4 bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                    <div>
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        {language === 'tr' ? 'Öğrenci Adı' : 'Student Name'}
                      </label>
                      <span className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                        {selectedStudent.student_name}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        {language === 'tr' ? 'Veli Adı' : 'Parent Name'}
                      </label>
                      <span className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                        {selectedStudent.parent_name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Paket Bilgileri */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white uppercase tracking-wider">
                    {language === 'tr' ? 'Paket Bilgileri' : 'Package Information'}
                  </h3>
                  <div className="grid grid-cols-1 gap-4 bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                    <div>
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        {language === 'tr' ? 'Paket Türü' : 'Package Type'}
                      </label>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-[#0071e3]/5 to-[#34d399]/5 dark:from-[#0071e3]/10 dark:to-[#34d399]/10 text-[#0071e3]">
                        {translatePackageType(selectedStudent.package_type)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        {language === 'tr' ? 'Başlangıç Tarihi' : 'Start Date'}
                      </label>
                      <span className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                        {formatDate(selectedStudent.package_start_date)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        {language === 'tr' ? 'Bitiş Tarihi' : 'End Date'}
                      </label>
                      <span className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                        {selectedStudent.is_free
                          ? (language === 'tr' ? 'Süresiz' : 'Unlimited')
                          : formatDate(selectedStudent.package_end_date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Katıldığı Dersler */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white uppercase tracking-wider">
                      {language === 'tr' ? 'Dersler' : 'Lessons'}
                    </h3>
                  </div>
                  
                  {loadingLessons ? (
                    // Loading state
                  <div className="space-y-2">
                      {[...Array(3)].map((_, index) => (
                        <div key={index} className="bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                            <div className="space-y-1 w-1/2">
                              <div className="h-4 bg-[#e5e5ea] dark:bg-[#2a3241] rounded-md w-32 relative overflow-hidden">
                                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                              </div>
                              <div className="h-3 bg-[#e5e5ea] dark:bg-[#2a3241] rounded-md w-24 relative overflow-hidden">
                                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                              </div>
                            </div>
                            <div className="h-7 bg-[#e5e5ea] dark:bg-[#2a3241] rounded-lg w-20 relative overflow-hidden">
                              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                            </div>
                          </div>
                        </div>
                      ))}
                      </div>
                  ) : studentLessons.length === 0 ? (
                    <div className="bg-[#f5f5f7] dark:bg-[#161922] p-6 rounded-xl text-center">
                      <p className="text-[#1d1d1f] dark:text-white font-medium">
                        {language === 'tr' ? 'Henüz ders kaydı yok' : 'No lessons recorded yet'}
                      </p>
                      <p className="text-sm text-[#6e6e73] dark:text-[#86868b] mt-1">
                        {language === 'tr' ? 'Bu öğrenci için ders planlaması yapılmamış.' : 'No lessons scheduled for this student'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {studentLessons.slice(0, visibleLessonsCount).map((lesson) => (
                        <div key={lesson.id} className="bg-[#f5f5f7] dark:bg-[#161922] rounded-xl overflow-hidden">
                          {/* Üst kısım - Ders bilgileri ve statü */}
                          <div className="p-4">
                      <div className="flex items-center justify-between">
                              <div className="flex-1">
                          <span className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                                  {lesson.events.event_type === 'ingilizce' 
                                    ? language === 'tr' ? 'İngilizce Oyun Dersi' : 'English Game Class'
                                    : lesson.events.event_type === 'duyusal' 
                                    ? language === 'tr' ? 'Duyusal Gelişim Dersi' : 'Sensory Development Class'
                                    : lesson.events.custom_description || (language === 'tr' ? 'Özel Ders' : 'Custom Class')}
                                  {lesson.is_makeup && (language === 'tr' ? ' (Telafi)' : ' (Makeup)')}
                                </span>
                                <span className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-1">
                                  {lesson.events && formatDate(lesson.events.event_date, 'dd MMMM yyyy, HH:mm')}
                                </span>
                                
                                {/* Ek notlar */}
                                {lesson.cancellation_reason && (
                                  <span className="block text-xs text-red-500 mt-1">
                                    {language === 'tr' ? 'İptal sebebi:' : 'Cancellation reason:'} {lesson.cancellation_reason}
                                  </span>
                                )}
                                {lesson.makeup_notes && (
                                  <span className="block text-xs text-blue-500 mt-1">
                                    {language === 'tr' ? 'Telafi notu:' : 'Makeup note:'} {lesson.makeup_notes}
                                  </span>
                                )}
                                {lesson.postponed_notes && (
                                  <span className="block text-xs text-amber-500 mt-1">
                                    {language === 'tr' ? 'Erteleme notu:' : 'Postponement note:'} {lesson.postponed_notes}
                                  </span>
                                )}
                        </div>
                              
                              <div>
                                {/* Durum etiketi */}
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium
                                  ${lesson.status === 'scheduled' ? 'bg-[#0071e3]/10 text-[#0071e3] ring-1 ring-inset ring-[#0071e3]/20' : 
                                    lesson.status === 'attended' ? 'bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20 dark:ring-emerald-400/20' : 
                                    lesson.status === 'no_show' ? 'bg-red-400/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20 dark:ring-red-400/20' :
                                    lesson.status === 'cancelled' ? 'bg-gray-400/10 text-gray-700 dark:text-gray-300 ring-1 ring-inset ring-gray-500/20 dark:ring-gray-400/20' :
                                    lesson.status === 'makeup' ? 'bg-blue-400/10 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20 dark:ring-blue-400/20' :
                                    lesson.status === 'postponed' ? 'bg-amber-400/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20 dark:ring-amber-400/20' :
                                    'bg-gray-400/10 text-gray-700'
                                  }`}>
                                  {translateLessonStatus(lesson.status)}
                        </span>
                      </div>
                    </div>
                          </div>
                          
                          {/* Border */}
                          <hr className="border-[#d2d2d7] dark:border-[#2a3241]" />
                          
                          {/* Alt kısım - Butonlar (Her zaman göster) */}
                          <div className="p-3 bg-[#f5f5f7]/50 dark:bg-[#161922]/70 flex items-center justify-between gap-2">
                            <button
                              onClick={() => updateLessonStatus(lesson.id, 'attended')}
                              disabled={statusUpdateLoading}
                              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg ${
                                lesson.status === 'attended' 
                                  ? 'bg-emerald-400/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20 hover:bg-emerald-400/30 dark:hover:bg-emerald-400/30'
                                  : 'bg-emerald-400/5 text-emerald-700/30 ring-1 ring-emerald-500/10 dark:bg-emerald-400/5 dark:text-emerald-300/30 dark:ring-emerald-400/10 hover:bg-emerald-400/20 dark:hover:bg-emerald-400/20 hover:text-emerald-700 dark:hover:text-emerald-300'
                              } transition-colors`}
                            >
                              {language === 'tr' ? 'Katıldı' : 'Joined'}
                            </button>
                            <button
                              onClick={() => updateLessonStatus(lesson.id, 'no_show')}
                              disabled={statusUpdateLoading}
                              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg ${
                                lesson.status === 'no_show' 
                                  ? 'bg-red-400/10 text-red-700 ring-1 ring-red-500/20 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20 hover:bg-red-400/30 dark:hover:bg-red-400/30'
                                  : 'bg-red-400/5 text-red-700/30 ring-1 ring-red-500/10 dark:bg-red-400/5 dark:text-red-300/30 dark:ring-red-400/10 hover:bg-red-400/20 dark:hover:bg-red-400/20 hover:text-red-700 dark:hover:text-red-300'
                              } transition-colors`}
                            >
                              {language === 'tr' ? 'Gelmedi' : 'Absent'}
                            </button>
                            <button
                              onClick={() => updateLessonStatus(lesson.id, 'postponed')}
                              disabled={statusUpdateLoading}
                              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg ${
                                lesson.status === 'postponed' 
                                  ? 'bg-amber-400/10 text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20 hover:bg-amber-400/30 dark:hover:bg-amber-400/30'
                                  : 'bg-amber-400/5 text-amber-700/30 ring-1 ring-amber-500/10 dark:bg-amber-400/5 dark:text-amber-300/30 dark:ring-amber-400/10 hover:bg-amber-400/20 dark:hover:bg-amber-400/20 hover:text-amber-700 dark:hover:text-amber-300'
                              } transition-colors`}
                            >
                              {language === 'tr' ? 'Ertelendi' : 'Delayed'}
                            </button>
                            <button
                              onClick={() => updateLessonStatus(lesson.id, 'makeup')}
                              disabled={statusUpdateLoading}
                              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg ${
                                lesson.status === 'makeup' 
                                  ? 'bg-blue-400/10 text-blue-700 ring-1 ring-blue-500/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/20 hover:bg-blue-400/30 dark:hover:bg-blue-400/30'
                                  : 'bg-blue-400/5 text-blue-700/30 ring-1 ring-blue-500/10 dark:bg-blue-400/5 dark:text-blue-300/30 dark:ring-blue-400/10 hover:bg-blue-400/20 dark:hover:bg-blue-400/20 hover:text-blue-700 dark:hover:text-blue-300'
                              } transition-colors`}
                            >
                              {language === 'tr' ? 'Telafi' : 'Makeup'}
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Load More Button */}
                      {visibleLessonsCount < studentLessons.length && (
                        <div className="flex justify-center pt-4">
                          <button
                            onClick={handleLoadMore}
                            className="px-6 py-3 bg-[#f5f5f7] dark:bg-[#161922] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] rounded-xl hover:bg-[#e5e5ea] dark:hover:bg-[#1a1f2e] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-2 dark:focus:ring-offset-[#121621] transition-all duration-200 flex items-center gap-2"
                          >
                            <span className="text-sm font-medium">
                              {language === 'tr' ? 'Daha Fazla Yükle' : 'Load More'}
                            </span>
                            <span className="text-xs text-[#6e6e73] dark:text-[#86868b] bg-[#e5e5ea] dark:bg-[#2a3241] px-2 py-1 rounded-full">
                              +{Math.min(10, studentLessons.length - visibleLessonsCount)}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Kullanım Durumu */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white uppercase tracking-wider">
                    {language === 'tr' ? 'Kullanım Durumu' : 'Usage Status'}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl flex items-center">
                      <div>
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        {language === 'tr' ? 'Kalan Ders' : 'Remaining Lessons'}
                      </label>
                      <span className={`font-medium ${
                          studentDetails?.is_free
                          ? 'text-base text-gray-700 dark:text-gray-300'
                            : studentDetails?.remaining_lessons <= 0
                          ? 'text-2xl text-red-700 dark:text-red-400'
                            : studentDetails?.remaining_lessons <= 2
                          ? 'text-2xl text-amber-700 dark:text-amber-400'
                          : 'text-2xl text-emerald-700 dark:text-emerald-400'
                      }`}>
                          {studentDetails?.is_free
                            ? (language === 'tr' ? 'Ücretsiz' : 'Free')
                            : studentDetails?.remaining_lessons}
                      </span>
                    </div>
                    </div>
                    <div className="bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl flex items-center">
                      <div>
                          <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                            {language === 'tr' ? 'Ödeme Durumu' : 'Payment Status'}
                          </label>
                        <span className={`inline-flex w-auto items-center px-3 py-1.5 rounded-lg text-xs font-medium ${
                          studentDetails?.payment_status === 'ucretsiz'
                              ? 'bg-gray-400/10 text-gray-700 ring-1 ring-gray-500/20 dark:bg-gray-400/10 dark:text-gray-300 dark:ring-gray-400/20'
                              : studentDetails?.payment_status === 'odendi'
                              ? 'bg-emerald-400/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20'
                              : 'bg-amber-400/10 text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20'
                          }`}>
                          {translatePaymentStatus(studentDetails?.payment_status)}
                          </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* İstatistikler */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white uppercase tracking-wider">
                    {language === 'tr' ? 'İstatistikler' : 'Statistics'}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                      <label className="block text-[10px] text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        {language === 'tr' ? 'Katıldığı Dersler' : 'Attended Lessons'}
                      </label>
                      <span className="text-2xl font-medium text-[#1d1d1f] dark:text-white">
                        {studentDetails?.attended_lessons || 0}
                      </span>
                    </div>
                    <div className="bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                      <label className="block text-[10px] text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        {language === 'tr' ? 'Gelmeyen' : 'Absents'}
                      </label>
                      <span className="text-2xl font-medium text-[#1d1d1f] dark:text-white">
                        {studentDetails?.no_show_lessons || 0}
                      </span>
                    </div>
                    <div className="bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                      <label className="block text-[10px] text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        {language === 'tr' ? 'Telafi Dersleri' : 'Makeup Lessons'}
                      </label>
                      <span className="text-2xl font-medium text-[#1d1d1f] dark:text-white">
                        {studentDetails?.makeup_completed || 0}
                      </span>
                    </div>
                    <div className="bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                      <label className="block text-[10px] text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        {language === 'tr' ? 'Ertelenen Dersler' : 'Postponed Lessons'}
                      </label>
                      <span className="text-2xl font-medium text-[#1d1d1f] dark:text-white">
                        {studentDetails?.postponed_lessons || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {showDetailView && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/25 backdrop-blur-sm z-40"
          onClick={handleCloseDetail}
        />
      )}
    </div>
  );
};

export default RemainingUsage; 