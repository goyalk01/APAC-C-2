'use client';

import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { useAlerts } from '../../context/AlertsContext';
import { ALERT_CONFIG } from '../dashboard/AlertFeed';

Chart.register(...registerables);

interface AnalyticsChartsProps {
  preview?: boolean;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ preview = false }) => {
  const { alerts, theme } = useAlerts();
  
  const doughnutRef = useRef<HTMLCanvasElement | null>(null);
  const barRef = useRef<HTMLCanvasElement | null>(null);
  
  const doughnutChartRef = useRef<Chart | null>(null);
  const barChartRef = useRef<Chart | null>(null);

  // Compute counts & confidence from alerts list
  const alertCounts: Record<string, number> = {};
  const confidenceData: Record<string, number> = {};

  // alerts is in reverse chronological order (newest first)
  // iterate in chronological order (oldest first) to establish counts
  [...alerts].reverse().forEach((alert) => {
    const p = alert.payload;
    alertCounts[p.alert_type] = (alertCounts[p.alert_type] || 0) + 1;
    confidenceData[p.alert_type] = p.confidence;
  });

  const alertKeys = Object.keys(alertCounts);
  const formattedLabels = alertKeys.map((k) =>
    (ALERT_CONFIG[k] || { label: k }).label.toUpperCase()
  );
  const counts = Object.values(alertCounts);
  const confs = Object.values(confidenceData).map((c) => Math.round(c * 100));

  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
  const textColor = isDark ? '#8b949e' : '#637381';
  const surfaceColor = isDark ? '#12171f' : '#ffffff';

  const chartColors = alertKeys.map((k) => {
    const style = ALERT_CONFIG[k] || { color: '#ff3860', lightColor: '#e02424' };
    return isDark ? style.color : style.lightColor;
  });

  useEffect(() => {
    // Chart Default Styles
    Chart.defaults.color = textColor;
    Chart.defaults.font.family = 'var(--font-mono)';
    Chart.defaults.font.size = 9;

    // Create / update doughnut chart
    if (doughnutRef.current) {
      if (doughnutChartRef.current) {
        doughnutChartRef.current.destroy();
      }
      doughnutChartRef.current = new Chart(doughnutRef.current, {
        type: 'doughnut',
        data: {
          labels: formattedLabels,
          datasets: [
            {
              data: counts,
              backgroundColor: chartColors.map((c) => `${c}cc`),
              borderColor: surfaceColor,
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 8,
                usePointStyle: true,
                pointStyleWidth: 7,
                font: { size: 8 },
              },
            },
          },
        },
      });
    }

    // Create / update bar chart
    if (barRef.current) {
      if (barChartRef.current) {
        barChartRef.current.destroy();
      }
      barChartRef.current = new Chart(barRef.current, {
        type: 'bar',
        data: {
          labels: formattedLabels,
          datasets: [
            {
              data: confs,
              backgroundColor: chartColors.map((c) => `${c}99`),
              borderRadius: 4,
              barPercentage: 0.55,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          scales: {
            x: {
              min: 0,
              max: 100,
              grid: { color: gridColor },
              ticks: {
                callback: (v) => `${v}%`,
                font: { size: 8 },
              },
            },
            y: {
              grid: { display: false },
              ticks: { font: { size: 8 } },
            },
          },
          plugins: {
            legend: { display: false },
          },
        },
      });
    }

    return () => {
      if (doughnutChartRef.current) doughnutChartRef.current.destroy();
      if (barChartRef.current) barChartRef.current.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts, theme]);

  return (
    <div className={`flex flex-col md:flex-row gap-4 w-full ${preview ? 'h-[140px]' : 'h-[240px]'}`}>
      <div className="flex-1 relative min-h-[120px] md:min-h-0">
        <canvas ref={doughnutRef} />
      </div>
      <div className="flex-1 relative min-h-[120px] md:min-h-0">
        <canvas ref={barRef} />
      </div>
    </div>
  );
};
