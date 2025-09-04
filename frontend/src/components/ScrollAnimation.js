// frontend/src/components/ScrollAnimation.js
import React, { useEffect, useRef, useState } from 'react';

const ScrollAnimation = ({ 
  children, 
  className = '', 
  animation = 'fade-in-up',
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  delay = 0,
  duration = 0.6,
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, rootMargin, hasAnimated]);

  const getAnimationClass = () => {
    const baseClass = 'scroll-animate';
    const animationClass = `animate-${animation}`;
    const visibleClass = isVisible ? 'animate' : '';
    const delayClass = delay > 0 ? `animate-stagger-${Math.ceil(delay * 10)}` : '';
    
    return `${baseClass} ${animationClass} ${visibleClass} ${delayClass} ${className}`.trim();
  };

  return (
    <div
      ref={ref}
      className={getAnimationClass()}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default ScrollAnimation;
