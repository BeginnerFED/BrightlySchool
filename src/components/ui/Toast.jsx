import React, { useEffect } from 'react'
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function Toast({ message, type = 'success', isVisible, onClose }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  if (!isVisible) return null

  return (
    <div className="fixed top-4 right-4 z-[9999]">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-all transform ${
        type === 'success' 
        ? 'bg-[#73f7c8] text-[#1c865f] border border-[#1c865f]/20' 
        : 'bg-[#fdc9c9] text-[#b62929] border border-[#b62929]/20'
      }`}>
        {type === 'success' ? (
          <CheckCircleIcon className="w-5 h-5" />
        ) : (
          <XCircleIcon className="w-5 h-5" />
        )}
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className={`p-1 rounded-lg hover:bg-black/5 transition-colors ${
            type === 'success' ? 'hover:text-[#2d9770]' : 'hover:text-[#ef4444]'
          }`}
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
} 