// frontend/src/components/Avatar.js
import React from 'react';

const Avatar = ({ src, name, size = 40, animated = true }) => {
  const initials = name ? name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase() : '';
  const style = {
    width: size,
    height: size,
    borderRadius: size < 48 ? 10 : 12,
    display: 'inline-grid', placeItems: 'center',
    background: 'linear-gradient(135deg,#6C63FF,#2EC4B6)', color: 'white', fontWeight: 700,
    flexShrink: 0,
  };
  
  const animationClass = animated ? 'avatar hover-scale' : '';
  
  return src ? 
    <img src={src} alt={name} style={{...style, objectFit:'cover'}} className={animationClass} /> : 
    <div style={style} className={animationClass}>{initials}</div>;
};

export default Avatar;
