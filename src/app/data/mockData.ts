export type UserRole = 'student' | 'worker' | 'admin';

export type IssueType =
  | 'no_wifi'
  | 'crowded'
  | 'noisy'
  | 'no_outlets'
  | 'closed'
  | 'dirty'
  | 'no_parking'
  | 'other';

export interface Issue {
  id: string;
  placeId: string;
  type: IssueType;
  description?: string;
  reportedBy: string;
  timestamp: Date;
  upvotes: number;
  hasConfirmed?: boolean;
}

export type NotificationType =
  | 'issue_report'
  | 'reservation_confirmed'
  | 'new_message'
  | 'place_update'
  | 'favorite_issue'
  | 'review_response'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  placeId?: string;
  placeName?: string;
  actionPath?: string | null;
}

export interface StudyPlace {
  id: string;
  name: string;
  type: 'library' | 'cafe' | 'coworking' | 'park';
  lat: number;
  lng: number;
  rating: number;
  reviews: number;
  quietness: number;
  wifi: boolean;
  outlets: boolean;
  openNow: boolean;
  hours: string;
  description: string;
}

export interface WorkPlace {
  id: string;
  name: string;
  type: 'office' | 'coworking' | 'meeting_room' | 'private_office';
  lat: number;
  lng: number;
  rating: number;
  reviews: number;
  wifi: boolean;
  parking: boolean;
  openNow: boolean;
  hours: string;
  description: string;
  pricePerHour: number;
  capacity: number;
}

export interface Student {
  id: string;
  name: string;
  avatar: string;
  career: string;
  university: string;
  subjects: string[];
  bio: string;
  online: boolean;
}

export interface Worker {
  id: string;
  name: string;
  avatar: string;
  role: UserRole;
  company: string;
  position: string;
  bio: string;
  online: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
}

export interface ChatConversation {
  userId: string;
  messages: Message[];
}

// Current user role - managed dynamically
let _currentUserRole: UserRole = 'student';

export const getCurrentUserRole = (): UserRole => _currentUserRole;
export const setCurrentUserRole = (role: UserRole) => {
  _currentUserRole = role;
};

// For backwards compatibility
export const currentUserRole: UserRole = 'student';

// Mock current user (student)
export const currentUser: Student = {
  id: 'current-user',
  name: 'Tu Perfil',
  avatar: '',
  career: 'Ingeniería Civil en Computación',
  university: 'Universidad de Chile',
  subjects: ['Algoritmos y Estructuras de Datos', 'Bases de Datos', 'Redes de Computadores'],
  bio: 'Estudiante apasionado por la tecnología y el desarrollo de software.',
  online: true,
};

// Mock current worker
export const currentWorker: Worker = {
  id: 'current-worker',
  name: 'Tu Perfil',
  avatar: '',
  role: 'worker',
  company: 'Tech Solutions SpA',
  position: 'Desarrollador Senior',
  bio: 'Desarrollador con 5 años de experiencia. Busco espacios tranquilos para trabajar remoto.',
  online: true,
};

