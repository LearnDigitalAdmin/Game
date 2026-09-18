// src/global/tactics/TacticsUIComponents.tsx
// React components for tactical setup, drag-drop lineups, and position management

import React, { useState } from 'react';
import type { Formation } from './TacticalDatabaseSchema';

export interface FormationViewProps {
  formation: Formation;
  selectedPlayers: Map<number, string>; // position_slot -> player_id
  onPlayerSelect: (positionSlot: number, playerId: string) => void;
  onPlayerDrop: (positionSlot: number, playerId: string) => void;
  availablePlayers: {
    id: string;
    name: string;
    position: string;
    rating: number;
    form: number;
  }[];
}

/**
 * Visual formation display with drag-drop player placement
 */
export const FormationView: React.FC<FormationViewProps> = ({
  formation,
  selectedPlayers,
  onPlayerDrop,
  availablePlayers,
}) => {
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);

  const handleDragStart = (playerId: string) => {
    setDraggedPlayer(playerId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (positionSlot: number) => {
    if (draggedPlayer) {
      onPlayerDrop(positionSlot, draggedPlayer);
      setDraggedPlayer(null);
    }
  };

  // Calculate position on pitch (0-100 scales)
  const getPositionStyle = (x: number, y: number) => ({
    left: `${x}%`,
    top: `${y}%`,
    position: 'absolute' as const,
  });

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      paddingBottom: '141%', // 1.41 aspect ratio for football pitch
      backgroundColor: '#1a5f2d',
      border: '2px solid #fff',
      overflow: 'hidden',
    }}>
      {/* Pitch markings */}
      <svg style={{ position: 'absolute', width: '100%', height: '100%' }}>
        <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="white" strokeWidth="1" />
        <circle cx="50%" cy="50%" r="10%" fill="none" stroke="white" strokeWidth="1" />
        <circle cx="50%" cy="50%" r="1%" fill="white" />
      </svg>

      {/* Player positions */}
      {formation.positions.map((pos) => {
        const playerId = selectedPlayers.get(pos.position_slot);
        const player = playerId
          ? availablePlayers.find((p) => p.id === playerId)
          : null;

        return (
          <div
            key={pos.position_slot}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(pos.position_slot)}
            style={{
              ...getPositionStyle(pos.x_position, pos.y_position),
              width: '50px',
              height: '50px',
              transform: 'translate(-50%, -50%)',
              backgroundColor: player ? '#ffcc00' : '#fff',
              border: '2px solid #000',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              opacity: draggedPlayer === playerId ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
            title={`${pos.position_name} - ${pos.role}`}
          >
            {player ? (
              <span title={player.name}>
                {player.name.split(' ').map((n) => n[0]).join('')}
              </span>
            ) : (
              <span style={{ color: '#999' }}>+</span>
            )}
          </div>
        );
      })}

      {/* Bench players (available for drag) */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          right: '10px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: '10px',
          borderRadius: '5px',
          maxHeight: '120px',
          overflowY: 'auto',
        }}
      >
        {availablePlayers
          .filter((p) => !Array.from(selectedPlayers.values()).includes(p.id))
          .map((player) => (
            <div
              key={player.id}
              draggable
              onDragStart={() => handleDragStart(player.id)}
              style={{
                padding: '5px 10px',
                backgroundColor: '#4CAF50',
                color: 'white',
                borderRadius: '3px',
                cursor: 'grab',
                whiteSpace: 'nowrap',
                fontSize: '12px',
              }}
              title={`${player.name} (${player.position}) - Rating: ${player.rating}, Form: ${player.form}`}
            >
              {player.name.substring(0, 15)} ({player.rating})
            </div>
          ))}
      </div>
    </div>
  );
};

/**
 * Tactical settings panel
 */
export interface TacticsSettingsPanelProps {
  mentality: string;
  tempo: number;
  pressure: string;
  defLine: string;
  onMentalityChange: (value: string) => void;
  onTempoChange: (value: number) => void;
  onPressureChange: (value: string) => void;
  onDefLineChange: (value: string) => void;
}

