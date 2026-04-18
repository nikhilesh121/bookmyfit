export interface PreviewLink {
  label: string;
  url: string;
  description: string;
  tech: string;
  port: number;
}

export const PREVIEWS: PreviewLink[] = [
  {
    label: 'Admin Panel',
    url: 'http://localhost:3000',
    description: 'Super admin portal — gym approvals, settlements, analytics',
    tech: 'Next.js 14',
    port: 3000,
  },
  {
    label: 'Gym Partner Panel',
    url: 'http://localhost:3001',
    description: 'Gym owner portal — QR scanner, members, earnings',
    tech: 'Next.js 14',
    port: 3001,
  },
  {
    label: 'Corporate Panel',
    url: 'http://localhost:3002',
    description: 'HR dashboard — employees, seat allocation, usage reports',
    tech: 'Next.js 14',
    port: 3002,
  },
  {
    label: 'Backend API',
    url: 'http://localhost:3003/api/docs',
    description: 'NestJS REST API + Swagger documentation',
    tech: 'NestJS 10',
    port: 3003,
  },
  {
    label: 'Tasklist Tracker',
    url: 'http://localhost:3100',
    description: 'This dashboard — live progress tracker',
    tech: 'Next.js 14',
    port: 3100,
  },
  {
    label: 'Mobile App (Expo)',
    url: 'exp://localhost:19000',
    description: 'Scan with Expo Go on phone — or press "w" for web preview at :19006',
    tech: 'Expo SDK 50',
    port: 19000,
  },
];
