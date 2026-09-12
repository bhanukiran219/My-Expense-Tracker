import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { DatePeriod } from '../types';
import { getPeriodLabel } from '../utils/datePeriod';

interface PeriodDropdownProps {
  period: DatePeriod;
  onPeriodChange: (period: DatePeriod) => void;
  className?: string;
}

export const PeriodDropdown: React.FC<PeriodDropdownProps> = ({
  period,
  onPeriodChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuAlign, setMenuAlign] = useState<'left' | 'right'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 'left';
    }
    return 'right';
  });

  const updateAlignment = () => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const menuWidth = 220; // w-52 + padding & margins

    // If aligning right would push the menu past the left edge of the screen:
    if (rect.right - menuWidth < 12) {
      setMenuAlign('left');
    } else if (rect.left + menuWidth > window.innerWidth - 12) {
      // If aligning left would push the menu past the right edge of the screen:
      setMenuAlign('right');
    } else {
      setMenuAlign(window.innerWidth < 640 ? 'left' : 'right');
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updateAlignment();
    }
    setIsOpen((prev) => !prev);
  };

  const periods: DatePeriod[] = [
    'all-time',
    'this-month',
    'last-month',
    'last-3-months',
    'last-6-months',
    'this-year',
  ];

  // Close dropdown when clicking outside and update on resize
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      updateAlignment();
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      window.addEventListener('resize', updateAlignment);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('resize', updateAlignment);
    };
  }, [isOpen]);

  const handleSelect = (selectedPeriod: DatePeriod) => {
    onPeriodChange(selectedPeriod);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        id="period-dropdown-btn"
        onClick={handleToggle}
        className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white hover:bg-slate-50/90 text-slate-800 text-xs md:text-sm font-bold rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition focus:outline-none focus:ring-2 focus:ring-violet-500/20 active:scale-98 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-violet-600 shrink-0" />
          <span className="text-slate-900 font-bold">{getPeriodLabel(period)}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-violet-600' : 'text-slate-400'
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="period-menu"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            id="period-dropdown-menu"
            className={`absolute mt-2 w-52 max-w-[calc(100vw-24px)] bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-50 ${
              menuAlign === 'left' ? 'left-0' : 'right-0'
            }`}
          >
            <div className="space-y-1">
              {periods.map((p) => {
                const isSelected = p === period;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleSelect(p)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-2xl transition cursor-pointer ${
                      isSelected
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-violet-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isSelected && <Check className="w-4 h-4 text-white shrink-0 stroke-[3]" />}
                      <span className={isSelected ? 'font-bold' : 'font-medium'}>
                        {getPeriodLabel(p)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