export const TacticsSettingsPanel: React.FC<TacticsSettingsPanelProps> = ({
  mentality,
  tempo,
  pressure,
  defLine,
  onMentalityChange,
  onTempoChange,
  onPressureChange,
  onDefLineChange,
}) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      padding: '15px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
    }}>
      {/* Mentality */}
      <div>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
          Mentality
        </label>
        <select
          value={mentality}
          onChange={(e) => onMentalityChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
          }}
        >
          <option value="ultra_defensive">Ultra Defensive</option>
          <option value="defensive">Defensive</option>
          <option value="balanced">Balanced</option>
          <option value="attacking">Attacking</option>
          <option value="ultra_attacking">Ultra Attacking</option>
        </select>
      </div>

      {/* Tempo */}
      <div>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
          Tempo: {tempo}
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={tempo}
          onChange={(e) => onTempoChange(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Pressure */}
      <div>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
          Pressure
        </label>
        <select
          value={pressure}
          onChange={(e) => onPressureChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
          }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="gegenpressing">Gegenpressing</option>
        </select>
      </div>

      {/* Defensive Line */}
      <div>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
          Defensive Line
        </label>
        <select
          value={defLine}
          onChange={(e) => onDefLineChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
          }}
        >
          <option value="deep">Deep</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </div>
    </div>
  );
};

/**
 * Lineup and substitution manager
 */
export interface LineupManagerProps {
  currentLineup: string[]; // player_ids on pitch
  substitutes: string[]; // player_ids on bench
  availablePlayers: {
    id: string;
    name: string;
    position: string;
    rating: number;
    form: number;
    available: boolean;
    reason?: string;
  }[];
  onSubstitution: (playerOutId: string, playerInId: string) => void;
}

export const LineupManager: React.FC<LineupManagerProps> = ({
  currentLineup,
  substitutes,
  availablePlayers,
  onSubstitution,
}) => {
  const [selectedOut, setSelectedOut] = useState<string | null>(null);

  const handleSubstitution = (playerInId: string) => {
    if (selectedOut) {
      onSubstitution(selectedOut, playerInId);
      setSelectedOut(null);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '15px' }}>
      {/* On Pitch */}
      <div>
        <h3 style={{ borderBottom: '2px solid #4CAF50', paddingBottom: '10px' }}>
          On Pitch (11)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {availablePlayers
            .filter((p) => currentLineup.includes(p.id))
            .map((player) => (
              <div
                key={player.id}
                onClick={() => setSelectedOut(player.id)}
                style={{
                  padding: '10px',
                  backgroundColor: selectedOut === player.id ? '#ffeb3b' : '#e8f5e9',
                  border: selectedOut === player.id ? '2px solid #fbc02d' : '1px solid #4CAF50',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: selectedOut === player.id ? 'bold' : 'normal',
                }}
              >
                {player.name} ({player.position})
                <span style={{ float: 'right', color: '#666' }}>
                  {player.rating} | {player.form}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Bench */}
      <div>
        <h3 style={{ borderBottom: '2px solid #2196F3', paddingBottom: '10px' }}>
          Substitutes
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {availablePlayers
            .filter((p) => substitutes.includes(p.id) && p.available)
            .map((player) => (
              <div
                key={player.id}
                onClick={() => selectedOut && handleSubstitution(player.id)}
                style={{
                  padding: '10px',
                  backgroundColor: selectedOut ? '#e3f2fd' : '#f5f5f5',
                  border: selectedOut ? '2px solid #1976d2' : '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: selectedOut ? 'pointer' : 'default',
                  opacity: selectedOut ? 1 : 0.8,
                  fontSize: '14px',
                }}
              >
                {player.name} ({player.position})
                <span style={{ float: 'right', color: '#666' }}>
                  {player.rating} | {player.form}
                </span>
              </div>
            ))}

          {/* Unavailable players */}
          {availablePlayers
            .filter((p) => substitutes.includes(p.id) && !p.available)
            .map((player) => (
              <div
                key={player.id}
                style={{
                  padding: '10px',
                  backgroundColor: '#ffebee',
                  border: '1px solid #ef5350',
                  borderRadius: '4px',
                  cursor: 'not-allowed',
                  opacity: 0.6,
                  fontSize: '12px',
                  color: '#666',
                }}
                title={player.reason}
              >
                {player.name} ({player.position})
                <span style={{ float: 'right' }}>❌ {player.reason}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Formation selector
 */
export interface FormationSelectorProps {
  formations: Formation[];
  selectedFormation: Formation;
  onFormationSelect: (formation: Formation) => void;
}

export const FormationSelector: React.FC<FormationSelectorProps> = ({
  formations,
  selectedFormation,
  onFormationSelect,
}) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
      gap: '10px',
      padding: '15px',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
    }}>
      {formations.map((formation) => (
        <button
          key={formation.id}
          onClick={() => onFormationSelect(formation)}
          style={{
            padding: '15px',
            backgroundColor: selectedFormation.id === formation.id ? '#4CAF50' : '#fff',
            color: selectedFormation.id === formation.id ? '#fff' : '#000',
            border: selectedFormation.id === formation.id ? '2px solid #2e7d32' : '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            transition: 'all 0.3s',
          }}
        >
          {formation.name}
          <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>
            {formation.code}
          </div>
        </button>
      ))}
    </div>
  );
};
