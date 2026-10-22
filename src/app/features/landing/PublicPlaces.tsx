import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, LockKeyhole, Pause, Play, RefreshCw } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "../../components/ui/carousel";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getDemoSession } from "../../services/demoSessionService";
import { getCachedPublicPlaces, listPublicPlaces, type PublicPlaceCard } from "../../services/publicPlaceService";
import { readPublicPlaceSnapshot } from "../../services/publicPlaceCatalog";
import { authLink } from "../auth/authNavigation";
import { LandingGuide } from "./LandingGuide";
import { PlacePhoto } from "./PlacePhoto";

const carouselOptions = { align: "start" as const, loop: true, breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } } };
const AUTOPLAY_DELAY_MS = 6000;

interface Props {
  initialPlaces?: PublicPlaceCard[];
  accessOpen: boolean;
  onPreview: (place: PublicPlaceCard, opener: HTMLAnchorElement) => void;
}

export function PublicPlaces({ initialPlaces, accessOpen, onPreview }: Props) {
  const { currentUser } = useCurrentUser();
  const hasAccount = Boolean(currentUser) || (!isSupabaseConfigured && Boolean(getDemoSession()));
  const [places, setPlaces] = useState<PublicPlaceCard[] | null>(() => initialPlaces ?? getCachedPublicPlaces() ?? readPublicPlaceSnapshot());
  const [loading, setLoading] = useState(places === null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
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

  const pages = useMemo(() => Array.from({ length: Math.ceil((places?.length ?? 0) / pageSize) }, (_, index) =>
    (places ?? []).slice(index * pageSize, (index + 1) * pageSize)), [places, pageSize]);
  const activePage = Math.min(currentPage, Math.max(0, pages.length - 1));

  useEffect(() => {
    carousel?.reInit({ startIndex: 0 });
  }, [carousel, places, pageSize]);

  useEffect(() => {
    if (!carousel || pages.length < 2 || paused || reducedMotion || hovered || focused || dragging || !inView || !tabVisible || accessOpen) return;
    const timer = window.setTimeout(() => carousel.scrollNext(), AUTOPLAY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [carousel, pages.length, activePage, paused, reducedMotion, hovered, focused, dragging, inView, tabVisible, accessOpen]);

  return (
    <section id="espacios" className="landing-catalog landing-container" aria-labelledby="landing-places-heading">
      <div className="landing-catalog-heading">
        <div><p className="landing-eyebrow">ENCUENTRA TU PRÓXIMO LUGAR</p><h2 id="landing-places-heading">Un espacio para cada idea.</h2>
          <p>Bibliotecas, cafés y espacios de trabajo. ¿Cuál va contigo?</p></div>
        <LandingGuide />
      </div>
      <div className="landing-catalog-toolbar">
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
                      event.preventDefault(); onPreview(place, event.currentTarget);
                    }}>
                    <div className="landing-card-photo"><PlacePhoto place={place} /><span className="landing-card-arrow" aria-hidden="true"><ArrowRight size={20} /></span></div>
                    <h3 title={place.name}>{place.name}</h3>
                  </Link>
                </article>
              ))}</div>
            </CarouselItem>)}
          </CarouselContent>
          {pages.length > 1 && <div className="landing-carousel-controls"><CarouselPrevious className="landing-carousel-arrow" aria-label="Ver lugares anteriores" /><CarouselNext className="landing-carousel-arrow" aria-label="Ver más lugares" /></div>}
        </Carousel>
      )}
      {!loading && !error && !places?.length && <div className="landing-catalog-status"><p>Pronto encontrarás nuevos espacios aquí.</p></div>}
      <p className="landing-catalog-note"><LockKeyhole size={15} aria-hidden="true" />Abre un lugar para ver su dirección. Entra a tu cuenta para conocer más.</p>
    </section>
  );
}
