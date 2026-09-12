import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: ReactNode;
  className?: string;
  align?: 'left' | 'right';
  menuClassName?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md';
  usePortal?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select option',
  icon,
  className = '',
  align = 'left',
  menuClassName = '',
  fullWidth = false,
  size = 'md',
  usePortal = true, // Default to portal so dropdowns float outside tables & overflow containers
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width?: number; openUpward?: boolean }>({
    top: 0,
    left: 0,
  });

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 220 && rect.top > 220;

    let calculatedLeft = align === 'right' ? rect.right - 220 : rect.left;
    if (fullWidth) {
      calculatedLeft = rect.left;
    }

    // Keep within horizontal viewport bounds
    calculatedLeft = Math.max(12, Math.min(calculatedLeft, window.innerWidth - 232));

    setCoords({
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      left: calculatedLeft,
      width: fullWidth ? rect.width : undefined,
      openUpward,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      updatePosition();
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, align, fullWidth]);

  const selectedOption = options.find((o) => o.value === value);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const isSmall = size === 'sm';

  const menuContent = (
    <motion.div
      key="custom-select-menu"
      initial={{ opacity: 0, scale: 0.95, y: coords.openUpward ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: coords.openUpward ? 10 : -10 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      ref={menuRef}
      id={id ? `${id}-menu` : undefined}
      style={
        usePortal
          ? {
              position: 'fixed',
              top: coords.openUpward ? undefined : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : undefined,
              left: `${coords.left}px`,
              width: coords.width ? `${coords.width}px` : undefined,
              minWidth: coords.width ? `${coords.width}px` : '210px',
              zIndex: 9999,
            }
          : undefined
      }
      className={`${
        usePortal
          ? 'shadow-2xl'
          : `absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 min-w-[200px] ${
              fullWidth ? 'w-full min-w-full' : 'w-max max-w-xs'
            } shadow-2xl z-50`
      } bg-white rounded-3xl border border-slate-200/90 p-2 ${menuClassName}`}
    >
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-2xl transition cursor-pointer text-left ${
                isSelected
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-violet-600'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                {isSelected ? (
                  <Check className="w-4 h-4 text-white shrink-0 stroke-[3]" />
                ) : (
                  option.icon && <span className="text-slate-400 shrink-0">{option.icon}</span>
                )}
                <span className={`truncate ${isSelected ? 'font-bold' : 'font-medium'}`}>
                  {option.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );

  return (
    <div
      className={`relative ${fullWidth ? 'w-full block' : 'inline-block'} text-left ${className}`}
      ref={triggerRef}
    >
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        id={id}
        onClick={() => {
          if (!isOpen) {
            updatePosition();
          }
          setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between gap-2.5 ${
          isSmall ? 'px-3 py-1.5 text-xs rounded-xl' : 'px-4 py-2.5 text-xs md:text-sm rounded-2xl'
        } bg-white hover:bg-slate-50/90 text-slate-800 font-bold border border-slate-200 shadow-2xs hover:border-slate-300 transition focus:outline-none focus:ring-2 focus:ring-violet-500/20 active:scale-98 cursor-pointer`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-violet-600 shrink-0">{icon}</span>}
          <span className="text-slate-900 font-bold truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-violet-600' : 'text-slate-400'
          }`}
        />
      </button>

      {/* Dropdown Menu (either portal or inline relative) */}
      {usePortal ? (
        createPortal(
          <AnimatePresence>{isOpen && menuContent}</AnimatePresence>,
          document.body
        )
      ) : (
        <AnimatePresence>{isOpen && menuContent}</AnimatePresence>
      )}
    </div>
  );
};
