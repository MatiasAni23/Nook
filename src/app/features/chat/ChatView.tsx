import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Send, Building2 } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { students, mockChats, mockWorkerChats, workPlaces, currentUser, currentWorker, type Message } from "../../data/mockData";

const getUserRole = (): 'student' | 'worker' | 'admin' => {
  return (window as any).__userRole || 'student';
};

export function ChatView() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userRole = getUserRole();

  const [conversations, setConversations] = useState(userRole === 'worker' ? mockWorkerChats : mockChats);
  const [messageText, setMessageText] = useState("");

  // For workers: get workplace info, for students: get student info
  const activeStudent = userId && userRole === 'student' ? students.find(s => s.id === userId) : null;
  const activeWorkplace = userId && userRole === 'worker' ? workPlaces.find(p => p.id === userId) : null;
  const activeChat = userId ? conversations[userId] : null;
  const activePerson = activeStudent || activeWorkplace;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  const sendMessage = () => {
    if (!messageText.trim() || !userId) return;

    const currentUserId = userRole === 'worker' ? currentWorker.id : currentUser.id;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUserId,
      text: messageText.trim(),
      timestamp: new Date(),
    };

    setConversations(prev => ({
      ...prev,
      [userId]: {
        userId,
        messages: [...(prev[userId]?.messages || []), newMessage],
      },
    }));

    setMessageText("");

    // Simulate a response after 2 seconds
    setTimeout(() => {
      const responseText = userRole === 'worker'
        ? "Gracias por tu mensaje. Un representante te responderá pronto."
        : "¡Gracias por tu mensaje! En una versión real con Supabase, esto sería un chat en tiempo real.";

      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        senderId: userId,
        text: responseText,
        timestamp: new Date(),
      };

      setConversations(prev => ({
        ...prev,
        [userId]: {
          userId,
          messages: [...prev[userId].messages, responseMessage],
        },
      }));
    }, 2000);
  };

  // Conversation list view
  if (!userId) {
    const conversationList = Object.entries(conversations).map(([id, conv]) => {
      const person = userRole === 'worker'
        ? workPlaces.find(p => p.id === id)
        : students.find(s => s.id === id);
      const lastMessage = conv.messages[conv.messages.length - 1];
      return { person, lastMessage, conv };
    }).filter(item => item.person);

    return (
      <div className="size-full flex flex-col bg-gray-50">
        <div className="flex-none p-4 pb-2">
          <h2 className="text-2xl">Mensajes</h2>
        </div>
        <div className="flex-1 overflow-auto px-4 pb-20">
          <div className="space-y-3">
            {conversationList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <p>No tienes conversaciones aún</p>
                  <Button
                    className="mt-4"
                    onClick={() => navigate(userRole === 'worker' ? '/app/discover' : '/app/students')}
                  >
                    {userRole === 'worker' ? 'Buscar espacios' : 'Buscar estudiantes'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              conversationList.map(({ person, lastMessage }) => {
            if (!person) return null;

            const isWorkplace = 'pricePerHour' in person;
            const isOnline = 'online' in person ? (person as any).online : true;

            return (
              <Card
                key={person.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/app/chat/${person.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-12">
                      <AvatarFallback className="bg-[#4F46E5] text-white">
                        {isWorkplace ? <Building2 className="size-6" /> : person.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold truncate">{person.name}</h3>
                        {isOnline && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            En línea
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {isWorkplace ? 'Espacio de trabajo' : (person as any).career}
                      </p>
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        {lastMessage.text}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {lastMessage.timestamp.toLocaleTimeString('es', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // Individual chat view
  if (!activePerson) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate("/app/chat")}>
          <ArrowLeft className="size-4 mr-2" />
          Volver
        </Button>
        <p className="mt-4">{userRole === 'worker' ? 'Lugar no encontrado' : 'Usuario no encontrado'}</p>
      </div>
    );
  }

  const isWorkplace = 'pricePerHour' in activePerson;
  const isOnline = 'online' in activePerson ? (activePerson as any).online : true;
  const subtitle = isWorkplace ? 'Espacio de trabajo' : (activePerson as any).career;
  const currentUserId = userRole === 'worker' ? currentWorker.id : currentUser.id;

  return (
    <div className="size-full flex flex-col bg-white">
      {/* Chat Header */}
      <div className="border-b px-4 py-3 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/app/chat")}>
            <ArrowLeft className="size-4" />
          </Button>

          <Avatar className="size-10">
            <AvatarFallback className="bg-[#4F46E5] text-white">
              {isWorkplace ? <Building2 className="size-5" /> : activePerson.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h3 className="font-semibold">{activePerson.name}</h3>
            <p className="text-xs text-gray-600">{subtitle}</p>
          </div>

          {isOnline && (
            <div className="size-3 bg-green-500 rounded-full" />
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4 bg-gray-50">
        {!activeChat || activeChat.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-center">
              Inicia la conversación con {activePerson.name}
            </p>
          </div>
        ) : (
          <>
            {activeChat.messages.map((message) => {
              const isOwn = message.senderId === currentUserId;

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2 ${
                      isOwn
                        ? 'bg-[#4F46E5] text-white'
                        : 'bg-white border shadow-sm'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-purple-100' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString('es', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t p-4 bg-white pb-20">
        <div className="flex gap-2">
          <Input
            placeholder="Escribe un mensaje..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <Button onClick={sendMessage} disabled={!messageText.trim()}>
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
