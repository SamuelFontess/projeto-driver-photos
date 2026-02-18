import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  hint?: string;
}

export function InputField({ label, id, hint, className, ...props }: InputFieldProps) {
  return (
    <div className="ui-input-group">
      <label className="ui-label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className={['ui-input', className ?? ''].join(' ').trim()} {...props} />
      {hint ? <small className="text-muted">{hint}</small> : null}
    </div>
  );
}
