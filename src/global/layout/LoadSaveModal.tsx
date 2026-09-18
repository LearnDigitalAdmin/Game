// LoadSaveModal.tsx - The main modal component

import { useState, useEffect } from 'react';
import { gameDB, type SaveFile } from '../database/Save';
import { Modal } from '../components/Modal';

interface LoadSaveModalProps {
  open: boolean;
  onClose: () => void;
  onLoadSave: (saveData: any) => void;
}

export function LoadSaveModal({ open, onClose, onLoadSave }: LoadSaveModalProps) {
  const [saves, setSaves] = useState<SaveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSave, setSelectedSave] = useState<SaveFile | null>(null);

  useEffect(() => {
    if (open) {
      loadSaves();
    }
  }, [open]);

  const loadSaves = async () => {
    try {
      setLoading(true);
      setError(null);
      const saveFiles = await gameDB.getSaveFiles();
      setSaves(saveFiles);
    } catch (error) {
      console.error('Error loading saves:', error);
      setError('Failed to load save files');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadGame = async (save: SaveFile) => {
    try {
      setLoadingId(save.id);
      setError(null);

      // Load full save data from database
      const saveData = await gameDB.loadSaveData(save.id);
      
      // Update last played time
      await gameDB.updateSaveProgress(save.id, {
        playtime: (save.playtime || 0) + 1 // Add 1 minute for loading
      });

      // Pass complete save data to parent
      onLoadSave({
        saveId: save.id,
        mode: save.mode,
        managerData: saveData.managerData,
        gameState: saveData.gameState,
        saveFile: save,
        startPage: save.currentPage || 'home'
      });
      
      onClose();
    } catch (error) {
      console.error('Error loading save:', error);
      setError(`Failed to load ${save.name}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteSave = async (save: SaveFile) => {
    try {
      setDeletingId(save.id);
      setError(null);
      
      await gameDB.deleteSave(save.id);
      
      // Remove from local state
      setSaves(prev => prev.filter(s => s.id !== save.id));
      setSelectedSave(null);
    } catch (error) {
      console.error('Error deleting save:', error);
      setError(`Failed to delete ${save.name}`);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPlaytime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'player': return '⚽';
      case 'manager': return '📋';
      case 'owner': return '🏢';
      default: return '🎮';
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'player': return 'bg-blue-100 text-blue-800';
      case 'manager': return 'bg-emerald-100 text-emerald-800';
      case 'owner': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Load Game">
      <div className="max-h-[70vh] overflow-hidden flex flex-col">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-slate-600">Loading save files...</span>
          </div>
        ) : saves.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">💾</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Save Files Found</h3>
            <p className="text-slate-500">Create a new game to start playing!</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="grid gap-3">
              {saves.map(save => (
                <div
                  key={save.id}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                    selectedSave?.id === save.id
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  onClick={() => setSelectedSave(save)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getModeIcon(save.mode)}</span>
                        <div>
                          <h3 className="font-semibold text-slate-900">{save.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getModeColor(save.mode)}`}>
                              {save.mode.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-slate-600">{save.clubName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Manager:</span>
                          <div className="font-medium">{save.managerName}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Season:</span>
                          <div className="font-medium">{save.season} • MD {save.matchday}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Game Date:</span>
                          <div className="font-medium">{formatDate(save.gameTime || save.gameDate)}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Playtime:</span>
                          <div className="font-medium">{formatPlaytime(save.playtime || 0)}</div>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-slate-500">
                        Last played: {formatDate(save.lastPlayed)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadGame(save);
                        }}
                        disabled={loadingId === save.id}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-md text-sm font-medium transition-colors"
                      >
                        {loadingId === save.id ? (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                            Loading...
                          </div>
                        ) : (
                          '▶️ Load'
                        )}
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSave(save);
                        }}
                        disabled={deletingId === save.id}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md text-sm font-medium transition-colors"
                      >
                        {deletingId === save.id ? (
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          '🗑️'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t mt-4">
          <div className="text-sm text-slate-500">
            {saves.length} save file{saves.length !== 1 ? 's' : ''} found
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            
            {selectedSave && (
              <button
                onClick={() => handleLoadGame(selectedSave)}
                disabled={loadingId === selectedSave.id}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium transition-colors"
              >
                {loadingId === selectedSave.id ? 'Loading...' : `Load ${selectedSave.name}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}