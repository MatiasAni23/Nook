import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowDown, ArrowLeft, Check, CheckCheck, ChevronLeft, LoaderCircle, MessageCircle, Search, Send, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { BrandLogo } from '../../components/BrandLogo';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useCurrentUser } from '../../context/CurrentUserContext';
import {
  type ChatMessage, type ChatUser, createTypingChannel, getConversationId,
  getCachedChatMessagesForUser, getChatMessagesForUser, getChatUsersByIds,
  markChatMessagesAsRead, removeTypingChannel, sendChatMessage, sendTypingEvent, subscribeToChatMessages,
} from '../../services/chatService';
import './chat.css';

type Conversations = Record<string, ChatMessage[]>;
const timeLabel = (date: Date) => date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const personDetail = (person: ChatUser) => person.role === 'student' ? person.profile?.career || 'Estudiante' : person.profile?.company || (person.role === 'admin' ? 'Administración de Pinwi' : person.role === 'delegate' ? 'Delegado de espacios' : 'Comunidad Pinwi');
function dayLabel(date: Date) {
  const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}
function groupMessages(messages: ChatMessage[], accountId: string): Conversations {
  const grouped: Conversations = {};
  for (const message of messages) {
    const peer = message.senderId === accountId ? message.receiverId : message.senderId;
    (grouped[peer] ??= []).push(message);
  }
  return grouped;
}
function PersonAvatar({ person, online = false }: { person: ChatUser; online?: boolean }) {
  return <span className="chat-avatar"><Avatar className="chat-avatar-image"><AvatarImage src={person.profile?.profile_image_url ?? undefined} alt="" /><AvatarFallback>{initials(person.name)}</AvatarFallback></Avatar>{online && <span className="chat-online" aria-label="En línea" />}</span>;
}
function TypingDots() { return <span className="chat-typing" role="status" aria-label="Escribiendo"><i /><i /><i /></span>; }

