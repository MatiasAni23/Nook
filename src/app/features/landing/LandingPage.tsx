import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, BriefcaseBusiness, Coffee, Facebook, Instagram, Linkedin, MessageCircle, Music2, Users, X, Youtube } from "lucide-react";
import { BrandLogo } from "../../components/BrandLogo";
import { getCachedSiteSettings, getSiteSettings, emptySiteSettings, socialChannels, subscribeSiteSettings } from "../../services/siteSettingsService";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getDemoSession } from "../../services/demoSessionService";
import type { PublicPlaceCard } from "../../services/publicPlaceCatalog";
import { authLink, destinationAfterLogin } from "../auth/authNavigation";
import { PublicPlaces } from "./PublicPlaces";
import { LandingJourney } from "./LandingJourney";
import { LandingAccessDialog } from "./LandingAccessDialog";
import { useLandingMotion } from "./useLandingMotion";
import "./landing.css";
import "./landing-motion.css";

const studyImage = new URL("../../../../assets/landing-study-space.jpg", import.meta.url).href;
const cafeImage = new URL("../../../../assets/imagen_descubrir.png", import.meta.url).href;
const workingMascot = new URL("../../../../assets/pinwi-working-v1.png", import.meta.url).href;
const socialIcons = { instagram: Instagram, facebook: Facebook, linkedin: Linkedin, youtube: Youtube, tiktok: Music2, x: X };

