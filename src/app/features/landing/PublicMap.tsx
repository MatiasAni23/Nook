import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { APIProvider, Map, Marker, useMap, type MapCameraChangedEvent } from "@vis.gl/react-google-maps";
import { ArrowRight, Clock3, Heart, LockKeyhole, MapPin, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../../components/ui/dialog";
import { getCachedPublicPins, listPublicMapPins, type PublicMapPin } from "../../services/publicMapService";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getPlacePinAsset } from "../mapa/placePinAssets";
import { cleanMapStyles } from "../mapa/mapStyles";
import { authLink } from "../auth/authNavigation";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { getDemoSession } from "../../services/demoSessionService";

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const initialCenter = { lat: -33.4569, lng: -70.6483 };
let camera = { center: initialCenter, zoom: 13 };
function PublicMarker({ pin, label, onClick }: { pin: PublicMapPin; label: string; onClick: () => void }) {
  const map = useMap();
  if (!map || typeof google === "undefined" || !google.maps?.Size) return null;
  return <Marker position={{ lat: pin.lat, lng: pin.lng }} title={label} onClick={onClick} icon={{ url: getPlacePinAsset(pin.type), scaledSize: new google.maps.Size(50, 50), anchor: new google.maps.Point(25, 50) }} />;
}

export function PublicMap() {
  const { currentUser } = useCurrentUser();
  const hasAccount = Boolean(currentUser) || (!isSupabaseConfigured && Boolean(getDemoSession()));
  const pinLabel = (pin: PublicMapPin, index: number) => hasAccount ? pin.name : `Espacio de ${pin.category === "work" ? "trabajo" : "estudio"} ${index + 1}`;
  const [pins, setPins] = useState<PublicMapPin[]>(() => getCachedPublicPins() ?? []);
  const [loading, setLoading] = useState(!getCachedPublicPins());
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<PublicMapPin | null>(null);
  const [mapError, setMapError] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapVisible, setMapVisible] = useState(false);

  useEffect(() => {
    const container = mapContainer.current;
    if (!container || !("IntersectionObserver" in window)) {
      setMapVisible(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setMapVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "150px 0px" });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mapVisible) return;
    let mounted = true;
    setLoading(pins.length === 0);
    setError("");
    listPublicMapPins().then(data => { if (mounted) setPins(data); })
      .catch(() => { if (mounted) setError("No pudimos cargar los espacios. Puedes intentarlo de nuevo."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [attempt, mapVisible]);

  const select = (pin: PublicMapPin) => { setOpener(document.activeElement instanceof HTMLElement ? document.activeElement : null); setSelected(pin); };
  const destination = selected ? "/app/" + (selected.category === "work" ? "workplace/" : "place/") + selected.id : "/app/discover";
  const saveCamera = (event: MapCameraChangedEvent) => {
    const { center, zoom } = event.detail;
    if (Number.isFinite(center.lat) && Number.isFinite(center.lng) && Number.isFinite(zoom)) camera = { center, zoom };
  };

  return (
    <>
      <div ref={mapContainer} className="landing-public-map" role="region" aria-label="Mapa público de espacios" aria-busy={loading}>
        {mapVisible && apiKey && !mapError ? (
          <APIProvider apiKey={apiKey} onError={() => setMapError(true)}>
            <Map reuseMaps renderingType="RASTER" defaultCenter={camera.center} defaultZoom={camera.zoom} styles={cleanMapStyles} disableDefaultUI zoomControl clickableIcons={false} gestureHandling="cooperative" onCameraChanged={saveCamera}>
              {pins.map((pin, index) => <PublicMarker key={pin.id} pin={pin} label={pinLabel(pin, index)} onClick={() => select(pin)} />)}
            </Map>
          </APIProvider>
        ) : (
          <div className="landing-map-reference">
            <span className="landing-map-river" aria-hidden="true" />
            {pins.map((pin, index) => <button key={pin.id} type="button" className="landing-map-pin" style={{ left: "calc(50% + " + (pin.lng - initialCenter.lng) * 2500 + "px)", top: "calc(50% + " + (initialCenter.lat - pin.lat) * 2200 + "px)" }} onClick={() => select(pin)} aria-label={"Explorar " + pinLabel(pin, index)}><img src={getPlacePinAsset(pin.type)} alt="" aria-hidden="true" /></button>)}
          </div>
        )}
        <div className="landing-map-caption"><MapPin size={16} aria-hidden="true" />{!isSupabaseConfigured ? "Mapa de ejemplo" : !apiKey || mapError ? "Vista de referencia · Mapa interactivo no disponible" : "Explora el mapa"}</div>
        <p className="landing-map-access"><LockKeyhole size={15} aria-hidden="true" />{hasAccount ? "Selecciona un pin para continuar a la app" : "Mira el mapa. Crea tu cuenta para conocer cada lugar."}</p>
        {(loading || error || pins.length === 0) && <div className="landing-map-status" role={error ? "alert" : "status"}><p>{loading ? "Cargando espacios…" : error || "Todavía no hay espacios disponibles en el mapa."}</p>{error && <button type="button" onClick={() => setAttempt(value => value + 1)}><RefreshCw size={16} aria-hidden="true" />Reintentar</button>}</div>}
      </div>
      <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent
          className="landing-access-dialog"
          onOpenAutoFocus={event => {
            const content = event.target;
            if (!(content instanceof HTMLElement)) return;
            const action = content.querySelector<HTMLAnchorElement>(".landing-access-actions a");
            const target = action && action.getBoundingClientRect().bottom <= content.getBoundingClientRect().bottom
              ? action : content.querySelector<HTMLButtonElement>(":scope > button");
            if (target) { event.preventDefault(); target.focus({ preventScroll: true }); }
          }}
          onCloseAutoFocus={event => { if (opener?.isConnected) { event.preventDefault(); opener.focus(); } }}
        >
          <div className="landing-access-place">
            <svg className="landing-access-route" viewBox="0 0 240 160" fill="none" aria-hidden="true"><path d="M-20 122H76V36H166V174M28-20V72H260M118-20V104H260" /><path className="landing-access-route-highlight" d="M-20 122H76V72H166V36H260" /></svg>
            {selected && <img className="landing-access-pin" src={getPlacePinAsset(selected.type)} alt="" aria-hidden="true" />}
            <div className="landing-access-place-copy">
              <p className="landing-access-eyebrow">{selected?.category === "work" ? "UN ESPACIO PARA TRABAJAR" : "UN ESPACIO PARA ESTUDIAR"}</p>
              <p className="landing-access-place-name">{hasAccount ? selected?.name : "Un lugar por descubrir"}</p>
              <span className="landing-access-location"><MapPin size={13} aria-hidden="true" />Seleccionado en el mapa</span>
            </div>
          </div>
          <div className="landing-access-body">
            <DialogTitle>{hasAccount ? "Conoce todo sobre este lugar" : "Tu próximo espacio está a un paso."}</DialogTitle>
            <DialogDescription>{hasAccount ? "Abre la ficha y revisa la información del lugar antes de ir." : "Inicia sesión o crea tu cuenta. Después te llevaremos directamente a la ficha del espacio que elegiste."}</DialogDescription>
            <ul className="landing-access-benefits" aria-label="Qué puedes consultar en Pinwi">
              <li><Clock3 size={16} aria-hidden="true" />Horarios</li>
              <li><SlidersHorizontal size={16} aria-hidden="true" />Servicios</li>
              <li><Heart size={16} aria-hidden="true" />Favoritos</li>
            </ul>
            <div className="landing-access-actions">
              {hasAccount ? <Link className="landing-button is-primary" to={destination}>Ver ficha del lugar<ArrowRight size={17} aria-hidden="true" /></Link> : <><Link className="landing-button is-primary" to={authLink(destination)}>Iniciar sesión<ArrowRight size={17} aria-hidden="true" /></Link><Link className="landing-button is-secondary" to={authLink(destination, true)}>Crear una cuenta</Link></>}
            </div>
            <DialogClose className="landing-access-explore">Seguir explorando el mapa</DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
