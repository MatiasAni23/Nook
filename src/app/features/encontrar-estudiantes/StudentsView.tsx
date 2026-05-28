import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, MessageCircle, GraduationCap, BookOpen } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { students, currentUser } from "../../data/mockData";

export function StudentsView() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<'all' | 'career' | 'subjects'>('all');

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.career.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.subjects.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filter === 'career') {
      return student.career === currentUser.career;
    }

    if (filter === 'subjects') {
      return student.subjects.some(s => currentUser.subjects.includes(s));
    }

    return true;
  });

  const getMatchPercentage = (student: typeof students[0]) => {
    const careerMatch = student.career === currentUser.career ? 40 : 0;
    const universityMatch = student.university === currentUser.university ? 20 : 0;
    const subjectMatches = student.subjects.filter(s => currentUser.subjects.includes(s)).length;
    const subjectMatch = (subjectMatches / Math.max(currentUser.subjects.length, 1)) * 40;

    return Math.round(careerMatch + universityMatch + subjectMatch);
  };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto pb-20">
        {/* Header */}
        <div className="px-4 pt-8 pb-4 bg-white">
          <h2 className="text-2xl mb-4" style={{ fontWeight: 700 }}>
            Encuentra compañeros de estudio
          </h2>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, carrera o materia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-lg bg-gray-50 border-0 text-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setFilter('all')}
              className={`px-5 py-2 rounded-full whitespace-nowrap transition-all text-sm font-medium ${
                filter === 'all'
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('career')}
              className={`px-5 py-2 rounded-full whitespace-nowrap transition-all text-sm font-medium ${
                filter === 'career'
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Mi carrera
            </button>
            <button
              onClick={() => setFilter('subjects')}
              className={`px-5 py-2 rounded-full whitespace-nowrap transition-all text-sm font-medium ${
                filter === 'subjects'
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Mis ramos
            </button>
          </div>
        </div>

        {/* Students List */}
        <div className="px-4 space-y-3 pb-4">
        {filteredStudents.map((student) => {
          const matchPercentage = getMatchPercentage(student);
          const commonSubjects = student.subjects.filter(s => currentUser.subjects.includes(s));

          return (
            <Card key={student.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="size-14">
                    <AvatarFallback className="bg-[#4F46E5] text-white">
                      {student.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold truncate">{student.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`size-2 rounded-full ${student.online ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="text-xs text-gray-500">
                            {student.online ? 'En línea' : 'Desconectado'}
                          </span>
                        </div>
                      </div>
                      {matchPercentage > 0 && (
                        <Badge variant="secondary" className="shrink-0">
                          {matchPercentage}% compatible
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <GraduationCap className="size-4 shrink-0" />
                        <span className="truncate">{student.career}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <BookOpen className="size-4 shrink-0" />
                        <span className="truncate">{student.university}</span>
                      </div>
                    </div>

                    {commonSubjects.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Materias en común:</p>
                        <div className="flex flex-wrap gap-1">
                          {commonSubjects.map(subject => (
                            <Badge key={subject} variant="outline" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{student.bio}</p>

                    <Button
                      className="w-full mt-3"
                      size="sm"
                      onClick={() => navigate(`/app/chat/${student.id}`)}
                    >
                      <MessageCircle className="size-4 mr-2" />
                      Enviar mensaje
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

          {filteredStudents.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <p>No se encontraron estudiantes con esos criterios</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