// Mock study places in Santiago, Chile
export const studyPlaces: StudyPlace[] = [
  {
    id: '1',
    name: 'Biblioteca Central Universidad de Chile',
    type: 'library',
    lat: -33.4569,
    lng: -70.6483,
    rating: 4.6,
    reviews: 245,
    quietness: 5,
    wifi: true,
    outlets: true,
    openNow: true,
    hours: '8:00 - 22:00',
    description: 'Biblioteca universitaria con amplios espacios de estudio silencioso y recursos académicos. Ideal para preparar exámenes.',
  },
  {
    id: '2',
    name: 'Café Literario',
    type: 'cafe',
    lat: -33.4489,
    lng: -70.6693,
    rating: 4.3,
    reviews: 156,
    quietness: 3,
    wifi: true,
    outlets: true,
    openNow: true,
    hours: '8:00 - 21:00',
    description: 'Cafetería en Providencia con buen ambiente para estudiar. Excelente café y wifi rápido.',
  },
  {
    id: '3',
    name: 'WeWork Vitacura',
    type: 'coworking',
    lat: -33.4069,
    lng: -70.5843,
    rating: 4.8,
    reviews: 189,
    quietness: 4,
    wifi: true,
    outlets: true,
    openNow: true,
    hours: '9:00 - 20:00',
    description: 'Espacio de coworking moderno con salas de estudio privadas y áreas colaborativas.',
  },
  {
    id: '4',
    name: 'Parque Forestal',
    type: 'park',
    lat: -33.4372,
    lng: -70.6404,
    rating: 4.1,
    reviews: 78,
    quietness: 2,
    wifi: false,
    outlets: false,
    openNow: true,
    hours: '6:00 - 21:00',
    description: 'Parque céntrico perfecto para estudiar al aire libre. Ideal en primavera y verano.',
  },
  {
    id: '5',
    name: 'Biblioteca de Santiago',
    type: 'library',
    lat: -33.4614,
    lng: -70.6795,
    rating: 4.7,
    reviews: 312,
    quietness: 5,
    wifi: true,
    outlets: true,
    openNow: true,
    hours: '9:00 - 19:00',
    description: 'Biblioteca pública moderna con salas de estudio grupal e individual. Excelente infraestructura.',
  },
  {
    id: '6',
    name: 'Starbucks Alameda',
    type: 'cafe',
    lat: -33.4450,
    lng: -70.6540,
    rating: 4.0,
    reviews: 98,
    quietness: 2,
    wifi: true,
    outlets: true,
    openNow: true,
    hours: '7:00 - 22:00',
    description: 'Café céntrico cerca del metro Universidad de Chile. Concurrido pero con buena conexión.',
  },
  {
    id: '7',
    name: 'Biblioteca PUC',
    type: 'library',
    lat: -33.4990,
    lng: -70.6143,
    rating: 4.8,
    reviews: 201,
    quietness: 5,
    wifi: true,
    outlets: true,
    openNow: true,
    hours: '8:00 - 23:00',
    description: 'Una de las mejores bibliotecas de Santiago. Espacios amplios, silenciosos y muy buena infraestructura.',
  },
  {
    id: '8',
    name: 'Café Haiti',
    type: 'cafe',
    lat: -33.4391,
    lng: -70.6527,
    rating: 4.4,
    reviews: 167,
    quietness: 3,
    wifi: true,
    outlets: true,
    openNow: true,
    hours: '8:00 - 20:00',
    description: 'Café tradicional del centro. Ambiente relajado y bueno para estudiar con música de fondo.',
  },
];

// Mock work places in Santiago, Chile
export const workPlaces: WorkPlace[] = [
  {
    id: 'w1',
    name: 'Oficina Ejecutiva Las Condes',
    type: 'private_office',
    lat: -33.4169,
    lng: -70.5943,
    rating: 4.7,
    reviews: 89,
    wifi: true,
    parking: true,
    openNow: true,
    hours: '8:00 - 20:00',
    description: 'Oficina privada completamente equipada en el corazón de Las Condes. Ideal para reuniones ejecutivas.',
    pricePerHour: 15000,
    capacity: 6,
  },
  {
    id: 'w2',
    name: 'Regus Providencia',
    type: 'coworking',
    lat: -33.4289,
    lng: -70.6193,
    rating: 4.5,
    reviews: 234,
    wifi: true,
    parking: true,
    openNow: true,
    hours: '7:00 - 21:00',
    description: 'Espacio de coworking profesional con salas de reuniones y escritorios privados.',
    pricePerHour: 8000,
    capacity: 20,
  },
  {
    id: 'w3',
    name: 'Sala de Reuniones Centro',
    type: 'meeting_room',
    lat: -33.4372,
    lng: -70.6504,
    rating: 4.3,
    reviews: 67,
    wifi: true,
    parking: false,
    openNow: true,
    hours: '9:00 - 19:00',
    description: 'Sala de reuniones equipada con proyector y pizarra. Ubicación céntrica.',
    pricePerHour: 12000,
    capacity: 10,
  },
  {
    id: 'w4',
    name: 'WeWork Isidora',
    type: 'coworking',
    lat: -33.4125,
    lng: -70.6045,
    rating: 4.9,
    reviews: 412,
    wifi: true,
    parking: true,
    openNow: true,
    hours: '24 horas',
    description: 'Coworking premium con todas las amenidades. Café ilimitado y eventos networking.',
    pricePerHour: 10000,
    capacity: 50,
  },
  {
    id: 'w5',
    name: 'Oficina Compartida Vitacura',
    type: 'office',
    lat: -33.3969,
    lng: -70.5743,
    rating: 4.6,
    reviews: 156,
    wifi: true,
    parking: true,
    openNow: true,
    hours: '8:00 - 20:00',
    description: 'Espacio de trabajo compartido en edificio moderno. Excelente conectividad.',
    pricePerHour: 7000,
    capacity: 15,
  },
  {
    id: 'w6',
    name: 'Sala Premium Torre Titanium',
    type: 'meeting_room',
    lat: -33.4189,
    lng: -70.6069,
    rating: 4.8,
    reviews: 98,
    wifi: true,
    parking: true,
    openNow: true,
    hours: '8:00 - 22:00',
    description: 'Sala de reuniones premium con vista panorámica. Equipamiento audiovisual de última generación.',
    pricePerHour: 25000,
    capacity: 12,
  },
];

