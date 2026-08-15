import React from 'react'

// Ayarlar sayfasının kart deseni. Settings.jsx içinde tanımlıydı; öğretmen
// kartları da aynı görünümü kullandığı için buraya taşındı — iki yerde
// kopyalansaydı zamanla ayrışırdı.
export default function SettingCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-gray-100 dark:border-[#2a3241] hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all duration-300">
      <div className="mb-4">
        <h4 className="font-medium text-[#1d1d1f] dark:text-white">{title}</h4>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}
