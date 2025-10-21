import React, { useState } from 'react';
import FixCard from '../components/FixCard';

export default function FixSuggestions() {
  const [suggestion, setSuggestion] = useState('No suggestions yet');

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold">Fix Suggestions</h2>
      <div className="mt-4">
        <FixCard suggestion={suggestion} />
      </div>
    </div>
  );
}
