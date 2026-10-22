import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, BriefcaseBusiness, Coffee, Facebook, Heart, Instagram, Linkedin, MessageCircle, Music2, Search, Sparkles, Users, X, Youtube } from "lucide-react";
import { BrandLogo } from "../../components/BrandLogo";
import { getCachedSiteSettings, getSiteSettings, emptySiteSettings, socialChannels, subscribeSiteSettings } from "../../services/siteSettingsService";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getDemoSession } from "../../services/demoSessionService";
import type { PublicPlaceCard } from "../../services/publicPlaceCatalog";
import { authLink, destinationAfterLogin } from "../auth/authNavigation";
import { PublicPlaces } from "./PublicPlaces";
import "./landing.css";

const studyImage = new URL("../../../../assets/landing-study-space.jpg", import.meta.url).href;
const cafeImage = new URL("../../../../assets/imagen_descubrir.png", import.meta.url).href;
const socialIcons = { instagram: Instagram, facebook: Facebook, linkedin: Linkedin, youtube: Youtube, tiktok: Music2, x: X };

export function LandingPage({ initialPlaces }: { initialPlaces?: PublicPlaceCard[] }) {
  const scroll = useRef<HTMLDivElement>(null);
  const { currentUser } = useCurrentUser();
  const demo = !isSupabaseConfigured ? getDemoSession() : null;
  const role = currentUser?.role ?? demo?.role;
  const [settings, setSettings] = useState(() => getCachedSiteSettings() ?? emptySiteSettings());
  const [contactError, setContactError] = useState(false);
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
          <div className="landing-hero-copy"><p className="landing-eyebrow"><span className="landing-live-dot" />TU LUGAR. TUS IDEAS. TU RITMO.</p>
            <h1 id="landing-title">Encuentra tu espacio para <span>estudiar y trabajar.</span></h1>
            <p className="landing-hero-description">Hay ideas que necesitan un cambio de aire. Descubre bibliotecas, cafés y espacios de trabajo en Chile donde hacerlas realidad.</p>
            <div className="landing-hero-actions"><a className="landing-button is-primary" href="#espacios">Descubrir espacios<ArrowUpRight size={19} aria-hidden="true" /></a><Link className="landing-inline-link" to={accountLink}>{role ? "Volver a mi cuenta" : "Crear mi cuenta"}<ArrowRight size={17} aria-hidden="true" /></Link></div>
            <p className="landing-hero-note"><span className="landing-note-line" />Mira los lugares. Elige el que te inspire.</p>
          </div>
          <div className="landing-hero-visual">
            <div className="landing-hero-orbit" aria-hidden="true" /><Sparkles className="landing-hero-spark" size={46} strokeWidth={1.3} aria-hidden="true" />
            <div className="landing-hero-main-photo"><img src={studyImage} alt="Espacio de estudio ilustrativo con mesas y luz natural" width={1448} height={1086} decoding="async" /><div><span>DALE ESPACIO A LO QUE VIENE</span><strong>Un buen lugar.<br />Un nuevo comienzo.</strong></div></div>
            <div className="landing-hero-small-photo"><img src={cafeImage} alt="Ambiente ilustrativo de un café para estudiar o trabajar" width={1774} height={887} decoding="async" /><span><Coffee size={16} aria-hidden="true" />A tu ritmo.</span></div>
            <div className="landing-hero-sticker"><BookOpen size={22} strokeWidth={1.6} aria-hidden="true" /><span>Para tus ideas.<br /><strong>Para ti.</strong></span></div>
            <span className="landing-hero-side-note" aria-hidden="true">EL LUGAR IMPORTA.</span>
          </div>
        </section></div>

        <div className="landing-type-strip"><div className="landing-container landing-place-types"><p>Distintos espacios.<br /><strong>Las mismas ganas de avanzar.</strong></p><span><BookOpen size={21} aria-hidden="true" />Bibliotecas</span><span><Coffee size={21} aria-hidden="true" />Cafés</span><span><BriefcaseBusiness size={21} aria-hidden="true" />Coworking</span><span><Users size={21} aria-hidden="true" />Salas y oficinas</span></div></div>

        <PublicPlaces initialPlaces={initialPlaces} />

        <section id="como-funciona" className="landing-how" aria-labelledby="landing-how-heading"><div className="landing-container">
          <div className="landing-how-heading"><p className="landing-eyebrow">DE LA IDEA AL LUGAR</p><h2 id="landing-how-heading">Tu próximo espacio,<br /><span>sin tantas vueltas.</span></h2><p>Explora primero. Crea tu cuenta cuando encuentres un lugar que te guste.</p></div>
          <div className="landing-steps">{[
            { number: "01", title: "Déjate inspirar", text: "Explora los lugares y sus fotos. Busca por nombre si ya tienes uno en mente.", Icon: Search },
            { number: "02", title: "Conoce el lugar", text: "Inicia sesión o crea tu cuenta para consultar su dirección, horarios y servicios.", Icon: BookOpen },
            { number: "03", title: "Hazlo parte de tu día", text: "Guarda tus favoritos y vuelve a encontrarlos cuando necesites concentrarte.", Icon: Heart },
          ].map(({ number, title, text, Icon }) => <article key={number}><div className="landing-step-top"><span>{number}</span><Icon size={25} strokeWidth={1.5} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p></article>)}</div>
        </div></section>

        <section id="objetivo" className="landing-container landing-purpose" aria-labelledby="landing-purpose-heading">
          <div className="landing-purpose-heading"><p className="landing-eyebrow">HOLA, SOMOS PINWI</p><h2 id="landing-purpose-heading">Lo que haces importa.<br /><span>Dónde lo haces, también.</span></h2></div>
          <div className="landing-purpose-copy"><p>Una biblioteca para concentrarte. Un café para cambiar de aire. Una mesa para empezar ese proyecto que llevas tiempo pensando.</p><p>Pinwi nace para acercar esos espacios a estudiantes y trabajadores. Reunimos lugares para que encontrar dónde avanzar sea una parte más simple de tu día.</p><a className="landing-inline-link" href="#espacios">Encuentra ese lugar<ArrowUpRight size={18} aria-hidden="true" /></a></div>
        </section>

        <section className="landing-container landing-faq" aria-labelledby="landing-faq-heading"><div><p className="landing-eyebrow">POR SI TE LO PREGUNTABAS</p><h2 id="landing-faq-heading">Antes de empezar.</h2></div><div className="landing-faq-list">
          <details><summary>¿Necesito una cuenta para explorar?<span aria-hidden="true">+</span></summary><p>Puedes ver los nombres y las fotos principales de los lugares sin una cuenta. Para consultar su dirección, horarios, servicios y demás detalles, inicia sesión o crea tu cuenta.</p></details>
          <details><summary>¿Qué espacios puedo encontrar?<span aria-hidden="true">+</span></summary><p>Pinwi reúne bibliotecas, cafés, coworking, salas y oficinas para estudiar o trabajar. Los lugares disponibles aparecen en el catálogo de esta página.</p></details>
          <details><summary>¿Puedo guardar un lugar para después?<span aria-hidden="true">+</span></summary><p>Sí. Con tu cuenta puedes guardar lugares en favoritos y volver a consultarlos desde la aplicación.</p></details>
        </div></section>

        <div className="landing-container"><section className="landing-final" aria-labelledby="landing-final-heading"><div><p className="landing-eyebrow">DALE UN LUGAR A TUS IDEAS</p><h2 id="landing-final-heading">Tu próxima gran idea<br />merece un buen espacio.</h2><p>Encuentra el tuyo. Nosotros te ayudamos a descubrirlo.</p><Link className="landing-button" to={accountLink}>{role ? "Ir a la app" : "Crear mi cuenta"}<ArrowUpRight size={19} aria-hidden="true" /></Link></div><div className="landing-final-art" aria-hidden="true"><Sparkles size={110} strokeWidth={.8} /><span>Nos vemos<br /><em>en Pinwi.</em></span></div></section></div>
      </main>

      <footer className="landing-footer"><div className="landing-container"><div className="landing-footer-top"><div><BrandLogo className="[&_img:first-child]:h-10 [&_img:last-child]:h-7" /><p>Un espacio para avanzar en lo tuyo.</p></div><nav aria-label="Explora Pinwi"><a href="#espacios">Descubrir espacios</a><a href="#como-funciona">Cómo funciona</a><a href="#objetivo">Somos Pinwi</a></nav><div className="landing-footer-contact"><span>Hablemos.</span><a href="mailto:info@pinwi.cl">info@pinwi.cl<ArrowUpRight size={16} aria-hidden="true" /></a>{contactError && <p role="status">No pudimos actualizar las redes. Intenta más tarde.</p>}<div className="landing-socials">{socialChannels.map(({ key, label }) => { const Icon = socialIcons[key]; return settings.links[key] ? <a key={key} href={settings.links[key]} target="_blank" rel="noopener noreferrer" aria-label={label}><Icon size={18} aria-hidden="true" /></a> : null; })}{settings.whatsapp && <a href={"https://wa.me/" + settings.whatsapp.slice(1)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle size={18} aria-hidden="true" /></a>}</div></div></div><div className="landing-footer-bottom"><span>© {new Date().getFullYear()} Pinwi. Hecho para encontrar tu lugar.</span><nav aria-label="Información legal"><Link to="/terminos">Términos y condiciones</Link><Link to="/privacidad">Privacidad</Link></nav><button type="button" onClick={() => scroll.current?.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}>Volver arriba<ArrowDown size={14} className="rotate-180" aria-hidden="true" /></button></div></div></footer>
    </div>
  );
}
