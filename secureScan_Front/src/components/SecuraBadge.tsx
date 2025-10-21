import React from 'react';

export default function SecuraBadge({ projectId }: { projectId: string }) {
  const src = `/api/badge/${encodeURIComponent(projectId)}`;
  return <img src={src} alt={`Badge for ${projectId}`} />;
}
