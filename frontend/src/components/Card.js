// frontend/src/components/Card.js
import React from 'react';
const Card = ({ children, className = '', style = {} }) => (
  <div className={`card ${className}`} style={style}>{children}</div>
);
export default Card;
