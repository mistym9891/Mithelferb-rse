import React, { useEffect, useRef } from 'react';

/**
 * Rückfrage vor einer Aktion, die man nicht versehentlich auslösen möchte.
 * Wird für das Abmelden verwendet – auf dem Handy sitzt die Schaltfläche dicht
 * neben anderen Bedienelementen.
 */
const ConfirmDialog: React.FC<{
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Rot einfärben, wenn die Aktion etwas verwirft. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, message, confirmLabel = 'Ja', cancelLabel = 'Abbrechen', danger, onConfirm, onCancel }) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, onConfirm]);

  return (
    <div
      className="fixed inset-0 z-[3500] bg-black/50 flex items-center justify-center p-4"
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-5"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-5">{message}</div>
        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded border border-gray-300 dark:border-gray-600
                       text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`flex-1 h-11 rounded text-white font-medium ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-mr-green hover:bg-mr-dark'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
