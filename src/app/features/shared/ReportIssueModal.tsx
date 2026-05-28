import { useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { type IssueType, getIssueLabel, getIssueIcon } from "../../data/mockData";

interface ReportIssueModalProps {
  placeName: string;
  onClose: () => void;
  onReport: (type: IssueType, description: string) => void;
}

export function ReportIssueModal({ placeName, onClose, onReport }: ReportIssueModalProps) {
  const [selectedType, setSelectedType] = useState<IssueType | null>(null);
  const [description, setDescription] = useState("");

  const issueTypes: IssueType[] = [
    'no_wifi',
    'crowded',
    'noisy',
    'no_outlets',
    'closed',
    'dirty',
    'no_parking',
    'other',
  ];

  const handleReport = () => {
    if (!selectedType) {
      alert('Por favor selecciona un tipo de problema');
      return;
    }
    onReport(selectedType, description);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl">Reportar problema</CardTitle>
          <button
            onClick={onClose}
            className="size-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X className="size-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Reportando problema en: <span className="font-semibold">{placeName}</span>
            </p>
            <p className="text-sm text-gray-600 mb-3">¿Qué está pasando?</p>
            <div className="grid grid-cols-2 gap-2">
              {issueTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedType === type
                      ? 'border-[#4F46E5] bg-purple-50'
                      : 'border-gray-300 hover:border-[#4F46E5]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getIssueIcon(type)}</span>
                    <span className="text-sm font-medium">{getIssueLabel(type)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedType && (
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Detalles adicionales (opcional)
              </label>
              <Textarea
                placeholder="Describe el problema con más detalle..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReport}
              disabled={!selectedType}
              className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA]"
            >
              Reportar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
