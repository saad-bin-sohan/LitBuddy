// frontend/src/components/Card.js
import React from 'react';

const Card = ({ children, className = '', style = {}, animated = true, ...props }) => {
  const animationClass = animated ? 'transition-all hover-lift' : '';
  
  return (
    <div className={`card ${animationClass} ${className}`} style={style} {...props}>
      {children}
    </div>
  );
};

export default Card;
