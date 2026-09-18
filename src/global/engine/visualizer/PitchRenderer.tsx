// src/global/engine/visualizer/PitchRenderer.tsx
// 2D pitch visualization component with real-time player positions

import React, { useEffect, useRef } from 'react';
import type { MatchState, PlayerPosition, Vector2D } from '../types/MatchTypes';

interface PitchRendererProps {
  matchState: MatchState;
  playerPositions: PlayerPosition[];
  ballPosition: Vector2D;
  selectedPlayerId?: string;
  onPlayerSelect?: (playerId: string) => void;
  showHeatmap?: boolean;
  cameraMode?: 'wide' | 'zoomed' | 'player-focus';
  width?: number;
  height?: number;
}

export const PitchRenderer: React.FC<PitchRendererProps> = ({
  matchState,
  playerPositions,
  ballPosition,
  selectedPlayerId,
  onPlayerSelect,
  width = 960,
  height = 540,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1f472f';
    ctx.fillRect(0, 0, width, height);

    // Draw pitch markings
    drawPitchMarkings(ctx, width, height);

    // Draw players
    drawPlayers(ctx, playerPositions, selectedPlayerId, width, height);

    // Draw ball
    drawBall(ctx, ballPosition, width, height);

    // Draw match info
    drawMatchInfo(ctx, matchState, width, height);
  }, [matchState, playerPositions, ballPosition, selectedPlayerId, width, height]);

  const drawPitchMarkings = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    // Center line
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Center spot
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w / 2 - 2, h / 2 - 2, 4, 4);

    // Penalty areas
    ctx.strokeRect(0, (h - 150) / 2, 80, 150);
    ctx.strokeRect(w - 80, (h - 150) / 2, 80, 150);

    // Goal areas
    ctx.strokeRect(0, (h - 90) / 2, 20, 90);
    ctx.strokeRect(w - 20, (h - 90) / 2, 20, 90);

    // Corner arcs
    const cornerRadius = 20;
    ctx.beginPath();
    ctx.arc(0, 0, cornerRadius, 0, Math.PI / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w, 0, cornerRadius, Math.PI, Math.PI * 1.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, h, cornerRadius, Math.PI / 2, Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w, h, cornerRadius, Math.PI * 1.5, Math.PI * 2);
    ctx.stroke();
  };

  const drawPlayers = (
    ctx: CanvasRenderingContext2D,
    positions: PlayerPosition[],
    selected: string | undefined,
    w: number,
    h: number
  ) => {
    positions.forEach(pos => {
      const x = (pos.position.x / 100) * w;
      const y = (pos.position.y / 100) * h;
      const radius = 8;

      // Draw player circle
      const isHomeTeam = pos.playerId.startsWith('home');
      ctx.fillStyle = selected === pos.playerId ? '#ffff00' : isHomeTeam ? '#3b82f6' : '#ef4444';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw selection highlight
      if (selected === pos.playerId) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw player number
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Would need to pass number from player data

      // Draw velocity vector
      if (pos.velocity.x !== 0 || pos.velocity.y !== 0) {
        const vx = pos.velocity.x * 5;
        const vy = pos.velocity.y * 5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + vx, y + vy);
        ctx.stroke();
      }
    });
  };

  const drawBall = (ctx: CanvasRenderingContext2D, pos: Vector2D, w: number, h: number) => {
    const x = (pos.x / 100) * w;
    const y = (pos.y / 100) * h;
    const radius = 5;

    // Ball shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + radius + 2, radius * 0.8, radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ball
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Ball shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawMatchInfo = (ctx: CanvasRenderingContext2D, state: MatchState, w: number, h: number) => {
    // Score
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${state.score.home} - ${state.score.away}`,
      w / 2,
      30
    );

    // Time
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`${Math.floor(state.currentMinute)}'`, w / 2, 55);

    // Possession
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Home: ${Math.round(state.ballPossession.home)}%`, 10, h - 10);
    ctx.textAlign = 'right';
    ctx.fillText(`Away: ${Math.round(state.ballPossession.away)}%`, w - 10, h - 10);

    // Period
    ctx.textAlign = 'center';
    ctx.font = '12px Arial';
    ctx.fillStyle = '#cccccc';
    const periodText = state.currentPeriod === 'first-half' ? '1H' : '2H';
    ctx.fillText(periodText, w / 2, h - 10);
  };

  return (
    <div className="pitch-container w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-auto block cursor-pointer"
        onClick={(e) => {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect && onPlayerSelect) {
            const x = (e.clientX - rect.left) / rect.width * 100;
            const y = (e.clientY - rect.top) / rect.height * 100;

            // Find nearest player
            let nearestId: string | null = null;
            let minDistance = Infinity;

            playerPositions.forEach((pos) => {
              const dist = Math.hypot(pos.position.x - x, pos.position.y - y);
              if (dist < minDistance && dist < 15) {
                minDistance = dist;
                nearestId = pos.playerId;
              }
            });

            if (nearestId && onPlayerSelect) {
              onPlayerSelect(nearestId);
            }
          }
        }}
      />
    </div>
  );
};

export default PitchRenderer;
