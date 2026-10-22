export type LegalDocument = "terms" | "privacy";

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export const LEGAL_DOCUMENT_DETAILS: Record<LegalDocument, {
  version: string;
  reviewDate: string;
  summaryTitle: string;
  summary: string;
  sourceUrl: string;
  sourceLabel: string;
}> = {
  terms: {
    version: "1.1",
    reviewDate: "21 de octubre de 2026",
    summaryTitle: "Condiciones de uso de Pinwi",
    summary: "Conoce las condiciones para utilizar tu cuenta, descubrir espacios y relacionarte con la comunidad. Aquí se describen tus responsabilidades, el alcance del servicio y los canales de contacto.",
    sourceUrl: "https://www.sernac.gov.cl/portal/618/w3-article-21568.html",
    sourceLabel: "Consultar derechos del consumidor en SERNAC",
  },
  privacy: {
    version: "1.0-borrador",
    reviewDate: "6 de octubre de 2026",
    summaryTitle: "Documento en preparación: aún no tiene fecha de vigencia.",
    summary: "Antes de publicar esta versión deben completarse la identificación del responsable, su domicilio y el canal de privacidad, y ponerse en funcionamiento los procedimientos descritos. Tener un dominio no sustituye estos requisitos.",
    sourceUrl: "https://www.bcn.cl/leychile/navegar?idNorma=1209272",
    sourceLabel: "Consultar Ley N.º 21.719 en la Biblioteca del Congreso Nacional",
  },
};

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: "1. Objeto y alcance del servicio",
    paragraphs: [
      "Estos términos regulan el uso de Pinwi, disponible en www.pinwi.cl, una plataforma para descubrir espacios de estudio y trabajo, guardar lugares favoritos, comunicarse con otras personas y gestionar solicitudes de reserva en los espacios que tengan habilitada esa función.",
      "Las funciones disponibles dependen del tipo de cuenta y de los servicios habilitados para cada lugar. La publicación de un espacio en Pinwi no implica que la plataforma sea su propietaria o administradora. La gestión del recinto y las condiciones de acceso corresponden a quienes lo operan, sin perjuicio de las responsabilidades propias de Pinwi.",
    ],
  },
  {
    title: "2. Consulta y aceptación de condiciones",
    paragraphs: [
      "Puedes consultar estas condiciones desde el inicio de sesión y en la página pública de términos. La sola visita al sitio no genera una obligación de contratar ni una autorización general para utilizar tus datos personales.",
      "Cada solicitud de reserva se rige, además, por la información del espacio y las condiciones comunicadas antes de enviarla. Una operación que requiera aceptación debe contar con una manifestación expresa de tu voluntad; consultar una ficha o un horario no equivale a contratar.",
    ],
  },
  {
    title: "3. Registro y seguridad de la cuenta",
    paragraphs: [
      "Para utilizar las funciones que requieren identificación debes crear una cuenta, proporcionar información veraz y mantener actualizados tus datos de contacto. Utiliza únicamente identidades, fotografías y antecedentes que te pertenezcan o que estés autorizado a utilizar.",
      "Protege tu contraseña y evita compartir tus credenciales. Si detectas un acceso que no reconoces, cambia tu contraseña y comunícalo a info@pinwi.cl. Pinwi no te solicitará tu contraseña ni tus códigos de verificación por correo o chat.",
      "Las funciones de administración y gestión de lugares sólo pueden utilizarse con los permisos asignados a la cuenta. Registrarte en la plataforma o indicar una vinculación con un establecimiento no otorga por sí solo facultades para representarlo.",
    ],
  },
  {
    title: "4. Uso responsable de la plataforma",
    paragraphs: [
      "Utiliza Pinwi de forma lícita y respetuosa. No se permite suplantar identidades, acosar, amenazar, discriminar, enviar publicidad no solicitada, publicar información engañosa ni compartir contenido que vulnere derechos de otras personas.",
      "Está prohibido intentar acceder a cuentas o datos ajenos, eludir controles de acceso, introducir código malicioso, extraer datos personales sin autorización o interferir con el funcionamiento de la plataforma.",
      "En los espacios físicos debes respetar las normas del recinto, su capacidad, los horarios autorizados y las indicaciones de sus responsables, además de cuidar las instalaciones y la convivencia con otras personas.",
    ],
  },
  {
    title: "5. Información de los lugares",
    paragraphs: [
      "Las fichas reúnen información sobre ubicación, horarios, servicios, accesibilidad, capacidad y otras características de los espacios. Esa información puede actualizarse y debe leerse junto con los avisos y condiciones particulares del lugar.",
      "La aparición de un lugar en el mapa o en los resultados no asegura disponibilidad inmediata ni acceso sin restricciones. Antes de trasladarte, revisa sus horarios y requisitos de ingreso; si adviertes información incorrecta, puedes comunicarla mediante las opciones de reporte disponibles o por correo.",
      "Quienes gestionan un lugar deben mantener su información actualizada, publicar únicamente contenidos que estén autorizados a utilizar y gestionar las solicitudes dentro del alcance de sus permisos.",
    ],
  },
  {
    title: "6. Solicitudes de reserva y pagos",
    paragraphs: [
      "En los lugares con reservas habilitadas puedes solicitar una franja publicada para un espacio y un grupo de personas. Revisa el lugar, la fecha, el horario y la capacidad antes de enviar la solicitud.",
      "Una solicitud enviada queda pendiente de aprobación. La reserva se considera confirmada cuando su estado figure como Confirmada en Mis reservas. La visualización de una franja disponible o el envío de una solicitud no equivalen a una confirmación.",
      "Pinwi no procesa pagos a través de la plataforma. Enviar una solicitud de reserva no realiza un cargo. Cualquier servicio adicional ofrecido directamente por un establecimiento debe informar previamente su prestador, precio total, condiciones de contratación, cancelación y devolución, cuando corresponda.",
      "Si necesitas cancelar una solicitud, utiliza la opción disponible en Mis reservas. Si una condición particular no está clara o necesitas resolver una incidencia, consulta con el responsable del lugar o escribe a info@pinwi.cl. Estas condiciones no restringen los derechos de cancelación, retracto o devolución que reconozca la legislación aplicable.",
    ],
  },
  {
    title: "7. Contenido y comunicaciones",
    paragraphs: [
      "Conservas los derechos sobre el contenido que compartes. La autorización para alojarlo y mostrarlo se limita a prestar la función elegida, sus destinatarios y el período necesario; no constituye una cesión general de propiedad ni una autorización para publicidad ajena al servicio.",
      "Comparte reseñas y reportes basados en tu experiencia, con información pertinente y respetuosa. No publiques datos personales de terceros sin autorización ni antecedentes sensibles innecesarios. Evita incluir teléfonos, direcciones particulares u otros datos privados en contenido visible para la comunidad.",
      "El contenido ilícito o que afecte derechos de otras personas podrá moderarse de forma proporcionada. Los mensajes se destinan a sus participantes; el acceso para soporte, investigación de abuso o requerimientos legales debe justificarse y limitarse a lo necesario.",
    ],
  },
  {
    title: "8. Propiedad intelectual",
    paragraphs: [
      "La marca Pinwi, su identidad visual, los diseños, textos y demás elementos de la plataforma están sujetos a los derechos de sus respectivos titulares. El acceso al servicio te permite utilizar sus funciones, sin transferirte derechos sobre esos elementos.",
      "No utilices la marca para aparentar una relación oficial con Pinwi ni reproduzcas o distribuyas contenido protegido sin autorización, salvo los usos permitidos por la ley. Los contenidos aportados por usuarios y establecimientos conservan la titularidad que les corresponda.",
    ],
  },
  {
    title: "9. Privacidad y datos personales",
    paragraphs: [
      "La política de privacidad, disponible en www.pinwi.cl/privacidad, complementa estos términos con información sobre el tratamiento de datos personales. Aceptar condiciones de uso no implica autorizar cualquier finalidad ni renunciar a tus derechos sobre los datos.",
      "Las elecciones opcionales de visibilidad de perfil y los permisos del dispositivo deben distinguirse de las funciones necesarias para prestar el servicio. Puedes gestionar la visibilidad de tu perfil desde sus ajustes y los permisos de ubicación desde tu navegador.",
      "Cerrar sesión no elimina tu cuenta ni los datos almacenados. Para consultas sobre tus datos o para solicitar el cierre de tu cuenta, escribe a info@pinwi.cl indicando tu solicitud, sin incluir contraseñas ni códigos de acceso.",
    ],
  },
  {
    title: "10. Disponibilidad y servicios de terceros",
    paragraphs: [
      "Pinwi puede experimentar interrupciones por mantenimiento, fallas técnicas o problemas de conectividad. Ante una incidencia, evita repetir operaciones sin revisar antes su estado, especialmente si ya enviaste una solicitud de reserva.",
      "Los mapas, enlaces externos y servicios de otros proveedores pueden estar sujetos a condiciones propias. Sus condiciones no sustituyen las obligaciones que correspondan a Pinwi por el servicio que presta.",
      "Las interrupciones y limitaciones técnicas no excluyen las responsabilidades establecidas por la ley ni los derechos de quienes utilizan la plataforma.",
    ],
  },
  {
    title: "11. Restricciones de acceso y cierre de cuenta",
    paragraphs: [
      "Pinwi podrá restringir contenido o suspender funciones de una cuenta cuando existan antecedentes de fraude, suplantación, acoso, acceso no autorizado u otros incumplimientos de estas condiciones. Las medidas deben ser proporcionales a la situación y se informarán sus motivos cuando corresponda, sin comprometer una investigación o la seguridad de otras personas.",
      "Puedes solicitar la revisión de una restricción o el cierre de tu cuenta mediante info@pinwi.cl. Una suspensión o un cierre no extinguen tus derechos sobre datos personales ni las obligaciones que deban mantenerse por una operación anterior o por disposición legal.",
    ],
  },
  {
    title: "12. Actualizaciones de estas condiciones",
    paragraphs: [
      "La versión y la fecha de actualización se indican al inicio de este documento. Los cambios sustanciales se comunicarán antes de su aplicación por los canales de la plataforma o mediante el correo asociado a tu cuenta, según corresponda.",
      "Las modificaciones no alteran retroactivamente las condiciones de operaciones ya confirmadas ni suponen una autorización automática para nuevas finalidades de tratamiento de datos. Cuando un cambio requiera aceptación expresa o un consentimiento específico, deberá solicitarse por separado.",
    ],
  },
  {
    title: "13. Contacto y legislación aplicable",
    paragraphs: [
      "Para consultas sobre el uso de Pinwi, reportar incidencias o presentar una solicitud relacionada con estas condiciones, escribe a info@pinwi.cl. Incluye una descripción de lo ocurrido y, si corresponde, la referencia del lugar o de la reserva, evitando compartir información sensible innecesaria.",
      "Estas condiciones se interpretan conforme a la legislación de la República de Chile. Ninguna disposición implica una renuncia a los derechos irrenunciables reconocidos por la normativa de protección al consumidor o de datos personales, ni limita el acceso a las autoridades y tribunales competentes.",
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
      "El directorio de estudiantes está desactivado por defecto. Desde Editar perfil puedes elegir compartir nombre, foto, carrera, institución, materias y bio con otras cuentas activas de Pinwi, y retirar esa elección cuando quieras. Tu correo, teléfono y ubicación de perfil no forman parte de ese directorio. En conversaciones y reservas se mantiene el nombre y la foto necesarios para identificar a los participantes. Retirar la visibilidad no elimina mensajes o copias que otras personas hayan recibido antes.",
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
