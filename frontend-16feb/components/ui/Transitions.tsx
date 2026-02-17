'use client';

import React, { useState, useEffect } from 'react';

export const FadeIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}> = ({ children, delay = 0, duration = 300, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`transition-opacity ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
};

export const SlideIn: React.FC<{
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
}> = ({ children, direction = 'up', delay = 0, duration = 300, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const transforms = {
    left: isVisible ? 'translateX(0)' : 'translateX(-20px)',
    right: isVisible ? 'translateX(0)' : 'translateX(20px)',
    up: isVisible ? 'translateY(0)' : 'translateY(20px)',
    down: isVisible ? 'translateY(0)' : 'translateY(-20px)',
  };

  return (
    <div
      className={`transition-all ${className}`}
      style={{
        transform: transforms[direction],
        opacity: isVisible ? 1 : 0,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
};

export const PageTransition: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <FadeIn duration={200}>
      <SlideIn direction="up" duration={300}>
        {children}
      </SlideIn>
    </FadeIn>
  );
};
