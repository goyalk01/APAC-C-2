'use client';

import React, { useEffect, useRef } from 'react';
import { useAlerts } from '../../context/AlertsContext';

interface TacticalMapProps {
  large?: boolean;
}

const MAP_NODES: Record<string, { x: number; y: number; label: string }> = {
  NODE_001: { x: 0.58, y: 0.35, label: 'N-001' },
  NODE_002: { x: 0.55, y: 0.56, label: 'N-002' },
  NODE_003: { x: 0.35, y: 0.22, label: 'N-003' },
  NODE_004: { x: 0.15, y: 0.72, label: 'N-004' },
  NODE_005: { x: 0.40, y: 0.28, label: 'N-005' },
};

const SWARM_BOX_POS = { x: 0.82, y: 0.52, label: 'SWARM BOX' };

export const TacticalMap: React.FC<TacticalMapProps> = ({ large = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { nodesReported, theme } = useAlerts();
  const frameRef = useRef(0);

  // Resize function to keep canvas pixels crisp
  const resize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    canvas.width = parent.clientWidth * 2;
    canvas.height = parent.clientHeight * 2;
    canvas.style.width = `${parent.clientWidth}px`;
    canvas.style.height = `${parent.clientHeight}px`;
  };

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const scale = 2; // pixel density scale factor
      const isDark = theme === 'dark';

      ctx.clearRect(0, 0, w, h);

      const margin = 45 * scale;
      const px = (n: { x: number }) => margin + n.x * (w - 2 * margin);
      const py = (n: { y: number }) => margin + n.y * (h - 2 * margin);

      const activeNodes = Object.keys(MAP_NODES).filter((id) =>
        nodesReported.includes(id)
      );

      // 1. Render glowing mesh link lines
      ctx.strokeStyle = isDark ? 'rgba(0, 184, 255, 0.25)' : 'rgba(28, 100, 242, 0.2)';
      ctx.lineWidth = 1 * scale;
      ctx.setLineDash([4 * scale, 4 * scale]);
      for (let i = 0; i < activeNodes.length; i++) {
        for (let j = i + 1; j < activeNodes.length; j++) {
          const a = MAP_NODES[activeNodes[i]];
          const b = MAP_NODES[activeNodes[j]];
          ctx.beginPath();
          ctx.moveTo(px(a), py(a));
          ctx.lineTo(px(b), py(b));
          ctx.stroke();
        }
      }

      // 2. Draw active relay lines to Swarm Box with flowing packet dots
      ctx.strokeStyle = isDark ? 'rgba(0, 255, 159, 0.35)' : 'rgba(14, 159, 110, 0.35)';
      ctx.lineWidth = 1.5 * scale;
      ctx.setLineDash([]);
      activeNodes.forEach((id) => {
        const n = MAP_NODES[id];
        const nx = px(n);
        const ny = py(n);
        const sbx = px(SWARM_BOX_POS);
        const sby = py(SWARM_BOX_POS);

        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(sbx, sby);
        ctx.stroke();

        // Flowing neon packet dots
        const flowT = (frameRef.current * 0.01) % 1.0;
        const packetX = nx + (sbx - nx) * flowT;
        const packetY = ny + (sby - ny) * flowT;

        ctx.beginPath();
        ctx.arc(packetX, packetY, 2.5 * scale, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#00ff9f' : '#0e9f6e';
        ctx.fill();
      });

      // 3. Draw radar rotating sweeps on dark theme
      if (isDark) {
        const sbx = px(SWARM_BOX_POS);
        const sby = py(SWARM_BOX_POS);
        const sweepR = large ? 180 * scale : 120 * scale;
        const angle = (frameRef.current * 0.015) % (Math.PI * 2);

        ctx.beginPath();
        ctx.moveTo(sbx, sby);
        ctx.arc(sbx, sby, sweepR, angle, angle + 0.15);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 255, 159, 0.02)';
        ctx.fill();
      }

      // 4. Draw nodes & overlapping pulsing rings
      Object.entries(MAP_NODES).forEach(([id, pos]) => {
        const x = px(pos);
        const y = py(pos);
        const on = nodesReported.includes(id);

        if (on) {
          // Overlapping pulsing rings
          const pulseSize =
            18 * scale +
            Math.sin(frameRef.current * 0.05 + id.charCodeAt(6) * 0.5) * 4 * scale;
          ctx.beginPath();
          ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? 'rgba(0, 255, 159, 0.02)' : 'rgba(14, 159, 110, 0.03)';
          ctx.fill();
          ctx.strokeStyle = isDark ? 'rgba(0, 255, 159, 0.1)' : 'rgba(14, 159, 110, 0.08)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        const r = 4.5 * scale;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = on
          ? isDark ? '#00ff9f' : '#0e9f6e'
          : isDark ? '#30363d' : '#d1d5db';
        ctx.fill();

        if (on) {
          ctx.shadowColor = isDark ? '#00ff9f' : '#0e9f6e';
          ctx.shadowBlur = 10 * scale;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Node Text
        ctx.fillStyle = on
          ? isDark ? '#8b949e' : '#637381'
          : isDark ? '#30363d' : '#9ca3af';
        ctx.font = `bold ${8 * scale}px var(--font-mono)`;
        ctx.textAlign = 'center';
        ctx.fillText(pos.label, x, y + 14 * scale);
      });

      // 5. Swarm Box Base Center (Hexagon)
      const sbx = px(SWARM_BOX_POS);
      const sby = py(SWARM_BOX_POS);
      const hexR = 10 * scale;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const hx = sbx + hexR * Math.cos(a);
        const hy = sby + hexR * Math.sin(a);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fillStyle = isDark ? '#00ff9f' : '#0e9f6e';
      ctx.fill();
      ctx.strokeStyle = isDark ? 'rgba(0, 255, 159, 0.5)' : 'rgba(14, 159, 110, 0.5)';
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();

      // Hexagon Glow
      ctx.shadowColor = isDark ? '#00ff9f' : '#0e9f6e';
      ctx.shadowBlur = 14 * scale;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = isDark ? '#00ff9f' : '#0e9f6e';
      ctx.font = `bold ${7 * scale}px var(--font-mono)`;
      ctx.textAlign = 'center';
      ctx.fillText('SWARM BOX', sbx, sby + 20 * scale);

      frameRef.current++;
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodesReported, theme, large]);

  return (
    <div className="relative w-full h-full min-h-[220px]">
      <div className="map-grid-overlay" />
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="scanline-effect" />
    </div>
  );
};
