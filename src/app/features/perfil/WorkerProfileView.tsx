import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { User, Briefcase, Building2, Edit, LogOut, Star, Heart } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { currentWorker, workPlaces } from "../../data/mockData";
import { isSupabaseConfigured } from "../../lib/supabase";
import { signOut } from "../../services/authService";
import { getCurrentUserProfile, getInitials, updateCurrentUserProfile } from "../../services/currentUserService";

export function WorkerProfileView() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState(currentWorker);
  const [favoritePlaces] = useState([workPlaces[0], workPlaces[2], workPlaces[3]]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(isSupabaseConfigured);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    getCurrentUserProfile()
      .then((user) => {
        if (!user) return;

        setProfile((currentProfile) => ({
          ...currentProfile,
          id: user.id,
          name: user.name,
          avatar: user.profile?.profile_image_url ?? currentProfile.avatar,
          company: user.profile?.company ?? "",
          position: user.profile?.position ?? user.profile?.industry ?? "",
          bio: user.profile?.bio ?? "",
          online: true,
        }));
      })
      .finally(() => setIsLoadingProfile(false));
  }, []);

  const handleSave = async () => {
    setIsSavingProfile(true);

    try {
      if (isSupabaseConfigured) {
        await updateCurrentUserProfile({
          name: profile.name,
          role: "worker",
          profileData: {
            company: profile.company,
            position: profile.position,
            bio: profile.bio,
          },
        });
      }

      setIsEditing(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      if (isSupabaseConfigured) {
        await signOut();
      }
    } finally {
      window.location.replace("/");
    }
  };

  const getPlaceImage = (id: string) => {
    const gradients = [
      'from-gray-400 to-gray-600',
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600',
      'from-orange-400 to-orange-600',
      'from-indigo-400 to-indigo-600',
      'from-pink-400 to-pink-600',
      'from-cyan-400 to-cyan-600',
      'from-red-400 to-red-600',
    ];
    const index = parseInt(id.replace(/\D/g, '')) % gradients.length;
    return gradients[index];
  };

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'office': return '🏢';
      case 'coworking': return '💼';
      case 'meeting_room': return '👥';
      case 'private_office': return '🚪';
      default: return '📍';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto pb-20">
        {isLoadingProfile && (
          <div className="px-4 py-3 text-sm text-gray-500">Cargando perfil...</div>
        )}

        {/* Header */}
        <div className="px-4 pt-8 pb-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl" style={{ fontWeight: 700 }}>Mi Perfil</h1>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-full bg-[#4F46E5] text-white text-sm font-medium hover:bg-[#4338CA] transition-all"
              >
                <Edit className="size-4 inline mr-1" />
                Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-full bg-gray-200 text-gray-700 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSavingProfile}
                  className="px-4 py-2 rounded-full bg-[#4F46E5] text-white text-sm font-medium"
                >
                  {isSavingProfile ? "Guardando..." : "Guardar"}
                </button>
              </div>
            )}
          </div>

          {/* Avatar and name */}
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="size-24 border-4 border-white shadow-lg">
              <AvatarFallback className="bg-[#4F46E5] text-white text-3xl">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Tu nombre"
                  className="h-10 text-lg font-semibold"
                />
              ) : (
                <h2 className="text-xl mb-1" style={{ fontWeight: 700 }}>{profile.name}</h2>
              )}
              <div className="flex items-center gap-2">
                <div className={`size-2 rounded-full ${profile.online ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm text-gray-600">
                  {profile.online ? 'En línea' : 'Desconectado'}
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {isEditing ? (
            <Textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Cuéntanos sobre ti"
              className="mb-4 bg-gray-50 border-0"
              rows={3}
            />
          ) : (
            <p className="text-sm text-gray-600 mb-4">{profile.bio}</p>
          )}

          {/* Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Briefcase className="size-5 text-[#4F46E5]" />
              {isEditing ? (
                <Input
                  value={profile.position}
                  onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                  placeholder="Tu cargo"
                  className="h-9 bg-gray-50 border-0"
                />
              ) : (
                <span className="text-sm font-medium">{profile.position}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-[#4F46E5]" />
              {isEditing ? (
                <Input
                  value={profile.company}
                  onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  placeholder="Tu empresa"
                  className="h-9 bg-gray-50 border-0"
                />
              ) : (
                <span className="text-sm font-medium">{profile.company}</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl text-[#4F46E5] mb-1" style={{ fontWeight: 700 }}>18</p>
                <p className="text-xs text-gray-600">Reservas realizadas</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl text-[#4F46E5] mb-1" style={{ fontWeight: 700 }}>72</p>
                <p className="text-xs text-gray-600">Horas reservadas</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl text-[#4F46E5] mb-1" style={{ fontWeight: 700 }}>5</p>
                <p className="text-xs text-gray-600">Lugares favoritos</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lugares favoritos */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg" style={{ fontWeight: 700 }}>Espacios favoritos</h3>
            <Heart className="size-5 text-red-500 fill-red-500" />
          </div>
          <div className="space-y-3">
            {favoritePlaces.map((place) => (
              <Card
                key={place.id}
                className="cursor-pointer hover:shadow-lg transition-all overflow-hidden bg-white"
                onClick={() => navigate(`/app/workplace/${place.id}`)}
              >
                <CardContent className="p-0">
                  <div className="flex gap-3 p-3">
                    <div className={`relative w-20 h-20 rounded-xl bg-gradient-to-br ${getPlaceImage(place.id)} flex items-center justify-center shrink-0`}>
                      <span className="text-3xl">{getPlaceIcon(place.type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-sm line-clamp-1">{place.name}</h4>
                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="size-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold">{place.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">Las Condes, Santiago</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs px-2 py-0 border-gray-300">
                            WiFi
                          </Badge>
                          <Badge variant="outline" className="text-xs px-2 py-0 border-gray-300">
                            Parking
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold text-[#4F46E5]">{formatPrice(place.pricePerHour)}/hr</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Logout */}
        <div className="px-4 pb-4">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full py-3 rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50 transition-all font-medium"
          >
            <LogOut className="size-4 inline mr-2" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}