export function LandingPage({ initialPlaces }: { initialPlaces?: PublicPlaceCard[] }) {
  const scroll = useRef<HTMLDivElement>(null);
  useLandingMotion(scroll);
  const { currentUser } = useCurrentUser();
  const demo = !isSupabaseConfigured ? getDemoSession() : null;
  const role = currentUser?.role ?? demo?.role;
  const [settings, setSettings] = useState(() => getCachedSiteSettings() ?? emptySiteSettings());
  const [contactError, setContactError] = useState(false);
  const [access, setAccess] = useState<{ open: boolean; place: PublicPlaceCard | null }>({ open: false, place: null });
  const accessOpener = useRef<HTMLElement | null>(null);
  const accountLink = role ? destinationAfterLogin(role) : authLink(undefined, true);

  useEffect(() => {
    let mounted = true;
    getSiteSettings().then(value => { if (mounted) { setSettings(value); setContactError(false); } }).catch(() => { if (mounted) setContactError(true); });
    const unsubscribe = subscribeSiteSettings(() => { const value = getCachedSiteSettings(); if (mounted && value) { setSettings(value); setContactError(false); } });
    return () => { mounted = false; unsubscribe(); };
  }, []);

  return (
    <div className="landing-page" ref={scroll}>
      <a className="landing-skip" href="#landing-content">Ir al contenido</a>
      <header className="landing-header"><div className="landing-container landing-header-inner">
        <Link className="landing-brand" to="/" aria-label="Pinwi, inicio"><BrandLogo className="[&_img:first-child]:h-10 [&_img:last-child]:h-7" /></Link>
        <nav className="landing-header-links" aria-label="Acerca de Pinwi"><a href="#espacios">Descubrir espacios</a><a href="#como-funciona">Cómo funciona</a><a href="#objetivo">Somos Pinwi</a></nav>
        <div className="landing-account-links">{role ? <Link className="landing-button is-primary" to={accountLink}>Ir a la app<ArrowUpRight size={16} aria-hidden="true" /></Link> : <><Link className="landing-login" to="/iniciar-sesion">Iniciar sesión</Link><Link className="landing-button is-primary" to={accountLink}>Crear cuenta<ArrowUpRight size={16} aria-hidden="true" /></Link></>}</div>
      </div></header>

      <main id="landing-content" tabIndex={-1}>
        <div className="landing-hero-wrap"><section className="landing-container landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <h1 id="landing-title">Encuentra tu espacio para <span>estudiar y trabajar.</span></h1>
            <p className="landing-hero-description"><strong>Conoce lugares cerca de ti.</strong> Descubre bibliotecas, cafés y espacios de trabajo en Chile para concentrarte, cambiar de aire y avanzar en lo tuyo.</p>
            <div className="landing-hero-actions">{role ? <Link className="landing-button is-primary" to={accountLink}>Conocer lugares<ArrowUpRight size={19} aria-hidden="true" /></Link> : <button className="landing-button is-primary" type="button" onClick={event => { accessOpener.current = event.currentTarget; setAccess({ open: true, place: null }); }}>Conocer lugares<ArrowUpRight size={19} aria-hidden="true" /></button>}<a className="landing-inline-link" href="#espacios">Ver los espacios<ArrowRight size={17} aria-hidden="true" /></a></div>
            <p className="landing-hero-note"><span className="landing-note-line" />Explora las fotos. Encuentra tu próximo lugar.</p>
          </div>
          <figure className="landing-hero-visual">
            <div className="landing-hero-main-photo"><img src={studyImage} alt="Espacio de estudio ilustrativo con mesas y luz natural" width={1448} height={1086} decoding="async" /></div>
            <div className="landing-hero-small-photo"><img src={cafeImage} alt="Ambiente ilustrativo de un café para estudiar o trabajar" width={1774} height={887} decoding="async" /></div>
            <figcaption className="landing-hero-caption">Un buen lugar. Un nuevo comienzo.</figcaption>
          </figure>
        </section></div>

        <div className="landing-type-strip"><div className="landing-container landing-place-types"><p>Distintos espacios.<br /><strong>Las mismas ganas de avanzar.</strong></p><span><BookOpen size={21} aria-hidden="true" />Bibliotecas</span><span><Coffee size={21} aria-hidden="true" />Cafés</span><span><BriefcaseBusiness size={21} aria-hidden="true" />Coworking</span><span><Users size={21} aria-hidden="true" />Salas y oficinas</span></div></div>

        <PublicPlaces initialPlaces={initialPlaces} accessOpen={access.open} onPreview={(place, opener) => { accessOpener.current = opener; setAccess({ open: true, place }); }} />

        <LandingJourney />

        <section className="landing-container landing-faq" aria-labelledby="landing-faq-heading"><div data-landing-from="left"><p className="landing-eyebrow">POR SI TE LO PREGUNTABAS</p><h2 id="landing-faq-heading">Antes de empezar.</h2><p className="landing-faq-intro">Para que tu única duda sea<br />qué lugar probar primero.</p></div><div className="landing-faq-list" data-landing-from="right">
          <details><summary>¿Necesito una cuenta para explorar?<span aria-hidden="true">+</span></summary><p>Puedes explorar las fotos y los nombres sin una cuenta. Al abrir un lugar también puedes ver su dirección. Para consultar horarios, servicios y los demás detalles, inicia sesión o crea tu cuenta.</p></details>
          <details><summary>¿Qué espacios puedo encontrar?<span aria-hidden="true">+</span></summary><p>Pinwi reúne bibliotecas, cafés, coworking, salas y oficinas para estudiar o trabajar. Los lugares disponibles aparecen en el catálogo de esta página.</p></details>
          <details><summary>¿Puedo guardar un lugar para después?<span aria-hidden="true">+</span></summary><p>Sí. Con tu cuenta puedes guardar lugares en favoritos y volver a consultarlos desde la aplicación.</p></details>
        </div></section>

        <div className="landing-container"><section className="landing-final" aria-labelledby="landing-final-heading"><div data-landing-from="left"><p className="landing-eyebrow">DALE UN LUGAR A TUS IDEAS</p><h2 id="landing-final-heading">Tu próxima gran idea<br />merece un buen espacio.</h2><p>Encuentra el tuyo. Nosotros te ayudamos a descubrirlo.</p><Link className="landing-button" to={accountLink}>{role ? "Ir a la app" : "Crear mi cuenta"}<ArrowUpRight size={19} aria-hidden="true" /></Link></div><div className="landing-final-art" data-landing-from="bottom" aria-hidden="true"><div className="landing-mascot-scene"><img src={workingMascot} alt="" width={1254} height={1254} loading="lazy" decoding="async" /></div></div></section></div>
      </main>

      <LandingAccessDialog open={access.open} place={access.place} returnFocusTo={accessOpener.current} onOpenChange={open => setAccess(current => ({ ...current, open }))} />

      <footer className="landing-footer"><div className="landing-container"><div className="landing-footer-top"><div><BrandLogo className="[&_img:first-child]:h-10 [&_img:last-child]:h-7" /><p>Un espacio para avanzar en lo tuyo.</p></div><nav aria-label="Explora Pinwi"><a href="#espacios">Descubrir espacios</a><a href="#como-funciona">Cómo funciona</a><a href="#objetivo">Somos Pinwi</a></nav><div className="landing-footer-contact"><span>Hablemos.</span><a href="mailto:info@pinwi.cl">info@pinwi.cl<ArrowUpRight size={16} aria-hidden="true" /></a>{contactError && <p role="status">No pudimos actualizar las redes. Intenta más tarde.</p>}<div className="landing-socials">{socialChannels.map(({ key, label }) => { const Icon = socialIcons[key]; return settings.links[key] ? <a key={key} href={settings.links[key]} target="_blank" rel="noopener noreferrer" aria-label={label}><Icon size={18} aria-hidden="true" /></a> : null; })}{settings.whatsapp && <a href={"https://wa.me/" + settings.whatsapp.slice(1)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle size={18} aria-hidden="true" /></a>}</div></div></div><div className="landing-footer-bottom"><span>© {new Date().getFullYear()} Pinwi. Hecho para encontrar tu lugar.</span><nav aria-label="Información legal"><Link to="/terminos">Términos y condiciones</Link><Link to="/privacidad">Privacidad</Link></nav><button type="button" onClick={() => scroll.current?.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}>Volver arriba<ArrowDown size={14} className="rotate-180" aria-hidden="true" /></button></div></div></footer>
    </div>
  );
}
