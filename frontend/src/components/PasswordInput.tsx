import React, { useState } from 'react';

/**
 * Passwortfeld mit Anzeigen/Verbergen.
 *
 * Gerade auf dem Handy vertippt man sich beim Abtippen eines vergebenen
 * Startpassworts leicht – deshalb lässt sich die Eingabe sichtbar machen.
 * Der Umschalter ist bewusst ein `<button type="button">`, damit ein Klick
 * nicht das Formular absendet.
 */
const PasswordInput: React.FC<{
  id?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  'aria-describedby'?: string;
}> = ({ id, value, onChange, autoComplete = 'current-password', required, placeholder, className, ...rest }) => {
  const [visible, setVisible] = useState(false);

  const base =
    'w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 ' +
    'rounded pl-3 pr-11 h-11';

  return (
    <div className="relative">
      <input
        {...rest}
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required={required}
        placeholder={placeholder}
        className={className ?? base}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-pressed={visible}
        aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
        title={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
        className="absolute inset-y-0 right-0 w-11 grid place-items-center text-gray-500
                   dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
      >
        <span aria-hidden="true" className="text-base leading-none">{visible ? '🙈' : '👁'}</span>
      </button>
    </div>
  );
};

export default PasswordInput;
