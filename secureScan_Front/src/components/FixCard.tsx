import React from 'react';

export default function FixCard({ suggestion }: { suggestion: string }) {
  return (
    <div className="p-4 border rounded shadow bg-white">
      <h3 className="font-semibold">Fix suggestion</h3>
      <p className="mt-2 text-sm">{suggestion}</p>
    </div>
  );
}
