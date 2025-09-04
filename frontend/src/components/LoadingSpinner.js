// frontend/src/components/LoadingSpinner.js
import React from 'react';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary', 
  text = 'Loading...',
  variant = 'spinner' 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'border-primary',
    secondary: 'border-secondary',
    white: 'border-white'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
          </div>
        );
      
      case 'bars':
        return (
          <div className="flex space-x-1">
            <div className="w-1 h-4 bg-current animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1 h-4 bg-current animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1 h-4 bg-current animate-pulse" style={{ animationDelay: '300ms' }}></div>
          </div>
        );
      
      case 'shimmer':
        return (
          <div className="animate-shimmer bg-gradient-to-r from-transparent via-current to-transparent bg-opacity-20 rounded">
            <div className="w-full h-full bg-current bg-opacity-10 rounded"></div>
          </div>
        );
      
      default:
        return (
          <div className={`${sizeClasses[size]} border-2 border-t-transparent rounded-full animate-spin ${colorClasses[color]}`}></div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      {renderSpinner()}
      {text && (
        <span className="text-sm text-muted animate-pulse">{text}</span>
      )}
    </div>
  );
};

export default LoadingSpinner;
