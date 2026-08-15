import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useLanguage } from '../context/LanguageContext'
import { 
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ScaleIcon,
  ClockIcon,
  PlusIcon,
  FunnelIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  CalendarDaysIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import CreateExpenses from '../components/CreateExpenses'
import UpdateExpensesModal from '../components/UpdateExpensesModal'
import DeleteExpensesModal from '../components/DeleteExpensesModal'
import DatePicker, { registerLocale } from 'react-datepicker'
import { tr } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'

// Türkçe lokalizasyonu kaydet
registerLocale('tr', tr)

// Custom DatePicker Styles
const customDatePickerStyles = `
  .react-datepicker {
    font-family: inherit;
    border: none;
    border-radius: 24px;
    background: #fff;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
    padding: 24px;
    margin-top: 8px;
    backdrop-filter: blur(20px);
  }

  .dark .react-datepicker {
    background: #121621;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  }

  .react-datepicker__close-icon {
    padding-right: 10px;
  }

  .react-datepicker__close-icon::after {
    background-color: transparent !important;
    color: #216ba5;
    height: 25px;
    width: 25px;
    font-size: 25px;
    line-height: 1;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dark .react-datepicker__close-icon::after {
    color: #0071e3;
  }

  .react-datepicker__header {
    background: transparent;
    border: none;
    padding: 0;
  }

  .react-datepicker__month {
    margin: 0;
    padding: 12px 0;
  }

  .react-datepicker__day-names {
    display: flex;
    justify-content: space-between;
    margin: 16px 0 8px;
    padding: 0 8px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    padding-bottom: 12px;
  }

  .dark .react-datepicker__day-names {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .react-datepicker__day-name {
    color: #86868b;
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    width: 40px;
    height: 40px;
    line-height: 40px;
    margin: 0;
  }

  .react-datepicker__month-container {
    float: none;
    background: transparent;
  }

  .react-datepicker__week {
    display: flex;
    justify-content: space-between;
    margin: 4px 0;
    padding: 0 8px;
  }

  .react-datepicker__day {
    width: 40px;
    height: 40px;
    line-height: 40px;
    margin: 0;
    border-radius: 50%;
    color: #1d1d1f;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    position: relative;
  }

  .dark .react-datepicker__day {
    color: #fff;
  }

  .react-datepicker__day:hover:not(.react-datepicker__day--selected):not(.react-datepicker__day--in-range) {
    background: rgba(0, 113, 227, 0.1);
    border-radius: 50%;
  }

  .dark .react-datepicker__day:hover:not(.react-datepicker__day--selected):not(.react-datepicker__day--in-range) {
    background: rgba(0, 113, 227, 0.2);
  }

  .react-datepicker__day--keyboard-selected {
    background: none;
  }

  .react-datepicker__day--in-range {
    background: #0071e3 !important;
    color: white !important;
    border-radius: 0;
  }

  .dark .react-datepicker__day--in-range {
    background: #0071e3 !important;
    color: white !important;
  }

  .react-datepicker__day--in-selecting-range {
    background: #0071e3 !important;
    color: white !important;
    border-radius: 0;
  }

  .dark .react-datepicker__day--in-selecting-range {
    background: #0071e3 !important;
    color: white !important;
  }

  .react-datepicker__day--selecting-range-start,
  .react-datepicker__day--range-start,
  .react-datepicker__day--range-end,
  .react-datepicker__day--selected {
    background: #0071e3 !important;
    color: white !important;
    border-radius: 50% !important;
    font-weight: 600;
  }

  .react-datepicker__day--range-start {
    border-top-right-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
  }

  .react-datepicker__day--range-end {
    border-top-left-radius: 0 !important;
    border-bottom-left-radius: 0 !important;
  }

  .react-datepicker__day--outside-month {
    color: #86868b;
    opacity: 0.5;
  }

  .dark .react-datepicker__day--outside-month {
    color: #86868b;
    opacity: 0.3;
  }

  .react-datepicker__triangle {
    display: none;
  }

  .react-datepicker-popper {
    animation: datePickerSlideDown 0.2s ease-out forwards;
    opacity: 0;
    top: 40px !important;
  }

  @media (min-width: 1024px) {
    .react-datepicker-popper {
      left: -100px !important;
    }
  }

  @media (max-width: 1023px) {
    .react-datepicker-popper {
      left: 0 !important;
    }
  }

  .react-datepicker-popper[data-placement^='bottom'] {
    top: 40px !important;
  }

  @media (min-width: 1024px) {
    .react-datepicker-popper[data-placement^='bottom'] {
      left: -100px !important;
    }
  }

  @media (max-width: 1023px) {
    .react-datepicker-popper[data-placement^='bottom'] {
      left: 0 !important;
    }
  }

  .react-datepicker-popper[data-placement^='top'] {
    top: auto !important;
  }

  @media (min-width: 1024px) {
    .react-datepicker-popper[data-placement^='top'] {
      left: -100px !important;
    }
  }

  @media (max-width: 1023px) {
    .react-datepicker-popper[data-placement^='top'] {
      left: 0 !important;
    }
  }

  @keyframes datePickerSlideDown {
    from {
      opacity: 0;
      transform: translateY(-16px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .react-datepicker__day--today {
    position: relative;
    font-weight: 600;
    color: #0071e3;
  }

  .dark .react-datepicker__day--today {
    color: #0071e3;
  }

  .react-datepicker__day--today::after {
    content: '';
    position: absolute;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #0071e3;
  }
`;

// Supabase istemcisini oluştur
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Skeleton Components
const SummaryCardSkeleton = () => (
  <div className="bg-white dark:bg-[#121621] rounded-2xl border border-[#d2d2d7] dark:border-[#2a3241] overflow-hidden">
    <div className="h-1 w-full bg-gray-200 dark:bg-gray-700" />
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
      <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  </div>
)

const TableSkeleton = () => (
  <div className="bg-white dark:bg-[#121621] rounded-2xl border border-[#d2d2d7] dark:border-[#2a3241] p-6">
    <div className="flex items-center justify-between mb-6">
      <div className="space-y-2">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded " />
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded " />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-xl " />
        <div className="h-[38px] w-32 bg-gray-200 dark:bg-gray-700 rounded-xl " />
      </div>
    </div>
    
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden">
          <div className="border-b-2 border-[#d2d2d7] dark:border-[#2a3241] pb-4 mb-4">
            <div className="grid grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded " />
      ))}
    </div>
          </div>
          <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-full h-16 bg-gray-200 dark:bg-gray-700 rounded-xl " />
        ))}
          </div>
        </div>
      </div>
    </div>
  </div>
)

const ChartSkeleton = () => (
  <div className="bg-white dark:bg-[#121621] rounded-2xl border border-[#d2d2d7] dark:border-[#2a3241] p-6">
    <div className="flex items-center justify-between mb-8">
      <div className="space-y-2">
        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded " />
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded " />
      </div>
      <div className="flex items-center gap-4">
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded " />
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded " />
      </div>
    </div>
    <div className="h-[300px] bg-gray-200 dark:bg-gray-700 rounded-xl " />
    <div className="mt-6 space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700 " />
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded " />
          </div>
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded " />
        </div>
      ))}
    </div>
  </div>
)

