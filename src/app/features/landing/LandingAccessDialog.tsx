import { Link } from "react-router";
import { ArrowRight, LockKeyhole, MapPin } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../../components/ui/dialog";
import type { PublicPlaceCard } from "../../services/publicPlaceCatalog";
import { authLink } from "../auth/authNavigation";
import { PlacePhoto } from "./PlacePhoto";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  place: PublicPlaceCard | null;
  returnFocusTo: HTMLElement | null;
}

export function LandingAccessDialog({ open, onOpenChange, place, returnFocusTo }: Props) {
  const destination = place ? "/app/place/" + place.id : "/app/discover";
  const title = place?.name ?? "Tu próximo lugar está cerca.";

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="landing-access-dialog" onCloseAutoFocus={event => {
      if (returnFocusTo?.isConnected) { event.preventDefault(); returnFocusTo.focus(); }
    }}>
      {place && <div className="landing-access-photo"><PlacePhoto place={place} eager /></div>}
      <div className="landing-access-body">
        <span className="landing-access-icon">{place ? <MapPin size={22} aria-hidden="true" /> : <LockKeyhole size={22} aria-hidden="true" />}</span>
        <DialogTitle>{title}</DialogTitle>
        {place && <div className="landing-access-address"><p>{place.address || "Este lugar todavía no tiene una dirección publicada."}</p></div>}
        <DialogDescription>{place ? "¿Quieres conocer más? Inicia sesión o crea tu cuenta para ver horarios, servicios y todos los detalles de este lugar." : "Encuentra dónde estudiar, trabajar o cambiar de aire. Inicia sesión o crea tu cuenta para explorar lugares cerca de ti y conocer todos sus detalles."}</DialogDescription>
        <div className="landing-access-actions"><Link className="landing-button is-primary" to={authLink(destination)}>Iniciar sesión<ArrowRight size={17} aria-hidden="true" /></Link><Link className="landing-button is-secondary" to={authLink(destination, true)}>Crear mi cuenta</Link></div>
        <DialogClose className="landing-access-explore">Seguir explorando</DialogClose>
      </div>
    </DialogContent>
  </Dialog>;
}
