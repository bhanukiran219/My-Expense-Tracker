import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // ISO format 'YYYY-MM-DD'
  onChange: (date: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
  align?: 'left' | 'right' | 'auto';
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  id,
  required = false,
  disabled = false,
  className = '',
  fullWidth = true,
  align = 'auto',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [resolvedAlign, setResolvedAlign] = useState<'left' | 'right'>('right');

  // Parse initial or fallback date
  const parsedDate = value ? new Date(value + 'T00:00:00') : new Date();
  const validParsed = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const [viewYear, setViewYear] = useState<number>(validParsed.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(validParsed.getMonth());

  // Update view when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Determine alignment when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      if (align === 'left') {
        setResolvedAlign('left');
      } else if (align === 'right') {
        setResolvedAlign('right');
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceOnRight = window.innerWidth - rect.left;
        if (spaceOnRight < 330) {
          setResolvedAlign('right');
        } else {
          setResolvedAlign('left');
        }
      }
    }
  }, [isOpen, align]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const formatDisplayDate = (valStr: string) => {
    if (!valStr) return '';
    try {
      const d = new Date(valStr + 'T00:00:00');
      if (isNaN(d.getTime())) return valStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return valStr;
    }
  };

  const handleSelectDay = (day: number, monthOffset: number = 0) => {
    const targetDate = new Date(viewYear, viewMonth + monthOffset, day);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    const formatted = `${y}-${m}-${d}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const setPreset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dateNum = String(d.getDate()).padStart(2, '0');
    const formatted = `${y}-${m}-${dateNum}`;
    onChange(formatted);
    setViewYear(y);
    setViewMonth(d.getMonth());
    setIsOpen(false);
  };

  // Generate calendar grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white cursor-pointer ${
          isOpen ? 'ring-2 ring-violet-500 bg-white border-transparent' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <span className={`truncate ${value ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </div>

        {value && !required && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/50 transition cursor-pointer"
            title="Clear date"
          >
            <X className="w-3.5 h-3.5" />
          </div>
        )}
      </button>

      {/* Popover Calendar Modal */}
      {isOpen && (
        <div
          id={`${id || 'custom-datepicker'}-popover`}
          className={`absolute z-60 mt-2 ${
            resolvedAlign === 'right' ? 'right-0' : 'left-0'
          } w-[300px] sm:w-[310px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Quick Presets */}
          <div className="grid grid-cols-4 gap-1 pb-2.5 mb-2.5 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setPreset(0)}
              className={`py-1 text-xs font-semibold rounded-lg text-center transition cursor-pointer ${
                value === todayStr
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setPreset(1)}
              className="py-1 text-xs font-semibold rounded-lg text-center bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => setPreset(7)}
              className="py-1 text-xs font-semibold rounded-lg text-center bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              7d ago
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setDate(1);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const formatted = `${y}-${m}-01`;
                onChange(formatted);
                setViewYear(y);
                setViewMonth(d.getMonth());
                setIsOpen(false);
              }}
              className="py-1 text-xs font-semibold rounded-lg text-center bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer truncate"
            >
              1st of Mo
            </button>
          </div>

          {/* Month / Year Header Navigator */}
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 font-bold text-xs sm:text-sm text-slate-900">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value))}
                className="bg-transparent hover:bg-slate-100 rounded-md px-1.5 py-0.5 cursor-pointer font-bold text-slate-900 focus:outline-none"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value))}
                className="bg-transparent hover:bg-slate-100 rounded-md px-1 py-0.5 cursor-pointer font-bold text-slate-900 focus:outline-none"
              >
                {Array.from({ length: 25 }, (_, i) => viewYear - 15 + i).map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_OF_WEEK.map((d, i) => (
              <div
                key={d}
                className={`text-[11px] font-bold py-0.5 ${
                  i === 0 || i === 6 ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Previous month filler days */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => {
              const dayNum = prevMonthDays - firstDayIndex + idx + 1;
              return (
                <button
                  key={`prev-${idx}`}
                  type="button"
                  onClick={() => handleSelectDay(dayNum, -1)}
                  className="h-7.5 sm:h-8 text-xs text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg flex items-center justify-center transition cursor-pointer"
                >
                  {dayNum}
                </button>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const curFormatted = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(
                dayNum
              ).padStart(2, '0')}`;
              const isSelected = value === curFormatted;
              const isToday = curFormatted === todayStr;

              return (
                <button
                  key={`cur-${dayNum}`}
                  type="button"
                  onClick={() => handleSelectDay(dayNum, 0)}
                  className={`h-7.5 sm:h-8 text-xs rounded-lg font-medium flex flex-col items-center justify-center transition relative cursor-pointer ${
                    isSelected
                      ? 'bg-violet-600 text-white font-bold shadow-md shadow-violet-200'
                      : isToday
                      ? 'bg-violet-50 text-violet-700 font-bold border border-violet-200 hover:bg-violet-100'
                      : 'text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <span>{dayNum}</span>
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-violet-600 absolute bottom-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer with Selected date & Done button */}
          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-xs">
            <div className="text-slate-500 font-medium truncate pr-2">
              {value ? (
                <span className="text-slate-800 font-semibold">
                  {formatDisplayDate(value)}
                </span>
              ) : (
                <span>No date</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg flex items-center gap-1 transition cursor-pointer shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
