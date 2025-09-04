// frontend/src/components/PageTransition.js
import React, { useEffect, useState } from 'react';

const PageTransition = ({ children, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after component mounts
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`page-transition ${isVisible ? 'page-enter-active' : 'page-enter'} ${className}`}
    >
      {children}
    </div>
  );
};

export default PageTransition;
