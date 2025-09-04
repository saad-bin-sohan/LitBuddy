// frontend/src/components/Button.js
import React from 'react';

const Button = ({ children, variant = 'primary', className = '', animated = true, ...rest }) => {
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
  
  const animationClass = animated ? 'transition-all hover-lift' : '';
  
  return (
    <button className={`${base} ${variantClass} ${animationClass} ${className}`} {...rest}>
      {children}
    </button>
  );
};

export default Button;
