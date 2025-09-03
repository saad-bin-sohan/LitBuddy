// frontend/src/components/Button.js
import React from 'react';

const Button = ({ children, variant = 'primary', className = '', ...rest }) => {
  const base = 'btn';
  let variantClass = 'btn-primary';
  
  switch (variant) {
    case 'ghost':
      variantClass = 'btn-ghost';
      break;
    case 'muted':
      variantClass = 'btn-muted';
      break;
    case 'secondary':
      variantClass = 'btn-secondary';
      break;
    case 'outline':
      variantClass = 'btn-outline';
      break;
    default:
      variantClass = 'btn-primary';
  }
  
  return (
    <button className={`${base} ${variantClass} ${className}`} {...rest}>
      {children}
    </button>
  );
};

export default Button;