// Mock students from Chilean universities
export const students: Student[] = [
  {
    id: '1',
    name: 'Catalina Silva',
    avatar: '',
    career: 'Ingeniería Civil en Computación',
    university: 'Universidad de Chile',
    subjects: ['Algoritmos y Estructuras de Datos', 'Programación Orientada a Objetos', 'Cálculo'],
    bio: 'Me encanta programar y participar en hackathons. Buscando equipo para estudiar para el certamen.',
    online: true,
  },
  {
    id: '2',
    name: 'Matías Fuentes',
    avatar: '',
    career: 'Ingeniería Civil Informática',
    university: 'Pontificia Universidad Católica de Chile',
    subjects: ['Bases de Datos', 'Redes de Computadores', 'Arquitectura de Software'],
    bio: 'Desarrollador full-stack. Me gusta estudiar en grupo y compartir conocimientos.',
    online: false,
  },
  {
    id: '3',
    name: 'Valentina Rojas',
    avatar: '',
    career: 'Ingeniería en Informática',
    university: 'Universidad Técnica Federico Santa María',
    subjects: ['Algoritmos y Estructuras de Datos', 'Inteligencia Artificial', 'Machine Learning'],
    bio: 'Apasionada por la IA y análisis de datos. Siempre dispuesta a colaborar en proyectos.',
    online: true,
  },
  {
    id: '4',
    name: 'Sebastián Morales',
    avatar: '',
    career: 'Ingeniería en Computación',
    university: 'Universidad de Santiago de Chile',
    subjects: ['Compiladores', 'Sistemas Operativos', 'Programación Avanzada'],
    bio: 'Programador backend especializado en Python y Java. Me gusta la café filosófica.',
    online: true,
  },
  {
    id: '5',
    name: 'Fernanda Pérez',
    avatar: '',
    career: 'Ingeniería Civil Industrial',
    university: 'Universidad de Chile',
    subjects: ['Investigación Operativa', 'Optimización', 'Estadística'],
    bio: 'Enfocada en data science y optimización. Buscando compañeros para ramos cuantitativos.',
    online: false,
  },
  {
    id: '6',
    name: 'Diego Vargas',
    avatar: '',
    career: 'Ingeniería en Software',
    university: 'Universidad Adolfo Ibáñez',
    subjects: ['Desarrollo Web', 'Arquitectura de Software', 'DevOps'],
    bio: 'Full-stack developer. Me interesa cloud computing y microservicios.',
    online: true,
  },
];

// Mock user ratings for places
export const userRatings: Record<string, number> = {
  '1': 5,
  '2': 4,
  '3': 5,
};

