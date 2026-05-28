import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, MapPin, Users, Star, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { mockPlaceStats, mockZoneStats } from "../../data/adminData";
import { AddPlaceModal } from "../shared/AddPlaceModal";

const COLORS = ['#9333ea', '#7c3aed', '#6d28d9', '#5b21b6'];

export function AdminDashboard() {
  const [selectedPlace, setSelectedPlace] = useState(mockPlaceStats[0]);
  const [showAddPlace, setShowAddPlace] = useState(false);

  const totalVisits = mockPlaceStats.reduce((sum, place) => sum + place.visits, 0);
  const averageRating = (mockPlaceStats.reduce((sum, place) => sum + place.averageRating, 0) / mockPlaceStats.length).toFixed(1);

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl mb-1">Panel de Administración</h1>
              <p className="text-gray-600">Gestiona lugares de estudio y analiza estadísticas</p>
            </div>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => setShowAddPlace(true)}
            >
              <Plus className="size-4 mr-2" />
              Agregar Lugar
            </Button>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <MapPin className="size-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl">{mockPlaceStats.length}</p>
                    <p className="text-sm text-gray-600">Lugares</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="size-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl">{totalVisits.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Visitas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Star className="size-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl">{averageRating}</p>
                    <p className="text-sm text-gray-600">Rating Promedio</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <Users className="size-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl">2</p>
                    <p className="text-sm text-gray-600">Delegados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="analytics">
            <TabsList>
              <TabsTrigger value="analytics">Análisis</TabsTrigger>
              <TabsTrigger value="zones">Zonas</TabsTrigger>
              <TabsTrigger value="places">Lugares</TabsTrigger>
            </TabsList>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4 mt-4">
              {/* Place Selector */}
              <Card>
                <CardHeader>
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

              {/* Peak Hours Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Horas Peak - {selectedPlace.placeName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={selectedPlace.peakHours}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}:00`} />
                      <YAxis />
                      <Tooltip labelFormatter={(hour) => `${hour}:00`} />
                      <Bar dataKey="visits" fill="#9333ea" name="Visitas" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Weekly Visits Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Visitas Semanales - {selectedPlace.placeName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={selectedPlace.weeklyVisits}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="visits" stroke="#9333ea" strokeWidth={2} name="Visitas" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Zones Tab */}
            <TabsContent value="zones" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estadísticas por Zona</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={mockZoneStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="zone" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalVisits" fill="#9333ea" name="Visitas Totales" />
                      <Bar dataKey="totalPlaces" fill="#7c3aed" name="Cantidad de Lugares" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                {mockZoneStats.map((zone) => (
                  <Card key={zone.zone}>
                    <CardHeader>
                      <CardTitle className="text-lg">{zone.zone}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lugares:</span>
                        <span>{zone.totalPlaces}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Visitas:</span>
                        <span>{zone.totalVisits.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rating Promedio:</span>
                        <span className="flex items-center gap-1">
                          <Star className="size-4 fill-yellow-400 text-yellow-400" />
                          {zone.averageRating}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Places Tab */}
            <TabsContent value="places" className="space-y-4 mt-4">
              {mockPlaceStats.map((place) => (
                <Card key={place.placeId}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg mb-2">{place.placeName}</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Visitas:</span>
                            <span className="ml-2">{place.visits.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Rating:</span>
                            <span className="ml-2 flex items-center gap-1">
                              <Star className="size-3 fill-yellow-400 text-yellow-400" />
                              {place.averageRating}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Reseñas:</span>
                            <span className="ml-2">{place.totalReviews}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Place Modal */}
      {showAddPlace && (
        <AddPlaceModal onClose={() => setShowAddPlace(false)} />
      )}
    </div>
  );
}
