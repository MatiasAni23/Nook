// Delegates
export interface Delegate {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'suspended' | 'pending';
  placesCount: number;
  assignedPlaces: string[]; // place IDs
  joinedDate: Date;
  lastActive: Date;
}

export const mockDelegates: Delegate[] = [
  {
    id: 'd1',
    name: 'María González',
    email: 'maria@nook.cl',
    phone: '+56 9 1234 5678',
    status: 'active',
    placesCount: 3,
    assignedPlaces: ['1', '2', '5'],
    joinedDate: new Date('2025-01-15'),
    lastActive: new Date('2026-05-18'),
  },
  {
    id: 'd2',
    name: 'Carlos Rodríguez',
    email: 'carlos@nook.cl',
    phone: '+56 9 8765 4321',
    status: 'active',
    placesCount: 2,
    assignedPlaces: ['3', '4'],
    joinedDate: new Date('2025-02-01'),
    lastActive: new Date('2026-05-19'),
  },
  {
    id: 'd3',
    name: 'Ana Martínez',
    email: 'ana@nook.cl',
    phone: '+56 9 5555 6666',
    status: 'pending',
    placesCount: 0,
    assignedPlaces: [],
    joinedDate: new Date('2026-05-10'),
    lastActive: new Date('2026-05-10'),
  },
];

// Users
export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'worker';
  status: 'active' | 'suspended' | 'blocked' | 'verified';
  registeredDate: Date;
  reservationsCount: number;
  reportsCount: number;
  university?: string;
  company?: string;
}

export const mockAppUsers: AppUser[] = [
  {
    id: 'u1',
    name: 'Estudiante Demo',
    email: 'estudiante@demo.cl',
    role: 'student',
    status: 'verified',
    registeredDate: new Date('2025-03-10'),
    reservationsCount: 12,
    reportsCount: 3,
    university: 'Universidad de Chile',
  },
  {
    id: 'u2',
    name: 'Trabajador Demo',
    email: 'trabajador@demo.cl',
    role: 'worker',
    status: 'verified',
    registeredDate: new Date('2025-04-15'),
    reservationsCount: 25,
    reportsCount: 1,
    company: 'Tech Solutions SpA',
  },
  {
    id: 'u3',
    name: 'Pedro Silva',
    email: 'pedro@example.com',
    role: 'student',
    status: 'active',
    registeredDate: new Date('2026-01-20'),
    reservationsCount: 5,
    reportsCount: 0,
    university: 'Pontificia Universidad Católica',
  },
  {
    id: 'u4',
    name: 'Lucía Torres',
    email: 'lucia@example.com',
    role: 'worker',
    status: 'active',
    registeredDate: new Date('2026-02-10'),
    reservationsCount: 8,
    reportsCount: 2,
    company: 'Startup Innovations',
  },
  {
    id: 'u5',
    name: 'Roberto Campos',
    email: 'roberto@example.com',
    role: 'student',
    status: 'suspended',
    registeredDate: new Date('2025-12-01'),
    reservationsCount: 3,
    reportsCount: 8,
    university: 'Universidad de Santiago',
  },
];

// Support Tickets
export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  category: 'technical' | 'billing' | 'report' | 'suggestion' | 'other';
  status: 'pending' | 'in_review' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  from: 'user' | 'support';
  name: string;
  message: string;
  timestamp: Date;
}

export const mockSupportTickets: SupportTicket[] = [
  {
    id: 't1',
    userId: 'u1',
    userName: 'Estudiante Demo',
    subject: 'No puedo reservar en Biblioteca Central',
    category: 'technical',
    status: 'in_review',
    priority: 'high',
    createdAt: new Date('2026-05-18T10:30:00'),
    updatedAt: new Date('2026-05-18T14:00:00'),
    assignedTo: 'Support Team',
    messages: [
      {
        id: 'm1',
        from: 'user',
        name: 'Estudiante Demo',
        message: 'Hola, al intentar hacer una reserva en la Biblioteca Central me sale un error. ¿Pueden ayudarme?',
        timestamp: new Date('2026-05-18T10:30:00'),
      },
      {
        id: 'm2',
        from: 'support',
        name: 'Soporte Nook',
        message: 'Hola, estamos revisando el problema. ¿Podrías decirnos qué error específico te aparece?',
        timestamp: new Date('2026-05-18T14:00:00'),
      },
    ],
  },
  {
    id: 't2',
    userId: 'u2',
    userName: 'Trabajador Demo',
    subject: 'Consulta sobre facturación',
    category: 'billing',
    status: 'pending',
    priority: 'medium',
    createdAt: new Date('2026-05-19T09:00:00'),
    updatedAt: new Date('2026-05-19T09:00:00'),
    messages: [
      {
        id: 'm3',
        from: 'user',
        name: 'Trabajador Demo',
        message: 'Necesito una factura de mi última reserva en WeWork Vitacura.',
        timestamp: new Date('2026-05-19T09:00:00'),
      },
    ],
  },
  {
    id: 't3',
    userId: 'u3',
    userName: 'Pedro Silva',
    subject: 'Sugerencia: Agregar filtro por universidad',
    category: 'suggestion',
    status: 'resolved',
    priority: 'low',
    createdAt: new Date('2026-05-15T16:20:00'),
    updatedAt: new Date('2026-05-17T11:00:00'),
    assignedTo: 'Product Team',
    messages: [
      {
        id: 'm4',
        from: 'user',
        name: 'Pedro Silva',
        message: 'Sería genial poder filtrar lugares cercanos a mi universidad.',
        timestamp: new Date('2026-05-15T16:20:00'),
      },
      {
        id: 'm5',
        from: 'support',
        name: 'Equipo de Producto',
        message: 'Excelente idea, lo hemos agregado al roadmap. ¡Gracias por tu sugerencia!',
        timestamp: new Date('2026-05-17T11:00:00'),
      },
    ],
  },
];

