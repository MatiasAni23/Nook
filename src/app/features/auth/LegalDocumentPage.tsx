import { Link } from "react-router";
import { BrandLogo } from "../../components/BrandLogo";
import { DocumentSection } from "./LegalDocumentsDialog";
import {
  LEGAL_PUBLICATION_NOTICE,
  LEGAL_REVIEW_DATE,
  LEGAL_SOURCE_URL,
  LEGAL_STATUS,
  LEGAL_VERSION,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
  type LegalDocument,
} from "./legalDocuments";

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  const isTerms = document === "terms";
  const sections = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS;

  return (
    <div className="h-dvh overflow-y-auto bg-[#F8FAFF] text-slate-700">
      <header className="border-b border-indigo-100 bg-white">
        <nav aria-label="Documentos legales" className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <Link to="/" aria-label="Pinwi, ir al inicio"><BrandLogo className="scale-90 origin-left" /></Link>
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-[#4F46E5]">
            <Link to="/terminos" aria-current={isTerms ? "page" : undefined} className="py-2 underline underline-offset-4">Términos</Link>
            <Link to="/privacidad" aria-current={!isTerms ? "page" : undefined} className="py-2 underline underline-offset-4">Privacidad</Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        <h1 className="text-3xl font-black text-[#1E1B4B]">{isTerms ? "Términos y condiciones de uso" : "Política de privacidad"}</h1>
        <p className="mt-3 text-sm text-slate-500">Versión {LEGAL_VERSION} · Revisado el {LEGAL_REVIEW_DATE}</p>
        <aside className="my-7 rounded-xl border border-indigo-100 bg-white p-5 text-sm leading-6">
          <strong className="block text-[#1E1B4B]">{LEGAL_STATUS}</strong>
          <p>{LEGAL_PUBLICATION_NOTICE}</p>
        </aside>
        <div className="space-y-6">{sections.map((section) => <DocumentSection key={section.title} section={section} headingLevel={2} />)}</div>
        <footer className="mt-8 border-t border-indigo-100 pt-5 text-sm">
          <a href={LEGAL_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-[#4F46E5] underline underline-offset-4">Consultar Ley N.º 21.719 en la Biblioteca del Congreso Nacional</a>
          <p className="mt-3"><Link to="/" className="text-[#4F46E5] underline underline-offset-4">Volver a Pinwi</Link></p>
        </footer>
      </main>
    </div>
  );
}