// Mock chat conversations (for students)
export const mockChats: Record<string, ChatConversation> = {
  '1': {
    userId: '1',
    messages: [
      { id: '1', senderId: '1', text: '¡Hola! ¿Estudiamos juntos para el certamen de Algoritmos? Me está costando caleta', timestamp: new Date(2026, 4, 13, 10, 30) },
      { id: '2', senderId: 'current-user', text: '¡Dale! ¿Qué día te tinca?', timestamp: new Date(2026, 4, 13, 10, 45) },
      { id: '3', senderId: '1', text: '¿El jueves en la Biblioteca Central de la U? Quedamos a las 15:00', timestamp: new Date(2026, 4, 13, 11, 0) },
      { id: '4', senderId: 'current-user', text: 'Perfecto, nos vemos allá!', timestamp: new Date(2026, 4, 13, 11, 5) },
    ],
  },
  '3': {
    userId: '3',
    messages: [
      { id: '1', senderId: '3', text: 'Oye, vi que también cursas IA. ¿Tienes los apuntes de redes neuronales?', timestamp: new Date(2026, 4, 12, 15, 20) },
      { id: '2', senderId: 'current-user', text: '¡Sí! Te los paso por correo. ¿Quieres estudiar juntos pa la prueba?', timestamp: new Date(2026, 4, 12, 16, 10) },
      { id: '3', senderId: '3', text: '¡Bacán! ¿Nos juntamos en el WeWork de Vitacura?', timestamp: new Date(2026, 4, 12, 16, 25) },
    ],
  },
  '4': {
    userId: '4',
    messages: [
      { id: '1', senderId: '4', text: 'Compa, ¿entendiste el ejercicio 3 del profe? No cacho nada', timestamp: new Date(2026, 4, 11, 18, 0) },
      { id: '2', senderId: 'current-user', text: 'Ese me costó, pero después lo pillé. ¿Nos juntamos a revisarlo?', timestamp: new Date(2026, 4, 11, 18, 30) },
    ],
  },
};

// Mock chat conversations for workers (with workplaces)
export const mockWorkerChats: Record<string, ChatConversation> = {
  'w1': {
    userId: 'w1',
    messages: [
      { id: '1', senderId: 'w1', text: 'Hola! Te confirmamos tu reserva para mañana a las 9:00. ¿Necesitas algo adicional?', timestamp: new Date(2026, 4, 15, 14, 20) },
      { id: '2', senderId: 'current-worker', text: 'Perfecto, muchas gracias. ¿Tienen proyector disponible?', timestamp: new Date(2026, 4, 15, 14, 25) },
      { id: '3', senderId: 'w1', text: 'Sí, todas nuestras salas cuentan con proyector 4K y pantalla. Ya lo dejamos listo para ti.', timestamp: new Date(2026, 4, 15, 14, 30) },
      { id: '4', senderId: 'current-worker', text: 'Excelente! Nos vemos mañana entonces', timestamp: new Date(2026, 4, 15, 14, 35) },
    ],
  },
  'w2': {
    userId: 'w2',
    messages: [
      { id: '1', senderId: 'current-worker', text: 'Hola, me gustaría consultar por disponibilidad para la próxima semana', timestamp: new Date(2026, 4, 14, 10, 0) },
      { id: '2', senderId: 'w2', text: '¡Hola! Claro que sí. Tenemos disponibilidad de lunes a viernes. ¿Qué días te interesan?', timestamp: new Date(2026, 4, 14, 10, 15) },
      { id: '3', senderId: 'current-worker', text: 'Miércoles y jueves completo si es posible', timestamp: new Date(2026, 4, 14, 10, 20) },
      { id: '4', senderId: 'w2', text: 'Perfecto, te puedo ofrecer un 15% de descuento por reservar 2 días completos. Te envío la cotización.', timestamp: new Date(2026, 4, 14, 10, 25) },
    ],
  },
  'w4': {
    userId: 'w4',
    messages: [
      { id: '1', senderId: 'w4', text: 'Hola! Gracias por tu reserva en WeWork Isidora. ¿Es tu primera vez con nosotros?', timestamp: new Date(2026, 4, 13, 9, 0) },
      { id: '2', senderId: 'current-worker', text: 'Sí, primera vez. ¿Dónde puedo estacionar?', timestamp: new Date(2026, 4, 13, 9, 10) },
      { id: '3', senderId: 'w4', text: 'Tenemos estacionamiento gratuito en el subterráneo. Al llegar pregunta en recepción y te damos tu pase.', timestamp: new Date(2026, 4, 13, 9, 15) },
    ],
  },
};

