import React, { useState, useEffect } from 'react';
import { networkManager } from '../services/offline/NetworkManager';
import { syncQueueService, SyncItem } from '../services/offline/SyncQueueService';
import { syncEngine } from '../services/offline/SyncEngine';
import { Wifi, WifiOff, RefreshCw, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

const DebugSyncPanel: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(networkManager.getStatus());
    const [pendingItems, setPendingItems] = useState<SyncItem[]>([]);

    useEffect(() => {
        const interval = setInterval(async () => {
            const items = await syncQueueService.getPendingItems();
            setPendingItems(items);
            setIsOnline(networkManager.getStatus());
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const toggleNetwork = () => {
        // We can't actually change system network, but we can mock it for our services
        // For this debug panel, we'll just show the status
        console.log('Use Browser DevTools (Network tab) to simulate offline mode');
    };

    return (
        <div className={`fixed bottom-20 right-4 z-[9999] transition-all ${isOpen ? 'w-72' : 'w-12 h-12'}`}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl border-2 border-slate-700"
            >
                {isOpen ? <ChevronDown /> : <RefreshCw className={pendingItems.length > 0 ? 'animate-spin' : ''} />}
                {pendingItems.length > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {pendingItems.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="mt-2 bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border-2 border-slate-700 overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Sync Monitor</h3>
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </div>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {pendingItems.length === 0 ? (
                            <p className="text-[10px] text-slate-500 text-center py-4 italic">No pending mutations</p>
                        ) : (
                            pendingItems.map((item) => (
                                <div key={item.id} className="bg-slate-800 rounded-lg p-2 text-[10px] border border-slate-700">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-black text-blue-400">{item.type}</span>
                                        <span className={`font-bold px-1 rounded ${item.priority === 'HIGH' ? 'bg-red-500' : 'bg-slate-600'}`}>{item.priority}</span>
                                    </div>
                                    <p className="text-slate-400 truncate opacity-70">{JSON.stringify(item.payload)}</p>
                                </div>
                            ))
                        )}
                    </div>

                    {isOnline && pendingItems.length > 0 && (
                        <button 
                            onClick={() => syncEngine.processQueue()}
                            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={12} /> SYNC NOW
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default DebugSyncPanel;
