import React, { useState, useEffect } from 'react';
import { Icon } from './ui';

interface ScrollToTopProps {
  targetRef: React.RefObject<HTMLDivElement>;
}

export function ScrollToTop({ targetRef }: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const target = targetRef.current;
      if (target) {
        setIsVisible(target.scrollTop > 300);
      }
    };

    const target = targetRef.current;
    if (target) {
      target.addEventListener('scroll', handleScroll);
      return () => target.removeEventListener('scroll', handleScroll);
    }
  }, []); // Empty deps - only set up listener once on mount

  const scrollToTop = () => {
    const target = targetRef.current;
    if (target) {
      target.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="scroll-to-top"
      aria-label="Scroll to top"
    >
      <Icon icon="lucide:chevron-up" size={20} />
    </button>
  );
}
