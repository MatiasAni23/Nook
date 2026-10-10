import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Building2, ChevronLeft, ChevronRight, Grid2X2, Heart } from "lucide-react";
import { CachedImage } from "../../components/ui/cached-image";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../components/ui/dialog";

function GalleryPhoto({ source, name, contain = false, backdrop = false, onLoad, onError }: { source?: string; name: string; contain?: boolean; backdrop?: boolean; onLoad?: (width: number, height: number) => void; onError?: () => void }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  return source && source !== failedSource ? (
    <span className="place-gallery-photo-frame">
      {backdrop && <CachedImage src={source} alt="" aria-hidden="true" className="place-gallery-photo-backdrop" />}
      <CachedImage
        src={source}
        alt={name}
        className={"place-gallery-photo" + (contain ? " is-contained" : "")}
        onLoad={(event) => onLoad?.(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
        onError={() => { setFailedSource(source); onError?.(); }}
      />
    </span>
  ) : (
    <span className="place-gallery-placeholder">
      <Building2 size={36} strokeWidth={1.3} aria-hidden="true" />
      <span>{source ? "Foto no disponible" : "Este lugar todavía no tiene fotos"}</span>
    </span>
  );
}

interface PlaceGalleryProps {
  name: string;
  images: string[];
  displayedImage?: string;
  activeIndex: number;
  isCompactLayout: boolean;
  onSelect: (index: number) => void;
  onBack: () => void;
  isFavorite: boolean;
  isSavingFavorite: boolean;
  onToggleFavorite: () => void;
}

export function PlaceGallery({ name, images, displayedImage, activeIndex, isCompactLayout, onSelect, onBack, isFavorite, isSavingFavorite, onToggleFavorite }: PlaceGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(4 / 3);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const dialogFocus = useRef<HTMLButtonElement | null>(null);
  const isMosaic = !isCompactLayout && images.length > 1;
  const previewImages = images.slice(0, 5);
  const previous = () => onSelect((activeIndex + images.length - 1) % images.length);
  const next = () => onSelect((activeIndex + 1) % images.length);
  const openPhoto = (index: number, button: HTMLButtonElement) => {
    if (!isOpen) opener.current = button;
    onSelect(index);
    setShowAll(false);
    setIsOpen(true);
  };

  useEffect(() => {
    if (isOpen) dialogFocus.current?.focus();
  }, [isOpen, showAll]);

  return (
    <>
      <div className={"place-gallery" + (images.length === 0 ? " is-empty" : "")} role="region" aria-label={"Fotos de " + name} aria-roledescription={isMosaic ? "galería de fotos" : images.length > 1 ? "carrusel" : undefined}>
        {isMosaic ? (
          <>
            <div className={"place-gallery-mosaic is-count-" + previewImages.length}>
              {previewImages.map((source, index) => (
                <button key={source + index} type="button" className="place-gallery-tile" onClick={(event) => openPhoto(index, event.currentTarget)} aria-label={"Ampliar foto " + (index + 1) + " de " + name}>
                  <GalleryPhoto source={source} name={"Foto " + (index + 1) + " de " + name} />
                </button>
              ))}
            </div>
            <button type="button" className="place-gallery-all" onClick={(event) => { opener.current = event.currentTarget; setShowAll(true); setIsOpen(true); }}>
              <Grid2X2 size={16} aria-hidden="true" />Ver todas las fotos<span>({images.length})</span>
            </button>
          </>
        ) : <div
          className="place-gallery-main"
          style={{ aspectRatio: imageAspectRatio }}
          onTouchStart={(event) => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
          onTouchCancel={() => { touchStart.current = null; }}
          onTouchEnd={(event) => {
            const start = touchStart.current;
            touchStart.current = null;
            if (!start || images.length < 2) return;
            const differenceX = event.changedTouches[0].clientX - start.x;
            const differenceY = event.changedTouches[0].clientY - start.y;
            if (Math.abs(differenceX) > 50 && Math.abs(differenceX) > Math.abs(differenceY)) {
              event.preventDefault();
              if (differenceX < 0) next(); else previous();
            }
          }}
        >
          {images.length > 0 ? (
            <button type="button" className="place-gallery-open" onClick={(event) => openPhoto(activeIndex, event.currentTarget)} aria-label={"Ampliar fotos de " + name}>
              <GalleryPhoto
                source={displayedImage ?? images[activeIndex]}
                name={name}
                contain
                backdrop
                onLoad={(width, height) => { if (width > 0 && height > 0) setImageAspectRatio(width / height); }}
                onError={() => setImageAspectRatio(4 / 3)}
              />
            </button>
          ) : <GalleryPhoto name={name} />}
          {images.length > 1 && (
            <>
              <button type="button" className="place-gallery-arrow is-previous" onClick={previous} aria-label="Foto anterior"><ChevronLeft size={20} /></button>
              <button type="button" className="place-gallery-arrow is-next" onClick={next} aria-label="Foto siguiente"><ChevronRight size={20} /></button>
              <span className="place-gallery-count" aria-live="polite">{activeIndex + 1} / {images.length}</span>
              <div className="place-gallery-pagination" role="group" aria-label="Seleccionar foto">
                {images.map((_, index) => (
                  <button key={index} type="button" className={activeIndex === index ? "is-active" : ""} onClick={() => onSelect(index)} aria-label={"Ver foto " + (index + 1)} aria-pressed={activeIndex === index} />
                ))}
              </div>
            </>
          )}
        </div>}
        <div className="place-gallery-top-actions">
          <button type="button" className="place-gallery-icon-action" onClick={onBack} aria-label="Volver"><ArrowLeft size={19} aria-hidden="true" /></button>
          <button
            type="button"
            className={"place-gallery-icon-action place-favorite-button" + (isFavorite ? " is-favorite" : "")}
            onClick={onToggleFavorite}
            disabled={isSavingFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
          ><Heart size={19} aria-hidden="true" /></button>
        </div>
      </div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="place-gallery-dialog"
          onCloseAutoFocus={(event) => {
            if (opener.current?.isConnected) { event.preventDefault(); opener.current.focus(); }
          }}
          onKeyDown={(event) => {
            if (showAll || images.length < 2) return;
            if (event.key === "ArrowLeft") { event.preventDefault(); previous(); }
            if (event.key === "ArrowRight") { event.preventDefault(); next(); }
          }}
        >
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription aria-live="polite">{showAll ? images.length + " fotos. Selecciona una para verla completa." : <>Foto {activeIndex + 1} de {images.length}. {images.length > 1 && "Usa las flechas para recorrer la galería."}</>}</DialogDescription>
          {showAll ? (
            <div className="place-gallery-overview">
              {images.map((source, index) => (
                <button key={source + index} ref={index === 0 ? dialogFocus : undefined} type="button" onClick={(event) => openPhoto(index, event.currentTarget)} aria-label={"Ampliar foto " + (index + 1)}>
                  <GalleryPhoto source={source} name={"Foto " + (index + 1) + " de " + name} />
                  <span className="place-gallery-photo-number">{index + 1}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              {!isCompactLayout && images.length > 1 && <button ref={dialogFocus} type="button" className="place-gallery-view-back" onClick={() => setShowAll(true)}><Grid2X2 size={16} aria-hidden="true" />Todas las fotos</button>}
              <div className="place-gallery-enlarged">
                <GalleryPhoto source={images[activeIndex]} name={name} contain />
                {images.length > 1 && (
                  <>
                    <button type="button" className="place-gallery-arrow is-previous" onClick={previous} aria-label="Foto anterior"><ChevronLeft size={20} /></button>
                    <button type="button" className="place-gallery-arrow is-next" onClick={next} aria-label="Foto siguiente"><ChevronRight size={20} /></button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
