import React from 'react';

export default function RedFlagAlert({ alerts = [] }) {
  if (!alerts.length) return null;
  return (
    <div className="rounded border border-red-300 bg-red-50 p-4">
      <h3 className="text-red-800 font-medium mb-2">Urgent Alerts</h3>
      <ul className="list-disc pl-6 text-red-900">
        {alerts.map((a, i) => (
          <li key={i}>{a.condition}</li>
        ))}
      </ul>
    </div>
  );
}


