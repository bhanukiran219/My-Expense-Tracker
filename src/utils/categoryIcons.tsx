import React from 'react';
import {
  ShoppingCart,
  Utensils,
  Home,
  Car,
  HeartPulse,
  GraduationCap,
  Briefcase,
  ReceiptText,
} from 'lucide-react';

export const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('grocer') || cat.includes('shop')) return <ShoppingCart className="w-4 h-4" />;
  if (cat.includes('din') || cat.includes('food')) return <Utensils className="w-4 h-4" />;
  if (cat.includes('hous') || cat.includes('rent') || cat.includes('util')) return <Home className="w-4 h-4" />;
  if (cat.includes('trans') || cat.includes('car') || cat.includes('auto')) return <Car className="w-4 h-4" />;
  if (cat.includes('health') || cat.includes('med')) return <HeartPulse className="w-4 h-4" />;
  if (cat.includes('edu')) return <GraduationCap className="w-4 h-4" />;
  if (cat.includes('work') || cat.includes('job') || cat.includes('income')) return <Briefcase className="w-4 h-4" />;
  return <ReceiptText className="w-4 h-4" />;
};
