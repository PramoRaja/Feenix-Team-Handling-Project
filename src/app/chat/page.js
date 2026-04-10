'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Send, MessageCircle, Search, Paperclip, X, File as FileIcon } from 'lucide-react';

export default function ChatPage() {
    const [user, setUser] = useState(null);
    const [threads, setThreads] = useState([]);
    const [activeUser, setActiveUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [search, setSearch] = useState('');
    const [sending, setSending] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const bottomRef = useRef(null);
    const pollingRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/auth').then(r=>r.json()).then(d=>{
            if(!d.authenticated) router.push('/login');
            else setUser(d.user);
        });
    }, []);

    const fetchThreads = useCallback(() => {
        fetch('/api/chat').then(r=>r.json()).then(d=>setThreads(d.threads || []));
    }, []);

    const fetchMessages = useCallback((withId) => {
        if(!withId) return;
        fetch(`/api/chat?with=${withId}`).then(r=>r.json()).then(d=>{
            setMessages(d.messages || []);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
            fetchThreads(); // refresh unread counts
        });
    }, [fetchThreads]);

    useEffect(() => {
        if(!user) return;
        fetchThreads();
    }, [user, fetchThreads]);

    useEffect(() => {
        if(pollingRef.current) clearInterval(pollingRef.current);
        if(activeUser) {
            fetchMessages(activeUser.id);
            pollingRef.current = setInterval(() => fetchMessages(activeUser.id), 3000);
        }
        return () => clearInterval(pollingRef.current);
    }, [activeUser, fetchMessages]);

    const openChat = (person) => {
        setActiveUser(person);
        setMessages([]);
    };

    const sendMessage = async (e) => {
        e?.preventDefault();
        if((!input.trim() && !attachment) || !activeUser || sending) return;
        setSending(true);

        let attachmentUrl = null;
        if(attachment) {
            const fd = new FormData(); fd.append('file', attachment);
            const up = await fetch('/api/upload', { method:'POST', body:fd }).then(r=>r.json());
            if(up.url) attachmentUrl = up.url;
        }

        await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiver_id: activeUser.id, message: input, attachment: attachmentUrl })
        });
        setInput('');
        setAttachment(null);
        setSending(false);
        fetchMessages(activeUser.id);
    };

    const handleKeyDown = (e) => {
        if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const filtered = threads.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

    const formatTime = (ts) => {
        if(!ts) return '';
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (ts) => {
        if(!ts) return '';
        const d = new Date(ts);
        const today = new Date();
        if(d.toDateString() === today.toDateString()) return 'Today';
        return d.toLocaleDateString();
    };

    if(!user) return null;

    return (
        <AppLayout user={user}>
            <style jsx global>{`
                .chat-layout { display: flex; gap: 0; height: calc(100vh - 145px); overflow: hidden; border-radius: 20px; border: 1px solid var(--panel-border); }
                .chat-sidebar { width: 300px; border-right: 1px solid var(--panel-border); background: var(--panel-bg); backdrop-filter: blur(20px); display: flex; flex-direction: column; overflow: hidden; }
                .chat-thread-item { display: flex; align-items: center; gap: 12px; padding: 14px 18px; cursor: pointer; transition: all 0.2s ease; border-bottom: 1px solid rgba(148,163,184,0.07); }
                .chat-thread-item:hover { background: rgba(59, 130, 246, 0.06); }
                .chat-thread-item.active { background: rgba(59, 130, 246, 0.12); border-left: 3px solid #3b82f6; }
                .chat-main { flex: 1; display: flex; flex-direction: column; background: var(--panel-bg); backdrop-filter: blur(20px); overflow: hidden; }
                .chat-messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 12px; }
                .chat-messages::-webkit-scrollbar { width: 4px; }
                .chat-messages::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 4px; }
                .msg-row { display: flex; gap: 10px; align-items: flex-end; }
                .msg-row.mine { flex-direction: row-reverse; }
                .msg-bubble { max-width: 65%; padding: 12px 16px; border-radius: 18px; font-size: 0.95em; line-height: 1.5; word-break: break-word; }
                .msg-bubble.mine { background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; border-bottom-right-radius: 4px; }
                .msg-bubble.theirs { background: var(--input-bg); color: var(--text-main); border: 1px solid var(--panel-border); border-bottom-left-radius: 4px; }
                .msg-time { font-size: 0.72em; color: var(--text-muted); margin-top: 4px; text-align: right; }
                .msg-time.theirs { text-align: left; }
                .chat-input-area { padding: 16px 20px; border-top: 1px solid var(--panel-border); display: flex; gap: 12px; align-items: flex-end; }
                .avatar-circle { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid var(--panel-border); }
                .avatar-fallback { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1em; flex-shrink: 0; }
                .sm-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
                .sm-avatar-fallback { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.95em; flex-shrink: 0; }
            `}</style>

            <div className="animate-slide-up chat-layout">

                {/* Left Sidebar — People List */}
                <div className="chat-sidebar">
                    <div style={{padding:'18px', borderBottom:'1px solid var(--panel-border)'}}>
                        <h3 style={{margin:'0 0 14px 0', display:'flex', alignItems:'center', gap:'8px', fontSize:'1.1em'}}>
                            <MessageCircle size={20} color="#3b82f6"/> Team Messages
                        </h3>
                        <div style={{position:'relative'}}>
                            <Search size={15} style={{position:'absolute', left:11, top:11, color:'var(--text-muted)'}}/>
                            <input
                                value={search}
                                onChange={e=>setSearch(e.target.value)}
                                placeholder="Search..."
                                style={{paddingLeft:'34px', padding:'9px 9px 9px 34px', fontSize:'0.88em', borderRadius:'10px', width:'100%'}}
                            />
                        </div>
                    </div>
                    <div style={{overflowY:'auto', flex:1}}>
                        {filtered.length === 0 && <div style={{padding:'30px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:'0.9em'}}>No team members found.</div>}
                        {filtered.map(person => {
                            const isActive = activeUser?.id === person.id;
                            const hasAvatar = person.profile_picture && person.profile_picture !== 'default.png';
                            return (
                                <div key={person.id} className={`chat-thread-item ${isActive ? 'active' : ''}`} onClick={()=>openChat(person)}>
                                    {hasAvatar ? (
                                        <img src={person.profile_picture} alt={person.name} className="sm-avatar" onError={e=>{e.target.style.display='none';}}/>
                                    ) : (
                                        <div className="sm-avatar-fallback">{person.name?.charAt(0)?.toUpperCase()}</div>
                                    )}
                                    <div style={{flex:1, minWidth:0}}>
                                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px'}}>
                                            <strong style={{fontSize:'0.95em', color:'var(--text-main)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{person.name}</strong>
                                            {person.unread > 0 && <span style={{background:'#ef4444', color:'white', borderRadius:'50%', minWidth:'20px', height:'20px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72em', fontWeight:700, padding:'0 4px', flexShrink:0}}>{person.unread}</span>}
                                        </div>
                                        <div style={{fontSize:'0.8em', color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{person.last_message || person.position}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Panel — Conversation */}
                {activeUser ? (
                    <div className="chat-main">
                        {/* Chat Header */}
                        <div style={{padding:'16px 24px', borderBottom:'1px solid var(--panel-border)', display:'flex', alignItems:'center', gap:'14px', background:'var(--panel-bg)'}}>
                            {(activeUser.profile_picture && activeUser.profile_picture !== 'default.png') ? (
                                <img src={activeUser.profile_picture} alt={activeUser.name} className="avatar-circle"/>
                            ) : (
                                <div className="avatar-fallback">{activeUser.name?.charAt(0)?.toUpperCase()}</div>
                            )}
                            <div>
                                <strong style={{fontSize:'1.1em', color:'var(--text-main)'}}>{activeUser.name}</strong>
                                <div style={{fontSize:'0.82em', color:'var(--text-muted)'}}>{activeUser.position}</div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="chat-messages">
                            {messages.length === 0 && (
                                <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:'0.95em', flexDirection:'column', gap:'10px', opacity:0.7}}>
                                    <MessageCircle size={40} color="#3b82f6"/>
                                    Say hi to {activeUser.name}!
                                </div>
                            )}
                            {messages.map((m, i) => {
                                const isMine = m.sender_id === user.id;
                                const showDate = i === 0 || formatDate(m.created_at) !== formatDate(messages[i-1]?.created_at);
                                return (
                                    <div key={m.id}>
                                        {showDate && (
                                            <div style={{textAlign:'center', fontSize:'0.75em', color:'var(--text-muted)', margin:'8px 0', display:'flex', alignItems:'center', gap:'10px'}}>
                                                <div style={{flex:1, height:1, background:'var(--panel-border)'}}/>
                                                <span>{formatDate(m.created_at)}</span>
                                                <div style={{flex:1, height:1, background:'var(--panel-border)'}}/>
                                            </div>
                                        )}
                                        <div className={`msg-row ${isMine ? 'mine' : ''}`}>
                                            {!isMine && (
                                                (m.sender_pic && m.sender_pic !== 'default.png') ? (
                                                    <img src={m.sender_pic} alt={m.sender_name} style={{width:'30px', height:'30px', borderRadius:'50%', objectFit:'cover', flexShrink:0}}/>
                                                ) : (
                                                    <div style={{width:'30px', height:'30px', borderRadius:'50%', background:'linear-gradient(135deg, #3b82f6, #8b5cf6)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8em', fontWeight:700, flexShrink:0}}>{m.sender_name?.charAt(0)}</div>
                                                )
                                            )}
                                            <div style={{display:'flex', flexDirection:'column'}}>
                                                {m.attachment && (
                                                    <div style={{marginBottom:'6px', alignSelf: isMine ? 'flex-end' : 'flex-start'}}>
                                                        {m.attachment.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                                            <img src={m.attachment} alt="attachment" style={{maxWidth:'200px', borderRadius:'12px', border: '1px solid var(--panel-border)'}} />
                                                        ) : (
                                                            <a href={m.attachment} target="_blank" rel="noopener noreferrer" style={{display:'flex', alignItems:'center', gap:'8px', padding:'8px 12px', background:'var(--panel-bg)', border:'1px solid var(--panel-border)', borderRadius:'8px', textDecoration:'none', color:'var(--text-main)', fontSize:'0.9em'}}>
                                                                <FileIcon size={16} color="#3b82f6"/> {m.attachment.split('/').pop()}
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                                {m.message && <div className={`msg-bubble ${isMine ? 'mine' : 'theirs'}`}>{m.message}</div>}
                                                <div className={`msg-time ${isMine ? '' : 'theirs'}`}>{formatTime(m.created_at)}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef}/>
                        </div>

                        {/* Input */}
                        <div style={{display:'flex', flexDirection:'column', borderTop: '1px solid var(--panel-border)'}}>
                            {attachment && (
                                <div style={{padding:'10px 20px', display:'flex', alignItems:'center', gap:'10px', background:'rgba(59, 130, 246, 0.05)', borderBottom:'1px solid var(--panel-border)'}}>
                                    <div style={{flex:1, fontSize:'0.85em', color:'var(--text-main)', display:'flex', alignItems:'center', gap:'8px'}}>
                                        <Paperclip size={14} color="#3b82f6"/>
                                        {attachment.name}
                                    </div>
                                    <button onClick={()=>setAttachment(null)} style={{background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)'}}><X size={16}/></button>
                                </div>
                            )}
                            <form onSubmit={sendMessage} className="chat-input-area" style={{borderTop:'none'}}>
                                <input type="file" id="chatAttachment" hidden onChange={e=>{if(e.target.files[0]) setAttachment(e.target.files[0])}} />
                                <button type="button" onClick={()=>document.getElementById('chatAttachment').click()} style={{background:'var(--panel-bg)', border:'1px solid var(--panel-border)', display:'flex', alignItems:'center', justifyContent:'center', width:'44px', height:'44px', borderRadius:'14px', cursor:'pointer', flexShrink:0, color:'var(--text-main)'}}>
                                    <Paperclip size={18}/>
                                </button>
                                <input
                                    value={input}
                                    onChange={e=>setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={`Message ${activeUser.name}...`}
                                    style={{flex:1, padding:'13px 18px', borderRadius:'14px', fontSize:'0.95em', margin:0}}
                                    autoComplete="off"
                                />
                                <button type="submit" disabled={(!input.trim() && !attachment) || sending} className="btn-primary" style={{padding:'13px 20px', borderRadius:'14px', minWidth:'60px', flexShrink:0}}>
                                    <Send size={18}/>
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'16px', color:'var(--text-muted)'}}>
                        <MessageCircle size={60} color="#3b82f6" style={{opacity:0.4}}/>
                        <p style={{fontSize:'1.1em', margin:0}}>Select a team member to start chatting</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
