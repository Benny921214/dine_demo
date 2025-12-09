
import React, { useState, useEffect } from 'react';
import { Database, Plus, Trash2, Edit2, X, Save, Globe, Link as LinkIcon, Download, Upload, AlertCircle, AlertTriangle } from 'lucide-react';
import { getRestaurantsByArea, saveRestaurant, deleteRestaurant, getAreas, addArea, deleteArea, getDatabaseDump, restoreDatabase } from '../services/db';
import { Restaurant } from '../types';

const INITIAL_FORM: Restaurant = {
    id: '',
    name: '',
    rating: 4.0,
    distanceKm: 1.0,
    avgCostMin: 100,
    avgCostMax: 300,
    avgWaitMin: 10,
    avgWaitMax: 30,
    mealTimeHours: 1.5,
    hours: '11:00-21:00',
    address: '',
    phone: '',
    services: [],
    foodTypes: [],
    seats: 30,
    area: '',
    isOpen: true,
    images: ['https://picsum.photos/800/600'],
    description: '',
    lat: 24.8,
    lng: 120.9
};

const Admin: React.FC = () => {
  const [areas, setAreas] = useState<string[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Restaurant>(INITIAL_FORM);

  // Modal States
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importError, setImportError] = useState('');

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreJson, setRestoreJson] = useState('');

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteAreaTarget, setDeleteAreaTarget] = useState<string | null>(null);

  // Load Areas on Mount
  useEffect(() => {
    const loadedAreas = getAreas();
    setAreas(loadedAreas);
    if (loadedAreas.length > 0 && !selectedDb) {
        setSelectedDb(loadedAreas[0]);
    }
  }, []);

  // Refresh Restaurants when DB (Area) changes
  useEffect(() => {
    if (selectedDb) {
        refreshData();
    } else {
        setRestaurants([]);
    }
  }, [selectedDb]);

  const refreshData = () => {
    setRestaurants(getRestaurantsByArea(selectedDb));
  };

  // --- Area Management ---
  const handleCreateAreaSubmit = () => {
    if (newAreaName && newAreaName.trim()) {
        const name = newAreaName.trim();
        addArea(name);
        setAreas(getAreas());
        setSelectedDb(name);
        setShowAreaModal(false);
        setNewAreaName('');
    }
  };

  const handleDeleteAreaRequest = () => {
      if (selectedDb) {
          setDeleteAreaTarget(selectedDb);
      }
  };

  const confirmDeleteArea = () => {
      if (deleteAreaTarget) {
          deleteArea(deleteAreaTarget);
          const updatedAreas = getAreas();
          setAreas(updatedAreas);
          
          // Switch to another area or clear
          if (updatedAreas.length > 0) {
              setSelectedDb(updatedAreas[0]);
          } else {
              setSelectedDb('');
          }
          setDeleteAreaTarget(null);
      }
  };

  // --- Import Management ---
  const handleImportSubmit = () => {
    setImportError('');
    if (!importUrl) return;

    let name = "Imported Restaurant";
    let address = "Imported from Google Maps";
    
    try {
        const urlObj = new URL(importUrl);
        // Attempt to parse standard Google Maps URL
        // Format: /maps/place/Name/@coords...
        const parts = urlObj.pathname.split('/');
        const placeIdx = parts.indexOf('place');
        
        if (placeIdx > -1 && parts[placeIdx + 1]) {
            name = decodeURIComponent(parts[placeIdx + 1].replace(/\+/g, ' '));
        } else {
            // Try query param if exists
            const queryName = urlObj.searchParams.get('q');
            if (queryName) name = queryName;
        }
    } catch (e) {
        setImportError("Invalid URL format. Please use a full Google Maps link.");
        return;
    }

    setFormData({
        ...INITIAL_FORM,
        id: Date.now().toString(),
        name: name,
        area: selectedDb,
        address: address,
        description: `Imported from: ${importUrl}`,
        images: [`https://picsum.photos/800/600?random=${Date.now()}`]
    });
    
    setShowImportModal(false);
    setImportUrl('');
    setIsEditing(true);
  };

  // --- Backup / Restore ---
  const handleBackup = () => {
    const dump = getDatabaseDump();
    const blob = new Blob([dump], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dine_decide_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreSubmit = () => {
    if (!restoreJson.trim()) return;
    const success = restoreDatabase(restoreJson);
    if (success) {
        alert("Database restored successfully! The page will now reload.");
        window.location.reload();
    } else {
        alert("Failed to restore. Please check if the JSON is valid.");
    }
  };

  // --- CRUD Operations ---
  const handleDeleteRequest = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
        deleteRestaurant(deleteTargetId);
        refreshData();
        setDeleteTargetId(null);
    }
  };

  const handleEdit = (r: Restaurant) => {
    setFormData(r);
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setFormData({ ...INITIAL_FORM, id: Date.now().toString(), area: selectedDb });
    setIsEditing(true);
  };

  const handleSave = () => {
    saveRestaurant(formData);
    setIsEditing(false);
    refreshData();
  };

  const handleArrayInput = (field: 'services' | 'foodTypes' | 'images', value: string) => {
    setFormData({ ...formData, [field]: value.split(',').map(s => s.trim()) });
  };

  // --- Render Editor ---
  if (isEditing) {
      return (
          <div className="min-h-screen bg-white pb-24 p-6 pt-8 animate-in slide-in-from-bottom-5">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">{formData.id && restaurants.find(r => r.id === formData.id) ? 'Edit Restaurant' : 'New Restaurant'}</h2>
                  <button onClick={() => setIsEditing(false)} className="p-2 bg-gray-100 rounded-full"><X /></button>
              </div>

              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Name</label>
                      <input className="w-full border p-3 rounded-lg bg-gray-50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Area</label>
                        <select className="w-full border p-3 rounded-lg bg-gray-50" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
                            {areas.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Rating</label>
                        <input type="number" step="0.1" className="w-full border p-3 rounded-lg bg-gray-50" value={formData.rating} onChange={e => setFormData({...formData, rating: parseFloat(e.target.value)})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Min Cost</label>
                        <input type="number" className="w-full border p-3 rounded-lg bg-gray-50" value={formData.avgCostMin} onChange={e => setFormData({...formData, avgCostMin: parseInt(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Max Cost</label>
                        <input type="number" className="w-full border p-3 rounded-lg bg-gray-50" value={formData.avgCostMax} onChange={e => setFormData({...formData, avgCostMax: parseInt(e.target.value)})} />
                    </div>
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                      <input className="w-full border p-3 rounded-lg bg-gray-50" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                      <textarea className="w-full border p-3 rounded-lg bg-gray-50" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Food Types (comma separated)</label>
                      <input className="w-full border p-3 rounded-lg bg-gray-50" value={formData.foodTypes.join(', ')} onChange={e => handleArrayInput('foodTypes', e.target.value)} />
                  </div>
                  
                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Services (comma separated)</label>
                      <input className="w-full border p-3 rounded-lg bg-gray-50" value={formData.services.join(', ')} onChange={e => handleArrayInput('services', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-bold text-gray-700">Images</label>
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, images: [...formData.images, '']})}
                          className="text-xs font-bold text-primary px-2 py-1 bg-primary/10 rounded"
                        >
                          + Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {formData.images.map((img, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input 
                              className="flex-1 border p-3 rounded-lg bg-gray-50" 
                              value={img} 
                              onChange={e => {
                                const copy = [...formData.images];
                                copy[idx] = e.target.value;
                                setFormData({...formData, images: copy});
                              }} 
                              placeholder="https://..."
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                const copy = formData.images.filter((_, i) => i !== idx);
                                setFormData({...formData, images: copy.length ? copy : ['']});
                              }}
                              className="p-2 bg-gray-100 rounded hover:bg-gray-200"
                              title="Remove"
                            >
                              <X size={16}/>
                            </button>
                          </div>
                        ))}
                  </div>
                  </div>

                  <div className="pt-4">
                      <button onClick={handleSave} className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2">
                          <Save size={20} /> Save to Database
                      </button>
                  </div>
              </div>
          </div>
      )
  }

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-gray-50 pb-24 pt-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="text-primary" /> Admin Panel
        </h1>
      </div>

      {/* Database Selector Row */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Active Database (Area)</label>
        <div className="flex gap-2">
            <div className="relative flex-1">
                <select 
                    value={selectedDb} 
                    onChange={(e) => setSelectedDb(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg font-medium outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                >
                    {areas.length === 0 && <option value="">No Areas Found</option>}
                    {areas.map(area => <option key={area} value={area}>{area}</option>)}
                </select>
                <Database size={16} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
            </div>
            
            {areas.length > 0 && selectedDb && (
                 <button 
                    onClick={handleDeleteAreaRequest}
                    className="bg-red-50 text-red-500 px-4 rounded-lg font-bold text-xl shadow-sm border border-red-100 flex items-center justify-center hover:bg-red-100 transition-colors"
                    title="Delete Area"
                >
                    <Trash2 size={20} />
                </button>
            )}

            <button 
                onClick={() => setShowAreaModal(true)}
                className="bg-gray-900 text-white px-4 rounded-lg font-bold text-xl shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                title="Create New Area Database"
            >
                +
            </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full animate-pulse ${selectedDb ? 'bg-green-500' : 'bg-red-500'}`}></div>
            PostgreSQL Connected: <span className="font-semibold text-gray-700">{selectedDb || 'None'}</span>
        </div>
      </div>

      {/* Actions Row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button 
            disabled={!selectedDb}
            onClick={handleAddNew} 
            className="bg-white border-2 border-primary border-dashed text-primary p-4 rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 font-bold hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Plus size={24} />
            Add Manually
        </button>
        <button 
             disabled={!selectedDb}
            onClick={() => setShowImportModal(true)}
            className="bg-white border-2 border-blue-500 border-dashed text-blue-600 p-4 rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 font-bold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Globe size={24} />
            Import Maps
        </button>
      </div>

      {/* List */}
      <div className="space-y-4 mb-8">
        {!selectedDb ? (
             <div className="text-center text-gray-400 py-10 bg-white rounded-xl border border-gray-100">
                Please select or create an Area to manage.
            </div>
        ) : restaurants.length === 0 ? (
            <div className="text-center text-gray-400 py-10 bg-white rounded-xl border border-gray-100">
                Database is empty for this area.<br/>Add a restaurant to get started.
            </div>
        ) : (
            restaurants.map(r => (
                <div key={r.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                    {r.images?.[0] ? (
                      <img 
                        src={r.images[0]} 
                        alt={r.name} 
                        className="w-16 h-16 rounded-lg object-cover bg-gray-200 shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-200 shrink-0 flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{r.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{r.address}</p>
                        <div className="flex gap-2 mt-2">
                            <button onClick={() => handleEdit(r)} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 font-bold">
                                <Edit2 size={12} /> Edit
                            </button>
                            <button onClick={() => handleDeleteRequest(r.id)} className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 font-bold">
                                <Trash2 size={12} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* Backup Section */}
      <div className="bg-gray-100 p-4 rounded-xl border border-gray-200">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
             <AlertCircle size={14} /> Data Backup
          </h3>
          <div className="flex gap-2">
              <button 
                onClick={handleBackup}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm hover:bg-gray-50"
              >
                  <Download size={14} /> Backup
              </button>
              <button 
                onClick={() => setShowRestoreModal(true)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm hover:bg-gray-50"
              >
                  <Upload size={14} /> Restore
              </button>
          </div>
          <p className="text-[10px] text-gray-500 mt-2 leading-tight">
            The data is stored in your browser. If you lose data after an update, use the Backup/Restore buttons to save your progress.
          </p>
      </div>

      {/* --- Modals --- */}

      {/* Add Area Modal */}
      {showAreaModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg">Create New Area</h3>
                    <button onClick={() => setShowAreaModal(false)} className="p-1 rounded-full hover:bg-gray-100"><X size={20}/></button>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area Name</label>
                    <input 
                        type="text" 
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        placeholder="e.g. Taipei City"
                        className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                    />
                </div>
                <button 
                    onClick={handleCreateAreaSubmit}
                    disabled={!newAreaName.trim()}
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl disabled:opacity-50"
                >
                    Create Database
                </button>
            </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Globe size={20} className="text-blue-500"/> Import from Maps</h3>
                    <button onClick={() => setShowImportModal(false)} className="p-1 rounded-full hover:bg-gray-100"><X size={20}/></button>
                </div>
                <p className="text-sm text-gray-500">Paste a full Google Maps link to automatically fill in the restaurant details.</p>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps URL</label>
                    <div className="relative">
                        <LinkIcon size={16} className="absolute left-3 top-3.5 text-gray-400" />
                        <input 
                            type="text" 
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            placeholder="https://www.google.com/maps/place/..."
                            className="w-full p-3 pl-9 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            autoFocus
                        />
                    </div>
                    {importError && <p className="text-red-500 text-xs mt-1">{importError}</p>}
                </div>
                <button 
                    onClick={handleImportSubmit}
                    disabled={!importUrl.trim()}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 shadow-md shadow-blue-200"
                >
                    Parse & Create
                </button>
            </div>
        </div>
      )}

      {/* Restore Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Upload size={20} className="text-gray-700"/> Restore Data</h3>
                    <button onClick={() => setShowRestoreModal(false)} className="p-1 rounded-full hover:bg-gray-100"><X size={20}/></button>
                </div>
                <p className="text-sm text-gray-500">Paste the JSON data you previously backed up.</p>
                <div>
                    <textarea 
                        value={restoreJson}
                        onChange={(e) => setRestoreJson(e.target.value)}
                        placeholder='{"restaurants": [...], "areas": [...] }'
                        className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-gray-400 text-xs font-mono h-32"
                    />
                </div>
                <button 
                    onClick={handleRestoreSubmit}
                    disabled={!restoreJson.trim()}
                    className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl disabled:opacity-50 shadow-md"
                >
                    Restore & Reload
                </button>
            </div>
        </div>
      )}

      {/* Delete Restaurant Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/50 z-[65] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl text-center">
                <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <AlertTriangle size={24} />
                </div>
                <h3 className="font-bold text-lg">Delete Restaurant?</h3>
                <p className="text-sm text-gray-500">
                    Are you sure you want to delete this restaurant? This action cannot be undone and it will be removed from the database.
                </p>
                <div className="flex gap-3 pt-2">
                    <button 
                        onClick={() => setDeleteTargetId(null)}
                        className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-md hover:bg-red-600"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Delete Area Modal */}
      {deleteAreaTarget && (
        <div className="fixed inset-0 bg-black/50 z-[65] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl text-center">
                <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Database size={24} />
                </div>
                <h3 className="font-bold text-lg">Delete Area "{deleteAreaTarget}"?</h3>
                <p className="text-sm text-gray-500">
                    Warning: This will delete the area AND ALL restaurants associated with it. This action cannot be undone.
                </p>
                <div className="flex gap-3 pt-2">
                    <button 
                        onClick={() => setDeleteAreaTarget(null)}
                        className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDeleteArea}
                        className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-md hover:bg-red-600"
                    >
                        Delete Area
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Admin;