export default function IncomeExpense() {
  const { language } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(true)
  const [isCreateExpenseModalOpen, setIsCreateExpenseModalOpen] = useState(false)
  const [summaryData, setSummaryData] = useState({
    monthlyIncome: 0,
    monthlyExpense: 0,
    netIncome: 0,
    pendingCount: 0
  })

  // Filtrelenmiş gelir toplam datası için yeni state ekliyorum
  const [filteredSummaryData, setFilteredSummaryData] = useState({
    filteredIncome: 0,
    filteredExpense: 0,
    filteredNetIncome: 0
  })

  // Grafik verisi için state
  const [chartData, setChartData] = useState([])
  const [chartRange, setChartRange] = useState(6) // Yeni state: default 6 ay

  // Pie chart verisi için state
  const [expenseDistribution, setExpenseDistribution] = useState([])

  // Tablo verileri için state
  const [incomeTableData, setIncomeTableData] = useState([])
  const [expenseTableData, setExpenseTableData] = useState([])

  // Filtreler için state
  const [incomeFilters, setIncomeFilters] = useState({
    paymentMethod: [],  // String yerine artık array yapısında
    dateRange: [],  
    paymentStatus: '',
    activeStatus: '',
    search: ''
  })

  const [expenseFilters, setExpenseFilters] = useState({
    expenseType: '',
    paymentMethod: '',
    dateRange: []  // null yerine boş dizi kullanıyoruz
  })

  const [isIncomeFilterSheetOpen, setIsIncomeFilterSheetOpen] = useState(false)
  const [isExpenseFilterSheetOpen, setIsExpenseFilterSheetOpen] = useState(false)

  // Modal states
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Tarih aralığı için state
  const [dateRange, setDateRange] = useState([
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  ])

  // Hızlı tarih seçimi için yardımcı fonksiyonlar
  const handleQuickDateSelect = (option) => {
    const today = new Date()
    let start, end

    switch (option) {
      case 'today':
        start = today
        end = today
        break
      case 'next14':
        start = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000) // Son 14 gün
        end = today
        break
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        break
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        end = new Date(today.getFullYear(), today.getMonth(), 0)
        break
      default:
        return
    }

    setDateRange([start, end])
  }

  // Özet verileri getir
  const fetchSummaryData = async () => {
    // Eğer tarih aralığı tam değilse işlemi yapma
    if (!dateRange[0] || !dateRange[1]) {
      return
    }

    setIsLoading(true)
    try {
      // Seçili tarih aralığını kullan
      const startDate = dateRange[0]
      // Bitiş tarihini günün sonuna ayarla (23:59:59.999)
      const endDate = new Date(dateRange[1])
      endDate.setHours(23, 59, 59, 999)

      // 1. Bu ayki gelirleri getir (financial_records tablosundan)
      const { data: incomeData, error: incomeError } = await supabase
        .from('financial_records')
        .select(`
          amount,
          payment_status,
          transaction_type,
          payment_date,
          registrations (
            package_start_date,
            package_end_date
          )
        `)
        .in('transaction_type', ['initial_payment', 'extension_payment'])
        .eq('payment_status', 'odendi')

      if (incomeError) throw incomeError

      // Ödeme tarihine göre filtreleme yapıyoruz
      const filteredIncomeData = incomeData.filter(record => {
        const paymentDate = new Date(record.payment_date || record.created_at);
        return paymentDate >= startDate && paymentDate <= endDate;
      });

      // 2. Bu ayki giderleri getir
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', startDate.toISOString())
        .lte('expense_date', endDate.toISOString())

      if (expenseError) throw expenseError

      // 3. Bekleyen ödemeleri getir - paket başlangıç tarihine göre filtreliyoruz
      const { data: pendingData, error: pendingError } = await supabase
        .from('financial_records')
        .select(`
          id,
          payment_status,
          payment_date,
          registrations (
            package_start_date,
            package_end_date
          )
        `)
        .eq('payment_status', 'beklemede')

      if (pendingError) throw pendingError

      // Bekleyen ödemeleri de ödeme tarihine göre filtreliyoruz
      const filteredPendingData = pendingData.filter(record => {
        // Eğer payment_date yoksa, tahsilat tarihi henüz belirlenmemiş demektir,
        // bu durumda bunu gelecekte tahsil edilecek ödeme olarak kabul edelim ve gösterelim
        if (!record.payment_date) return true;
        
        const paymentDate = new Date(record.payment_date);
        return paymentDate >= startDate && paymentDate <= endDate;
      });

      // Toplamları hesapla
      const monthlyIncome = filteredIncomeData.reduce((sum, record) => sum + record.amount, 0);
      const monthlyExpense = expenseData.reduce((sum, record) => sum + record.amount, 0)
      const netIncome = monthlyIncome - monthlyExpense
      const pendingCount = filteredPendingData.length

      // State'i güncelle
      setSummaryData({
        monthlyIncome,
        monthlyExpense,
        netIncome,
        pendingCount
      })

      // Filtrelenmiş veri için varsayılan değerleri ayarla
      setFilteredSummaryData({
        filteredIncome: monthlyIncome,
        filteredExpense: monthlyExpense,
        filteredNetIncome: netIncome
      })
    } catch (error) {
      console.error('Özet verileri getirilirken hata:', error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Gelir tablosu verilerini getir
  const fetchIncomeTableData = async () => {
    try {
      // 1. Önce tüm finansal kayıtları getirelim
      // Bütün finansal kayıtları getirelim, filtrelemeyi sonra yapalım
      const { data, error } = await supabase
        .from('financial_records')
        .select(`
          id,
          amount,
          payment_method,
          payment_status,
          created_at,
          transaction_type,
          registration_id,
          extension_history_id,
          payment_date,
          notes,
          registrations (
            student_name,
            parent_name,
            package_type,
            package_start_date,
            package_end_date,
            is_active,
            initial_start_date,
            initial_end_date,
            initial_package_type
          )
        `)
        .in('transaction_type', ['initial_payment', 'extension_payment'])
        .in('payment_status', ['odendi', 'beklemede']) // Hem ödendi hem bekleyen kayıtları getirelim
        .order('created_at', { ascending: false })

      if (error) throw error

      // 2. Uzatma geçmişini de getirelim
      const { data: extensionData, error: extensionError } = await supabase
        .from('extension_history')
        .select('*')

      if (extensionError) throw extensionError

      // 3. Verilerimizi işleyelim
      const formattedData = await Promise.all(data.map(async (record) => {
        let displayStartDate, displayEndDate, displayPackageType;

        if (record.transaction_type === 'initial_payment') {
          // İlk kayıt için kaydedilen ilk tarihleri kullan (UpdateModal sonrası doğru olmalı)
          displayStartDate = record.registrations.initial_start_date || record.registrations.package_start_date;
          displayEndDate = record.registrations.initial_end_date || record.registrations.package_end_date; 
          displayPackageType = record.registrations.initial_package_type || record.registrations.package_type;
        } else { // extension_payment
          // Öncelik: FK üzerinden direkt eşleşme; yoksa fuzzy fallback.
          const directMatch = record.extension_history_id
            ? extensionData.find(ext => ext.id === record.extension_history_id)
            : null;

          const potentialMatches = extensionData
            .filter(ext => ext.registration_id === record.registration_id)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

          const fuzzyMatch = potentialMatches.find(ext =>
            (record.payment_status === 'beklemede' ||
             (ext.payment_amount === record.amount &&
              ext.payment_method === record.payment_method &&
              (!record.payment_date || !ext.payment_date || Math.abs(new Date(record.payment_date) - new Date(ext.payment_date)) < 60000)
             )
            ) &&
            ext.new_package_type === record.registrations.package_type
          );

          const extensionRecord = directMatch || fuzzyMatch;

          if (extensionRecord && extensionRecord.new_start_date) {
            // Uzatma kaydı bulunduysa ve new_start_date varsa onu kullan
            displayStartDate = extensionRecord.new_start_date; // *** Düzeltildi: new_start_date kullanılıyor ***
            displayEndDate = extensionRecord.new_end_date;
            displayPackageType = extensionRecord.new_package_type;
          } else {
            // Güvenilir bir eşleşme bulunamadıysa veya new_start_date yoksa,
            // en iyi tahmin olarak mevcut paket tarihlerini kullan (bu durum ideal değil)
            console.warn(`Extension history eşleşmesi bulunamadı veya new_start_date eksik: financial_record.id=${record.id}, registration_id=${record.registration_id}`);
            displayStartDate = record.registrations.package_start_date;
            displayEndDate = record.registrations.package_end_date;
            displayPackageType = record.registrations.package_type;
          }
        }

        return {
          id: record.id,
          student: record.registrations.student_name,
          parent: record.registrations.parent_name,
          package: displayPackageType,
          date: displayStartDate,
          end_date: displayEndDate,
          is_active: record.registrations.is_active,
          amount: record.amount,
          method: record.payment_method,
          status: record.payment_status,
          payment_date: record.payment_date || record.created_at, // Ödeme tarihi, yoksa created_at kullanılır
          transaction_type: record.transaction_type === 'initial_payment' 
            ? (language === 'tr' ? 'İlk Kayıt' : 'Initial Registration')
            : (language === 'tr' ? 'Paket Uzatma' : 'Package Extension'),
          created_at: record.created_at
        };
      }));

      // 4. Tarihe göre filtreleme yap - Artık ödeme tarihine göre filtreleme yapıyoruz
      const filteredData = formattedData.filter(record => {
        const paymentDate = new Date(record.payment_date);
        
        // Bitiş tarihini günün sonuna ayarla (23:59:59.999)
        const endDateAdjusted = new Date(dateRange[1]);
        endDateAdjusted.setHours(23, 59, 59, 999);
        
        // Ödeme tarihi belirtilen aralıkta mı kontrol et
        return paymentDate >= dateRange[0] && paymentDate <= endDateAdjusted;
      });

      // 5. Varsayılan olarak sadece "odendi" durumundaki kayıtları gösterelim
      // Ancak filtre uygulanmışsa ve "beklemede" seçilmişse, o durumda bekleyen kayıtları gösterelim
      const paymentStatusFiltered = incomeFilters.paymentStatus 
        ? filteredData.filter(record => record.status === incomeFilters.paymentStatus)
        : filteredData.filter(record => record.status === 'odendi'); // Varsayılan olarak sadece ödenmiş olanları göster

      setIncomeTableData(paymentStatusFiltered);
    } catch (error) {
      console.error('Gelir tablosu verileri getirilirken hata:', error.message);
    }
  }

  // Gider tablosu verilerini getir
  const fetchExpenseTableData = async () => {
    try {
      // Bitiş tarihini günün sonuna ayarla (23:59:59.999)
      const endDateAdjusted = new Date(dateRange[1]);
      endDateAdjusted.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', dateRange[0].toISOString())
        .lte('expense_date', endDateAdjusted.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = data.map(record => ({
        id: record.id,
        title: record.description,
        category: record.expense_type,
        date: record.expense_date,
        notes: record.notes || '',
        amount: record.amount,
        method: record.payment_method
      }))

      setExpenseTableData(formattedData)
    } catch (error) {
      console.error('Gider tablosu verileri getirilirken hata:', error.message)
    }
  }

  // Gider dağılımı verilerini getir
  const fetchExpenseDistribution = async () => {
    try {
      // Bitiş tarihini günün sonuna ayarla (23:59:59.999)
      const endDateAdjusted = new Date(dateRange[1]);
      endDateAdjusted.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from('expenses')
        .select('expense_type, amount')
        .gte('expense_date', dateRange[0].toISOString())
        .lte('expense_date', endDateAdjusted.toISOString())

      if (error) throw error

      // Kategorilere göre toplamları hesapla
      const totals = data.reduce((acc, curr) => {
        const type = curr.expense_type
        if (!acc[type]) {
          acc[type] = {
            name: type,
            value: 0,
            color: type === 'kira' ? '#0071e3'
              : type === 'elektrik' ? '#34d399'
              : type === 'su' ? '#fbbf24'
              : type === 'dogalgaz' ? '#f87171'
              : type === 'internet' ? '#a78bfa'
              : type === 'maas' ? '#60a5fa'
              : type === 'malzeme' ? '#fb923c'
              : type === 'mutfak' ? '#4ade80'
              : type === 'reklam' ? '#f472b6'
              : type === 'filament' ? '#22d3ee'
              : '#94a3b8'
          }
        }
        acc[type].value += curr.amount
        return acc
      }, {})

      // Object değerlerini array'e çevir
      const distributionData = Object.values(totals)

      setExpenseDistribution(distributionData)
    } catch (error) {
      console.error('Gider dağılımı verileri getirilirken hata:', error.message)
    }
  }

  // Tüm verileri getir
  const fetchAllData = async () => {
    setIsLoading(true)
    setIsTableLoading(true)
    
    try {
      await fetchSummaryData()
      await fetchIncomeTableData()
      await fetchExpenseTableData()
      await fetchExpenseDistribution()
      
      // Son seçilen ay sayısının verilerini getir
      const selectedMonthsAgo = new Date()
      selectedMonthsAgo.setMonth(selectedMonthsAgo.getMonth() - (chartRange - 1))

      // Gelirler - hem ilk kayıt hem uzatma işlemlerini dahil edelim
      const { data: monthlyIncomeData, error: monthlyIncomeError } = await supabase
        .from('financial_records')
        .select(`
          amount, 
          created_at,
          payment_date,
          transaction_type
        `)
        .in('transaction_type', ['initial_payment', 'extension_payment'])
        .eq('payment_status', 'odendi')
        .gte('created_at', selectedMonthsAgo.toISOString())
        .order('created_at', { ascending: true })

      if (monthlyIncomeError) throw monthlyIncomeError

      // Giderler
      const { data: monthlyExpenseData, error: monthlyExpenseError } = await supabase
        .from('expenses')
        .select('amount, expense_date')
        .gte('expense_date', selectedMonthsAgo.toISOString())
        .order('expense_date', { ascending: true })

      if (monthlyExpenseError) throw monthlyExpenseError

      // Grafik verilerini hazırla
      const monthlyData = {}
      const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

      // Son seçilen ay sayısını döngüye al
      for (let i = 0; i < chartRange; i++) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`
        const monthName = months[date.getMonth()]
        
        monthlyData[monthKey] = {
          name: monthName,
          gelir: 0,
          gider: 0
        }
      }

      // Gelirleri ekle - artık ödeme tarihine göre grupluyoruz
      monthlyIncomeData.forEach(record => {
        // Ödeme tarihine göre grupla
        const date = new Date(record.payment_date || record.created_at);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].gelir += record.amount;
        }
      });

      // Giderleri ekle
      monthlyExpenseData.forEach(record => {
        const date = new Date(record.expense_date)
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].gider += record.amount
        }
      })

      // Grafik verilerini state'e aktar
      setChartData(Object.values(monthlyData).reverse())
    } catch (error) {
      console.error('Veriler getirilirken hata:', error.message)
    } finally {
      setIsLoading(false)
      setIsTableLoading(false)
    }
  }

  // Filtreleri uygula
  const applyFilters = (data, filterType) => {
    const currentFilters = filterType === 'income' ? incomeFilters : expenseFilters;
    
    const filteredData = data.filter(item => {
      // Search filter for income
      let searchMatch = true;
      if (filterType === 'income' && currentFilters.search) {
        const searchTerm = currentFilters.search.toLowerCase();
        searchMatch = item.student.toLowerCase().includes(searchTerm) || 
                     item.parent.toLowerCase().includes(searchTerm);
      }
      
      // Ödeme yöntemi filtresini güncelliyoruz - çoklu seçim kontrolü
      let methodMatch = true;
      if (filterType === 'income') {
        // Boş dizi değilse (hiçbir filtre seçilmediğinde) ve dizi uzunluğu > 0 ise filtre uygula
        methodMatch = !currentFilters.paymentMethod.length || 
                      currentFilters.paymentMethod.includes(item.method.toLowerCase());
      } else {
        methodMatch = !currentFilters.paymentMethod || item.method.toLowerCase() === currentFilters.paymentMethod;
      }
      
      let statusMatch = true;
      if (filterType === 'income') {
        statusMatch = !currentFilters.paymentStatus || item.status === currentFilters.paymentStatus;
      }
      
      let activeStatusMatch = true;
      if (filterType === 'income' && currentFilters.activeStatus) {
        activeStatusMatch = 
          (currentFilters.activeStatus === 'active' && item.is_active) ||
          (currentFilters.activeStatus === 'inactive' && !item.is_active);
      }
      
      let categoryMatch = true;
      if (filterType === 'income') {
        // Burada dateRange kontrolünü düzenliyoruz - null veya boş dizi kontrolü
        categoryMatch = !currentFilters.dateRange || !currentFilters.dateRange.length || (
          new Date(item.date) >= currentFilters.dateRange[0] &&
          new Date(item.date) <= currentFilters.dateRange[1]
        );
      } else {
        categoryMatch = !currentFilters.expenseType || item.category.toLowerCase() === currentFilters.expenseType;
      }
      
      return searchMatch && methodMatch && categoryMatch && statusMatch && activeStatusMatch;
    });

    // Filtrelemeden sonra toplam tutarları hesaplama
    if (filterType === 'income') {
      // Yeni bir filtrelenmiş gelir hesaplaması yapıyoruz
      const filteredIncome = filteredData.reduce((total, item) => total + item.amount, 0);
      
      // Mevcut filtrelenmiş toplam ile farklı ise state güncelleniyor
      if (filteredSummaryData.filteredIncome !== filteredIncome) {
        setFilteredSummaryData(prev => ({
          ...prev,
          filteredIncome: filteredIncome,
          // Net gelir hesaplaması - eğer gider filtresi varsa onu, yoksa toplam gideri kullan
          filteredNetIncome: filteredIncome - (expenseFilters.expenseType || expenseFilters.paymentMethod ? 
            prev.filteredExpense : summaryData.monthlyExpense)
        }));
      }
    } else if (filterType === 'expense') {
      // Gider için benzer hesaplama
      const filteredExpense = filteredData.reduce((total, item) => total + item.amount, 0);
      if (filteredSummaryData.filteredExpense !== filteredExpense) {
        setFilteredSummaryData(prev => ({
          ...prev,
          filteredExpense: filteredExpense,
          // Net gelir hesaplaması - eğer gelir filtresi varsa onu, yoksa toplam geliri kullan
          filteredNetIncome: (incomeFilters.paymentMethod.length || incomeFilters.paymentStatus || incomeFilters.activeStatus ? 
            prev.filteredIncome : summaryData.monthlyIncome) - filteredExpense
        }));
      }
    }
    
    return filteredData;
  };

  useEffect(() => {
    // Eğer dateRange'in her iki değeri de varsa (başlangıç ve bitiş) veriyi getir
    if (dateRange[0] && dateRange[1]) {
      fetchAllData()
    }
  }, [dateRange])

  // Filtreleri izle ve uygula
  useEffect(() => {
    if (!isTableLoading) {
      fetchIncomeTableData()
      fetchExpenseTableData()
    }
  }, [incomeFilters, expenseFilters])

  // Yeni useEffect - Filtreler değiştiğinde filtrelenmiş verileri hazırla
  // Bu sadece veriler hazır olduğunda çalışacak
  useEffect(() => {
    if (!isTableLoading && incomeTableData.length > 0) {
      // Bu useEffect içinde doğrudan applyFilters çağırmıyoruz
      // Çünkü applyFilters hem filtreleme yapıp hem de state güncellediği için
      // sonsuz döngüye neden olabilir
      const filtered = incomeTableData.filter(item => {
        return !incomeFilters.paymentMethod.length || 
               incomeFilters.paymentMethod.includes(item.method.toLowerCase());
      });
      
      const filteredIncome = filtered.reduce((total, item) => total + item.amount, 0);
      setFilteredSummaryData(prev => ({
        ...prev,
        filteredIncome: filteredIncome,
        filteredNetIncome: filteredIncome - (expenseFilters.expenseType || expenseFilters.paymentMethod ? 
          prev.filteredExpense : summaryData.monthlyExpense)
      }));
    }
  }, [isTableLoading, incomeFilters.paymentMethod, incomeTableData]);

  // Gider filtreleri için yeni useEffect
  useEffect(() => {
    if (!isTableLoading && expenseTableData.length > 0) {
      const filtered = expenseTableData.filter(item => {
        const methodMatch = !expenseFilters.paymentMethod || item.method.toLowerCase() === expenseFilters.paymentMethod;
        const categoryMatch = !expenseFilters.expenseType || item.category.toLowerCase() === expenseFilters.expenseType;
        
        return methodMatch && categoryMatch;
      });
      
      const filteredExpense = filtered.reduce((total, item) => total + item.amount, 0);
      setFilteredSummaryData(prev => ({
        ...prev,
        filteredExpense: filteredExpense,
        filteredNetIncome: (incomeFilters.paymentMethod.length || incomeFilters.paymentStatus || incomeFilters.activeStatus ? 
          prev.filteredIncome : summaryData.monthlyIncome) - filteredExpense
      }));
    }
  }, [isTableLoading, expenseFilters.paymentMethod, expenseFilters.expenseType, expenseTableData]);

  // Para formatı
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2, // Değiştirildi: 0 -> 2
      maximumFractionDigits: 2  // Değiştirildi: 0 -> 2
    }).format(amount)
  }

  // Tooltip için para formatı
  const formatTooltipValue = (value) => {
    return formatCurrency(value)
  }

  // Handle update
  const handleUpdate = () => {
    fetchAllData()
  }

  // Handle delete
  const handleDelete = () => {
    fetchAllData()
  }

  // State for active dropdown
  const [activeDropdown, setActiveDropdown] = useState(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdownButton = event.target.closest('.dropdown-toggle');
      const dropdownMenu = event.target.closest('.dropdown-menu');
      
      if (!dropdownButton && !dropdownMenu) {
        setActiveDropdown(null);
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [activeDropdown])

  // Add new useEffect for chartRange
  useEffect(() => {
    fetchAllData()
  }, [chartRange])

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between h-auto lg:h-16 px-6 border-b border-[#d2d2d7] dark:border-[#2a3241] py-4 lg:py-0 gap-4 lg:gap-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium text-[#1d1d1f] dark:text-white">
            {language === 'tr' ? 'Gelir/Gider' : 'Income/Expense'}
          </h1>
        </div>

        {/* Date Range Picker ve Quick Selection Buttons */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 w-full lg:w-auto">
          {/* Quick Selection Buttons */}
          <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            <button
              onClick={() => handleQuickDateSelect('today')}
              className="h-9 px-4 rounded-lg text-sm font-medium bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] transition-colors whitespace-nowrap"
            >
              {language === 'tr' ? 'Bugün' : 'Today'}
            </button>
            <button
              onClick={() => handleQuickDateSelect('next14')}
              className="h-9 px-4 rounded-lg text-sm font-medium bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] transition-colors whitespace-nowrap"
            >
              {language === 'tr' ? 'Son 14 Gün' : 'Last 14 Days'}
            </button>
            <button
              onClick={() => handleQuickDateSelect('lastMonth')}
              className="h-9 px-4 rounded-lg text-sm font-medium bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] transition-colors whitespace-nowrap"
            >
              {language === 'tr' ? 'Geçen Ay' : 'Last Month'}
            </button>
            <button
              onClick={() => handleQuickDateSelect('thisMonth')}
              className="h-9 px-4 rounded-lg text-sm font-medium bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] transition-colors whitespace-nowrap"
            >
              {language === 'tr' ? 'Bu Ay' : 'This Month'}
            </button>
          </div>

          {/* Date Range Picker */}
          <div className="relative w-full lg:w-auto">
            <style>{customDatePickerStyles}</style>
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <CalendarDaysIcon className="w-5 h-5 text-[#86868b]" />
            </div>
            <DatePicker
              selectsRange={true}
              startDate={dateRange[0]}
              endDate={dateRange[1]}
              onChange={(update) => setDateRange(update)}
              dateFormat="dd.MM.yyyy"
              locale={language === 'tr' ? 'tr' : 'en'}
              className="h-10 pl-4 pr-4 rounded-lg text-sm font-medium bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] transition-all cursor-pointer w-full lg:w-[210px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-opacity-50 focus:border-[#0071e3]"
              placeholderText={language === 'tr' ? 'Tarih Aralığı Seçin' : 'Select Date Range'}
              showPopperArrow={false}
              isClearable={true}
              renderCustomHeader={({
                date,
                decreaseMonth,
                increaseMonth,
                prevMonthButtonDisabled,
                nextMonthButtonDisabled
              }) => (
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                    type="button"
                    className="p-2 rounded-xl hover:bg-[#f5f5f7] dark:hover:bg-[#2a3241] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <svg className="w-5 h-5 text-[#1d1d1f] dark:text-white opacity-75 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.01em]">
                    {date.toLocaleString(language === 'tr' ? 'tr' : 'en', { 
                      month: 'long',
                      year: 'numeric'
                    }).split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </div>
                  <button
                    onClick={increaseMonth}
                    disabled={nextMonthButtonDisabled}
                    type="button"
                    className="p-2 rounded-xl hover:bg-[#f5f5f7] dark:hover:bg-[#2a3241] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <svg className="w-5 h-5 text-[#1d1d1f] dark:text-white opacity-75 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            />
          </div>
        </div>
      </div>

      {/* Income Filter Sheet */}
      <div className={`
        fixed right-0 top-0 h-full w-[400px] bg-white dark:bg-[#121621] shadow-xl z-50 transform transition-transform duration-300
        ${isIncomeFilterSheetOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Sheet Header */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-[#d2d2d7] dark:border-[#2a3241] shrink-0">
            <h2 className="text-lg font-medium text-[#1d1d1f] dark:text-white">
              {language === 'tr' ? 'Gelir Filtreleri' : 'Income Filters'}
            </h2>
            <button
              onClick={() => setIsIncomeFilterSheetOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241] transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-[#424245] dark:text-[#86868b]" />
            </button>
          </div>

          {/* Sheet Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Öğrenci Durumu Filtresi */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                {language === 'tr' ? 'Öğrenci Durumu' : 'Student Status'}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setIncomeFilters(prev => ({ ...prev, activeStatus: 'active' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors flex-1 whitespace-nowrap
                    ${incomeFilters.activeStatus === 'active'
                      ? 'bg-[#0f766e] dark:bg-[#34d399] text-white'
                      : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0f766e] dark:hover:border-[#34d399]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Aktif' : 'Active'}
                </button>
                <button
                  onClick={() => setIncomeFilters(prev => ({ ...prev, activeStatus: 'inactive' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors flex-1 whitespace-nowrap
                    ${incomeFilters.activeStatus === 'inactive'
                      ? 'bg-[#be123c] dark:bg-[#ef4444] text-white'
                      : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#be123c] dark:hover:border-[#ef4444]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Pasif' : 'Inactive'}
                </button>
              </div>
            </div>

            {/* Ödeme Yöntemi Filtresi */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                {language === 'tr' ? 'Ödeme Yöntemi' : 'Payment Method'}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIncomeFilters(prev => {
                      const newPaymentMethod = [...prev.paymentMethod];
                      // Eğer zaten seçiliyse kaldır, değilse ekle (toggle)
                      if (newPaymentMethod.includes('banka')) {
                        return { ...prev, paymentMethod: newPaymentMethod.filter(m => m !== 'banka') };
                      } else {
                        return { ...prev, paymentMethod: [...newPaymentMethod, 'banka'] };
                      }
                    });
                  }}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors flex-1 whitespace-nowrap
                    ${incomeFilters.paymentMethod.includes('banka')
                      ? 'bg-[#121621] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Banka' : 'Bank'}
                </button>
                <button
                  onClick={() => {
                    setIncomeFilters(prev => {
                      const newPaymentMethod = [...prev.paymentMethod];
                      // Eğer zaten seçiliyse kaldır, değilse ekle (toggle)
                      if (newPaymentMethod.includes('nakit')) {
                        return { ...prev, paymentMethod: newPaymentMethod.filter(m => m !== 'nakit') };
                      } else {
                        return { ...prev, paymentMethod: [...newPaymentMethod, 'nakit'] };
                      }
                    });
                  }}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors flex-1 whitespace-nowrap
                    ${incomeFilters.paymentMethod.includes('nakit')
                      ? 'bg-[#121621] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Nakit' : 'Cash'}
                </button>
                <button
                  onClick={() => {
                    setIncomeFilters(prev => {
                      const newPaymentMethod = [...prev.paymentMethod];
                      // Eğer zaten seçiliyse kaldır, değilse ekle (toggle)
                      if (newPaymentMethod.includes('kart')) {
                        return { ...prev, paymentMethod: newPaymentMethod.filter(m => m !== 'kart') };
                      } else {
                        return { ...prev, paymentMethod: [...newPaymentMethod, 'kart'] };
                      }
                    });
                  }}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors flex-1 whitespace-nowrap
                    ${incomeFilters.paymentMethod.includes('kart')
                      ? 'bg-[#121621] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Kredi Kartı' : 'Credit Card'}
                </button>
              </div>
            </div>

            {/* Ödeme Durumu Filtresi */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                {language === 'tr' ? 'Ödeme Durumu' : 'Payment Status'}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setIncomeFilters(prev => ({ ...prev, paymentStatus: 'odendi' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors flex-1 whitespace-nowrap
                    ${incomeFilters.paymentStatus === 'odendi'
                      ? 'bg-[#121621] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Ödendi' : 'Paid'}
                </button>
                <button
                  onClick={() => setIncomeFilters(prev => ({ ...prev, paymentStatus: 'beklemede' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors flex-1 whitespace-nowrap
                    ${incomeFilters.paymentStatus === 'beklemede'
                      ? 'bg-[#121621] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Beklemede' : 'Pending'}
                </button>
              </div>
            </div>
          </div>

          {/* Sheet Footer */}
          <div className="px-6 py-4 border-t border-[#d2d2d7] dark:border-[#2a3241] shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  // Filtreleri temizlerken paymentMethod'u [] olarak ayarlıyoruz
                  setIncomeFilters({
                    paymentMethod: [],  // Boş array olarak ayarla
                    dateRange: [],
                    paymentStatus: '',
                    activeStatus: '',
                    search: ''
                  })
                  setIsIncomeFilterSheetOpen(false)
                }}
                className="flex-1 h-10 bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a3241] focus:outline-none transition-colors"
              >
                {language === 'tr' ? 'Filtreleri Temizle' : 'Clear Filters'}
              </button>
              <button
                onClick={() => setIsIncomeFilterSheetOpen(false)}
                className="flex-1 h-10 bg-[#1d1d1f] dark:bg-[#0071e3] text-white font-medium rounded-xl hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none transition-colors"
              >
                {language === 'tr' ? 'Uygula' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Filter Sheet */}
      <div className={`
        fixed right-0 top-0 h-full w-[400px] bg-white dark:bg-[#121621] shadow-xl z-50 transform transition-transform duration-300
        ${isExpenseFilterSheetOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Sheet Header */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-[#d2d2d7] dark:border-[#2a3241] shrink-0">
            <h2 className="text-lg font-medium text-[#1d1d1f] dark:text-white">
              {language === 'tr' ? 'Gider Filtreleri' : 'Expense Filters'}
            </h2>
            <button
              onClick={() => setIsExpenseFilterSheetOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241] transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-[#424245] dark:text-[#86868b]" />
            </button>
          </div>

          {/* Sheet Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Gider Türü Filtresi */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                {language === 'tr' ? 'Gider Türü' : 'Expense Type'}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {['kira', 'elektrik', 'su', 'internet', 'maas', 'malzeme', 'mutfak', 'reklam', 'filament', 'diger'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setExpenseFilters(prev => ({ ...prev, expenseType: type }))}
                    className={`
                      h-9 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                      ${expenseFilters.expenseType === type
                        ? 'bg-[#121621] dark:bg-[#0071e3] text-white'
                        : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                      }
                    `}
                  >
                    {language === 'tr'
                      ? type.charAt(0).toUpperCase() + type.slice(1)
                      : type === 'kira' ? 'Rent'
                      : type === 'elektrik' ? 'Electricity'
                      : type === 'su' ? 'Water'
                      : type === 'internet' ? 'Internet'
                      : type === 'maas' ? 'Salary'
                      : type === 'malzeme' ? 'Materials'
                      : type === 'mutfak' ? 'Kitchen'
                      : type === 'reklam' ? 'Advertising'
                      : type === 'filament' ? 'Filament'
                      : 'Other'
                    }
                  </button>
                ))}
              </div>
            </div>

            {/* Ödeme Yöntemi Filtresi */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                {language === 'tr' ? 'Ödeme Yöntemi' : 'Payment Method'}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setExpenseFilters(prev => ({ ...prev, paymentMethod: 'banka' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors flex-1 whitespace-nowrap
                    ${expenseFilters.paymentMethod === 'banka'
                      ? 'bg-[#121621] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Banka' : 'Bank'}
                </button>
                <button
                  onClick={() => setExpenseFilters(prev => ({ ...prev, paymentMethod: 'nakit' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors flex-1 whitespace-nowrap
                    ${expenseFilters.paymentMethod === 'nakit'
                      ? 'bg-[#121621] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Nakit' : 'Cash'}
                </button>
                <button
                  onClick={() => setExpenseFilters(prev => ({ ...prev, paymentMethod: 'kart' }))}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium transition-colors flex-1 whitespace-nowrap
                    ${expenseFilters.paymentMethod === 'kart'
                      ? 'bg-[#121621] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  {language === 'tr' ? 'Kredi Kartı' : 'Credit Card'}
                </button>
              </div>
            </div>
          </div>

          {/* Sheet Footer */}
          <div className="px-6 py-4 border-t border-[#d2d2d7] dark:border-[#2a3241] shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  // Gider filtreleri için de aynı şekilde dateRange'i [] olarak ayarlıyoruz
                  setExpenseFilters({
                    expenseType: '',
                    paymentMethod: '',
                    dateRange: []  // null yerine boş dizi
                  })
                  setIsExpenseFilterSheetOpen(false)
                }}
                className="flex-1 h-10 bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a3241] focus:outline-none transition-colors"
              >
                {language === 'tr' ? 'Filtreleri Temizle' : 'Clear Filters'}
              </button>
              <button
                onClick={() => setIsExpenseFilterSheetOpen(false)}
                className="flex-1 h-10 bg-[#1d1d1f] dark:bg-[#0071e3] text-white font-medium rounded-xl hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none transition-colors"
              >
                {language === 'tr' ? 'Uygula' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlays */}
      {(isIncomeFilterSheetOpen || isExpenseFilterSheetOpen) && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40"
          onClick={() => {
            setIsIncomeFilterSheetOpen(false)
            setIsExpenseFilterSheetOpen(false)
          }}
        />
      )}

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            <>
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
            </>
          ) : (
            <>
              {/* Aylık Gelir - Filtreleme bilgisini çoklu seçime göre güncelliyoruz */}
              <div className="bg-white dark:bg-[#121621] rounded-2xl border border-[#d2d2d7] dark:border-[#2a3241] overflow-hidden group hover:border-[#0071e3] dark:hover:border-[#0071e3] hover:shadow-lg dark:hover:shadow-[#0071e3]/10 transition-all duration-200">
                <div className="h-1 w-full bg-[#0071e3]" />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[#6e6e73] dark:text-[#86868b] text-sm font-medium">
                      {language === 'tr' ? 'Gelir' : 'Income'}
                      {incomeFilters.paymentMethod.length > 0 && (
                        <span className="ml-1 text-xs">
                          ({language === 'tr' ? 
                            (incomeFilters.paymentMethod.map(method => 
                              method === 'nakit' ? 'Nakit' : 
                              method === 'banka' ? 'Banka' : 
                              method === 'kart' ? 'Kredi Kartı' : ''
                            ).join(', ')) : 
                            (incomeFilters.paymentMethod.map(method => 
                              method === 'nakit' ? 'Cash' : 
                              method === 'banka' ? 'Bank' : 
                              method === 'kart' ? 'Credit Card' : ''
                            ).join(', '))})
                        </span>
                      )}
                    </p>
                    <div className="w-7 h-7 bg-[#0071e3]/10 dark:bg-[#0071e3]/20 rounded-lg flex items-center justify-center">
                      <ArrowTrendingUpIcon className="w-4 h-4 text-[#0071e3]" />
                    </div>
                  </div>
                  <div className="flex items-end gap-1">
                    <h3 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">
                      {isLoading ? '...' : 
                        // Filtre varsa filtrelenmiş geliri göster, yoksa tüm geliri göster
                        formatCurrency(incomeFilters.paymentMethod.length || incomeFilters.paymentStatus || incomeFilters.activeStatus ? 
                          filteredSummaryData.filteredIncome : 
                          summaryData.monthlyIncome)
                      }
                    </h3>
                  </div>
                </div>
              </div>

              {/* Aylık Gider - Artık filtrelenebilir */}
              <div className="bg-white dark:bg-[#121621] rounded-2xl border border-[#d2d2d7] dark:border-[#2a3241] overflow-hidden group hover:border-[#0071e3] dark:hover:border-[#0071e3] hover:shadow-lg dark:hover:shadow-[#0071e3]/10 transition-all duration-200">
                <div className="h-1 w-full bg-[#ef4444]" />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[#6e6e73] dark:text-[#86868b] text-sm font-medium">
                      {language === 'tr' ? 'Gider' : 'Expense'}
                      {expenseFilters.paymentMethod && (
                        <span className="ml-1 text-xs">
                          ({language === 'tr' ? 
                            (expenseFilters.paymentMethod === 'nakit' ? 'Nakit' : 
                             expenseFilters.paymentMethod === 'banka' ? 'Banka' : 
                             expenseFilters.paymentMethod === 'kart' ? 'Kredi Kartı' : '') : 
                            (expenseFilters.paymentMethod === 'nakit' ? 'Cash' : 
                             expenseFilters.paymentMethod === 'banka' ? 'Bank' : 
                             expenseFilters.paymentMethod === 'kart' ? 'Credit Card' : '')})
                        </span>
                      )}
                      {expenseFilters.expenseType && (
                        <span className="ml-1 text-xs">
                          ({language === 'tr'
                            ? expenseFilters.expenseType.charAt(0).toUpperCase() + expenseFilters.expenseType.slice(1)
                            : expenseFilters.expenseType === 'kira' ? 'Rent'
                            : expenseFilters.expenseType === 'elektrik' ? 'Electricity'
                            : expenseFilters.expenseType === 'su' ? 'Water'
                            : expenseFilters.expenseType === 'internet' ? 'Internet'
                            : expenseFilters.expenseType === 'maas' ? 'Salary'
                            : expenseFilters.expenseType === 'malzeme' ? 'Materials'
                            : expenseFilters.expenseType === 'mutfak' ? 'Kitchen'
                            : expenseFilters.expenseType === 'reklam' ? 'Advertising'
                            : expenseFilters.expenseType === 'filament' ? 'Filament'
                            : 'Other'})
                        </span>
                      )}
                    </p>
                    <div className="w-7 h-7 bg-[#ef4444]/10 dark:bg-[#ef4444]/20 rounded-lg flex items-center justify-center">
                      <ArrowTrendingDownIcon className="w-4 h-4 text-[#ef4444]" />
                    </div>
                  </div>
                  <div className="flex items-end gap-1">
                    <h3 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">
                      {isLoading ? '...' : formatCurrency(expenseFilters.expenseType || expenseFilters.paymentMethod ? 
                        filteredSummaryData.filteredExpense : summaryData.monthlyExpense)}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Net Kazanç - Artık filtrelere göre hesaplanıyor */}
              <div className="bg-white dark:bg-[#121621] rounded-2xl border border-[#d2d2d7] dark:border-[#2a3241] overflow-hidden group hover:border-[#0071e3] dark:hover:border-[#0071e3] hover:shadow-lg dark:hover:shadow-[#0071e3]/10 transition-all duration-200">
                <div className="h-1 w-full bg-[#34d399]" />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[#6e6e73] dark:text-[#86868b] text-sm font-medium">
                      {language === 'tr' ? 'Net Kazanç' : 'Net Income'}
                      {(incomeFilters.paymentMethod.length || expenseFilters.paymentMethod || expenseFilters.expenseType) && (
                        <span className="ml-1 text-xs">
                          ({language === 'tr' ? 'Filtrelenmiş' : 'Filtered'})
                        </span>
                      )}
                    </p>
                    <div className="w-7 h-7 bg-[#34d399]/10 dark:bg-[#34d399]/20 rounded-lg flex items-center justify-center">
                      <ScaleIcon className="w-4 h-4 text-[#34d399]" />
                    </div>
                  </div>
                  <div className="flex items-end gap-1">
                    <h3 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">
                      {isLoading ? '...' : formatCurrency(
                        (incomeFilters.paymentMethod.length || incomeFilters.paymentStatus || incomeFilters.activeStatus || 
                         expenseFilters.paymentMethod || expenseFilters.expenseType) 
                          ? filteredSummaryData.filteredNetIncome 
                          : summaryData.netIncome
                      )}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Bekleyen Tahsilatlar */}
              <div 
                onClick={() => {
                  setIncomeFilters(prev => ({ ...prev, paymentStatus: 'beklemede' }));
                  fetchIncomeTableData();
                }}
                className="bg-white dark:bg-[#121621] rounded-2xl border border-[#d2d2d7] dark:border-[#2a3241] overflow-hidden group hover:border-[#0071e3] dark:hover:border-[#0071e3] hover:shadow-lg dark:hover:shadow-[#0071e3]/10 transition-all duration-200 cursor-pointer"
              >
                <div className="h-1 w-full bg-[#fbbf24]" />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[#6e6e73] dark:text-[#86868b] text-sm font-medium">
                      {language === 'tr' ? 'Bekleyen Tahsilatlar' : 'Pending Payments'}
                    </p>
                    <div className="w-7 h-7 bg-[#fbbf24]/10 dark:bg-[#fbbf24]/20 rounded-lg flex items-center justify-center">
                      <ClockIcon className="w-4 h-4 text-[#fbbf24]" />
                    </div>
                  </div>
                  <div className="flex items-end gap-1">
                    <h3 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">
                      {isLoading ? '...' : summaryData.pendingCount}
                    </h3>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Income Table */}
        {isTableLoading ? (
          <TableSkeleton />
        ) : (
          <div className="bg-white dark:bg-[#121621] rounded-2xl border border-[#d2d2d7] dark:border-[#2a3241] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[#f5f5f7] dark:border-[#2a3241]">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">
                      {language === 'tr' ? 'Gelir Detayları' : 'Income Details'}
                    </h2>
                    <span className="text-sm font-medium text-[#424245] dark:text-[#86868b]">
                      ({applyFilters(incomeTableData, 'income').length})
                    </span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1 sm:flex-none">
                    <input
                      type="search"
                      placeholder={language === 'tr' ? 'Öğrenci veya veli ara...' : 'Search student or parent...'}
                      value={incomeFilters.search}
                      onChange={(e) => setIncomeFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="h-9 pl-9 pr-4 rounded-xl text-sm font-medium bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] focus:border-[#0071e3] dark:focus:border-[#0071e3] focus:bg-white dark:focus:bg-[#121621] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-opacity-20 transition-all w-full sm:w-[250px]"
                    />
                    <svg className="w-4 h-4 text-[#86868b] absolute left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                  </div>
                  <button
                    onClick={() => setIsIncomeFilterSheetOpen(true)}
                    className="h-9 w-full sm:w-9 flex items-center justify-center rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] transition-colors relative group"
                    title={language === 'tr' ? 'Filtre' : 'Filter'}
                  >
                    <AdjustmentsHorizontalIcon className="w-5 h-5 text-[#424245] dark:text-[#86868b]" />
                    {(incomeFilters.paymentMethod.length || 
                      incomeFilters.paymentStatus || 
                      incomeFilters.activeStatus || 
                      incomeFilters.search || 
                      (incomeFilters.dateRange && incomeFilters.dateRange.length > 0)) && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#0071e3] rounded-full ring-2 ring-white dark:ring-[#121621] " />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              {applyFilters(incomeTableData, 'income').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 mb-4 rounded-full bg-[#f5f5f7] dark:bg-[#1d1d1f] flex items-center justify-center">
                    <BanknotesIcon className="w-8 h-8 text-[#86868b]" />
                  </div>
                  <h3 className="text-lg font-medium text-[#1d1d1f] dark:text-white mb-2">
                    {language === 'tr' ? 'Gelir kaydı bulunamadı' : 'No income records found'}
                  </h3>
                  <p className="text-sm text-[#6e6e73] dark:text-[#86868b] text-center max-w-sm">
                    {language === 'tr' 
                      ? 'Seçilen tarih aralığında herhangi bir gelir kaydı bulunmamaktadır.' 
                      : 'There are no income records for the selected date range.'}
                  </p>
                </div>
              ) : (
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
                          {language === 'tr' ? 'Paket' : 'Package'}
                        </span>
                      </th>
                      <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                        <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                          {language === 'tr' ? 'Başlangıç-Bitiş' : 'Start-End'}
                        </span>
                      </th>
                      <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                        <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                          {language === 'tr' ? 'Ödeme Günü' : 'Payment Date'}
                        </span>
                      </th>
                      <th className="py-4 px-6 text-center bg-[#f5f5f7]/50 dark:bg-[#161922]">
                        <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                          {language === 'tr' ? 'Durum' : 'Status'}
                        </span>
                      </th>
                      <th className="py-4 px-6 text-right bg-[#f5f5f7]/50 dark:bg-[#161922]">
                        <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                          {language === 'tr' ? 'Tutar' : 'Amount'}
                        </span>
                      </th>
                      <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                        <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                          {language === 'tr' ? 'Yöntem' : 'Method'}
                        </span>
                      </th>
                      <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                        <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                          {language === 'tr' ? 'Ödeme Durumu' : 'Payment Status'}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {applyFilters(incomeTableData, 'income').map((item, index) => (
                      <tr 
                        key={item.id}
                        className={`
                          group transition-all duration-200 ease-in-out cursor-default
                          hover:bg-gradient-to-r hover:from-[#69b0f8]/10 hover:via-[#34d399]/10 hover:to-[#f5f5f7]
                          dark:hover:from-[#0071e3]/10 dark:hover:via-[#34d399]/10 dark:hover:to-transparent
                          hover:shadow-[0_4px_20px_rgba(0,113,227,0.1)]
                          dark:hover:shadow-[0_0_20px_rgba(0,113,227,0.10)]
                          hover:transform hover:-translate-y-[1px]
                          ${index % 2 === 0 ? 'bg-white dark:bg-[#121621]' : 'bg-[#f5f5f7]/30 dark:bg-[#161922]/30'}
                        `}
                      >
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                              {item.student}
                            </span>
                            <span className="text-xs text-[#6e6e73] dark:text-[#86868b]">
                              {item.parent}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-[#0071e3]/5 to-[#34d399]/5 dark:from-[#0071e3]/10 dark:to-[#34d399]/10 text-[#0071e3] group-hover:from-[#0071e3]/10 group-hover:to-[#34d399]/10 dark:group-hover:from-[#0071e3]/20 dark:group-hover:to-[#34d399]/20 transition-all">
                            {item.package === 'ucretsiz' ? 'Ücretsiz'
                              : item.package === 'hafta-1' ? 'Haftada 1'
                              : item.package === 'hafta-2' ? 'Haftada 2'
                              : item.package === 'hafta-3' ? 'Haftada 3'
                              : item.package === 'hafta-4' ? 'Haftada 4'
                              : 'Tek Seferlik'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-sm text-[#424245] dark:text-[#86868b]">
                              {new Date(item.date).toLocaleDateString('tr-TR')} - {item.end_date ? new Date(item.end_date).toLocaleDateString('tr-TR') : new Date(item.date).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-sm text-[#424245] dark:text-[#86868b]">
                              {new Date(item.payment_date).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-center">
                            <span className={`
                              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                              ${item.is_active 
                                ? 'bg-[#34d399]/20 text-[#0f766e] border border-[#0f766e] dark:bg-[#34d399]/10 dark:text-[#34d399] dark:border-[#34d399]' 
                                : 'bg-[#ef4444]/5 text-[#be123c] border border-[#be123c] dark:bg-[#ef4444]/10 dark:text-[#ef4444] dark:border-[#ef4444]'
                              }
                            `}>
                                {item.is_active ? (
                                  <>
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#0f766e] dark:bg-[#34d399] " />
                                    {language === 'tr' ? 'Aktif' : 'Active'}
                                  </>
                                ) : (
                                  <>
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#be123c] dark:bg-[#ef4444]" />
                                    {language === 'tr' ? 'Pasif' : 'Inactive'}
                                  </>
                                )}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-sm font-semibold bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
                            {formatCurrency(item.amount)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-[#f5f5f7] dark:bg-[#1d1d1f] text-[#424245] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] group-hover:bg-white dark:group-hover:bg-[#121621] transition-colors">
                            {item.method.charAt(0).toUpperCase() + item.method.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                            item.status === 'odendi'
                              ? 'bg-[#34d399]/5 text-[#2c9c7a] border border-[#2c9c7a] dark:text-[#34d399] dark:border-[#34d399]'
                              : 'bg-[#fbbf24]/5 text-[#d4a014] border-[#d4a014] dark:text-[#fbbf24] dark:border-[#fbbf24]'
                          } group-hover:bg-opacity-20 dark:group-hover:bg-opacity-20 transition-colors`}>
                            {item.status === 'odendi' ? (
                              <>
                                <CheckCircleIcon className="w-4 h-4" />
                                <span>Ödendi</span>
                              </>
                            ) : (
                              <>
                                <ClockIcon className="w-4 h-4" />
                                <span>Beklemede</span>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Expense Table and Pie Chart Container */}
        {isTableLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TableSkeleton />
            </div>
            <div>
              <ChartSkeleton />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Expense Table */}
            <div className="lg:col-span-2 bg-white dark:bg-[#121621] rounded-2xl border border-[#d2d2d7] dark:border-[#2a3241] overflow-hidden">
              <div className="p-6 border-b border-[#f5f5f7] dark:border-[#2a3241]">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">
                        {language === 'tr' ? 'Gider Detayları' : 'Expense Details'}
                      </h2>
                      <span className="text-sm font-medium text-[#424245] dark:text-[#86868b]">
                        ({applyFilters(expenseTableData, 'expense').length})
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      onClick={() => setIsExpenseFilterSheetOpen(true)}
                      className="h-9 w-full sm:w-9 flex items-center justify-center rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] transition-colors relative group"
                    >
                      <AdjustmentsHorizontalIcon className="w-5 h-5 text-[#424245] dark:text-[#86868b]" />
                      {(expenseFilters.expenseType || 
                        expenseFilters.paymentMethod || 
                        (expenseFilters.dateRange && expenseFilters.dateRange.length > 0)) && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#0071e3] rounded-full ring-2 ring-white dark:ring-[#121621] " />
                      )}
                    </button>
                    <button
                      onClick={() => setIsCreateExpenseModalOpen(true)}
                      className="h-9 w-full sm:w-auto px-4 rounded-xl bg-[#1d1d1f] dark:bg-[#0071e3] text-white text-sm font-medium hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0071e3] transition-all transform hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center sm:justify-start gap-2"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>{language === 'tr' ? 'Gider Ekle' : 'Add Expense'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                {applyFilters(expenseTableData, 'expense').length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="w-16 h-16 mb-4 rounded-full bg-[#f5f5f7] dark:bg-[#1d1d1f] flex items-center justify-center">
                      <ArrowTrendingDownIcon className="w-8 h-8 text-[#86868b]" />
                    </div>
                    <h3 className="text-lg font-medium text-[#1d1d1f] dark:text-white mb-2">
                      {language === 'tr' ? 'Gider kaydı bulunamadı' : 'No expense records found'}
                    </h3>
                    <p className="text-sm text-[#6e6e73] dark:text-[#86868b] text-center max-w-sm">
                      {language === 'tr' 
                        ? 'Seçilen tarih aralığında herhangi bir gider kaydı bulunmamaktadır.' 
                        : 'There are no expense records for the selected date range.'}
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-[#d2d2d7] dark:border-[#2a3241]">
                        <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                          <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                            {language === 'tr' ? 'Başlık' : 'Title'}
                          </span>
                        </th>
                        <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                          <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                            {language === 'tr' ? 'Kategori' : 'Category'}
                          </span>
                        </th>
                        <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                          <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                            {language === 'tr' ? 'Tarih' : 'Date'}
                          </span>
                        </th>
                        <th className="py-4 px-6 text-right bg-[#f5f5f7]/50 dark:bg-[#161922]">
                          <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                            {language === 'tr' ? 'Tutar' : 'Amount'}
                          </span>
                        </th>
                        <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                          <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                            {language === 'tr' ? 'Yöntem' : 'Method'}
                          </span>
                        </th>
                        <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                          <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                            {language === 'tr' ? 'Not' : 'Note'}
                          </span>
                        </th>
                        <th className="py-4 px-6 text-right bg-[#f5f5f7]/50 dark:bg-[#161922] w-[100px]">
                          <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                            {language === 'tr' ? 'İşlemler' : 'Actions'}
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {applyFilters(expenseTableData, 'expense').map((item, index) => {
                        // Sabit kategori renkleri
                        const categoryColors = {
                          'kira': { bg: 'from-[#0071e3]/5 to-[#34d399]/5', text: 'text-[#0071e3]' },
                          'elektrik': { bg: 'from-[#f59e0b]/5 to-[#f97316]/5', text: 'text-[#f97316]' },
                          'su': { bg: 'from-[#8b5cf6]/5 to-[#6366f1]/5', text: 'text-[#6366f1]' },
                          'dogalgaz': { bg: 'from-[#ec4899]/5 to-[#d946ef]/5', text: 'text-[#d946ef]' },
                          'internet': { bg: 'from-[#10b981]/5 to-[#34d399]/5', text: 'text-[#10b981]' },
                          'maas': { bg: 'from-[#3b82f6]/5 to-[#60a5fa]/5', text: 'text-[#3b82f6]' },
                          'malzeme': { bg: 'from-[#f43f5e]/5 to-[#fb7185]/5', text: 'text-[#f43f5e]' },
                          'mutfak': { bg: 'from-[#14b8a6]/5 to-[#2dd4bf]/5', text: 'text-[#14b8a6]' },
                          'reklam': { bg: 'from-[#f472b6]/5 to-[#ec4899]/5', text: 'text-[#ec4899]' },
                          'filament': { bg: 'from-[#22d3ee]/5 to-[#06b6d4]/5', text: 'text-[#06b6d4]' },
                          'diger': { bg: 'from-[#6b7280]/5 to-[#9ca3af]/5', text: 'text-[#6b7280]' }
                        };

                        const color = categoryColors[item.category.toLowerCase()] || categoryColors['diger'];

                        return (
                          <tr 
                            key={item.id}
                            className={`
                          group transition-all duration-200 ease-in-out cursor-default
                          hover:bg-gradient-to-r hover:from-[#69b0f8]/10 hover:via-[#34d399]/10 hover:to-[#f5f5f7]
                          dark:hover:from-[#0071e3]/10 dark:hover:via-[#34d399]/10 dark:hover:to-transparent
                          hover:shadow-[0_4px_20px_rgba(0,113,227,0.1)]
                          dark:hover:shadow-[0_0_20px_rgba(0,113,227,0.10)]
                          hover:transform hover:-translate-y-[1px]
                          ${index % 2 === 0 ? 'bg-white dark:bg-[#121621]' : 'bg-[#f5f5f7]/30 dark:bg-[#161922]/30'}
                            `}
                          >
                            <td className="py-4 px-6">
                              <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                                {item.title}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r ${color.bg} dark:from-opacity-10 dark:to-opacity-10 ${color.text} transition-all`}>
                                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-sm text-[#424245] dark:text-[#86868b]">
                                {new Date(item.date).toLocaleDateString('tr-TR')}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <span className="text-sm font-semibold bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
                                {formatCurrency(item.amount)}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-[#f5f5f7] dark:bg-[#1d1d1f] text-[#424245] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] group-hover:bg-white dark:group-hover:bg-[#121621] transition-colors">
                                {item.method.charAt(0).toUpperCase() + item.method.slice(1)}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-sm text-[#6e6e73] dark:text-[#86868b]">
                                  {item.notes && item.notes.length > 20 ? `${item.notes.substring(0, 20)}...` : item.notes}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                                <div className="flex items-center justify-end">
                                  <div className="relative">
                                <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const currentRow = item.id
                                        setActiveDropdown(activeDropdown === currentRow ? null : currentRow)
                                      }}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] transition-colors dropdown-toggle"
                                    >
                                      <svg className="w-4 h-4 text-[#424245] dark:text-[#86868b]" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 4 15">
                                        <path d="M3.5 1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 6.041a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 5.959a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"/>
                                      </svg>
                                </button>

                                    {/* Dropdown Menu */}
                                    {activeDropdown === item.id && (
                                      <div 
                                        className="absolute right-full mr-2 bottom-0 w-48 rounded-xl bg-white dark:bg-[#1d1d1f] shadow-lg border border-[#d2d2d7] dark:border-[#2a3241] py-2 z-[999] dropdown-menu"
                                        style={{
                                          filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.1))',
                                          transformOrigin: 'right'
                                        }}
                                      >
                                <button
                                          onClick={() => {
                                            setSelectedExpense(item)
                                            setIsUpdateModalOpen(true)
                                            setActiveDropdown(null)
                                          }}
                                          className="w-full px-4 py-2 text-left text-sm text-[#1d1d1f] dark:text-white hover:bg-[#f5f5f7] dark:hover:bg-[#2a3241] transition-colors flex items-center gap-2"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[#424245] dark:text-[#86868b]">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                          </svg>
                                          {language === 'tr' ? 'Düzenle' : 'Edit'}
                                        </button>
                                        <div className="h-[1px] w-full bg-[#d2d2d7] dark:bg-[#2a3241]" />
                                        <button
                                          onClick={() => {
                                            setSelectedExpense(item)
                                            setIsDeleteModalOpen(true)
                                            setActiveDropdown(null)
                                          }}
                                          className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                          </svg>
                                          {language === 'tr' ? 'Sil' : 'Delete'}
                                </button>
                                      </div>
                                    )}
                                  </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Expense Distribution Pie Chart - Takes up 1/3 */}
            <div className="bg-white dark:bg-[#121621] rounded-2xl border border-[#d2d2d7] dark:border-[#2a3241] p-6 max-h-[485px] overflow-auto">
              <div className="space-y-1 mb-6">
                <h2 className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                  {language === 'tr' ? 'Gider Dağılımı' : 'Expense Distribution'}
                </h2>
                <p className="text-sm text-[#6e6e73] dark:text-[#86868b]">
                  {language === 'tr' ? 'Kategorilere Göre' : 'By Category'}
                </p>
              </div>
              
              <div className="h-[300px] w-full">
                {expenseDistribution.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="w-16 h-16 mb-4 rounded-full bg-[#f5f5f7] dark:bg-[#1d1d1f] flex items-center justify-center">
                      <ChartPieIcon className="w-8 h-8 text-[#86868b]" />
                    </div>
                    <h3 className="text-lg font-medium text-[#1d1d1f] dark:text-white mb-2">
                      {language === 'tr' ? 'Gider dağılımı bulunamadı' : 'No expense distribution found'}
                    </h3>
                    <p className="text-sm text-[#6e6e73] dark:text-[#86868b] text-center max-w-sm">
                      {language === 'tr' 
                        ? 'Seçilen tarih aralığında herhangi bir gider dağılımı bulunmamaktadır.' 
                        : 'There is no expense distribution for the selected date range.'}
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[...expenseDistribution].sort((a, b) => b.value - a.value)}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={3}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        {expenseDistribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            stroke="none"
                            style={{
                              filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))',
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'rgba(29, 29, 31, 0.95)',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                          padding: '12px 16px',
                          backdropFilter: 'blur(12px)',
                        }}
                        itemStyle={{ 
                          color: '#ffffff', 
                          fontSize: '14px', 
                          padding: '4px 0',
                          fontWeight: '500',
                        }}
                        formatter={(value, name) => [
                          formatCurrency(value),
                          language === 'tr'
                            ? name.charAt(0).toUpperCase() + name.slice(1)
                            : name === 'kira' ? 'Rent'
                            : name === 'elektrik' ? 'Electricity'
                            : name === 'su' ? 'Water'
                            : name === 'dogalgaz' ? 'Natural Gas'
                            : name === 'internet' ? 'Internet'
                            : name === 'maas' ? 'Salary'
                            : name === 'malzeme' ? 'Materials'
                            : name === 'mutfak' ? 'Kitchen'
                            : name === 'reklam' ? 'Advertising'
                            : name === 'filament' ? 'Filament'
                            : 'Other'
                        ]}
                        labelStyle={{ 
                          color: 'white', 
                          fontWeight: '600', 
                          fontSize: '16px', 
                          marginBottom: '8px',
                          textTransform: 'capitalize'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Legend */}
              {expenseDistribution.length > 0 && (
                <div className="mt-6 space-y-2">
                  {[...expenseDistribution]
                    .sort((a, b) => b.value - a.value)
                    .map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-[#1d1d1f] dark:text-white">
                            {language === 'tr'
                              ? item.name.charAt(0).toUpperCase() + item.name.slice(1)
                              : item.name === 'kira' ? 'Rent'
                              : item.name === 'elektrik' ? 'Electricity'
                              : item.name === 'su' ? 'Water'
                              : item.name === 'dogalgaz' ? 'Natural Gas'
                              : item.name === 'internet' ? 'Internet'
                              : item.name === 'maas' ? 'Salary'
                              : item.name === 'malzeme' ? 'Materials'
                              : item.name === 'mutfak' ? 'Kitchen'
                              : item.name === 'reklam' ? 'Advertising'
                              : item.name === 'filament' ? 'Filament'
                              : 'Other'
                            }
                          </span>
                        </div>
                        <span className="text-sm font-medium text-[#424245] dark:text-[#86868b]">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chart */}
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <div className="bg-white dark:bg-[#121621] rounded-2xl border border-[#d2d2d7] dark:border-[#2a3241] p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                  {language === 'tr' ? 'Gelir & Gider Grafiği' : 'Income & Expense Chart'}
                </h2>
                <p className="text-sm text-[#6e6e73] dark:text-[#86868b]">
                  {language === 'tr' ? `Son ${chartRange} Ay` : `Last ${chartRange} Months`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#0071e3]" />
                  <span className="text-sm text-[#1d1d1f] dark:text-white">
                    {language === 'tr' ? 'Gelir' : 'Income'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
                  <span className="text-sm text-[#1d1d1f] dark:text-white">
                    {language === 'tr' ? 'Gider' : 'Expense'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 10,
                    left: 10,
                    bottom: 5,
                  }}
                >
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0071e3" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0071e3" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    stroke="#86868b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#86868b"
                    fontSize={12}
                    tickFormatter={formatTooltipValue}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#121621',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      padding: '12px'
                    }}
                    itemStyle={{ color: '#f5f5f7', fontSize: '12px', padding: '4px 0' }}
                    formatter={(value, name) => [
                      formatTooltipValue(value),
                      name === 'gelir' ? (language === 'tr' ? 'Gelir' : 'Income') :
                      name === 'gider' ? (language === 'tr' ? 'Gider' : 'Expense') : name
                    ]}
                    labelStyle={{ color: 'white', fontWeight: '500', fontSize: '14px', marginBottom: '8px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="gelir" 
                    stroke="#0071e3" 
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, fill: '#0071e3' }}
                    fill="url(#incomeGradient)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="gider" 
                    stroke="#ef4444" 
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, fill: '#ef4444' }}
                    fill="url(#expenseGradient)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Range Selection Buttons */}
            <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-[#d2d2d7] dark:border-[#2a3241]">
              <button
                onClick={() => setChartRange(3)}
                className={`
                  h-9 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                  ${chartRange === 3
                    ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                    : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                  }
                `}
              >
                {language === 'tr' ? 'Son 3 Ay' : 'Last 3 Months'}
              </button>
              <button
                onClick={() => setChartRange(6)}
                className={`
                  h-9 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                  ${chartRange === 6
                    ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                    : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                  }
                `}
              >
                {language === 'tr' ? 'Son 6 Ay' : 'Last 6 Months'}
              </button>
              <button
                onClick={() => setChartRange(12)}
                className={`
                  h-9 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                  ${chartRange === 12
                    ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                    : 'bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                  }
                `}
              >
                {language === 'tr' ? 'Son 12 Ay' : 'Last 12 Months'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Expense Modal */}
      <CreateExpenses 
        isOpen={isCreateExpenseModalOpen}
        onClose={() => setIsCreateExpenseModalOpen(false)}
        onSuccess={() => {
          fetchAllData()
        }}
      />

      {/* Update Modal */}
      <UpdateExpensesModal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false)
          setSelectedExpense(null)
        }}
        expense={selectedExpense}
        onUpdate={handleUpdate}
      />

      {/* Delete Modal */}
      <DeleteExpensesModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedExpense(null)
        }}
        expense={selectedExpense}
        onDelete={handleDelete}
      />
    </div>
  )
} 