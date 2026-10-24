import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronRight, Copy, LockKeyhole, MapPin } from "lucide-react";
import { BrandLogo } from "../../components/BrandLogo";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../components/ui/dialog";
import { getPublicPlacePath, SITE_ORIGIN } from "../../seo/siteSeo";
import { getPlaceKind, getPlaceLocality, getPublicCollections, getPublicPlaceDescription, getRelatedPublicPlaces, type PublicCollection } from "../../seo/publicPlaceDiscovery";
import { PUBLIC_PLACE_SOURCES } from "../../seo/publicPlaceSources";
import type { PublicPlaceCard } from "../../services/publicPlaceCatalog";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { authLink, destinationAfterLogin } from "../auth/authNavigation";
import { PlacePhoto } from "../landing/PlacePhoto";
import { usePublicCatalog } from "../landing/PublicCatalogContext";
import type { PublicRouteContext } from "./PublicSiteLayout";
import "../landing/landing.css";
import "./public-places.css";

export function PublicPageFrame({ children }: { children: ReactNode }) {
  const scroll = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const { currentUser } = useCurrentUser();
  useEffect(() => { scroll.current?.scrollTo({ top: 0 }); }, [pathname]);
  return <div className="public-site" ref={scroll}>
    <a className="landing-skip" href="#public-content">Ir al contenido</a>
    <header className="public-header public-container">
      <Link to="/" aria-label="Pinwi, inicio"><BrandLogo className="[&_img:first-child]:h-10 [&_img:last-child]:h-7" /></Link>
      <nav aria-label="Navegación principal"><Link className="public-directory-link" to="/lugares">Explorar lugares</Link><Link className="landing-button is-primary" to={currentUser ? destinationAfterLogin(currentUser.role) : authLink()}>{currentUser ? "Ir a la app" : "Iniciar sesión"}<ArrowUpRight size={16} aria-hidden="true" /></Link></nav>
    </header>
    <main className="public-container" id="public-content" tabIndex={-1}>{children}</main>
    <footer className="public-footer public-container"><Link to="/">Pinwi · Un espacio para tus ideas.</Link><nav aria-label="Información legal"><Link to="/terminos">Términos</Link><Link to="/privacidad">Privacidad</Link></nav></footer>
  </div>;
}

export function PublicPlaceGrid({ places, modal = false }: { places: PublicPlaceCard[]; modal?: boolean }) {
  return <div className="public-place-grid">{places.map(place => <article className="public-place-card" key={place.id}>
    <Link to={getPublicPlacePath(place)} state={modal ? { publicPlaceModal: true } : undefined} replace={modal}>
      <div className="public-card-photo"><PlacePhoto place={place} /><span aria-hidden="true"><ArrowUpRight size={20} /></span></div>
      <h3>{place.name}</h3>
      {(place.type || place.zone) && <p className="public-card-meta">{[getPlaceKind(place)?.label, getPlaceLocality(place)?.name ?? place.zone].filter(Boolean).join(" · ")}</p>}
    </Link>
  </article>)}</div>;
}

