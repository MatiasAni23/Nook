import { ArrowRight } from "lucide-react";

const mascot = new URL("../../../../assets/pinwi-guide-v1.png", import.meta.url).href;

/** A visual guide to discovery; the existing BrandLogo remains the brand mark. */
export function LandingGuide() {
  return (
    <aside className="landing-guide" aria-label="Un consejo de Pinwi">
      <div className="landing-guide-float">
        <div className="landing-guide-bubble">
          <svg className="landing-guide-tail" viewBox="0 0 80 32" aria-hidden="true"><path d="M0 1 Q32 11 78 1 Q42 30 0 31" /></svg>
          <p className="landing-guide-greeting">¡Hola! ¿Buscamos tu próximo lugar?</p>
          <p>Mira las fotos. Entra a tu cuenta para conocer cada espacio.</p>
          <a className="landing-inline-link" href="#como-funciona">Te cuento cómo<ArrowRight size={15} aria-hidden="true" /></a>
        </div>
        <div className="landing-guide-character" aria-hidden="true">
          <span className="landing-guide-halo" />
          <img src={mascot} alt="" width={1254} height={1254} loading="lazy" decoding="async" />
        </div>
      </div>
    </aside>
  );
}
