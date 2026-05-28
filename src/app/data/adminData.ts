export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'delegado' | 'user';
}

export interface PlaceStats {
  placeId: string;
  placeName: string;
  visits: number;
  averageRating: number;
  totalReviews: number;
  peakHours: { hour: number; visits: number }[];
  weeklyVisits: { day: string; visits: number }[];
}

export interface ZoneStats {
  zone: string;
  totalPlaces: number;
  totalVisits: number;
  averageRating: number;
}

// Mock admin user
export const mockAdminUser: User = {
  id: 'admin-1',
  email: 'admin@nook.cl',
  name: 'Administrador',
  role: 'admin',
};

// Mock delegated users
export const mockDelegates: User[] = [
  {
    id: 'delegate-1',
    email: 'maria@nook.cl',
    name: 'María González',
    role: 'delegado',
  },
  {
    id: 'delegate-2',
    email: 'carlos@nook.cl',
    name: 'Carlos Rodríguez',
    role: 'delegado',
  },
];

// Mock place statistics
export const mockPlaceStats: PlaceStats[] = [
  {
    placeId: '1',
    placeName: 'Biblioteca Central Universidad de Chile',
    visits: 1247,
    averageRating: 4.6,
    totalReviews: 245,
    peakHours: [
      { hour: 9, visits: 45 },
      { hour: 10, visits: 78 },
      { hour: 11, visits: 95 },
      { hour: 12, visits: 82 },
      { hour: 13, visits: 65 },
      { hour: 14, visits: 88 },
      { hour: 15, visits: 112 },
      { hour: 16, visits: 125 },
      { hour: 17, visits: 98 },
      { hour: 18, visits: 76 },
      { hour: 19, visits: 54 },
      { hour: 20, visits: 32 },
    ],
    weeklyVisits: [
      { day: 'Lun', visits: 245 },
      { day: 'Mar', visits: 289 },
      { day: 'Mié', visits: 312 },
      { day: 'Jue', visits: 298 },
      { day: 'Vie', visits: 178 },
      { day: 'Sáb', visits: 89 },
      { day: 'Dom', visits: 54 },
    ],
  },
  {
    placeId: '2',
    placeName: 'Café Literario',
    visits: 856,
    averageRating: 4.3,
    totalReviews: 156,
    peakHours: [
      { hour: 8, visits: 34 },
      { hour: 9, visits: 56 },
      { hour: 10, visits: 72 },
      { hour: 11, visits: 68 },
      { hour: 12, visits: 54 },
      { hour: 13, visits: 45 },
      { hour: 14, visits: 67 },
      { hour: 15, visits: 89 },
      { hour: 16, visits: 95 },
      { hour: 17, visits: 78 },
      { hour: 18, visits: 65 },
      { hour: 19, visits: 43 },
    ],
    weeklyVisits: [
      { day: 'Lun', visits: 156 },
      { day: 'Mar', visits: 178 },
      { day: 'Mié', visits: 189 },
      { day: 'Jue', visits: 165 },
      { day: 'Vie', visits: 123 },
      { day: 'Sáb', visits: 78 },
      { day: 'Dom', visits: 45 },
    ],
  },
  {
    placeId: '3',
    placeName: 'WeWork Vitacura',
    visits: 1089,
    averageRating: 4.8,
    totalReviews: 189,
    peakHours: [
      { hour: 9, visits: 67 },
      { hour: 10, visits: 89 },
      { hour: 11, visits: 102 },
      { hour: 12, visits: 95 },
      { hour: 13, visits: 78 },
      { hour: 14, visits: 92 },
      { hour: 15, visits: 108 },
      { hour: 16, visits: 115 },
      { hour: 17, visits: 98 },
      { hour: 18, visits: 76 },
      { hour: 19, visits: 54 },
    ],
    weeklyVisits: [
      { day: 'Lun', visits: 234 },
      { day: 'Mar', visits: 256 },
      { day: 'Mié', visits: 267 },
      { day: 'Jue', visits: 245 },
      { day: 'Vie', visits: 189 },
      { day: 'Sáb', visits: 67 },
      { day: 'Dom', visits: 34 },
    ],
  },
];

// Mock zone statistics
export const mockZoneStats: ZoneStats[] = [
  {
    zone: 'Centro',
    totalPlaces: 3,
    totalVisits: 2456,
    averageRating: 4.4,
  },
  {
    zone: 'Providencia',
    totalPlaces: 2,
    totalVisits: 1834,
    averageRating: 4.5,
  },
  {
    zone: 'Vitacura',
    totalPlaces: 2,
    totalVisits: 1567,
    averageRating: 4.7,
  },
  {
    zone: 'Las Condes',
    totalPlaces: 1,
    totalVisits: 892,
    averageRating: 4.6,
  },
];
