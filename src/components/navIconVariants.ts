import { Variants } from 'framer-motion';
import { ActiveTab } from '../types';

export const getNavIconVariants = (id: ActiveTab | 'brand'): Variants => {
  switch (id) {
    case 'dashboard':
      return {
        idle: { scale: 1, rotate: 0, y: 0 },
        hover: {
          scale: 1.22,
          rotate: [0, -10, 8, -4, 0],
          transition: { duration: 0.45, ease: 'easeInOut' },
        },
        active: {
          scale: 1.1,
          rotate: [0, -5, 5, 0],
          transition: { duration: 0.4 },
        },
        tap: { scale: 0.9 },
      };

    case 'cash-flow':
      return {
        idle: { scale: 1, rotate: 0 },
        hover: {
          scale: 1.22,
          rotate: [0, -24, 18, -12, 6, 0],
          transition: { duration: 0.55, ease: 'easeInOut' },
        },
        active: {
          scale: 1.1,
          rotate: [0, -10, 10, 0],
          transition: { duration: 0.5 },
        },
        tap: { scale: 0.9 },
      };

    case 'net-worth':
      return {
        idle: { scale: 1, y: 0 },
        hover: {
          scale: 1.2,
          y: [0, -5, 2, 0],
          transition: { duration: 0.45, ease: 'easeInOut' },
        },
        active: {
          scale: 1.1,
          y: [0, -2, 0],
          transition: { duration: 0.35 },
        },
        tap: { scale: 0.9 },
      };

    case 'transactions':
      return {
        idle: { scale: 1, y: 0, rotate: 0 },
        hover: {
          scale: 1.2,
          y: [0, 4, -3, 0],
          rotate: [0, -6, 6, 0],
          transition: { duration: 0.45, ease: 'easeInOut' },
        },
        active: {
          scale: 1.1,
          y: [0, 2, 0],
          transition: { duration: 0.35 },
        },
        tap: { scale: 0.9 },
      };

    case 'recurring':
      return {
        idle: { scale: 1, rotate: 0 },
        hover: {
          scale: 1.22,
          rotate: 360,
          transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] },
        },
        active: {
          scale: 1.1,
          rotate: 180,
          transition: { duration: 0.4 },
        },
        tap: { scale: 0.9 },
      };

    case 'subscriptions':
      return {
        idle: { scale: 1, rotate: 0 },
        hover: {
          scale: [1, 1.3, 0.95, 1.22, 1.15],
          rotate: [0, 22, -18, 12, 0],
          transition: { duration: 0.55, ease: 'easeInOut' },
        },
        active: {
          scale: [1.1, 1.2, 1.1],
          rotate: [0, 15, -10, 0],
          transition: { duration: 0.8 },
        },
        tap: { scale: 0.9 },
      };

    case 'budgets':
      return {
        idle: { scale: 1, rotate: 0 },
        hover: {
          scale: 1.22,
          rotate: [0, 90, 180, 0],
          transition: { duration: 0.55, ease: 'easeInOut' },
        },
        active: {
          scale: 1.1,
          rotate: [0, 45, 0],
          transition: { duration: 0.4 },
        },
        tap: { scale: 0.9 },
      };

    case 'goals':
      return {
        idle: { scale: 1 },
        hover: {
          scale: [1, 1.32, 0.9, 1.2],
          transition: { duration: 0.45, ease: 'easeInOut' },
        },
        active: {
          scale: [1.1, 1.22, 1.1],
          transition: { duration: 0.4 },
        },
        tap: { scale: 0.88 },
      };

    case 'loans':
      return {
        idle: { scale: 1, y: 0, rotate: 0 },
        hover: {
          scale: 1.2,
          y: [0, -5, 2, 0],
          rotate: [0, -12, 10, 0],
          transition: { duration: 0.48, ease: 'easeInOut' },
        },
        active: {
          scale: 1.1,
          y: [0, -3, 0],
          transition: { duration: 0.35 },
        },
        tap: { scale: 0.9 },
      };

    case 'documents':
      return {
        idle: { scale: 1, rotate: 0 },
        hover: {
          scale: 1.2,
          rotate: [0, -15, 12, -6, 0],
          transition: { duration: 0.5, ease: 'easeInOut' },
        },
        active: {
          scale: 1.1,
          rotate: [0, -8, 0],
          transition: { duration: 0.35 },
        },
        tap: { scale: 0.9 },
      };

    case 'rules-tags':
    case 'rules':
      return {
        idle: { scale: 1, x: 0 },
        hover: {
          scale: 1.2,
          x: [0, 5, -5, 3, 0],
          transition: { duration: 0.45, ease: 'easeInOut' },
        },
        active: {
          scale: 1.1,
          x: [0, 2, 0],
          transition: { duration: 0.35 },
        },
        tap: { scale: 0.9 },
      };

    case 'settings':
      return {
        idle: { scale: 1, rotate: 0 },
        hover: {
          scale: 1.22,
          rotate: 180,
          transition: { duration: 0.55, ease: [0.34, 1.56, 0.64, 1] },
        },
        active: {
          scale: 1.1,
          rotate: 90,
          transition: { duration: 0.4 },
        },
        tap: { scale: 0.9 },
      };

    case 'brand':
      return {
        idle: { scale: 1, rotate: 0 },
        hover: {
          scale: 1.12,
          rotate: [0, -10, 10, -5, 0],
          transition: { duration: 0.5, ease: 'easeInOut' },
        },
        tap: { scale: 0.94 },
      };

    default:
      return {
        idle: { scale: 1 },
        hover: { scale: 1.2, transition: { duration: 0.3 } },
        active: { scale: 1.1 },
        tap: { scale: 0.9 },
      };
  }
};
