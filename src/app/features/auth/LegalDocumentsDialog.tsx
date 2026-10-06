import { FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

import {
  LEGAL_PUBLICATION_NOTICE,
  LEGAL_REVIEW_DATE,
  LEGAL_SOURCE_URL,
  LEGAL_STATUS,
  LEGAL_VERSION,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
  type LegalDocument,
  type LegalSection,
} from "./legalDocuments";

export type { LegalDocument } from "./legalDocuments";

export function DocumentSection({ section, headingLevel = 3 }: { section: LegalSection; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
      <Heading className="text-sm font-black text-[#1E1B4B]">{section.title}</Heading>
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
                Versión {LEGAL_VERSION} · Revisado el {LEGAL_REVIEW_DATE}
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
                <strong className="block font-semibold text-slate-700">{LEGAL_STATUS}</strong>
                {LEGAL_PUBLICATION_NOTICE}
              </p>
            </div>
            <div className="space-y-5">{sections.map((section) => <DocumentSection key={section.title} section={section} />)}</div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-sm text-[#4F46E5]">
              <a href={isTerms ? "/terminos" : "/privacidad"} className="underline underline-offset-4">Abrir documento completo</a>
              <a href={LEGAL_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Consultar Ley N.º 21.719 (BCN)</a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
