import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ImageOff, LockKeyhole, Pause, Play, RefreshCw, Search, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../../components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "../../components/ui/carousel";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getDemoSession } from "../../services/demoSessionService";
import { getCachedPublicPlaces, listPublicPlaces, type PublicPlaceCard } from "../../services/publicPlaceService";
import { readPublicPlaceSnapshot } from "../../services/publicPlaceCatalog";
import { authLink } from "../auth/authNavigation";

const carouselOptions = { align: "start" as const, loop: true, breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } } };
const AUTOPLAY_DELAY_MS = 6000;

function PlacePhoto({ place, eager = false }: { place: PublicPlaceCard; eager?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return place.imageUrl && failedSource !== place.imageUrl ? (
    <img src={place.imageUrl} alt={"Foto principal de " + place.name} width={640} height={440}
      loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailedSource(place.imageUrl)} />
  ) : <span className="landing-photo-placeholder"><ImageOff size={28} strokeWidth={1.3} aria-hidden="true" /><span>Imagen no disponible</span></span>;
}

export function PublicPlaces({ initialPlaces }: { initialPlaces?: PublicPlaceCard[] }) {
  const { currentUser } = useCurrentUser();
  const hasAccount = Boolean(currentUser) || (!isSupabaseConfigured && Boolean(getDemoSession()));
  const [places, setPlaces] = useState<PublicPlaceCard[] | null>(() => initialPlaces ?? getCachedPublicPlaces() ?? readPublicPlaceSnapshot());
  const [loading, setLoading] = useState(places === null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(12);
  const [carousel, setCarousel] = useState<CarouselApi>();
  const [currentPage, setCurrentPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [selected, setSelected] = useState<PublicPlaceCard | null>(null);
  const opener = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 639px)");
    const tablet = window.matchMedia("(max-width: 900px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setPageSize(mobile.matches ? 6 : tablet.matches ? 9 : 12); setReducedMotion(motion.matches); };
    update();
    mobile.addEventListener("change", update);
    tablet.addEventListener("change", update);
    motion.addEventListener("change", update);
    return () => { mobile.removeEventListener("change", update); tablet.removeEventListener("change", update); motion.removeEventListener("change", update); };
  }, []);

  useEffect(() => {
    if (!carousel) return;
    const update = () => setCurrentPage(carousel.selectedScrollSnap());
    const pointerDown = () => setDragging(true);
    const pointerUp = () => setDragging(false);
    update();
    carousel.on("select", update);
    carousel.on("reInit", update);
    carousel.on("pointerDown", pointerDown);
    carousel.on("pointerUp", pointerUp);
    return () => {
      carousel.off("select", update); carousel.off("reInit", update);
      carousel.off("pointerDown", pointerDown); carousel.off("pointerUp", pointerUp);
    };
  }, [carousel]);

  useEffect(() => {
    const update = () => setTabVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (!carousel) return;
    if (!("IntersectionObserver" in window)) { setInView(true); return; }
    const observer = new IntersectionObserver(entries => setInView(entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.15)), { threshold: 0.15 });
    observer.observe(carousel.rootNode());
    return () => observer.disconnect();
  }, [carousel]);

  useEffect(() => {
    let mounted = true;
    setError("");
    listPublicPlaces().then(value => { if (mounted) setPlaces(value); })
      .catch(() => { if (mounted) setError("No pudimos actualizar los lugares. Intenta nuevamente."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [attempt]);

  const visiblePlaces = useMemo(() => {
    const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
    const search = normalize(query.trim());
    return (places ?? []).filter(place => normalize(place.name).includes(search));
  }, [places, query]);
  const pages = useMemo(() => Array.from({ length: Math.ceil(visiblePlaces.length / pageSize) }, (_, index) =>
    visiblePlaces.slice(index * pageSize, (index + 1) * pageSize)), [visiblePlaces, pageSize]);
  const activePage = Math.min(currentPage, Math.max(0, pages.length - 1));

  useEffect(() => {
    carousel?.reInit({ startIndex: 0 });
  }, [carousel, visiblePlaces, pageSize]);

  useEffect(() => {
    if (!carousel || pages.length < 2 || paused || reducedMotion || hovered || focused || dragging || !inView || !tabVisible || selected || query.trim()) return;
    const timer = window.setTimeout(() => carousel.scrollNext(), AUTOPLAY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [carousel, pages.length, activePage, paused, reducedMotion, hovered, focused, dragging, inView, tabVisible, selected, query]);

  const destination = selected ? "/app/place/" + selected.id : "/app/discover";

  return (
    <section id="espacios" className="landing-catalog landing-container" aria-labelledby="landing-places-heading">
      <div className="landing-catalog-heading">
        <div><p className="landing-eyebrow">ENCUENTRA TU PRÓXIMO LUGAR</p><h2 id="landing-places-heading">Un espacio para cada idea.</h2>
          <p>Bibliotecas, cafés y espacios de trabajo. ¿Cuál va contigo?</p></div>
        <a className="landing-inline-link" href="#como-funciona">¿Cómo funciona?<ArrowRight size={17} aria-hidden="true" /></a>
      </div>
      <div className="landing-catalog-toolbar">
        <div className="landing-search"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="landing-place-search">Buscar lugares por nombre</label>
          <input id="landing-place-search" type="search" placeholder="Busca un lugar por su nombre" value={query} onChange={event => setQuery(event.target.value)} />
          {query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery("")}><X size={17} aria-hidden="true" /></button>}</div>
        {!reducedMotion && pages.length > 1 && <button type="button" className="landing-autoplay-toggle" disabled={!carousel} onClick={() => setPaused(value => !value)} aria-label={paused ? "Reanudar carrusel automático" : "Pausar carrusel automático"} title={paused ? "Reanudar carrusel" : "Pausar carrusel"}>{paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}</button>}
      </div>
      {!isSupabaseConfigured && <p className="landing-demo-note">Vista de ejemplo. Los lugares conectados se mostrarán al configurar el servicio.</p>}
      {error && <div className="landing-catalog-status is-error" role="alert"><p>{error}</p><button type="button" onClick={() => { setLoading(places === null); setAttempt(value => value + 1); }}><RefreshCw size={16} aria-hidden="true" />Reintentar</button></div>}
      {loading && !places ? <div className="landing-place-grid" aria-busy="true">{Array.from({ length: pageSize }, (_, index) => <div key={index} className="landing-card-skeleton" aria-hidden="true"><span /><span /></div>)}</div> : pages.length > 0 && (
        <Carousel className={`landing-place-carousel${carousel ? " is-ready" : ""}`} opts={carouselOptions} setApi={setCarousel} aria-label="Lugares disponibles" aria-roledescription="carrusel" aria-busy={loading}
          onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
          <CarouselContent className="landing-carousel-track">
            {pages.map((page, pageIndex) => <CarouselItem key={pageIndex} className="landing-carousel-page" aria-roledescription="página" aria-label={`${pageIndex + 1} de ${pages.length}`} aria-hidden={carousel ? pageIndex !== activePage : undefined}>
              <div className="landing-place-grid">{page.map(place => (
                <article className="landing-place-card" key={place.id}>
                  <Link to={hasAccount ? "/app/place/" + place.id : authLink("/app/place/" + place.id)} aria-label={"Conocer " + place.name} tabIndex={carousel && pageIndex !== activePage ? -1 : undefined}
                    onClick={event => {
                      if (hasAccount || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
                      event.preventDefault(); opener.current = event.currentTarget; setSelected(place);
                    }}>
                    <div className="landing-card-photo"><PlacePhoto place={place} /><span className="landing-card-arrow" aria-hidden="true"><ArrowRight size={20} /></span></div>
                    <h3>{place.name}</h3>
                  </Link>
                </article>
              ))}</div>
            </CarouselItem>)}
          </CarouselContent>
          {pages.length > 1 && <div className="landing-carousel-controls"><CarouselPrevious className="landing-carousel-arrow" aria-label="Ver lugares anteriores" /><CarouselNext className="landing-carousel-arrow" aria-label="Ver más lugares" /></div>}
        </Carousel>
      )}
      {!loading && !error && visiblePlaces.length === 0 && <div className="landing-catalog-status"><p>{query ? "No encontramos lugares con ese nombre." : "Pronto encontrarás nuevos espacios aquí."}</p>{query && <button type="button" onClick={() => setQuery("")}>Ver todos los lugares<ArrowRight size={16} aria-hidden="true" /></button>}</div>}
      <p className="landing-catalog-note"><LockKeyhole size={15} aria-hidden="true" />Inicia sesión para ver direcciones, horarios y todos los detalles.</p>

      <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="landing-access-dialog" onCloseAutoFocus={event => {
          if (opener.current?.isConnected) { event.preventDefault(); opener.current.focus(); }
        }}>
          {selected && <div className="landing-access-photo"><PlacePhoto place={selected} eager /><p>{selected.name}</p></div>}
          <div className="landing-access-body"><span className="landing-access-icon"><LockKeyhole size={21} aria-hidden="true" /></span>
            <DialogTitle>Conoce tu próximo espacio.</DialogTitle>
            <DialogDescription>Inicia sesión o crea tu cuenta para ver la dirección, los horarios y los detalles de este lugar. Te llevaremos directamente a su ficha.</DialogDescription>
            <div className="landing-access-actions"><Link className="landing-button is-primary" to={authLink(destination)}>Iniciar sesión<ArrowRight size={17} aria-hidden="true" /></Link><Link className="landing-button is-secondary" to={authLink(destination, true)}>Crear una cuenta</Link></div>
            <DialogClose className="landing-access-explore">Seguir descubriendo lugares</DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
