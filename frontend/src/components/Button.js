// frontend/src/components/Button.js
import React from 'react';

const Button = ({ children, variant = 'primary', className = '', ...rest }) => {
  const base = 'btn';
  const v = variant === 'ghost' ? 'btn-ghost' : variant === 'muted' ? 'btn-muted' : 'btn-primary';
  return (
    <button className={`${base} ${v} ${className}`} {...rest}>
      {children}
    </button>
  );
};

export default Button;