export function PublicPlaceContent({ place, places, modal = false }: { place: PublicPlaceCard; places: PublicPlaceCard[]; modal?: boolean }) {
  const { currentUser } = useCurrentUser();
  const [copyStatus, setCopyStatus] = useState("");
  const related = getRelatedPublicPlaces(place, places);
  const kind = getPlaceKind(place), locality = getPlaceLocality(place);
  const descriptionText = getPublicPlaceDescription(place);
  const source = PUBLIC_PLACE_SOURCES[place.id];
  const collections = getPublicCollections(places).filter(collection =>
    (collection.kind === place.type && (!collection.locality || collection.locality.slug === locality?.slug)) ||
    (!collection.kind && locality && collection.locality?.slug === locality.slug));
  const destination = "/app/place/" + place.id;
  const accountDestination = currentUser ? destinationAfterLogin(currentUser.role, destination) : authLink(destination);
  useEffect(() => { setCopyStatus(""); }, [place.id]);
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(SITE_ORIGIN + getPublicPlacePath(place)); setCopyStatus("Enlace copiado"); }
    catch { setCopyStatus("No pudimos copiar el enlace. Puedes copiar la dirección de esta página."); }
  };
  const title = <h1>{place.name}</h1>;
  const description = <p className="public-place-intro">{descriptionText || "Explora la ubicación y la foto principal de este espacio para preparar tu próxima jornada de estudio o trabajo."}</p>;
  return <article className="public-place-content">
    <nav className="public-breadcrumbs" aria-label="Ruta de navegación"><Link to="/">Inicio</Link><ChevronRight size={13} aria-hidden="true" /><Link to="/lugares">Lugares</Link><ChevronRight size={13} aria-hidden="true" /><span aria-current="page">{place.name}</span></nav>
    <div className="public-place-hero">
      <div className="public-place-photo"><PlacePhoto place={place} eager /></div>
      <div className="public-place-info">
        <p className="public-eyebrow">UN LUGAR. NUEVAS IDEAS.</p>
        {(kind || place.zone) && <p className="public-place-tags">{kind && <span>{kind.label}</span>}{place.zone && <span>{locality?.name ?? place.zone}</span>}</p>}
        {modal ? <DialogTitle asChild>{title}</DialogTitle> : title}
        <div className="public-place-address"><MapPin size={23} aria-hidden="true" /><div><h2>Dirección</h2><p>{place.address || "Este lugar todavía no tiene una dirección publicada."}</p></div></div>
        {modal ? <DialogDescription asChild>{description}</DialogDescription> : description}
        {source && <p className="public-place-source">Referencia: <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}<ArrowUpRight size={12} aria-hidden="true" /></a></p>}
        <p className="public-place-private-note">Horarios, servicios y los demás detalles están disponibles con tu cuenta.</p>
        <div className="public-place-actions"><Link className="landing-button is-primary" to={accountDestination}>Ver más detalles<ArrowRight size={18} aria-hidden="true" /></Link><button className="public-copy" type="button" onClick={() => void copyLink()}>{copyStatus === "Enlace copiado" ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}Copiar enlace</button></div>
        <p className="public-copy-status" role="status">{copyStatus}</p>
        {modal && <Link className="public-open-page" to={getPublicPlacePath(place)} state={null} replace>Abrir ficha completa en esta pestaña<ArrowUpRight size={14} aria-hidden="true" /></Link>}
      </div>
    </div>
    {collections.length > 0 && <nav className="public-collection-links" aria-label="Explorar por tipo y comuna">{collections.map(collection => <Link key={collection.path} to={collection.path}>{collection.title}<ArrowUpRight size={14} aria-hidden="true" /></Link>)}</nav>}
    <aside className="public-place-invite" aria-label="Conoce más con tu cuenta"><div><span><LockKeyhole size={15} aria-hidden="true" />TU PRÓXIMO PASO</span><h2>La foto es sólo el comienzo.</h2><p>Consulta horarios y servicios, guarda tus favoritos y encuentra tu próximo lugar para estudiar o trabajar.</p><Link to={currentUser ? accountDestination : authLink(destination, true)}>{currentUser ? "Continuar en Pinwi" : "Crear mi cuenta"}<ArrowRight size={17} aria-hidden="true" /></Link></div><img src="/brand/splash-mascot.png" alt="Pinwino, el pingüino de Pinwi" width={160} height={160} loading="lazy" decoding="async" /></aside>
    {related.length > 0 && <section className="public-related" aria-labelledby="public-related-heading"><div className="public-section-heading"><div><p className="public-eyebrow">COINCIDEN EN TIPO O ZONA</p><h2 id="public-related-heading">Lugares relacionados.</h2></div><Link to="/lugares">Ver el directorio<ArrowRight size={16} aria-hidden="true" /></Link></div><PublicPlaceGrid places={related} modal={modal} /></section>}
  </article>;
}

export function PublicPlaceRoute() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { modal, opener } = useOutletContext<PublicRouteContext>();
  const { places, loading, error, retry } = usePublicCatalog();
  const place = places?.find(place => getPublicPlacePath(place) === pathname);
  const statusTitle = <h1>{loading ? "Cargando lugar…" : error ? "No pudimos cargar este lugar" : "Este lugar no está disponible"}</h1>;
  const statusDescription = <p>{error || (!loading ? "Puede que el enlace haya cambiado o que el lugar ya no esté publicado." : "Estamos consultando el catálogo público.")}</p>;
  const content = place ? <PublicPlaceContent place={place} places={places ?? []} modal={modal} /> : <div className="public-state" aria-live="polite" aria-busy={loading}>
    {modal ? <DialogTitle asChild>{statusTitle}</DialogTitle> : statusTitle}
    {modal ? <DialogDescription asChild>{statusDescription}</DialogDescription> : statusDescription}
    {error && <button className="landing-button is-primary" type="button" onClick={retry}>Reintentar</button>}<Link to="/lugares"><ArrowLeft size={17} aria-hidden="true" />Explorar otros lugares</Link>
  </div>;
  if (modal) return <Dialog open onOpenChange={open => { if (!open) void navigate(-1); }}><DialogContent className="public-place-modal" onCloseAutoFocus={event => { if (opener.current?.isConnected) { event.preventDefault(); opener.current.focus(); } }}>{content}</DialogContent></Dialog>;
  return <PublicPageFrame>{content}</PublicPageFrame>;
}

