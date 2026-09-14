import React from 'react';

/**
 * Ringname als Link auf die Website des Rings.
 *
 * Ohne hinterlegte Adresse wird schlicht der Name ausgegeben. `noopener`
 * verhindert, dass die Zielseite auf dieses Fenster zugreifen kann;
 * `noreferrer` unterdrückt zusätzlich die Herkunftsangabe.
 */
const RingLink: React.FC<{
  name: string;
  website?: string | null;
  className?: string;
  /** Wird z. B. im Karten-Tooltip gebraucht, wo Klicks nicht ankommen. */
  plain?: boolean;
}> = ({ name, website, className = '', plain = false }) => {
  if (!website || plain) {
    return <span className={className}>{name}</span>;
  }
  return (
    <a
      href={website}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      title={`Website öffnen: ${website.replace(/^https?:\/\//, '')}`}
      className={`text-blue-700 dark:text-blue-400 hover:underline ${className}`}
    >
      {name}
      <span aria-hidden="true" className="ml-0.5 text-[0.85em] opacity-70">↗</span>
    </a>
  );
};

export default RingLink;