// Mock issues/reports
export const placeIssues: Issue[] = [
  {
    id: 'i1',
    placeId: '1',
    type: 'crowded',
    description: 'Está lleno, no hay mesas disponibles',
    reportedBy: 'Usuario anónimo',
    timestamp: new Date(2026, 4, 19, 10, 30),
    upvotes: 12,
  },
  {
    id: 'i2',
    placeId: '1',
    type: 'noisy',
    reportedBy: 'Usuario anónimo',
    timestamp: new Date(2026, 4, 19, 11, 15),
    upvotes: 5,
  },
  {
    id: 'i3',
    placeId: '3',
    type: 'no_wifi',
    description: 'Internet caído desde hace 1 hora',
    reportedBy: 'Usuario anónimo',
    timestamp: new Date(2026, 4, 19, 9, 45),
    upvotes: 23,
  },
  {
    id: 'i4',
    placeId: '6',
    type: 'no_outlets',
    description: 'Todos los enchufes ocupados',
    reportedBy: 'Usuario anónimo',
    timestamp: new Date(2026, 4, 19, 12, 0),
    upvotes: 8,
  },
  {
    id: 'i5',
    placeId: 'w2',
    type: 'crowded',
    reportedBy: 'Usuario anónimo',
    timestamp: new Date(2026, 4, 19, 8, 30),
    upvotes: 15,
  },
  {
    id: 'i6',
    placeId: 'w4',
    type: 'no_parking',
    description: 'Estacionamiento completo',
    reportedBy: 'Usuario anónimo',
    timestamp: new Date(2026, 4, 19, 13, 20),
    upvotes: 7,
  },
];

export const getIssueLabel = (type: IssueType): string => {
  const labels: Record<IssueType, string> = {
    no_wifi: 'Sin WiFi',
    crowded: 'Lleno',
    noisy: 'Ruidoso',
    no_outlets: 'Sin enchufes',
    closed: 'Cerrado',
    dirty: 'Sucio',
    no_parking: 'Sin parking',
    other: 'Otro',
  };
  return labels[type];
};

export const getIssueIcon = (type: IssueType): string => {
  const icons: Record<IssueType, string> = {
    no_wifi: '📶',
    crowded: '👥',
    noisy: '🔊',
    no_outlets: '🔌',
    closed: '🚫',
    dirty: '🧹',
    no_parking: '🚗',
    other: '⚠️',
  };
  return icons[type];
};

// Mock notifications
export const notifications: Notification[] = [
  {
    id: 'n1',
    type: 'issue_report',
    title: 'Nuevo reporte en Biblioteca Central',
    message: '12 personas reportaron que está lleno',
    timestamp: new Date(2026, 4, 19, 10, 30),
    read: false,
    placeId: '1',
    placeName: 'Biblioteca Central Universidad de Chile',
  },
  {
    id: 'n2',
    type: 'favorite_issue',
    title: 'Problema en lugar favorito',
    message: 'WeWork Vitacura reporta sin WiFi desde hace 1 hora',
    timestamp: new Date(2026, 4, 19, 9, 45),
    read: false,
    placeId: '3',
    placeName: 'WeWork Vitacura',
  },
  {
    id: 'n3',
    type: 'new_message',
    title: 'Nuevo mensaje',
    message: 'Catalina Silva te envió un mensaje',
    timestamp: new Date(2026, 4, 19, 8, 20),
    read: false,
  },
  {
    id: 'n4',
    type: 'reservation_confirmed',
    title: 'Reserva confirmada',
    message: 'Tu reserva en Oficina Ejecutiva Las Condes para mañana a las 9:00',
    timestamp: new Date(2026, 4, 18, 16, 0),
    read: true,
    placeId: 'w1',
    placeName: 'Oficina Ejecutiva Las Condes',
  },
  {
    id: 'n5',
    type: 'place_update',
    title: 'Actualización de lugar',
    message: 'Biblioteca de Santiago tiene nuevo horario extendido hasta las 21:00',
    timestamp: new Date(2026, 4, 18, 12, 0),
    read: true,
    placeId: '5',
    placeName: 'Biblioteca de Santiago',
  },
];
