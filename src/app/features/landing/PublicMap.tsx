import { useEffect, useState } from "react";
import { Link } from "react-router";
import { APIProvider, Map, Marker, useMap, type MapCameraChangedEvent } from "@vis.gl/react-google-maps";
import { ArrowRight, LockKeyhole, MapPin, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../components/ui/dialog";
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
function PublicMarker({ pin, onClick }: { pin: PublicMapPin; onClick: () => void }) {
  const map = useMap();
  if (!map || typeof google === "undefined" || !google.maps?.Size) return null;
  return <Marker position={{ lat: pin.lat, lng: pin.lng }} title={pin.name} onClick={onClick} icon={{ url: getPlacePinAsset(pin.type), scaledSize: new google.maps.Size(50, 50), anchor: new google.maps.Point(25, 50) }} />;
}

export function PublicMap() {
  const { currentUser } = useCurrentUser();
  const hasAccount = Boolean(currentUser) || (!isSupabaseConfigured && Boolean(getDemoSession()));
  const [pins, setPins] = useState<PublicMapPin[]>(() => getCachedPublicPins() ?? []);
  const [loading, setLoading] = useState(!getCachedPublicPins());
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<PublicMapPin | null>(null);
  const [mapError, setMapError] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(pins.length === 0);
    setError("");
    listPublicMapPins().then(data => { if (mounted) setPins(data); })
      .catch(() => { if (mounted) setError("No pudimos cargar los espacios. Puedes intentarlo de nuevo."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [attempt]);

  const select = (pin: PublicMapPin) => { setOpener(document.activeElement instanceof HTMLElement ? document.activeElement : null); setSelected(pin); };
  const destination = selected ? "/app/" + (selected.category === "work" ? "workplace/" : "place/") + selected.id : "/app/discover";
  const saveCamera = (event: MapCameraChangedEvent) => {
    const { center, zoom } = event.detail;
    if (Number.isFinite(center.lat) && Number.isFinite(center.lng) && Number.isFinite(zoom)) camera = { center, zoom };
  };

  return (
    <>
      <div className="landing-public-map" role="region" aria-label="Mapa público de espacios" aria-busy={loading}>
        {apiKey && !mapError ? (
          <APIProvider apiKey={apiKey} onError={() => setMapError(true)}>
            <Map defaultCenter={camera.center} defaultZoom={camera.zoom} styles={cleanMapStyles} disableDefaultUI zoomControl clickableIcons={false} gestureHandling="cooperative" onCameraChanged={saveCamera}>
              {pins.map(pin => <PublicMarker key={pin.id} pin={pin} onClick={() => select(pin)} />)}
            </Map>
          </APIProvider>
        ) : (
          <div className="landing-map-reference">
            <span className="landing-map-river" aria-hidden="true" />
            {pins.map(pin => <button key={pin.id} type="button" className="landing-map-pin" style={{ left: "calc(50% + " + (pin.lng - initialCenter.lng) * 2500 + "px)", top: "calc(50% + " + (initialCenter.lat - pin.lat) * 2200 + "px)" }} onClick={() => select(pin)} aria-label={"Explorar " + pin.name}><img src={getPlacePinAsset(pin.type)} alt="" aria-hidden="true" /></button>)}
          </div>
        )}
        <div className="landing-map-caption"><MapPin size={16} aria-hidden="true" />{!isSupabaseConfigured ? "Mapa de ejemplo" : !apiKey || mapError ? "Vista de referencia · Mapa interactivo no disponible" : "Explora el mapa"}</div>
        <p className="landing-map-access"><LockKeyhole size={15} aria-hidden="true" />{hasAccount ? "Selecciona un pin para continuar a la app" : "Mira el mapa. Crea tu cuenta para conocer cada lugar."}</p>
        {(loading || error || pins.length === 0) && <div className="landing-map-status" role={error ? "alert" : "status"}><p>{loading ? "Cargando espacios…" : error || "Todavía no hay espacios disponibles en el mapa."}</p>{error && <button type="button" onClick={() => setAttempt(value => value + 1)}><RefreshCw size={16} aria-hidden="true" />Reintentar</button>}</div>}
      </div>
      <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="landing-access-dialog" onCloseAutoFocus={event => { if (opener?.isConnected) { event.preventDefault(); opener.focus(); } }}>
          <span className="landing-access-icon"><LockKeyhole size={24} aria-hidden="true" /></span>
          <DialogTitle>{hasAccount ? "Continúa explorando en Pinwi" : "Ese lugar puede ser tu próximo espacio"}</DialogTitle>
          <DialogDescription>{hasAccount ? "Abre la ficha para conocer los servicios, horarios y la información del lugar." : "Inicia sesión o crea tu cuenta para ver la ficha completa, sus servicios y horarios. Mientras tanto, puedes seguir mirando el mapa."}</DialogDescription>
          {hasAccount ? <Link className="landing-button is-primary" to={destination}>Ver ficha del lugar<ArrowRight size={17} aria-hidden="true" /></Link> : <><Link className="landing-button is-primary" to={authLink(destination)}>Iniciar sesión<ArrowRight size={17} aria-hidden="true" /></Link><Link className="landing-button is-secondary" to={authLink(destination, true)}>Crear una cuenta</Link></>}
        </DialogContent>
      </Dialog>
    </>
  );
}