export function ChatView() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser, onlineUserIds } = useCurrentUser();
  const accountId = currentUser?.id ?? '';
  const role = currentUser?.role ?? 'student';
  const basePath = role === 'admin' ? '/admin/chat' : role === 'delegate' ? '/delegate/chat' : '/app/chat';
  const homePath = role === 'admin' ? '/admin' : role === 'delegate' ? '/delegate' : '/app/discover';
  const scope = `${accountId}:${userId ?? ''}`;
  const activeScope = useRef(scope); activeScope.current = scope;
  const activePeer = useRef(userId); activePeer.current = userId;
  const [participants, setParticipants] = useState<Record<string, ChatUser>>({});
  const participantsRef = useRef(participants); participantsRef.current = participants;
  const loadedAccount = useRef('');
  const lastRefresh = useRef(Date.now());
  const [conversations, setConversations] = useState<Conversations>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingText, setPendingText] = useState('');
  const [typing, setTyping] = useState(false);
  const [visibleCount, setVisibleCount] = useState(80);
  const [showLatest, setShowLatest] = useState(false);
  const [readVersion, setReadVersion] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const previousHeight = useRef(0);
  const lastScrollScope = useRef('');
  const resolvedProfiles = useRef(new Set<string>());
  const sendingRef = useRef<string | null>(null);
  const pendingProfiles = useRef(new Set<string>());
  const pendingReads = useRef(new Set<string>());
  const typingChannel = useRef<ReturnType<typeof createTypingChannel>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const outgoingTypingTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastTyping = useRef(0);
  const person = userId ? participants[userId] : undefined;
  const messages = userId ? conversations[userId] ?? [] : [];
  const unreadIds = messages.filter(message => !message.read && message.receiverId === accountId).map(message => message.id).join('|');

  const upsertMessages = (updates: ChatMessage[]) => {
    setConversations(previous => {
      const next = { ...previous };
      for (const [peer, updatesForPeer] of Object.entries(groupMessages(updates, accountId))) {
        const merged = new Map((previous[peer] ?? []).map(item => [item.id, item]));
        for (const message of updatesForPeer) merged.set(message.id, message);
        next[peer] = [...merged.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
      return next;
    });
  };
  const upsert = (message: ChatMessage) => upsertMessages([message]);

  useEffect(() => {
    if (!isSupabaseConfigured || !accountId) { setLoading(false); return; }
    let cancelled = false;
    const account = accountId;
    const cached = getCachedChatMessagesForUser(account);
    if (loadedAccount.current !== account) {
      loadedAccount.current = account;
      resolvedProfiles.current.clear();
      setConversations(groupMessages(cached ?? [], account)); setParticipants({});
    }
    setLoading(Object.keys(participantsRef.current).length === 0); setError('');
    getChatMessagesForUser(account, { forceRefresh: reload > 0 }).then(async snapshot => {
      if (cancelled) return;
      const grouped = groupMessages(getCachedChatMessagesForUser(account) ?? snapshot, account);
      setConversations(grouped);
      const ids = Object.keys(grouped);
      if (activePeer.current && !ids.includes(activePeer.current)) ids.push(activePeer.current);
      const people = await getChatUsersByIds(ids);
      if (!cancelled) { ids.forEach(id => resolvedProfiles.current.add(id)); setParticipants(Object.fromEntries(people.map(peer => [peer.id, peer]))); }
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'No pudimos cargar tus conversaciones.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accountId, reload]);

  useEffect(() => {
    if (!accountId || !isSupabaseConfigured) return;
    let disposed = false;
    pendingProfiles.current.clear();
    const stop = subscribeToChatMessages(accountId, message => {
      if (disposed) return;
      upsert(message);
      const peer = message.senderId === accountId ? message.receiverId : message.senderId;
      if (!participantsRef.current[peer] && !pendingProfiles.current.has(peer)) {
        pendingProfiles.current.add(peer);
        void getChatUsersByIds([peer]).then(people => {
          if (!disposed) setParticipants(previous => ({ ...previous, ...Object.fromEntries(people.map(item => [item.id, item])) }));
        }).catch(() => undefined).finally(() => pendingProfiles.current.delete(peer));
      }
    });
    return () => { disposed = true; stop(); };
  }, [accountId]);

  useEffect(() => {
    if (loading || !userId || person || !accountId || !isSupabaseConfigured || error || resolvedProfiles.current.has(userId)) return;
    let cancelled = false;
    void getChatUsersByIds([userId]).then(people => {
      if (!cancelled) { resolvedProfiles.current.add(userId); setParticipants(previous => ({ ...previous, ...Object.fromEntries(people.map(peer => [peer.id, peer])) })); }
    }).catch(() => { if (!cancelled) setError('No pudimos abrir este perfil. Intenta nuevamente.'); });
    return () => { cancelled = true; };
  }, [accountId, userId, loading, person, error]);

  useEffect(() => {
    setDraft(''); setPendingText(''); setSending(false); setTyping(false); setVisibleCount(80); setShowLatest(false);
    stickToBottom.current = true;
    if (!accountId || !userId || !isSupabaseConfigured) return;
    const channel = createTypingChannel(getConversationId(accountId, userId), event => {
      if (event.from !== userId) return;
      clearTimeout(typingTimer.current); setTyping(event.isTyping);
      if (event.isTyping) typingTimer.current = setTimeout(() => setTyping(false), 3000);
    });
    typingChannel.current = channel;
    return () => {
      clearTimeout(typingTimer.current); clearTimeout(outgoingTypingTimer.current);
      sendTypingEvent(channel, { from: accountId, isTyping: false });
      removeTypingChannel(channel); typingChannel.current = null;
    };
  }, [accountId, userId]);

  useEffect(() => {
    const visible = () => {
      if (document.hidden) return;
      setReadVersion(version => version + 1);
      if (Date.now() - lastRefresh.current > 30000) { lastRefresh.current = Date.now(); setReload(version => version + 1); }
    };
    document.addEventListener('visibilitychange', visible); window.addEventListener('focus', visible); window.addEventListener('online', visible);
    return () => { document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', visible); window.removeEventListener('online', visible); };
  }, []);

  useEffect(() => {
    if (loading || !person || !userId || !accountId || !unreadIds || document.hidden || pendingReads.current.has(scope)) return;
    const readScope = scope;
    pendingReads.current.add(readScope);
    void markChatMessagesAsRead({ currentUserId: accountId, otherUserId: userId }).then(updated => {
      if (activeScope.current === readScope && updated.length) upsertMessages(updated);
    }).catch(() => undefined).finally(() => pendingReads.current.delete(readScope));
  }, [accountId, userId, scope, unreadIds, readVersion, loading, person?.id]);

  useLayoutEffect(() => {
    if (lastScrollScope.current !== scope) { lastScrollScope.current = scope; stickToBottom.current = true; previousHeight.current = 0; }
    const pane = timeline.current; if (!pane) return;
    if (previousHeight.current) { pane.scrollTop += pane.scrollHeight - previousHeight.current; previousHeight.current = 0; }
    else if (stickToBottom.current) pane.scrollTop = pane.scrollHeight;
  }, [messages.length, scope, person?.id, loading, visibleCount, typing, pendingText]);

  useEffect(() => {
    if (!userId || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const update = () => {
      const top = root.current?.getBoundingClientRect().top ?? 0;
      root.current?.style.setProperty('--chat-viewport-height', `${Math.max(240, viewport.height - Math.max(0, top - viewport.offsetTop))}px`);
      if (stickToBottom.current && timeline.current) timeline.current.scrollTop = timeline.current.scrollHeight;
    };
    update(); viewport.addEventListener('resize', update); viewport.addEventListener('scroll', update);
    return () => { viewport.removeEventListener('resize', update); viewport.removeEventListener('scroll', update); };
  }, [userId]);

  useLayoutEffect(() => {
    if (input.current) { input.current.style.height = 'auto'; input.current.style.height = `${Math.min(132, input.current.scrollHeight)}px`; }
  }, [draft]);

  const announceTyping = (value: string) => {
    setDraft(value); clearTimeout(outgoingTypingTimer.current);
    if (!accountId) return;
    const now = Date.now();
    if (!value.trim() || now - lastTyping.current > 1200) {
      lastTyping.current = now; sendTypingEvent(typingChannel.current, { from: accountId, isTyping: Boolean(value.trim()) });
    }
    outgoingTypingTimer.current = setTimeout(() => sendTypingEvent(typingChannel.current, { from: accountId, isTyping: false }), 2000);
  };

  const send = async () => {
    const text = draft.trim(); if (!text || !userId || !accountId || sendingRef.current === scope) return;
    const requestScope = scope; sendingRef.current = scope;
    setSending(true); setPendingText(text); setError(''); stickToBottom.current = true;
    try {
      const message = await sendChatMessage({ senderId: accountId, receiverId: userId, message: text });
      if (!activeScope.current.startsWith(`${accountId}:`)) return;
      upsert(message);
      if (activeScope.current !== requestScope) return;
      setDraft(current => current.trim() === text ? '' : current);
      sendTypingEvent(typingChannel.current, { from: accountId, isTyping: false });
    } catch (cause) { if (activeScope.current === requestScope) setError(cause instanceof Error ? cause.message : 'No se pudo enviar. Tu mensaje sigue aquí para reintentar.'); }
    finally { if (sendingRef.current === requestScope) sendingRef.current = null; if (activeScope.current === requestScope) { setSending(false); setPendingText(''); } }
  };

  const conversationList = useMemo(() => Object.entries(conversations).map(([id, items]) => ({
    id, person: participants[id], last: items[items.length - 1], unread: items.filter(message => message.receiverId === accountId && !message.read).length,
  })).filter(item => item.person && item.last && (role !== 'admin' || item.person.role === 'delegate') && (role !== 'delegate' || ['admin', 'worker'].includes(item.person.role)))
    .filter(item => (!unreadOnly || item.unread) && `${item.person.name} ${personDetail(item.person)}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')))
    .sort((a, b) => b.last.createdAt.getTime() - a.last.createdAt.getTime()), [conversations, participants, accountId, role, search, unreadOnly]);

  if (!isSupabaseConfigured || !accountId) return <div className="chat-unavailable"><MessageCircle /><h1>Tus conversaciones, en un solo lugar</h1><p>{isSupabaseConfigured ? 'Inicia sesión para acceder a tus mensajes.' : 'El chat requiere una conexión configurada con Pinwi.'}</p></div>;
  if (loadedAccount.current !== accountId) return <div className="chat-unavailable" role="status">Cargando conversaciones…</div>;

  return <div ref={root} className={`chat-workspace ${userId ? 'is-thread' : 'is-inbox'}`}>
    <aside className="chat-sidebar" aria-label="Conversaciones">
      <header className="chat-sidebar-header"><button type="button" className="chat-home" onClick={() => navigate(homePath)} aria-label="Volver a Pinwi"><ChevronLeft size={18} /><BrandLogo variant="mark" className="h-8" /></button><span>Tu comunidad, más cerca</span></header>
      <div className="chat-inbox-heading"><h1>Mensajes<span /></h1><p>Las buenas ideas empiezan conversando.</p></div>
      <div className="chat-search"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="chat-search">Buscar conversaciones</label><input id="chat-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Busca una conversación" />{search && <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda"><X size={16} /></button>}</div>
      <div className="chat-filters" role="group" aria-label="Filtrar conversaciones"><button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>Todos</button><button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Sin leer</button></div>
      <div className="chat-conversations">
        {error && !userId && <div className="chat-error" role="alert">{error}<button type="button" onClick={() => setReload(version => version + 1)}>Reintentar</button></div>}
        {loading ? <div className="chat-list-skeleton" aria-label="Cargando conversaciones" role="status">{[0, 1, 2, 3].map(n => <div key={n}><i /><span><b /><b /></span></div>)}</div> : conversationList.length === 0 ? <div className="chat-list-empty"><MessageCircle size={28} /><h2>{search ? 'No encontramos ese nombre' : unreadOnly ? 'Estás al día' : 'Todo empieza con un hola'}</h2><p>{search ? 'Prueba con otro nombre o carrera.' : unreadOnly ? 'Tus mensajes pendientes aparecerán aquí.' : 'Conecta con la comunidad y encuentra con quién compartir tus ideas.'}</p>{!search && !unreadOnly && role === 'student' && <button type="button" onClick={() => navigate('/app/students')}>Conocer estudiantes</button>}</div> : conversationList.map(item => <button type="button" key={item.id} className={`chat-conversation ${item.id === userId ? 'is-active' : ''} ${item.unread ? 'is-unread' : ''}`} onClick={() => navigate(`${basePath}/${item.id}`)} aria-current={item.id === userId ? 'page' : undefined}>
          <PersonAvatar person={item.person} online={onlineUserIds.has(item.id)} /><span className="chat-conversation-copy"><span className="chat-conversation-top"><strong>{item.person.name}</strong><time dateTime={item.last.createdAt.toISOString()}>{item.last.createdAt.toDateString() === new Date().toDateString() ? timeLabel(item.last.createdAt) : item.last.createdAt.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}</time></span><span className="chat-conversation-detail">{personDetail(item.person)}</span><span className="chat-conversation-bottom"><span>{item.id === userId && typing ? 'Escribiendo…' : `${item.last.senderId === accountId ? 'Tú: ' : ''}${item.last.text}`}</span>{item.unread > 0 && <b aria-label={`${item.unread} mensajes sin leer`}>{item.unread > 99 ? '99+' : item.unread}</b>}</span></span>
        </button>)}
      </div>
    </aside>

    {!userId ? <section className="chat-welcome"><span className="chat-welcome-icon"><MessageCircle size={36} strokeWidth={1.5} /></span><h2>Un hola puede ser<br />el comienzo de algo bueno.</h2><p>Elige una conversación para seguir compartiendo.<br />Tu próximo compañero de ideas puede estar aquí.</p><BrandLogo className="chat-welcome-brand" /></section> : <section className="chat-thread" aria-label={person ? `Chat con ${person.name}` : 'Conversación'}>
      <header className="chat-thread-header"><button type="button" className="chat-back" onClick={() => navigate(basePath)} aria-label="Volver a conversaciones"><ArrowLeft size={21} /></button>{person ? <><PersonAvatar person={person} online={onlineUserIds.has(person.id)} /><div className="chat-thread-person"><h1>{person.name}</h1><p aria-live="polite">{typing ? 'Escribiendo…' : onlineUserIds.has(person.id) ? 'En línea' : personDetail(person)}</p></div><span className="chat-thread-brand"><BrandLogo variant="mark" className="h-8" /></span></> : <div className="chat-header-skeleton" aria-label="Cargando perfil" />}</header>
      <div className="chat-timeline" ref={timeline} onScroll={() => { const pane = timeline.current; if (pane) { stickToBottom.current = pane.scrollHeight - pane.scrollTop - pane.clientHeight < 100; setShowLatest(!stickToBottom.current); } }}>
        {loading && !person ? <div className="chat-message-skeleton" role="status" aria-label="Cargando mensajes"><i /><i /><i /><i /></div> : !person ? <div className="chat-thread-empty"><MessageCircle size={32} /><h2>Esta conversación no está disponible</h2><p>{error || 'El perfil puede haber cambiado su disponibilidad.'}</p><button type="button" onClick={() => { setError(''); setReload(version => version + 1); }}>Reintentar</button></div> : messages.length === 0 ? <div className="chat-thread-empty"><PersonAvatar person={person} /><h2>Saluda a {person.name.split(' ')[0]}</h2><p>Comparte una idea, una pregunta o tu próximo lugar favorito.</p></div> : <>
          {messages.length > visibleCount && <button type="button" className="chat-load-older" onClick={() => { previousHeight.current = timeline.current?.scrollHeight ?? 0; setVisibleCount(count => count + 80); }}>Ver mensajes anteriores</button>}
          {messages.slice(-visibleCount).map((message, index, visible) => {
            const previous = visible[index - 1]; const own = message.senderId === accountId;
            const newDay = !previous || previous.createdAt.toDateString() !== message.createdAt.toDateString();
            const grouped = !newDay && previous.senderId === message.senderId && message.createdAt.getTime() - previous.createdAt.getTime() < 300000;
            return <div key={message.id}>{newDay && <div className="chat-day"><span>{dayLabel(message.createdAt)}</span></div>}<article className={`chat-message-row ${own ? 'is-own' : ''} ${grouped ? 'is-grouped' : ''}`} aria-label={`${own ? 'Tú' : person.name}, ${timeLabel(message.createdAt)}`}><div className="chat-bubble"><p>{message.text}</p><span className="chat-message-meta"><time dateTime={message.createdAt.toISOString()}>{timeLabel(message.createdAt)}</time>{own && <span className={message.read ? 'is-read' : ''} aria-label={message.read ? 'Visto' : 'Enviado'} title={message.read ? 'Visto' : 'Enviado'}>{message.read ? <CheckCheck size={14} /> : <Check size={14} />}</span>}</span></div></article></div>;
          })}
        </>}
        {typing && <div className="chat-message-row"><div className="chat-bubble"><TypingDots /></div></div>}
        {pendingText && <div className="chat-message-row is-own is-pending"><div className="chat-bubble"><p>{pendingText}</p><span className="chat-message-meta">Enviando…</span></div></div>}
      </div>
      {showLatest && <button type="button" className="chat-latest" onClick={() => { stickToBottom.current = true; timeline.current?.scrollTo({ top: timeline.current.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }}><ArrowDown size={15} /> Últimos mensajes</button>}
      <footer className="chat-composer-area">{error && person && <p className="chat-error" role="alert">{error}</p>}<form className="chat-composer" onSubmit={event => { event.preventDefault(); void send(); }}><label className="sr-only" htmlFor="chat-message">Escribe un mensaje</label><textarea ref={input} id="chat-message" rows={1} maxLength={4000} value={draft} onChange={event => announceTyping(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} onBlur={() => sendTypingEvent(typingChannel.current, { from: accountId, isTyping: false })} disabled={!person} placeholder="Escribe un mensaje…" /><button type="submit" disabled={!draft.trim() || sending || !person} aria-label={sending ? 'Enviando mensaje' : 'Enviar mensaje'}>{sending ? <LoaderCircle className="chat-send-spinner" size={19} /> : <Send size={19} />}</button></form><p className="chat-composer-hint">Un espacio para conversar con respeto.</p></footer>
    </section>}
  </div>;
}
