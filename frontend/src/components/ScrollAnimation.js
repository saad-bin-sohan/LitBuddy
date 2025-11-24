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
  repeat = false,
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!hasAnimated || repeat)) {
          setIsVisible(true);
          if (!repeat) {
            setHasAnimated(true);
          }
        } else if (!entry.isIntersecting && repeat) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    const current = ref.current;

    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [threshold, rootMargin, hasAnimated, repeat]);

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
