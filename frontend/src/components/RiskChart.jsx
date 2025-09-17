import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function RiskChart({ points = [], labels: customLabels, yRange = { min: 0, max: 1 }, title }) {
  const labels = Array.isArray(customLabels) && customLabels.length === points.length
    ? customLabels
    : points.map((_, i) => `T${i + 1}`);
  const data = {
    labels,
    datasets: [
      {
        label: title || 'Risk',
        data: points,
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.2)'
      }
    ]
  };
  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { min: yRange?.min ?? 0, max: yRange?.max ?? 1 } }
  };
  return <Line data={data} options={options} />;
}