// Reservations
export interface Reservation {
  id: string;
  userId: string;
  userName: string;
  placeId: string;
  placeName: string;
  dates: Date[];
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  createdAt: Date;
  totalAmount: number;
  paymentMethod: string;
}

export const mockReservations: Reservation[] = [
  {
    id: 'r1',
    userId: 'u2',
    userName: 'Trabajador Demo',
    placeId: 'w1',
    placeName: 'WeWork Vitacura',
    dates: [new Date('2026-05-20'), new Date('2026-05-21')],
    status: 'confirmed',
    createdAt: new Date('2026-05-18T15:00:00'),
    totalAmount: 45000,
    paymentMethod: 'Tarjeta de crédito',
  },
  {
    id: 'r2',
    userId: 'u4',
    userName: 'Lucía Torres',
    placeId: 'w2',
    placeName: 'Espacio CoWork Providencia',
    dates: [new Date('2026-05-22')],
    status: 'pending',
    createdAt: new Date('2026-05-19T10:30:00'),
    totalAmount: 18000,
    paymentMethod: 'Transferencia',
  },
  {
    id: 'r3',
    userId: 'u2',
    userName: 'Trabajador Demo',
    placeId: 'w1',
    placeName: 'WeWork Vitacura',
    dates: [new Date('2026-05-15')],
    status: 'confirmed',
    createdAt: new Date('2026-05-13T09:00:00'),
    totalAmount: 20000,
    paymentMethod: 'Onepay',
  },
];

// Place Reports (Waze-style)
export interface PlaceReport {
  id: string;
  placeId: string;
  placeName: string;
  userId: string;
  userName: string;
  type: 'no_wifi' | 'crowded' | 'noisy' | 'no_outlets' | 'closed' | 'dirty' | 'no_parking' | 'other';
  description: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  upvotes: number;
  createdAt: Date;
  location: { lat: number; lng: number };
}

export const mockPlaceReports: PlaceReport[] = [
  {
    id: 'pr1',
    placeId: '1',
    placeName: 'Biblioteca Central Universidad de Chile',
    userId: 'u1',
    userName: 'Estudiante Demo',
    type: 'no_wifi',
    description: 'WiFi no funciona en el segundo piso',
    status: 'reviewing',
    upvotes: 12,
    createdAt: new Date('2026-05-18T11:00:00'),
    location: { lat: -33.4569, lng: -70.6483 },
  },
  {
    id: 'pr2',
    placeId: '2',
    placeName: 'Café Literario',
    userId: 'u3',
    userName: 'Pedro Silva',
    type: 'crowded',
    description: 'Está lleno, no hay mesas disponibles',
    status: 'resolved',
    upvotes: 8,
    createdAt: new Date('2026-05-19T14:30:00'),
    location: { lat: -33.4589, lng: -70.6503 },
  },
  {
    id: 'pr3',
    placeId: '3',
    placeName: 'WeWork Vitacura',
    userId: 'u4',
    userName: 'Lucía Torres',
    type: 'no_outlets',
    description: 'Pocos enchufes disponibles en sala principal',
    status: 'pending',
    upvotes: 5,
    createdAt: new Date('2026-05-19T16:00:00'),
    location: { lat: -33.4609, lng: -70.6523 },
  },
  {
    id: 'pr4',
    placeId: '4',
    placeName: 'Espacio Biblioteca UAI',
    userId: 'u1',
    userName: 'Estudiante Demo',
    type: 'noisy',
    description: 'Hay mucho ruido por obras de construcción cercanas',
    status: 'reviewing',
    upvotes: 15,
    createdAt: new Date('2026-05-17T09:20:00'),
    location: { lat: -33.4629, lng: -70.6543 },
  },
];
