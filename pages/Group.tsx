
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, X, Info, Clock, DollarSign, Star, MapPin, ChevronLeft, Heart, Check, History, HelpCircle, Sparkles, Copy, Share2, UserPlus, Users, LogIn, Edit2 } from 'lucide-react';
import { motion, useMotionValue, useTransform, PanInfo, useAnimation, AnimatePresence } from 'framer-motion';
import { getAreas, getGroups, getGroupById, saveGroup, saveSelectionResult, getSelectionResults, getUserProfile, updateUserProfile } from '../services/db';
import { searchRestaurants } from '../services/gemini';
import { p2p } from '../services/p2p';
import { Group, Restaurant, SelectionResult, UserProfile, P2PMessage } from '../types';
import RestaurantDetail from '../components/RestaurantDetail';

// --- Sub-Components ---

// 1. Group List View
const GroupListView = ({ groups, user, onCreateClick, onGroupClick, onJoinClick, onUpdateName }: { groups: Group[], user: UserProfile, onCreateClick: () => void, onGroupClick: (g: Group) => void, onJoinClick: (id: string) => void, onUpdateName: (n: string) => void }) => {
    const [joinId, setJoinId] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(user.name);

    const visibleGroups = groups.filter(g => g.members.some(m => m.id === user.id));

    const handleJoin = () => {
        if (joinId.trim()) onJoinClick(joinId.trim());
    };

    const saveName = () => {
        onUpdateName(tempName);
        setIsEditingName(false);
    };

    return (
        <div className="p-6 space-y-6 pt-8 pb-20">
            {/* User Profile Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <div className="text-xs text-gray-400 font-bold uppercase">You are</div>
                    {isEditingName ? (
                        <div className="flex items-center gap-2 mt-1">
                            <input 
                                className="border rounded px-2 py-1 text-sm w-32" 
                                value={tempName} 
                                onChange={e => setTempName(e.target.value)}
                                autoFocus
                            />
                            <button onClick={saveName} className="bg-primary text-white text-xs px-2 py-1 rounded">Save</button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 font-bold text-lg text-gray-800">
                            {user.name}
                            <button onClick={() => setIsEditingName(true)} className="text-gray-400 hover:text-gray-600"><Edit2 size={14} /></button>
                        </div>
                    )}
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-400 rounded-full flex items-center justify-center text-white font-bold">
                    {user.name[0]?.toUpperCase()}
                </div>
            </div>

            {/* Join Session */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3">
                <h3 className="font-bold text-blue-800 flex items-center gap-2">
                    <LogIn size={18} /> Join Session
                </h3>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Enter Group ID..." 
                        className="flex-1 p-3 border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={joinId}
                        onChange={(e) => setJoinId(e.target.value)}
                    />
                    <button 
                        onClick={handleJoin}
                        disabled={!joinId.trim()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-md disabled:opacity-50"
                    >
                        Join
                    </button>
                </div>
                <p className="text-[10px] text-blue-600/70">
                    Enter the ID shared by your friend to join their lobby.
                </p>
            </div>

            {/* Create Button */}
            <button 
                onClick={onCreateClick}
                className="w-full py-4 border-2 border-dashed border-primary text-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
            >
                <Plus size={24} /> CREATE NEW GROUP
            </button>

            {/* Group List */}
            <div className="space-y-4">
                <h2 className="font-bold text-gray-500 text-sm uppercase tracking-wider">Recent Groups</h2>
                {visibleGroups.length === 0 ? (
                    <div className="text-center text-gray-400 py-4">No recent groups.</div>
                ) : (
                    visibleGroups.map(group => (
                        <div 
                            key={group.id} 
                            onClick={() => onGroupClick(group)}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1 cursor-pointer active:scale-98 transition-transform"
                        >
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-lg">{group.name}</h3>
                                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">{group.area}</span>
                            </div>
                            <p className="text-gray-500 text-sm truncate">{group.note}</p>
                            <div className="flex justify-between text-xs text-gray-400 mt-2">
                                <span>{group.date} @ {group.time}</span>
                                <span>{group.members.length} members</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// 2. Group Form (Create / Edit)
const GroupForm = ({ onBack, onSubmit, initialData, user }: { onBack: () => void, onSubmit: (g: Group) => void, initialData?: Group, user: UserProfile }) => {
    const [areas, setAreas] = useState<string[]>([]);
    
    useEffect(() => {
        setAreas(getAreas());
    }, []);

    const [formData, setFormData] = useState({
        name: initialData?.name || '', 
        note: initialData?.note || '', 
        area: initialData?.area || '新竹市東區', 
        date: initialData?.date || '', 
        time: initialData?.time || '', 
        swiping: initialData?.swipingAmount?.toString() || '10', 
        vegetarian: initialData?.isVegetarian || false,
        priceRange: initialData?.idealPriceRange || '200-600',
        maxWait: initialData?.maxWaitTime || '15 min',
        anonymousVoting: initialData?.anonymousVoting || false
    });

    const handleSubmit = () => {
        const newGroup: Group = {
            id: initialData?.id || Date.now().toString().slice(-6), // Shorter ID for sharing
            name: formData.name || 'New Group',
            note: formData.note,
            area: formData.area,
            date: formData.date,
            time: formData.time,
            swipingAmount: parseInt(formData.swiping) || 10,
            isVegetarian: formData.vegetarian,
            members: initialData?.members || [user],
            inviteLink: 'https://dine.decide/join/', 
            idealPriceRange: formData.priceRange,
            maxWaitTime: formData.maxWait,
            anonymousVoting: formData.anonymousVoting
        };
        onSubmit(newGroup);
    };

    return (
        <div className="p-6 pt-8 min-h-screen bg-white pb-20">
            <h2 className="text-2xl font-bold mb-6">{initialData ? 'Edit Group' : 'Create New Group'}</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                    <input type="text" className="w-full p-3 border rounded-lg bg-gray-50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Friday Dinner" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cravings / Note</label>
                    <textarea className="w-full p-3 border rounded-lg bg-gray-50" rows={2} value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="e.g. Sushi, Italian, or anything spicy..." />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ideal Area</label>
                    <select className="w-full p-3 border rounded-lg bg-gray-50" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
                        <option value="">Select Area</option>
                        {areas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input type="text" placeholder="MM/DD" className="w-full p-3 border rounded-lg bg-gray-50" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                        <input type="text" placeholder="HH:MM" className="w-full p-3 border rounded-lg bg-gray-50" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                    </div>
                </div>
                
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ideal Price</label>
                        <input type="text" placeholder="200-600" className="w-full p-3 border rounded-lg bg-gray-50" value={formData.priceRange} onChange={e => setFormData({...formData, priceRange: e.target.value})} />
                    </div>
                     <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Wait</label>
                        <input type="text" placeholder="15 min" className="w-full p-3 border rounded-lg bg-gray-50" value={formData.maxWait} onChange={e => setFormData({...formData, maxWait: e.target.value})} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Swiping Amount</label>
                    <input type="number" className="w-full p-3 border rounded-lg bg-gray-50" value={formData.swiping} onChange={e => setFormData({...formData, swiping: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vegetarians?</label>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setFormData({...formData, vegetarian: true})}
                            className={`flex-1 py-3 rounded-lg border ${formData.vegetarian ? 'bg-green-100 border-green-500 text-green-800 font-bold' : 'border-gray-200'}`}
                        >Yes</button>
                        <button 
                            onClick={() => setFormData({...formData, vegetarian: false})}
                            className={`flex-1 py-3 rounded-lg border ${!formData.vegetarian ? 'bg-gray-200 border-gray-400 text-gray-800 font-bold' : 'border-gray-200'}`}
                        >No</button>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50">
                    <input 
                        id="anonymousVoting"
                        type="checkbox" 
                        checked={formData.anonymousVoting} 
                        onChange={e => setFormData({...formData, anonymousVoting: e.target.checked})}
                        className="w-5 h-5"
                    />
                    <label htmlFor="anonymousVoting" className="text-sm font-medium text-gray-700">
                        Anonymous voting (hide who liked/disliked)
                    </label>
                </div>
            </div>

            <div className="flex gap-4 mt-8 pb-8">
                <button onClick={onBack} className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-gray-600">Back</button>
                <button onClick={handleSubmit} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg">
                    {initialData ? 'Save Changes' : 'Create'}
                </button>
            </div>
        </div>
    );
};

// 3. Group Detail View (Lobby)
const GroupDetailView = ({ group, user, onBack, onStart, onHistory, onEdit, loading, onLeave }: { group: Group, user: UserProfile, onBack: () => void, onStart: (g:Group, sharedRestaurants?: Restaurant[]) => void, onHistory: () => void, onEdit: () => void, loading: boolean, onLeave: () => void }) => {
    const [copied, setCopied] = useState(false);
    const [liveMembers, setLiveMembers] = useState<UserProfile[]>(group.members);
    const membersRef = useRef<UserProfile[]>(group.members);
    const hostIdRef = useRef<string>(group.members[0]?.id || user.id);
    const [tempDisplayName, setTempDisplayName] = useState(() => {
        const me = group.members.find(m => m.id === user.id);
        return me?.name || user.name;
    });
    
    const setMembers = (next: UserProfile[]) => {
        // Ensure host stays first if known
        const ordered = (() => {
            if (!hostIdRef.current) return next;
            const host = next.find(m => m.id === hostIdRef.current);
            const others = next.filter(m => m.id !== hostIdRef.current);
            return host ? [host, ...others] : next;
        })();
        membersRef.current = ordered;
        setLiveMembers(ordered);
        // Persist updated roster so re-opened views also see everyone
        saveGroup({ ...group, members: ordered });
    };

    const mergeMembers = (incoming: UserProfile[]) => {
        const map = new Map<string, UserProfile>();
        [...membersRef.current, ...incoming].forEach(m => map.set(m.id, m));
        return Array.from(map.values());
    };

    // P2P Synchronization Logic
    // useEffect(() => {
    //     p2p.joinGroup(group.id, user);
    //     const withSelf = mergeMembers([user]);
    //     setMembers(withSelf);
    //     // Broadcast our roster so everyone aligns
    //     p2p.send('LOBBY_UPDATE', group.id, user.id, { members: withSelf, hostId: hostIdRef.current });

    //     // 2. Listen for events
    //     const unsubscribe = p2p.subscribe((msg: P2PMessage) => {
    //         if (msg.groupId !== group.id) return;

    //         switch (msg.type) {
    //             case 'JOIN_REQUEST': {
    //                 const next = mergeMembers([msg.payload.user]);
    //                 setMembers(next);
    //                 // Echo roster so newcomer sees everyone
    //                 p2p.send('LOBBY_UPDATE', group.id, user.id, { members: next, hostId: hostIdRef.current });
    //                 break;
    //             }
    //             case 'START_SESSION':
    //                 onStart(group, msg.payload?.restaurants); 
    //                 break;
    //             case 'LOBBY_UPDATE':
    //                 if (msg.payload?.hostId) {
    //                     hostIdRef.current = msg.payload.hostId;
    //                 }
    //                 if (msg.payload?.members) {
    //                     setMembers(mergeMembers(msg.payload.members));
    //                 }
    //                 break;
    //         }
    //     });

    //     return () => unsubscribe();
    // }, [group.id, user.id]);

    useEffect(() => {
        // 0. 先把目前 group 成員塞進 ref（避免 stale）
        membersRef.current = group.members || [];
        if (!hostIdRef.current && group.members[0]) {
            hostIdRef.current = group.members[0].id;
        }

        // 1. 先訂閱，之後所有訊息都收得到
        const unsubscribe = p2p.subscribe((msg: P2PMessage) => {
            if (msg.groupId !== group.id) return;

            switch (msg.type) {
                case 'JOIN_REQUEST': {
                    // 通常 host 處理，不過讓所有人 merge 也沒關係
                    const next = mergeMembers([msg.payload.user]);
                    setMembers(next);
                    // host 回傳完整 roster
                    if (hostIdRef.current === user.id) {
                        p2p.send('LOBBY_UPDATE', group.id, user.id, {
                            members: next,
                            hostId: hostIdRef.current,
                        });
                    }
                    break;
                }

                case 'LOBBY_UPDATE': {
                    if (msg.payload?.hostId) {
                        hostIdRef.current = msg.payload.hostId;
                    }
                    if (msg.payload?.members) {
                        setMembers(mergeMembers(msg.payload.members));
                    }
                    break;
                }

                case 'START_SESSION':
                    onStart(group, msg.payload?.restaurants);
                    break;
            }
        });

        // 2. 加入這個 group 的房間（給 p2p 用）
        p2p.joinGroup(group.id, user);

        // 3. 本地先把自己放進畫面中
        const initialMembers = mergeMembers([user]);
        setMembers(initialMembers);

        // 4. 對外宣告「我來了」，請 host 把我加進 roster 再廣播回來
        p2p.send('JOIN_REQUEST', group.id, user.id, { user });

        return () => {
            unsubscribe();
        };
    }, [group.id, user.id]);


    const handleStartClick = () => {
        onStart(group);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(group.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
    <div className="p-4 pt-8 min-h-screen bg-gradient-to-b from-red-50/60 via-white to-white pb-52">
            <div className="bg-white rounded-3xl p-6 shadow-lg space-y-4 mb-6 border border-gray-100">
                <div className="flex justify-between items-start">
                     <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
                     <button onClick={onEdit} className="text-primary text-xs font-bold bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors">Edit</button>
                </div>
                {group.note && <p className="text-gray-600 bg-gray-100 p-3 rounded-lg text-sm">{group.note}</p>}
                
                <div className="grid grid-cols-2 gap-y-3 text-sm text-gray-600">
                    <div><span className="font-semibold block text-xs text-gray-400">Date & Time</span>{group.date} @ {group.time}</div>
                    <div><span className="font-semibold block text-xs text-gray-400">Area</span>{group.area}</div>
                </div>

                <div className="pt-2">
                    <label className="text-xs font-bold text-gray-400 mb-2 block flex items-center gap-1">
                        <Share2 size={12}/> SHARE GROUP ID
                    </label>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-gray-900 text-white rounded-lg px-3 py-3 text-lg text-center tracking-widest font-mono font-bold">
                            {group.id}
                        </div>
                        <button 
                            onClick={handleCopy}
                            className={`px-4 rounded-lg font-bold text-white transition-all ${copied ? 'bg-green-500' : 'bg-gray-200 text-gray-600'}`}
                        >
                            {copied ? <Check size={20}/> : <Copy size={20}/>}
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 text-center">
                        Open this app in another tab and enter this ID to join!
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-lg space-y-4 border border-gray-100">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Your name in this group</label>
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                        <input 
                            value={tempDisplayName}
                            onChange={e => setTempDisplayName(e.target.value)}
                            className="flex-1 border rounded-lg px-3 py-2 bg-gray-50"
                            placeholder="Enter display name"
                        />
                        <button 
                            onClick={() => {
                                const updatedMembers = liveMembers.map(m => m.id === user.id ? { ...m, name: tempDisplayName || user.name } : m);
                                setMembers(updatedMembers);
                                p2p.send('LOBBY_UPDATE', group.id, user.id, { members: updatedMembers, hostId: hostIdRef.current });
                            }}
                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold"
                        >
                            Save
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">Each group can have a different display name.</p>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Users size={18} className="text-primary" />
                        Lobby ({liveMembers.length})
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-xs text-green-600 font-bold">Live Sync</span>
                    </div>
                </div>
                <div className="space-y-3">
                    <AnimatePresence>
                        {liveMembers.map((m, i) => {
                            const hostId = hostIdRef.current || liveMembers[0]?.id || group.members[0]?.id;
                            return (
                            <motion.div 
                                key={m.id} 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${m.id === user.id ? 'bg-primary' : 'bg-gray-400'}`}>
                                        {m.name[0]?.toUpperCase()}
                                    </div>
                                    <span className="text-gray-700 font-medium">{m.name} {m.id === user.id && '(You)'}</span>
                                </div>
                                {m.id === hostId && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Host</span>}
                            </motion.div>
                            );
                        })}
                    </AnimatePresence>
                    <div className="pt-2 border-t border-dashed border-gray-200 text-center">
                        <p className="text-xs text-gray-400 animate-pulse">Waiting for others...</p>
                    </div>
                </div>
            </div>

            <div className="fixed inset-x-3 sm:inset-x-6 bottom-24 sm:bottom-20 z-40">
                <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-gray-200 p-3 flex flex-col gap-2">
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={onBack} className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold shadow-sm w-full">Back</button>
                        <button onClick={onHistory} className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold shadow-sm w-full flex items-center justify-center gap-2">
                            <History size={18} /> History
                        </button>
                        <button
                            onClick={() => {
                                const updatedMembers = group.members.filter(m => m.id !== user.id);
                                const updated = { ...group, members: updatedMembers };
                                saveGroup(updated);
                                onBack();
                            }}
                            className="px-4 py-3 bg-red-50 text-red-500 rounded-xl font-bold shadow-sm border border-red-100 w-full"
                        >
                            Leave
                        </button>
                    </div>
                    <button 
                        onClick={handleStartClick} 
                        disabled={loading}
                        className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-red-200 disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {loading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <Sparkles size={18} />}
                        {loading ? "Finding..." : "Start"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// 4. Swiping View (Tinder Style)
interface SwipingViewProps {
    restaurants: Restaurant[];
    user: UserProfile;
    groupId: string;
    onFinish: (likes: string[], dislikes: string[]) => void;
    onOpenDetail: (r: Restaurant) => void;
    onBack: () => void;
    onShowTutorial: () => void;
}

const SwipingView: React.FC<SwipingViewProps> = ({ restaurants, user, groupId, onFinish, onOpenDetail, onBack, onShowTutorial }) => {
    const [currentIndex, setCurrentIndex] = useState(restaurants.length - 1);
    const [likes, setLikes] = useState<string[]>([]);
    const [dislikes, setDislikes] = useState<string[]>([]);
    
    const x = useMotionValue(0);
    const controls = useAnimation();
    
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const likeOpacity = useTransform(x, [20, 150], [0, 1]); 
    const nopeOpacity = useTransform(x, [-150, -20], [1, 0]); 
    
    // Broadcast my voting activity
    useEffect(() => {
        p2p.send('VOTE_UPDATE', groupId, user.id, { 
            status: 'VOTING', 
            progress: ((restaurants.length - 1 - currentIndex) / restaurants.length) 
        });
    }, [currentIndex]);

    const handleSwipe = async (direction: 'like' | 'nope') => {
        const targetX = direction === 'like' ? 500 : -500;
        await controls.start({
            x: targetX,
            rotate: direction === 'like' ? 20 : -20,
            opacity: 0,
            transition: { duration: 0.3 }
        });
        
        const r = restaurants[currentIndex];
        
        if (direction === 'like') {
             setLikes(prev => [...prev, r.id]);
        } else {
             setDislikes(prev => [...prev, r.id]);
        }

        setCurrentIndex(prev => prev - 1);
        x.set(0);
        controls.set({ x: 0, rotate: 0, opacity: 1 });
    };

    const handleDragEnd = (event: any, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        if (offset > 100 || velocity > 500) {
            handleSwipe('like');
        } else if (offset < -100 || velocity < -500) {
            handleSwipe('nope');
        } else {
             controls.start({ x: 0, rotate: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
        }
    };

    useEffect(() => {
        if (currentIndex < 0) {
            p2p.send('VOTE_UPDATE', groupId, user.id, { status: 'FINISHED' });
            onFinish(likes, dislikes);
        }
    }, [currentIndex, likes, dislikes, onFinish]);

    if (currentIndex < 0) return <div className="flex flex-col items-center justify-center h-screen bg-white text-gray-800 font-bold text-xl animate-pulse">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        Waiting for others...
    </div>;

    return (
        <div className="fixed inset-0 bg-slate-50 z-[60] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 pt-6">
                <button onClick={onBack} className="p-3 bg-white rounded-full shadow-sm text-gray-500 hover:bg-gray-100">
                    <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-gray-800">Discover</span>
                    <span className="text-xs text-gray-400">{restaurants.length - 1 - currentIndex} / {restaurants.length}</span>
                </div>
                <div className="w-12"></div>
            </div>

            <div className="flex-1 relative w-full max-w-md mx-auto px-4 pb-24 flex items-center justify-center">
                {restaurants.map((r, index) => {
                    if (index > currentIndex) return null;
                    if (index < currentIndex - 1) return null; 

                    const isFront = index === currentIndex;
                    return (
                        <motion.div
                            key={r.id}
                            style={{ 
                                x: isFront ? x : 0, 
                                rotate: isFront ? rotate : 0, 
                                zIndex: index,
                            }}
                            animate={isFront ? controls : {}}
                            drag={isFront ? "x" : false}
                            dragConstraints={{ left: 0, right: 0 }}
                            onDragEnd={handleDragEnd}
                            className="absolute w-[calc(100%-32px)] aspect-[3/4] max-h-[70vh] bg-white rounded-3xl shadow-xl overflow-hidden cursor-grab active:cursor-grabbing border border-gray-100 select-none"
                        >
                            <div className="relative h-2/3">
                                <img src={r.images[0]} alt={r.name} className="w-full h-full object-cover pointer-events-none" />
                                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />
                                
                                <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-8 border-4 border-green-500 text-green-500 font-extrabold text-4xl px-4 py-1 rounded-lg transform -rotate-12 bg-black/10 backdrop-blur-sm tracking-widest">
                                    LIKE
                                </motion.div>
                                <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-8 border-4 border-red-500 text-red-500 font-extrabold text-4xl px-4 py-1 rounded-lg transform rotate-12 bg-black/10 backdrop-blur-sm tracking-widest">
                                    NOPE
                                </motion.div>

                                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                                    <h2 className="text-3xl font-bold leading-tight drop-shadow-md mb-1">{r.name}</h2>
                                    <div className="flex items-center gap-2 text-sm font-medium opacity-90">
                                        <MapPin size={14} /> {r.distanceKm} km away
                                        <span>•</span>
                                        <Star size={14} className="text-yellow-400 fill-yellow-400" /> {r.rating}
                                    </div>
                                </div>
                            </div>

                            <div className="h-1/3 p-5 flex flex-col justify-between bg-white relative">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start text-gray-600 text-sm">
                                        <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full"><Clock size={14}/> {r.avgWaitMin}-{r.avgWaitMax} min wait</div>
                                        <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full"><DollarSign size={14}/> ${r.avgCostMin}-{r.avgCostMax}</div>
                                    </div>
                                    <p className="text-gray-500 text-sm line-clamp-2">{r.description}</p>
                                    <div className="text-xs text-gray-400 uppercase tracking-wide font-bold">{r.foodTypes.slice(0,3).join(' • ')}</div>
                                </div>
                                
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onOpenDetail(r); }}
                                    className="absolute bottom-5 right-5 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                                >
                                    <Info size={20} />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <div className="absolute bottom-12 left-0 right-0 flex justify-center items-center gap-6 z-50">
                <button 
                    onClick={() => handleSwipe('nope')}
                    className="w-16 h-16 bg-white rounded-full shadow-lg text-red-500 flex items-center justify-center border border-gray-100 hover:scale-110 active:scale-95 transition-transform"
                >
                    <X size={32} strokeWidth={3} />
                </button>
                <button 
                    onClick={onShowTutorial}
                    className="w-12 h-12 bg-white rounded-full shadow-lg text-blue-400 flex items-center justify-center border border-gray-100 hover:scale-110 active:scale-95 transition-transform"
                >
                    <Info size={24} strokeWidth={2.5} />
                </button>
                <button 
                    onClick={() => handleSwipe('like')}
                    className="w-16 h-16 bg-gradient-to-tr from-green-400 to-green-600 rounded-full shadow-lg text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-green-200"
                >
                    <Heart size={32} strokeWidth={3} fill="white" />
                </button>
            </div>
        </div>
    );
};

// 5. Results View
const ResultsView = ({ 
    sessionRestaurants, 
    onClose, 
    groupId, 
    user, 
    selectedGroup, 
    votePayloads 
}: { 
    sessionRestaurants: Restaurant[], 
    onClose: () => void, 
    groupId: string, 
    user: UserProfile, 
    selectedGroup: Group, 
    votePayloads: Record<string, { likes: string[]; dislikes: string[]; name?: string }> 
}) => {

    const membersMap = useMemo(() => {
        const map: Record<string, UserProfile> = {};
        selectedGroup.members.forEach(m => { map[m.id] = m; });
        return map;
    }, [selectedGroup.members]);

    // Aggregate votes: count likes per restaurant
    const ranking = useMemo(() => {
        const counts: Record<string, number> = {};
        const voters = Object.keys(votePayloads);
        voters.forEach(uid => {
            (votePayloads[uid]?.likes || []).forEach(rid => {
                counts[rid] = (counts[rid] || 0) + 1;
            });
        });

        const withMeta = sessionRestaurants.map(r => ({
            restaurant: r,
            likes: counts[r.id] || 0,
        }));

        withMeta.sort((a, b) => b.likes - a.likes);
        const topFive = withMeta.slice(0, 5);
        if (withMeta.length <= 5) return withMeta;
        const cutoff = topFive[topFive.length - 1]?.likes ?? 0;
        return withMeta.filter(item => item.likes >= cutoff).slice(0, withMeta.length);
    }, [sessionRestaurants, votePayloads]);

    // Prepare per-restaurant voter lists if not anonymous
    const perRestaurantVotes = useMemo(() => {
        const map: Record<string, { liked: string[]; disliked: string[] }> = {};
        sessionRestaurants.forEach(r => map[r.id] = { liked: [], disliked: [] });

        Object.entries(votePayloads).forEach(([uid, payload]) => {
            payload.likes?.forEach(rid => {
                if (map[rid]) map[rid].liked.push(uid);
            });
            payload.dislikes?.forEach(rid => {
                if (map[rid]) map[rid].disliked.push(uid);
            });
        });
        return map;
    }, [sessionRestaurants, votePayloads]);

    const isAnonymous = selectedGroup.anonymousVoting;

    return (
        <div className="fixed inset-0 bg-gray-50 z-[70] p-6 overflow-y-auto pb-24 pt-12 animate-in slide-in-from-bottom-20 duration-500">
            <h1 className="text-2xl font-bold text-center mb-2">Voting Results</h1>
            <p className="text-center text-gray-500 mb-6 text-sm">
                Showing top picks (including ties). {isAnonymous ? 'Votes are anonymous.' : 'Likes/Dislikes are visible.'}
            </p>

            <div className="space-y-4">
                {ranking.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10 flex flex-col items-center">
                         <div className="bg-gray-200 p-4 rounded-full mb-4"><X size={32} /></div>
                         No votes received yet.
                    </div>
                ) : (
                    ranking.map((entry, idx) => {
                        const voteDetail = perRestaurantVotes[entry.restaurant.id] || { liked: [], disliked: [] };
                        const getName = (id: string) => membersMap[id]?.name || votePayloads[id]?.name || 'Unknown';
                        const likedNames = voteDetail.liked.map(getName);
                        const dislikedNames = voteDetail.disliked.map(getName);
                        return (
                            <div key={entry.restaurant.id} className="bg-white p-4 rounded-xl shadow border border-gray-100 relative overflow-hidden">
                                 <div className="absolute top-0 left-0 bg-yellow-400 text-white px-3 py-1 rounded-br-xl font-bold z-10">
                                    #{idx + 1} • {entry.likes} likes
                                 </div>
                                 <div className="flex gap-4 mt-2">
                                    <img src={entry.restaurant.images[0]} className="w-20 h-20 rounded-lg object-cover bg-gray-200 shrink-0" alt=""/>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg leading-tight mb-1">{entry.restaurant.name}</h3>
                                        <div className="flex items-center text-xs text-gray-500 mb-2">
                                            <Star size={12} fill="#9ca3af" className="mr-1"/> {entry.restaurant.rating} • {entry.restaurant.area}
                                        </div>
                                        {!isAnonymous && (
                                            <div className="space-y-1 text-xs text-gray-600">
                                                <div><span className="font-semibold">Liked by:</span> {likedNames.length ? likedNames.join(', ') : '—'}</div>
                                                <div><span className="font-semibold">Disliked by:</span> {dislikedNames.length ? dislikedNames.join(', ') : '—'}</div>
                                            </div>
                                        )}
                                    </div>
                                 </div>
                            </div>
                        );
                    })
                )}
            </div>
            <button onClick={onClose} className="fixed bottom-6 left-6 right-6 bg-gray-900 text-white py-4 rounded-xl font-bold shadow-lg z-50">Close to Group</button>
        </div>
    );
};

// 6. Waiting View
const WaitingView = ({ group, statusMap }: { group: Group, statusMap: Record<string, string> }) => {
    return (
        <div className="fixed inset-0 bg-white z-[65] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Waiting for others...</h2>
            <p className="text-gray-500 mb-6 text-sm">We’ll show the results when everyone finishes swiping.</p>

            <div className="w-full max-w-md bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left">
                <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Status</h3>
                <div className="space-y-2">
                    {group.members.map((m, idx) => {
                        const status = statusMap[m.id] || 'VOTING';
                        return (
                            <div key={m.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-primary' : 'bg-gray-400'}`}>
                                        {m.name[0]?.toUpperCase()}
                                    </div>
                                    <div className="text-sm font-medium text-gray-700">{m.name}</div>
                                </div>
                                <span className={`text-xs font-bold ${status === 'FINISHED' ? 'text-green-600' : 'text-yellow-500'}`}>
                                    {status === 'FINISHED' ? 'Finished' : 'In Progress'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// 7. History View
const HistoryView = ({ groupId, onClose }: { groupId: string, onClose: () => void }) => {
    const results = getSelectionResults(groupId);
    return (
        <div className="fixed inset-0 bg-white z-[45] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 pt-12 border-b border-gray-100 flex items-center gap-3">
                 <button onClick={onClose} className="p-2 bg-gray-100 rounded-full"><ChevronLeft size={20}/></button>
                 <h2 className="text-xl font-bold">Session History</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {results.length === 0 ? (
                    <div className="text-center text-gray-400 mt-20">No history found for this group.</div>
                ) : (
                    results.map(res => (
                        <div key={res.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-gray-400 uppercase">{new Date(res.timestamp).toLocaleDateString()}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${res.type === 'MATCH' ? 'bg-green-500' : 'bg-blue-400'}`}>
                                    {res.type}
                                </span>
                            </div>
                            <div className="text-sm text-gray-500">
                                {res.type === 'MATCH' ? "Match Found" : "Voting Session"}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// 8. Tutorial Overlay
const TutorialOverlay = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={onClose}>
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
                <HelpCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">How to Play</h2>
            <div className="space-y-4 text-left">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold shrink-0"><Heart size={18}/></div>
                    <div><div className="font-bold text-gray-800">Swipe Right</div><div className="text-sm text-gray-500">Like a restaurant</div></div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold shrink-0"><X size={18}/></div>
                    <div><div className="font-bold text-gray-800">Swipe Left</div><div className="text-sm text-gray-500">Pass / Nope</div></div>
                </div>
            </div>
            <button onClick={onClose} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl shadow-lg">Got it!</button>
        </div>
    </div>
);

// --- Main Component ---
const GroupPage: React.FC = () => {
  const [view, setView] = useState<'LIST' | 'CREATE' | 'EDIT' | 'DETAIL' | 'SWIPE' | 'RESULTS' | 'MATCH' | 'HISTORY' | 'WAIT'>('LIST');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [detailRestaurant, setDetailRestaurant] = useState<Restaurant | null>(null);
  const [sessionLikes, setSessionLikes] = useState<string[]>([]);
  const [sessionRestaurants, setSessionRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(getUserProfile());
  const [showTutorial, setShowTutorial] = useState(false);
  const [voteStatus, setVoteStatus] = useState<Record<string, string>>({});
  const [votePayloads, setVotePayloads] = useState<Record<string, { likes: string[]; dislikes: string[]; name?: string }>>({});
  const refreshGroups = () => setGroups(getGroups().filter(g => g.members.some(m => m.id === currentUser.id)));

  useEffect(() => {
    refreshGroups();
    
    // Listen for global starts (e.g. if I am in LIST view but someone started my group, should I jump? 
    // Complexity: High. For now, only jump if I am in DETAIL view)
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      p2p.joinGroup(selectedGroup.id, currentUser);
    }
  }, [selectedGroup?.id, currentUser]);

  // Listen for vote updates to know when peers finish
  useEffect(() => {
    const unsubscribe = p2p.subscribe((msg: P2PMessage) => {
        if (!selectedGroup || msg.groupId !== selectedGroup.id) return;
        if (msg.type === 'VOTE_UPDATE') {
            const status = msg.payload?.status || 'VOTING';
            setVoteStatus(prev => ({ ...prev, [msg.senderId]: status }));
        }
        if (msg.type === 'SESSION_FINISH') {
            const likes = msg.payload?.likes || [];
            const dislikes = msg.payload?.dislikes || [];
            const name = msg.payload?.name;
            setVotePayloads(prev => ({ ...prev, [msg.senderId]: { likes, dislikes, name } }));
            setVoteStatus(prev => ({ ...prev, [msg.senderId]: 'FINISHED' }));
        }
    });
    return () => unsubscribe();
  }, [selectedGroup?.id]);

  // When everyone is finished and we are waiting, advance to results
  useEffect(() => {
    if (view !== 'WAIT' || !selectedGroup) return;
    const memberIds = selectedGroup.members.map(m => m.id);
    const statusValues = Object.values(voteStatus);

    // Prefer explicit member list if present, but fall back to any reported participants
    const allDoneFromMembers = memberIds.length > 0 && memberIds.every(id => voteStatus[id] === 'FINISHED');
    const allDoneFromReports = statusValues.length > 0 && statusValues.every(v => v === 'FINISHED');

    if (allDoneFromMembers || allDoneFromReports) setView('RESULTS');
  }, [voteStatus, view, selectedGroup]);

  const handleCreate = (newGroup: Group) => {
      saveGroup(newGroup);
      refreshGroups();
      setSelectedGroup(newGroup);
      setView('DETAIL');
  };

  const handleJoinByInput = (id: string) => {
      // 1. Check if group exists locally
      let g = getGroupById(id);
      
      // 2. If not, create a temporary local shell for it so we can enter lobby.
      // In a real app, we would fetch from server.
      if (!g) {
          const newStubGroup: Group = {
            id: id,
            name: `Group ${id}`,
            note: 'Joined via ID',
            area: 'Unknown',
            date: '',
            time: '',
            swipingAmount: 10,
            isVegetarian: false,
            members: [currentUser],
            inviteLink: '',
            idealPriceRange: '',
            maxWaitTime: ''
          };
          saveGroup(newStubGroup);
          g = newStubGroup;
          refreshGroups();
      }
      
      setSelectedGroup(g);
      setView('DETAIL');
  };

  const handleLeaveGroup = (groupId: string) => {
      const group = getGroupById(groupId);
      if (!group) return;
      const updatedMembers = group.members.filter(m => m.id !== currentUser.id);
      if (updatedMembers.length === 0) {
          deleteGroup(groupId);
      } else {
          saveGroup({ ...group, members: updatedMembers });
      }
      refreshGroups();
      setSelectedGroup(null);
      setView('LIST');
  };

  const handleStartSession = async (groupToStart: Group, sharedRestaurants?: Restaurant[]) => {
      if (!groupToStart) return;
      setLoading(true);
      setVoteStatus({}); // reset status each session
      setVotePayloads({});
      
      try {
          let sessionSet: Restaurant[] = [];
          const isHost = (groupToStart.members && groupToStart.members[0]?.id === currentUser.id) || groupToStart.members.length === 0;

          if (sharedRestaurants && sharedRestaurants.length > 0) {
              // Use host-provided deck for deterministic order across devices.
              sessionSet = sharedRestaurants;
          } else {
              if (!isHost) {
                  // Non-host should wait for host to send the deck; avoid fetching independently.
                  setLoading(false);
                  return;
              }
              let query = groupToStart.note || "restaurants";
              if (groupToStart.isVegetarian) query += " vegetarian";
              if (groupToStart.idealPriceRange) query += ` price range ${groupToStart.idealPriceRange}`;

              const requested = groupToStart.swipingAmount > 0 ? groupToStart.swipingAmount : 10;
              const searchArea = groupToStart.area || '新竹市東區';
              const results = await searchRestaurants(searchArea, query, requested);
              
              if (results.length === 0) {
                  alert("Could not find any restaurants.");
                  setLoading(false);
                  return;
              }

              const count = requested;
              sessionSet = results.slice(0, count);
              if (sessionSet.length < count) {
                  // Backfill with mock data if not enough
                  const remaining = count - sessionSet.length;
                  const filler = MOCK_RESTAURANTS
                    .filter(r => !sessionSet.find(s => s.id === r.id))
                    .slice(0, remaining);
                  sessionSet = [...sessionSet, ...filler];
              }

              // Broadcast the deck so peers use the same order
              p2p.send('START_SESSION', groupToStart.id, currentUser.id, { restaurants: sessionSet });
          }

          setSessionRestaurants(sessionSet);
          // mark self as voting
          setVoteStatus({ [currentUser.id]: 'VOTING' });
          
          // Important: Ensure we are still using the group object state
          setSelectedGroup(groupToStart);
          setView('SWIPE');

      } catch (e) {
          console.error(e);
          alert("Error connecting to Google Maps.");
      } finally {
          setLoading(false);
      }
  };

  const handleSwipeFinish = (likes: string[], dislikes: string[]) => {
      if (selectedGroup) {
          saveSelectionResult({
            id: Date.now().toString(),
            groupId: selectedGroup.id,
            timestamp: Date.now(),
            type: 'VOTE',
            likes: likes
          });
      }
      setSessionLikes(likes);
      setVoteStatus(prev => ({ ...prev, [currentUser.id]: 'FINISHED' }));
      setVotePayloads(prev => ({ ...prev, [currentUser.id]: { likes, dislikes, name: currentUser.name } }));
      p2p.send('SESSION_FINISH', selectedGroup?.id || '', currentUser.id, { likes, dislikes, name: currentUser.name });
      setView('WAIT');
  };

  const updateName = (name: string) => {
      const updated = updateUserProfile(name);
      setCurrentUser(updated);
  };

  return (
    <div className="min-h-screen bg-gray-50">
        {view === 'LIST' && (
            <GroupListView 
                groups={groups} 
                user={currentUser}
                onCreateClick={() => setView('CREATE')}
                onGroupClick={(g) => { setSelectedGroup(g); setView('DETAIL'); }}
                onJoinClick={handleJoinByInput}
                onUpdateName={updateName}
            />
        )}

        {view === 'CREATE' && (
            <GroupForm 
                onBack={() => setView('LIST')}
                onSubmit={handleCreate}
                user={currentUser}
            />
        )}

        {view === 'EDIT' && selectedGroup && (
             <GroupForm 
                onBack={() => setView('DETAIL')}
                onSubmit={handleCreate}
                initialData={selectedGroup}
                user={currentUser}
            />
        )}

        {view === 'DETAIL' && selectedGroup && (
            <GroupDetailView 
                group={selectedGroup}
                user={currentUser}
                onBack={() => setView('LIST')}
                onHistory={() => setView('HISTORY')}
                onStart={handleStartSession}
                onEdit={() => setView('EDIT')}
                loading={loading}
                onLeave={() => handleLeaveGroup(selectedGroup.id)}
            />
        )}

        {view === 'HISTORY' && selectedGroup && (
            <HistoryView 
                groupId={selectedGroup.id} 
                onClose={() => setView('DETAIL')} 
            />
        )}

        {view === 'SWIPE' && selectedGroup && (
            <SwipingView 
                restaurants={sessionRestaurants} 
                user={currentUser}
                groupId={selectedGroup.id}
                onFinish={handleSwipeFinish}
                onOpenDetail={setDetailRestaurant}
                onBack={() => setView('DETAIL')}
                onShowTutorial={() => setShowTutorial(true)}
            />
        )}

        {view === 'RESULTS' && selectedGroup && (
            <ResultsView 
                sessionRestaurants={sessionRestaurants}
                onClose={() => setView('DETAIL')}
                groupId={selectedGroup.id}
                user={currentUser}
                selectedGroup={selectedGroup}
                votePayloads={votePayloads}
            />
        )}

        {view === 'WAIT' && selectedGroup && (
            <WaitingView group={selectedGroup} statusMap={voteStatus} />
        )}

        {detailRestaurant && (
            <RestaurantDetail 
                restaurant={detailRestaurant} 
                onClose={() => setDetailRestaurant(null)} 
                zIndexOverride={80}
            />
        )}

        {showTutorial && (
            <TutorialOverlay onClose={() => setShowTutorial(false)} />
        )}
    </div>
  );
};

export default GroupPage;
