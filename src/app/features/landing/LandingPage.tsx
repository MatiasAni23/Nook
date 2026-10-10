import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowDown, ArrowRight, BookOpen, BriefcaseBusiness, Coffee, Facebook, Heart, Instagram, Linkedin, MapPin, MessageCircle, Music2, Users, X, Youtube } from "lucide-react";
import { BrandLogo } from "../../components/BrandLogo";
import { CachedImage } from "../../components/ui/cached-image";
import { getCachedSiteSettings, getSiteSettings, emptySiteSettings, socialChannels, subscribeSiteSettings } from "../../services/siteSettingsService";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getDemoSession } from "../../services/demoSessionService";
import { authLink, destinationAfterLogin } from "../auth/authNavigation";
import { getPlacePinAsset } from "../mapa/placePinAssets";
import { PublicMap } from "./PublicMap";
import "./landing.css";

const image = new URL("../../../../assets/imagen_descubrir.png", import.meta.url).href;
const purposeImage = new URL("../../../../assets/landing-study-space.jpg", import.meta.url).href;
const socialIcons = { instagram: Instagram, facebook: Facebook, linkedin: Linkedin, youtube: Youtube, tiktok: Music2, x: X };

export function LandingPage() {
  const scroll = useRef<HTMLDivElement>(null);
  const { currentUser } = useCurrentUser();
  const demo = !isSupabaseConfigured ? getDemoSession() : null;
  const role = currentUser?.role ?? demo?.role;
  const [settings, setSettings] = useState(() => getCachedSiteSettings() ?? emptySiteSettings());
  const [contactError, setContactError] = useState(false);

  useEffect(() => {
    let mounted = true;
    getSiteSettings().then(value => { if (mounted) { setSettings(value); setContactError(false); } }).catch(() => { if (mounted) setContactError(true); });
    const unsubscribe = subscribeSiteSettings(() => { const value = getCachedSiteSettings(); if (mounted && value) { setSettings(value); setContactError(false); } });
    return () => { mounted = false; unsubscribe(); };
  }, []);
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });

  return (
    <div className="landing-page" ref={scroll}>
      <a className="landing-skip" href="#landing-content">Ir al contenido</a>
      <header className="landing-header"><div className="landing-container landing-header-inner">
        <Link to="/" aria-label="Pinwi, inicio"><BrandLogo className="[&_img:first-child]:h-10 [&_img:last-child]:h-7" /></Link>
        <nav className="landing-header-links" aria-label="Acerca de Pinwi"><button type="button" onClick={() => jump("como-funciona")}>Cómo funciona</button><button type="button" onClick={() => jump("objetivo")}>Nuestro objetivo</button><button type="button" onClick={() => jump("mapa")}>Explorar mapa</button></nav>
        <div className="landing-account-links">{role ? <Link className="landing-button is-primary" to={destinationAfterLogin(role)}>Ir a la app<ArrowRight size={16} aria-hidden="true" /></Link> : <><Link className="landing-login" to="/iniciar-sesion">Iniciar sesión</Link><Link className="landing-button is-primary" to={authLink(undefined, true)}>Crear cuenta<ArrowRight size={16} aria-hidden="true" /></Link></>}</div>
      </div></header>

      <main id="landing-content" tabIndex={-1}>
        <section className="landing-container landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy"><p className="landing-eyebrow">UN ESPACIO PARA LO QUE VIENE</p><h1 id="landing-title">Encuentra tu lugar.<br /><span>Hazlo tuyo.</span></h1><p className="landing-hero-description">Para esa prueba, ese proyecto o ese día de trabajo. Descubre bibliotecas, cafés y espacios donde puedas concentrarte, cerca de donde estás.</p><div className="landing-hero-actions"><button type="button" className="landing-button is-primary" onClick={() => jump("mapa")}>Explorar el mapa<ArrowRight size={18} aria-hidden="true" /></button><Link className="landing-text-link" to={authLink(undefined, true)}>Unirme a Pinwi</Link></div><p className="landing-hero-note"><MapPin size={16} aria-hidden="true" />Empieza mirando el mapa, sin crear una cuenta.</p></div>
          <div className="landing-hero-visual"><CachedImage src={image} alt="Un café con espacios para sentarse y trabajar" className="landing-hero-photo" /><div className="landing-visual-caption"><span>Tu próxima pausa productiva</span><strong>Un lugar que vaya contigo.</strong></div><img className="landing-hero-pin" src={getPlacePinAsset("cafe")} alt="" aria-hidden="true" /></div>
        </section>

        <div className="landing-container landing-place-types" aria-label="Tipos de espacios"><span><BookOpen size={20} aria-hidden="true" />Bibliotecas</span><span><Coffee size={20} aria-hidden="true" />Cafés</span><span><BriefcaseBusiness size={20} aria-hidden="true" />Coworking</span><span><Users size={20} aria-hidden="true" />Salas y oficinas</span></div>

        <section id="mapa" className="landing-map-section" aria-labelledby="landing-map-heading"><div className="landing-container"><div className="landing-section-heading"><div><p className="landing-eyebrow">PRIMERO, EXPLORA</p><h2 id="landing-map-heading">La ciudad tiene un lugar para ti.</h2></div><p>Mueve el mapa y descubre los pines. Para conocer un espacio en detalle, entra a tu cuenta.</p></div><PublicMap /></div></section>

        <section id="como-funciona" className="landing-container landing-how" aria-labelledby="landing-how-heading"><div className="landing-section-heading"><div><p className="landing-eyebrow">DEL MAPA A TU PRÓXIMO PLAN</p><h2 id="landing-how-heading">Así de simple.</h2></div><p>Menos vueltas buscando. Más tiempo para lo que quieres hacer.</p></div><div className="landing-steps">{[
          { number: "01", title: "Encuentra un espacio", text: "Explora el mapa y ubica los lugares que te acomoden para estudiar o trabajar.", Icon: MapPin },
          { number: "02", title: "Conoce lo que ofrece", text: "Crea tu cuenta para revisar sus servicios, horarios e información antes de ir.", Icon: BookOpen },
          { number: "03", title: "Quédate con tus favoritos", text: "Guarda los lugares que te gustan y vuelve a encontrarlos cuando los necesites.", Icon: Heart },
        ].map(({ number, title, text, Icon }) => <article key={number}><div><span>{number}</span><Icon size={23} strokeWidth={1.5} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>

        <section id="objetivo" className="landing-purpose" aria-labelledby="landing-purpose-heading"><div className="landing-container landing-purpose-inner"><div className="landing-purpose-art"><CachedImage src={purposeImage} alt="Espacio de estudio ilustrativo con una mesa, libros y luz natural" loading="lazy" decoding="async" width={1448} height={1086} /></div><div><p className="landing-eyebrow">POR QUÉ EXISTE PINWI</p><h2 id="landing-purpose-heading">Un buen espacio<br />puede cambiar tu día.</h2><p>Queremos hacer más simple encontrar dónde estudiar y trabajar: reunir los lugares en un mapa, acercar su información y conectar a quienes comparten las mismas ganas de avanzar.</p><p>Pinwi está pensado para estudiantes y trabajadores. La comunidad aporta reportes sobre los espacios, y el directorio académico es una opción que cada persona decide activar.</p><Link className="landing-text-link" to={authLink(undefined, true)}>Encuentra tu espacio<ArrowRight size={17} aria-hidden="true" /></Link></div></div></section>

        <section className="landing-container landing-final"><div><p className="landing-eyebrow">TU PRÓXIMO ESPACIO TE ESPERA</p><h2>Explora hoy. Vuelve cuando quieras.</h2><p>Con una cuenta puedes ver las fichas, guardar lugares y acceder a la comunidad de Pinwi.</p></div><Link className="landing-button is-primary" to={role ? destinationAfterLogin(role) : authLink(undefined, true)}>{role ? "Ir a la app" : "Crear mi cuenta"}<ArrowRight size={18} aria-hidden="true" /></Link></section>
      </main>

      <footer className="landing-footer"><div className="landing-container"><div className="landing-footer-top"><div><BrandLogo className="[&_img:first-child]:h-10 [&_img:last-child]:h-7" /><p>Espacios de estudio y trabajo.<br />Un lugar para avanzar en lo tuyo.</p><button type="button" className="landing-back-top" onClick={() => scroll.current?.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}>Volver arriba<ArrowDown size={16} className="rotate-180" aria-hidden="true" /></button></div><div><h3>Conecta con Pinwi</h3>{contactError && <p className="landing-contact-error" role="status">No pudimos actualizar los enlaces de contacto. Intenta nuevamente más tarde.</p>}<div className="landing-socials">{socialChannels.map(({ key, label }) => { const Icon = socialIcons[key]; return settings.links[key] ? <a key={key} href={settings.links[key]} target="_blank" rel="noopener noreferrer"><Icon size={17} aria-hidden="true" />{label}<ArrowRight size={13} aria-hidden="true" /></a> : <span key={key} title="Próximamente"><Icon size={17} aria-hidden="true" />{label}<small>Pronto</small></span>; })}{settings.whatsapp ? <a href={"https://wa.me/" + settings.whatsapp.slice(1)} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} aria-hidden="true" />WhatsApp<ArrowRight size={13} aria-hidden="true" /></a> : <span><MessageCircle size={17} aria-hidden="true" />WhatsApp<small>Pronto</small></span>}</div></div></div><div className="landing-footer-bottom"><span>© {new Date().getFullYear()} Pinwi</span><nav aria-label="Información legal"><Link to="/terminos">Términos y condiciones</Link><Link to="/privacidad">Privacidad</Link></nav></div></div></footer>
    </div>
  );
}
