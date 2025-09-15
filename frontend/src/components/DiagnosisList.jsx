import React from 'react';

export default function DiagnosisList({ items = [] }) {
  return (
    <ul className="divide-y divide-slate-200">
      {items.map((d, i) => (
        <li key={i} className="py-2 flex items-center justify-between">
          <span className="font-medium text-slate-900">{d.label}</span>
          <span className="text-slate-600">{(d.confidence * 100).toFixed(1)}%</span>
        </li>
      ))}
    </ul>
  );
}


