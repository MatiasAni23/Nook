export type LegalDocument = "terms" | "privacy";

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export const LEGAL_VERSION = "1.0-borrador";
export const LEGAL_REVIEW_DATE = "6 de octubre de 2026";
export const LEGAL_STATUS = "Documento en preparación: aún no tiene fecha de vigencia.";
export const LEGAL_PUBLICATION_NOTICE =
  "Antes de publicar esta versión deben completarse la identificación del responsable, su domicilio y el canal de privacidad, y ponerse en funcionamiento los procedimientos descritos. Tener un dominio no sustituye estos requisitos.";
export const LEGAL_SOURCE_URL = "https://www.bcn.cl/leychile/navegar?idNorma=1209272";

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: "1. Servicio e identificación del operador",
    paragraphs: [
      "Pinwi permite descubrir espacios para estudiar o trabajar, guardar lugares, comunicarse y gestionar solicitudes según las funciones disponibles y el tipo de cuenta. Algunas pantallas siguen siendo demostraciones; una simulación no constituye una reserva ni un pago real.",
      "Pendiente antes de publicación: nombre o razón social del operador, RUT, representante legal cuando corresponda, domicilio y contacto. Pinwi es el nombre de la aplicación y no identifica por sí solo a la persona responsable del servicio.",
    ],
  },
  {
    title: "2. Aceptación y cambios",
    paragraphs: [
      "La versión definitiva deberá presentarse antes de crear una cuenta o contratar un servicio, con una acción expresa de aceptación y constancia de la versión aceptada. La mera navegación no se considera consentimiento para usos opcionales de datos personales.",
      "La política de privacidad informa sobre el tratamiento de datos; leerla o aceptar estos términos no autoriza cualquier uso de tu información. Una finalidad opcional que requiera consentimiento debe ofrecerse por separado.",
      "Los cambios sustanciales deberán comunicarse antes de aplicarse, indicando la nueva versión y fecha. No se entenderán aceptadas automáticamente futuras finalidades de tratamiento por el solo uso de Pinwi.",
    ],
  },
  {
    title: "3. Cuenta, seguridad y menores de edad",
    paragraphs: [
      "Entrega información exacta y protege tu contraseña. Las cuentas y funciones de administración de espacios deben usarse sólo por las personas autorizadas. Está prohibido acceder a datos ajenos, suplantar identidades o interferir con el servicio.",
      "Podrán adoptarse medidas proporcionadas ante fraude, abuso o riesgos de seguridad, informando sus motivos cuando resulte procedente y habilitando un canal de revisión. Una suspensión no elimina tus derechos sobre tus datos.",
      "La modalidad de acceso para menores de edad está pendiente de definición. Antes de habilitarla deben existir controles de edad y representación, protección de perfiles y reglas de comunicación acordes con la normativa. Este borrador no acredita que esos controles estén implementados.",
    ],
  },
  {
    title: "4. Lugares, reservas y cobros",
    paragraphs: [
      "Los horarios, precios, servicios y disponibilidad deben verificarse con la información del lugar. Las solicitudes sólo serán vinculantes conforme al mecanismo de confirmación y las condiciones informadas en cada operación.",
      "Antes de habilitar cobros reales deberán informarse el prestador del servicio, precio total y cargos, medios de pago, cancelación, reembolso y atención de reclamos. El checkout de demostración no procesa pagos ni confirma una reserva ante el lugar.",
      "Estos términos no excluyen las obligaciones legales del operador o del prestador ni limitan derechos que la legislación del consumidor reconozca cuando corresponda.",
    ],
  },
  {
    title: "5. Contenido y comunicaciones",
    paragraphs: [
      "Conservas los derechos sobre el contenido que compartes. La autorización para alojarlo y mostrarlo se limita a prestar la función elegida, sus destinatarios y el período necesario; no constituye una cesión general de propiedad ni una autorización para publicidad ajena al servicio.",
      "No publiques datos de terceros sin autorización ni información sensible innecesaria. Las reseñas y reportes visibles para la comunidad pueden identificar a su autor; evita incluir datos de contacto o antecedentes privados en esos espacios.",
      "El contenido ilícito o que afecte derechos de otras personas podrá moderarse de forma proporcionada. Los mensajes se destinan a sus participantes; el acceso para soporte, investigación de abuso o requerimientos legales debe justificarse y limitarse a lo necesario.",
    ],
  },
  {
    title: "6. Datos personales y derechos",
    paragraphs: [
      "La política de privacidad complementa estos términos y describe los datos, finalidades, destinatarios y pendientes de preparación. Los derechos sobre datos personales no se renuncian al usar Pinwi, cerrar una cuenta o aceptar condiciones del servicio.",
      "Los permisos del dispositivo y los consentimientos opcionales deberán poder retirarse sin afectar las funciones que no los necesiten. Cerrar sesión no equivale a borrar tu cuenta ni los datos almacenados por el servicio.",
    ],
  },
  {
    title: "7. Disponibilidad, cierre y contacto",
    paragraphs: [
      "El servicio puede experimentar mantenimiento o fallas. Las limitaciones técnicas no eximen al operador de sus obligaciones legales ni permiten conservar datos sin una finalidad y fundamento válidos.",
      "Pendiente antes de publicación: canal operativo de soporte, cierre de cuenta y ejercicio de derechos. No se fija una jurisdicción exclusiva ni se limita el acceso a las autoridades competentes mediante este borrador.",
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: "1. Estado del documento y responsable",
    paragraphs: [
      "Este borrador describe las funciones revisadas de Pinwi y los puntos que deben completarse antes de publicarlo. Falta identificar al responsable: nombre o razón social, RUT, representante legal cuando corresponda, domicilio y correo o formulario de privacidad. No hay todavía un canal oficial definido para ejercer derechos.",
      "Se prepara para la reforma introducida por la Ley N.º 21.719, que entra en vigor el 1 de diciembre de 2026. Hasta entonces sigue siendo aplicable la normativa actualmente vigente; esta fecha no posterga las obligaciones existentes.",
    ],
  },
  {
    title: "2. Personas, datos y fuentes",
    paragraphs: [
      "Pinwi trata datos de usuarios, personas invitadas a administrar lugares y participantes en comunicaciones, reservas o soporte. La información procede de lo que entregas, de tus interacciones, del dispositivo y, para invitaciones o gestión de espacios, del administrador o delegado que la registra.",
      "Cuenta: nombre, correo, teléfono, rol, verificación y fotografía. Perfil: región, ciudad, institución, carrera, asignaturas, empresa, cargo, sector laboral y descripción, según el perfil elegido. El teléfono y algunos datos académicos o laborales se exigen actualmente en determinados pasos; debe revisarse su necesidad antes del lanzamiento.",
      "Actividad: favoritos, reseñas, reportes, mensajes y datos de solicitudes de reserva o soporte cuando la función esté conectada al servicio. También se registran impresiones de lugares y vistas de detalles asociadas al identificador de cuenta; esas métricas actuales no son anónimas.",
      "Datos técnicos: sesión, identificadores, estado de conexión, eventos de escritura del chat, información de ubicación para el mapa y registros de operación de proveedores. No hay un campo destinado a pedir datos sensibles; los textos libres o imágenes podrían contenerlos. Evita proporcionar información sensible innecesaria o datos de terceros.",
    ],
  },
  {
    title: "3. Finalidades y fundamentos por definir",
    paragraphs: [
      "Cuenta, autenticación, favoritos, comunicaciones y solicitudes se utilizan para prestar las funciones que solicitas. La versión definitiva debe justificar qué datos son necesarios para el servicio y qué tratamientos responden a obligaciones legales concretas.",
      "La prevención de fraude y la seguridad pueden requerir un interés legítimo documentado y evaluado frente a tus derechos. No se ha aprobado todavía esa evaluación ni una base para las métricas identificables; no deben darse por autorizadas mediante estos términos.",
      "Para finalidades opcionales que se basen en consentimiento deberá informarse cada finalidad, ofrecer una elección previa y conservar prueba de ella. Rechazar o retirar una elección opcional no debe impedir funciones independientes. Antes de incorporar publicidad, nuevos destinatarios o usos de perfil deberán actualizarse esta información y su fundamento.",
    ],
  },
  {
    title: "4. Ubicación y mapas",
    paragraphs: [
      "El mapa usa coordenadas del navegador para mostrar cercanía y centrar la vista. En la versión revisada solicita ubicación al abrir el mapa y puede intentar obtener una ubicación aproximada por IP mediante Google Geolocation si la ubicación del navegador falla, incluso por denegación del permiso. Este comportamiento está pendiente de corrección; rechazar el permiso del navegador no impide actualmente ese intento alternativo.",
      "Google interviene en la carga del mapa y puede recibir información de conexión y de las consultas del mapa. No se identificó un historial de coordenadas guardado en la base de datos de Pinwi; la vista mantiene coordenadas y posición del mapa durante el uso. Antes de publicación deben precisarse duración, destinatarios y elecciones disponibles, y ofrecerse búsqueda manual sin ubicación.",
    ],
  },
  {
    title: "5. Visibilidad y destinatarios",
    paragraphs: [
      "Los mensajes y solicitudes se destinan a los participantes y a quienes gestionan el espacio o atienden soporte, conforme a su función. Reseñas y reportes comunitarios pueden ser consultados por otros usuarios. Las fotografías de perfil se generan con enlaces públicos en la versión revisada; conocer el enlace puede permitir ver la imagen fuera de Pinwi si el almacenamiento está configurado como público.",
      "La app comparte identificadores y estado de conexión mediante una presencia general, y señales de escritura en el chat. Falta limitar y verificar estos accesos. Tampoco se ha validado que los permisos de base de datos limiten todos los campos privados a sus destinatarios necesarios.",
      "Los proveedores identificados en el proyecto son Supabase para autenticación, base de datos, almacenamiento y tiempo real; Google Maps y Geolocation para mapas y ubicación; y Brevo para invitaciones por correo. Debe completarse la identificación de las entidades contratadas y otros proveedores efectivos, incluido alojamiento y correo de autenticación.",
    ],
  },
  {
    title: "6. Proveedores y transferencias internacionales",
    paragraphs: [
      "Los países de alojamiento y tratamiento, los subencargados y las garantías contractuales aún deben verificarse con las cuentas y contratos reales. Este borrador no asegura que tus datos se almacenen en Chile ni que todos los proveedores cuenten ya con acuerdos de protección de datos.",
      "Antes de publicar deben informarse destinos y garantías aplicables, documentar las instrucciones a cada proveedor y revisar sus medidas de seguridad. Una autorización genérica en los términos no sustituye el mecanismo requerido para transferencias habituales.",
    ],
  },
  {
    title: "7. Conservación y eliminación",
    paragraphs: [
      "No hay todavía plazos de conservación aprobados por categoría ni un proceso completo de eliminación de cuenta. Deben definirse y publicarse períodos o criterios verificables para perfiles, mensajes, reservas, reportes, métricas, invitaciones, registros y respaldos, junto con las excepciones legales que justifiquen una conservación limitada.",
      "Cerrar sesión limpia determinados datos locales, pero no elimina los datos del servidor. Reemplazar una foto tampoco acredita que se borre la anterior. La futura supresión debe abarcar proveedores y archivos, y distinguir lo que se elimina, anonimiza o conserva con un fundamento documentado.",
    ],
  },
  {
    title: "8. Seguridad e incidentes",
    paragraphs: [
      "La app utiliza autenticación y controles de acceso, pero su eficacia completa está pendiente de validación. No se promete seguridad absoluta ni cifrado de extremo a extremo de los chats.",
      "Antes de publicar deben verificarse permisos, almacenamiento, sesiones y recuperación, y aprobarse un procedimiento de incidentes con responsables, evaluación de riesgo, registro y comunicaciones que correspondan. Este borrador no certifica que dichas medidas ya estén operativas.",
    ],
  },
  {
    title: "9. Derechos y procedimiento",
    paragraphs: [
      "La reforma reconoce acceso, rectificación, supresión, oposición, portabilidad cuando proceda y bloqueo. Retirar un consentimiento no invalida usos anteriores lícitos; tampoco elimina otros fundamentos que deban justificarse.",
      "La portabilidad legal comprende datos que hayas facilitado y que se traten de forma automatizada sobre la base de tu consentimiento. La atención de derechos debe ser sencilla y ajustarse a las reglas de gratuidad de la ley; Pinwi aún debe habilitar el mecanismo operativo.",
      "Desde el 1 de diciembre de 2026, una solicitud debe acusarse de recibo y responderse dentro de 30 días corridos, con una sola prórroga de hasta 30 días. El bloqueo temporal fundado tiene respuesta en dos días hábiles; mientras se resuelve no se trata la información afectada. Una negativa debe justificarse e informar la reclamación ante la Agencia y su plazo de 30 días hábiles. Hasta esa fecha rigen los procedimientos y plazos de la normativa vigente.",
      "Pendiente antes de publicación: correo o formulario operativo, verificación proporcionada de identidad, seguimiento y respuestas. La edición de perfil sólo corrige algunos datos; no sustituye el ejercicio de los demás derechos ni existe aún una descarga o eliminación completa desde la app.",
    ],
  },
  {
    title: "10. Menores y decisiones automatizadas",
    paragraphs: [
      "Antes de admitir menores debe definirse la modalidad de acceso, verificar las autorizaciones que correspondan y proteger perfiles y comunicaciones. No debe confundirse el permiso para usar una cuenta con una autorización para publicar datos o ubicación. Los controles necesarios aún están pendientes.",
      "Las funciones revisadas ordenan o filtran lugares por atributos y cercanía. No se identificaron decisiones exclusivamente automatizadas con efectos jurídicos o impacto significativo sobre la persona. Si se incorporan deberán explicarse su lógica y consecuencias y habilitar las garantías correspondientes.",
    ],
  },
  {
    title: "11. Almacenamiento en tu dispositivo",
    paragraphs: [
      "La app mantiene la sesión mediante almacenamiento del navegador y usa memoria, almacenamiento de sesión y caché de imágenes para cargar datos y preferencias. La analítica interna de lugares escribe eventos en el servidor y no se convierte en anónima por no usar cookies publicitarias.",
      "No se identificaron herramientas publicitarias adicionales en el proyecto revisado. Las prácticas reales de alojamiento y proveedores deben verificarse; cualquier tecnología opcional deberá informarse y ofrecer sus controles antes de activarse.",
    ],
  },
  {
    title: "12. Actualizaciones y publicación definitiva",
    paragraphs: [
      "La versión y fecha de revisión se muestran en este documento; no son una declaración de cumplimiento ni una fecha de entrada en vigor. La versión definitiva deberá identificar al responsable, ofrecer contacto real, detallar conservación y transferencias y corresponder a prácticas ya implementadas.",
      "Los cambios de finalidad, proveedores o funciones deberán evaluarse e informarse antes de aplicarse. No se presume una autorización general para futuros usos de tus datos.",
    ],
  },
];
