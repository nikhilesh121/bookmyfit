// SVG icon set for admin panel — no emojis, no icon fonts
type P = { size?: number; color?: string; className?: string };

const base = (size = 16, color = 'currentColor') => ({
  width: size, height: size, viewBox: '0 0 24 24',
  fill: 'none', stroke: color, strokeWidth: 2,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const IconStar = ({ size = 14, color = '#FFB400' }: P) => (
  <svg {...base(size, color)} fill={color}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const IconCheck = ({ size = 14, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const IconChevronDown = ({ size = 14, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const IconClose = ({ size = 14, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const IconWarning = ({ size = 14, color = '#FFB400' }: P) => (
  <svg {...base(size, color)}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const IconUsers = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

export const IconGym = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}>
    <path d="M6.5 6.5h11M6.5 17.5h11M2 10v4M22 10v4M5 8v8M19 8v8" />
  </svg>
);

export const IconDollar = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);

export const IconSearch = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const IconFilter = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export const IconRefresh = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);

export const IconShield = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const IconArrowRight = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export const IconCalendar = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const IconBell = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}>
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

export const IconTag = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

export const IconTrendUp = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
