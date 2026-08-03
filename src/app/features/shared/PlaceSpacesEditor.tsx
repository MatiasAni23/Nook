import { ImagePlus, Plus, Trash2, Users } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import type { PlaceSpace, PlaceSpaceInput } from "../../services/placeService";

export type PlaceSpaceDraft = {
  id: string;
  name: string;
  capacity: string;
  image: PlaceSpaceInput["image"] | null;
  previewUrl?: string;
};

export function placeSpacesToDrafts(spaces: PlaceSpace[]): PlaceSpaceDraft[] {
  return spaces.map((space) => ({
    id: space.id,
    name: space.name,
    capacity: String(space.capacity),
    image: { type: "existing", url: space.imageUrl },
    previewUrl: space.imageUrl,
  }));
}

export function validPlaceSpaces(drafts: PlaceSpaceDraft[]): PlaceSpaceInput[] {
  return drafts.map((space) => ({
    name: space.name.trim(),
    capacity: Number(space.capacity),
    image: space.image!,
  }));
}

export function arePlaceSpacesValid(drafts: PlaceSpaceDraft[]) {
  return drafts.every((space) => space.name.trim() && Number.isInteger(Number(space.capacity)) && Number(space.capacity) > 0 && space.image);
}

interface PlaceSpacesEditorProps {
  spaces: PlaceSpaceDraft[];
  onChange: (spaces: PlaceSpaceDraft[]) => void;
}

export function PlaceSpacesEditor({ spaces, onChange }: PlaceSpacesEditorProps) {
  const addSpace = () => onChange([...spaces, {
    id: crypto.randomUUID(), name: "", capacity: "", image: null,
  }]);

  const updateSpace = (id: string, change: Partial<PlaceSpaceDraft>) => {
    onChange(spaces.map((space) => space.id === id ? { ...space, ...change } : space));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Espacios dentro del lugar</p>
          <p className="text-xs text-gray-500">Opcional. Ej.: oficinas, salas o piezas de estudio. No habilita reservas.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addSpace} className="shrink-0 border-[#4F46E5] text-[#4F46E5]">
          <Plus className="mr-1 size-4" /> Agregar espacio
        </Button>
      </div>

      {spaces.map((space, index) => (
        <div key={space.id} className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:grid-cols-[112px_1fr_auto]">
          <Label htmlFor={`space-image-${space.id}`} className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-white text-center hover:border-[#4F46E5]">
            {space.previewUrl ? <img src={space.previewUrl} alt={`Espacio ${index + 1}`} className="size-full object-cover" /> : <><ImagePlus className="size-5 text-[#4F46E5]" /><span className="mt-1 text-[11px] text-gray-500">Imagen *</span></>}
          </Label>
          <Input
            id={`space-image-${space.id}`}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              updateSpace(space.id, { image: { type: "new", file }, previewUrl: URL.createObjectURL(file) });
            }}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor={`space-name-${space.id}`}>Nombre *</Label><Input id={`space-name-${space.id}`} value={space.name} onChange={(event) => updateSpace(space.id, { name: event.target.value })} placeholder="Ej.: Sala de estudio 1" /></div>
            <div className="space-y-1"><Label htmlFor={`space-capacity-${space.id}`}><Users className="mr-1 inline size-3.5" />Capacidad *</Label><Input id={`space-capacity-${space.id}`} type="number" min="1" value={space.capacity} onChange={(event) => updateSpace(space.id, { capacity: event.target.value })} placeholder="8" /></div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(spaces.filter((item) => item.id !== space.id))} className="self-center text-red-600 hover:bg-red-50 hover:text-red-700" aria-label="Quitar espacio"><Trash2 className="size-4" /></Button>
        </div>
      ))}
    </div>
  );
}
