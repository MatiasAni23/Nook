import { FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

export type LegalDocument = "terms" | "privacy";

interface LegalSection {
  title: string;
  paragraphs: string[];
}

const TERMS_SECTIONS: LegalSection[] = [
  {
    title: "1. Alcance y aceptación",
    paragraphs: [
      "Estos Términos regulan el uso de Nook, una plataforma para descubrir, guardar, recomendar y, cuando corresponda, reservar espacios para estudiar, trabajar o reunirse.",
      "Al crear una cuenta, navegar en la plataforma o utilizar sus funciones, aceptas este documento y sus futuras actualizaciones. Este texto es una versión de trabajo y debe ser revisado antes de su publicación definitiva.",
    ],
  },
  {
    title: "2. Cuenta y seguridad",
    paragraphs: [
      "Debes entregar información exacta, mantenerla actualizada y proteger tus credenciales. No compartas tu contraseña ni permitas que otra persona utilice tu cuenta.",
      "Puedes solicitar la recuperación de acceso mediante el correo asociado a tu cuenta. Nook podrá suspender cuentas ante señales de uso indebido, fraude, suplantación o riesgos para la seguridad de la comunidad.",
    ],
  },
  {
    title: "3. Uso de la plataforma",
    paragraphs: [
      "Nook permite consultar información de lugares, interactuar con otros usuarios y administrar reservas o espacios según el tipo de perfil. La disponibilidad, precios, horarios, condiciones de ingreso y servicios de cada lugar pueden cambiar.",
      "Te comprometes a utilizar la plataforma de manera respetuosa, lícita y coherente con su propósito. Está prohibido publicar información falsa, vulnerar derechos de terceros, interferir con el servicio o intentar acceder a datos ajenos.",
    ],
  },
  {
    title: "4. Reservas y lugares",
    paragraphs: [
      "Las reservas, solicitudes y confirmaciones están sujetas a las condiciones informadas por cada lugar. Cuando exista un delegado o administrador del espacio, será responsable de mantener actualizada la información operacional que publique.",
      "Nook actúa como plataforma tecnológica y no garantiza que un espacio mantenga su disponibilidad fuera de la información registrada. Las políticas de pago, cancelación, acceso y reembolso deberán definirse expresamente antes de habilitar funciones de cobro.",
    ],
  },
  {
    title: "5. Contenido y comunidad",
    paragraphs: [
      "Conservas la responsabilidad por el contenido que compartas, como reseñas, fotos, descripciones o mensajes. Al publicarlo, autorizas a Nook a mostrarlo dentro de la plataforma para operar y mejorar el servicio.",
      "No se permite contenido ofensivo, discriminatorio, engañoso, ilícito o que infrinja derechos de autor, privacidad u otros derechos de terceros. Nook podrá moderar o retirar contenido que incumpla estas reglas.",
    ],
  },
  {
    title: "6. Disponibilidad y cambios",
    paragraphs: [
      "Trabajamos para mantener Nook disponible y actualizado, pero pueden existir pausas por mantenimiento, fallas técnicas, cambios de proveedores o causas fuera de nuestro control.",
      "Podemos modificar funciones, requisitos o estos Términos. Si el cambio es relevante, procuraremos comunicarlo por los canales disponibles antes de que entre en vigencia.",
    ],
  },
  {
    title: "7. Contacto y vigencia",
    paragraphs: [
      "Para consultas sobre estos Términos, se habilitará un canal de contacto oficial antes del lanzamiento público. La versión publicada en la plataforma indicará su fecha de vigencia y el responsable legal correspondiente.",
    ],
  },
];

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: "1. Propósito de esta política",
    paragraphs: [
      "Esta Política explica qué datos puede tratar Nook, para qué se utilizan y qué opciones tienes sobre ellos. Es un borrador base que deberá completarse con la identificación del responsable, los proveedores y los canales de contacto antes de su publicación definitiva.",
    ],
  },
  {
    title: "2. Datos que podemos tratar",
    paragraphs: [
      "Según cómo uses Nook, podemos tratar datos de cuenta como nombre, correo electrónico, teléfono, rol y foto de perfil; datos de uso como lugares guardados, reservas, reseñas e interacciones; y datos técnicos básicos necesarios para la seguridad y funcionamiento del servicio.",
      "La ubicación solo debe utilizarse cuando actives una función que la requiera. No solicitamos información sensible salvo que una función futura lo informe de forma expresa y cuente con una base válida para ello.",
    ],
  },
  {
    title: "3. Finalidades del tratamiento",
    paragraphs: [
      "Usamos los datos para crear y proteger cuentas, mostrar lugares relevantes, gestionar reservas, facilitar la comunicación necesaria entre usuarios y espacios, responder solicitudes y mejorar la experiencia.",
      "También podemos usar información agregada o disociada para métricas, rendimiento y planificación del servicio, procurando que no identifique directamente a una persona.",
    ],
  },
  {
    title: "4. Compartición de información",
    paragraphs: [
      "Solo compartimos los datos necesarios con proveedores que permiten operar la plataforma, como infraestructura, autenticación, almacenamiento o mensajería, bajo obligaciones de seguridad y confidencialidad.",
      "Cuando solicites una reserva, el lugar o su delegado podrá recibir los datos indispensables para gestionar esa solicitud. No vendemos datos personales ni los compartimos para fines publicitarios ajenos a Nook sin una base adecuada y comunicación previa.",
    ],
  },
  {
    title: "5. Conservación y seguridad",
    paragraphs: [
      "Conservamos los datos mientras sean necesarios para prestar el servicio, atender obligaciones legales, resolver controversias o proteger la seguridad de Nook. Luego se eliminan o anonimizan conforme a criterios que deberán definirse en la versión final.",
      "Aplicamos medidas técnicas y organizativas razonables, incluyendo controles de acceso y reglas de seguridad a nivel de base de datos. Ningún sistema es infalible, por lo que también te pedimos proteger tus credenciales y avisarnos ante actividad sospechosa.",
    ],
  },
  {
    title: "6. Tus derechos",
    paragraphs: [
      "Podrás solicitar información sobre tus datos, pedir su corrección, actualización, eliminación o bloqueo cuando corresponda, y retirar consentimientos opcionales. El alcance y los plazos de respuesta se ajustarán a la normativa aplicable.",
      "Antes del lanzamiento público se incorporará el canal oficial para ejercer estos derechos y la identificación del responsable de datos. La normativa chilena reconoce derechos de las personas sobre el tratamiento de sus datos personales.",
    ],
  },
  {
    title: "7. Cookies y tecnologías similares",
    paragraphs: [
      "Nook puede utilizar almacenamiento local, cookies o tecnologías equivalentes para mantener la sesión, recordar preferencias, prevenir abuso y medir el rendimiento. Las herramientas analíticas o publicitarias adicionales deberán detallarse aquí antes de activarse.",
    ],
  },
  {
    title: "8. Cambios y contacto",
    paragraphs: [
      "Actualizaremos esta política cuando cambien nuestras prácticas o las obligaciones aplicables. La fecha de vigencia y el correo de privacidad se completarán antes de publicar la versión definitiva.",
    ],
  },
];

