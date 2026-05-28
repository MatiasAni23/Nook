import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, MapPin, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { mockPlaceStats, mockZoneStats } from "../../data/adminData";

export function AdminStats() {
  const [selectedPlace, setSelectedPlace] = useState(mockPlaceStats[0]);

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl mb-1">Estadísticas y Análisis</h2>
            <p className="text-gray-600">Analiza el rendimiento de los espacios</p>
          </div>

          <Tabs defaultValue="places">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="places">Por Lugar</TabsTrigger>
              <TabsTrigger value="zones">Por Zona</TabsTrigger>
            </TabsList>

            {/* Places Tab */}
            <TabsContent value="places" className="space-y-4 mt-4">
              {/* Place Selector */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Selecciona un lugar</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={selectedPlace.placeId}
                    onValueChange={(id) => {
                      const place = mockPlaceStats.find(p => p.placeId === id);
                      if (place) setSelectedPlace(place);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPlaceStats.map(place => (
                        <SelectItem key={place.placeId} value={place.placeId}>
                          {place.placeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Stats Summary */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-2xl text-[#4F46E5]">{selectedPlace.visits.toLocaleString('es-CL')}</p>
                    <p className="text-xs text-gray-600">Visitas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="size-4 fill-yellow-400 text-yellow-400" />
                      <p className="text-2xl text-[#4F46E5]">{selectedPlace.averageRating}</p>
                    </div>
                    <p className="text-xs text-gray-600">Rating</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-2xl text-[#4F46E5]">{selectedPlace.totalReviews}</p>
                    <p className="text-xs text-gray-600">Reseñas</p>
                  </CardContent>
                </Card>
              </div>

              {/* Peak Hours Chart */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Horas Peak</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={selectedPlace.peakHours} key={`peak-${selectedPlace.placeId}`}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="hour"
                        tickFormatter={(hour) => `${hour}h`}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip labelFormatter={(hour) => `${hour}:00`} />
                      <Bar dataKey="visits" fill="#9333ea" name="Visitas" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Weekly Visits Chart */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Visitas Semanales</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={selectedPlace.weeklyVisits} key={`weekly-${selectedPlace.placeId}`}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="visits"
                        stroke="#9333ea"
                        strokeWidth={3}
                        name="Visitas"
                        dot={{ fill: '#9333ea', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Zones Tab */}
            <TabsContent value="zones" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Comparación por Zonas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={mockZoneStats} key="zones-chart">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="zone" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="totalVisits" fill="#9333ea" name="Visitas" />
                      <Bar dataKey="totalPlaces" fill="#7c3aed" name="Lugares" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid gap-3">
                {mockZoneStats.map((zone, index) => (
                  <Card key={zone.zone}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`size-10 rounded-full flex items-center justify-center text-white ${
                            index === 0 ? 'bg-[#4F46E5]' :
                            index === 1 ? 'bg-[#6366F1]' :
                            index === 2 ? 'bg-[#818CF8]' : 'bg-[#A5B4FC]'
                          }`}>
                            <MapPin className="size-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{zone.zone}</h3>
                            <p className="text-sm text-gray-600">{zone.totalPlaces} lugares registrados</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">{zone.totalVisits.toLocaleString('es-CL')}</p>
                          <div className="flex items-center gap-1 justify-end">
                            <Star className="size-3 fill-yellow-400 text-yellow-400" />
                            <p className="text-sm text-gray-600">{zone.averageRating}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
