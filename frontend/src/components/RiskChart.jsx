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

export default function RiskChart({ points = [] }) {
  const labels = points.map((_, i) => `T${i + 1}`);
  const data = {
    labels,
    datasets: [
      {
        label: 'Risk',
        data: points,
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.2)'
      }
    ]
  };
  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { min: 0, max: 1 } }
  };
  return <Line data={data} options={options} />;
}