function DocumentSection({ section }: { section: LegalSection }) {
  return (
    <section className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
      <h3 className="text-sm font-black text-[#1E1B4B]">{section.title}</h3>
      <div className="mt-2.5 space-y-2.5 text-sm leading-6 text-slate-600">
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

export function LegalDocumentsDialog({
  document,
  onDocumentChange,
}: {
  document: LegalDocument | null;
  onDocumentChange: (document: LegalDocument | null) => void;
}) {
  const activeDocument = document ?? "terms";
  const isTerms = activeDocument === "terms";
  const sections = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS;
  const Icon = isTerms ? FileText : LockKeyhole;

  return (
    <Dialog open={document !== null} onOpenChange={(open) => !open && onDocumentChange(null)}>
      <DialogContent className="flex h-[min(46rem,calc(100vh-2rem))] max-h-[calc(100vh-2rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl border-[#E0E7FF] bg-white p-0 shadow-[0_24px_70px_rgba(30,27,75,0.28)] sm:max-w-4xl">
        <DialogHeader className="border-b border-[#E0E7FF] px-6 py-5 pr-14 text-left">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <Icon className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-[#1E1B4B]">
                {isTerms ? "Términos de uso" : "Política de privacidad"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs font-medium text-slate-400">
                Borrador editable antes de la publicación definitiva
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 md:grid-cols-[11.5rem_minmax(0,1fr)]">
          <nav className="flex border-b border-[#E0E7FF] bg-[#F8FAFF] p-3 md:flex-col md:border-b-0 md:border-r">
            <button
              type="button"
              onClick={() => onDocumentChange("terms")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition md:flex-none md:justify-start ${isTerms ? "bg-white text-[#4F46E5] shadow-[0_6px_16px_rgba(79,70,229,0.08)]" : "text-slate-400 hover:text-[#4F46E5]"}`}
            >
              <FileText className="size-4" />
              Términos
            </button>
            <button
              type="button"
              onClick={() => onDocumentChange("privacy")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition md:mt-1 md:flex-none md:justify-start ${!isTerms ? "bg-white text-[#4F46E5] shadow-[0_6px_16px_rgba(79,70,229,0.08)]" : "text-slate-400 hover:text-[#4F46E5]"}`}
            >
              <LockKeyhole className="size-4" />
              Privacidad
            </button>
          </nav>

          <div className="min-h-0 overflow-y-auto px-6 py-6">
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#E0E7FF] bg-[#F8FAFF] px-4 py-3 text-xs leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#4F46E5]" />
              <p>
                Este contenido es una base operativa para Nook y requiere revisión jurídica antes de declarar su vigencia.
              </p>
            </div>
            <div className="space-y-5">{sections.map((section) => <DocumentSection key={section.title} section={section} />)}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
