import React, { useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

export default function RiskChart({ 
  points = [], 
  labels: customLabels, 
  yRange = { min: 0, max: 1 },
  height = 220
}) {
  const chartRef = useRef(null);
  
  // Create gradient for the chart fill
  const createGradient = (ctx, chartArea) => {
    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
    gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.2)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0.25)');
    return gradient;
  };

  const labels = Array.isArray(customLabels) && customLabels.length === points.length
    ? customLabels
    : points.map((_, i) => `Day ${i + 1}`);
    
  const data = {
    labels,
    datasets: [
      {
        label: 'Risk Level',
        data: points,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: function(context) {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          
          if (!chartArea) {
            return null;
          }
          return createGradient(ctx, chartArea);
        },
        borderWidth: 2,
        pointBackgroundColor: 'white',
        pointBorderColor: 'rgb(59, 130, 246)',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: 'white',
        pointHoverBorderColor: 'rgb(59, 130, 246)',
        pointHoverBorderWidth: 2,
        tension: 0.3,
        fill: true,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: false 
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: 'white',
        bodyColor: 'white',
        padding: 12,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            return `Risk: ${context.parsed.y.toFixed(2)}`;
          }
        },
        titleFont: {
          size: 14,
          weight: '500'
        },
        bodyFont: {
          size: 13
        },
        boxPadding: 6
      }
    },
    scales: { 
      y: { 
        min: yRange?.min ?? 0, 
        max: yRange?.max ?? 1,
        grid: {
          color: 'rgba(226, 232, 240, 0.2)',
          borderDash: [4, 4],
          drawTicks: false
        },
        border: {
          display: false
        },
        ticks: {
          color: 'rgba(100, 116, 139, 0.8)',
          padding: 8,
          callback: function(value) {
            return value.toFixed(1);
          },
          font: {
            size: 12
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false
        },
        ticks: {
          color: 'rgba(100, 116, 139, 0.8)',
          maxRotation: 45,
          minRotation: 45,
          padding: 10,
          font: {
            size: 12
          }
        }
      }
    },
    elements: {
      line: {
        borderWidth: 2,
      },
      point: {
        hoverRadius: 7,
        hoverBorderWidth: 2,
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    animation: {
      duration: 800,
      easing: 'easeInOutCubic'
    },
    layout: {
      padding: {
        top: 10,
        right: 15,
        bottom: 10,
        left: 15
      }
    }
  };

  return (
    <div className="relative w-full" style={{ height: `${height}px` }}>
      <Line 
        ref={chartRef}
        data={data} 
        options={options} 
        updateMode="resize"
      />
    </div>
  );
}