export function PublicDirectory() {
  const { places, loading, error, retry } = usePublicCatalog();
  const collections = getPublicCollections(places ?? []);
  return <PublicPageFrame>
    <nav className="public-breadcrumbs" aria-label="Ruta de navegación"><Link to="/">Inicio</Link><ChevronRight size={13} aria-hidden="true" /><span aria-current="page">Lugares</span></nav>
    <section className="public-directory-intro"><p className="public-eyebrow">DALE UN LUGAR A TUS IDEAS</p><h1>Lugares para estudiar<br />y trabajar en Chile.</h1><p>Bibliotecas, cafés para estudiar y espacios de coworking: conoce su tipo, ubicación y descripción para encontrar un entorno que vaya contigo. Explora por zona o por el espacio que necesitas para tu próxima jornada.</p><a href="#public-directory-grid">Encuentra tu próximo lugar<ArrowRight size={18} aria-hidden="true" /></a></section>
    <CollectionNavigation collections={collections.filter(collection => !collection.locality)} label="Explora por tipo de lugar" />
    <CollectionNavigation collections={collections.filter(collection => !collection.kind)} label="Encuentra lugares en tu zona" />
    {error && <div className="public-state" role="alert"><p>{error}</p><button type="button" className="landing-button is-secondary" onClick={retry}>Reintentar</button></div>}
    <section className="public-directory-list" id="public-directory-grid" aria-labelledby="public-directory-heading"><h2 id="public-directory-heading">Explora los espacios</h2>{loading && !places ? <p role="status">Cargando lugares…</p> : places?.length ? <PublicPlaceGrid places={places} /> : !error && <p>Pronto encontrarás nuevos espacios aquí.</p>}</section>
  </PublicPageFrame>;
}

function CollectionNavigation({ collections, label }: { collections: PublicCollection[]; label: string }) {
  if (!collections.length) return null;
  return <nav className="public-collection-nav" aria-label={label}><h2>{label}</h2><div>{collections.map(collection => <Link key={collection.path} to={collection.path}>{collection.kind && collection.locality ? collection.title : collection.locality?.name ?? collection.title.replace(/ en Chile$/, "")}<ArrowUpRight size={15} aria-hidden="true" /></Link>)}</div></nav>;
}

export function PublicCollectionContent({ collection, places }: { collection: PublicCollection; places: PublicPlaceCard[] }) {
  const otherCollections = getPublicCollections(places).filter(other => other.path !== collection.path &&
    (collection.kind ? other.kind === collection.kind : other.locality?.slug === collection.locality?.slug));
  return <PublicPageFrame>
    <nav className="public-breadcrumbs" aria-label="Ruta de navegación"><Link to="/">Inicio</Link><ChevronRight size={13} aria-hidden="true" /><Link to="/lugares">Lugares</Link><ChevronRight size={13} aria-hidden="true" /><span aria-current="page">{collection.title}</span></nav>
    <section className="public-directory-intro"><p className="public-eyebrow">ELIGE DÓNDE AVANZAR</p><h1>{collection.title}.</h1><p>{collection.introduction}</p><p>{collection.advice}</p><a href="#public-collection-grid">Explorar estos lugares<ArrowRight size={18} aria-hidden="true" /></a></section>
    <section className="public-directory-list" id="public-collection-grid" aria-labelledby="public-collection-heading"><h2 id="public-collection-heading">Conoce los espacios</h2><PublicPlaceGrid places={collection.places} /></section>
    <CollectionNavigation collections={otherCollections} label={collection.kind ? "Explora también por zona" : "Más espacios en esta zona"} />
  </PublicPageFrame>;
}

export function PublicCollectionRoute() {
  const { pathname } = useLocation();
  const { places, loading, error, retry } = usePublicCatalog();
  const collection = getPublicCollections(places ?? []).find(collection => collection.path === pathname);
  return collection ? <PublicCollectionContent collection={collection} places={places ?? []} /> : <PublicPageFrame><div className="public-state" aria-live="polite"><h1>{loading ? "Cargando lugares…" : "Esta selección no está disponible"}</h1><p>{error || "Explora el directorio para conocer los espacios publicados."}</p>{error && <button type="button" className="landing-button is-primary" onClick={retry}>Reintentar</button>}<Link to="/lugares">Ver todos los lugares<ArrowRight size={16} aria-hidden="true" /></Link></div></PublicPageFrame>;
}
