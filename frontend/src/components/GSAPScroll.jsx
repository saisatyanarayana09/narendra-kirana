import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export function GSAPFadeUp({ children, delay = 0, stagger = 0.1, className = "" }) {
  const container = useRef();

  useGSAP(() => {
    // Select all immediate children to stagger them, or just the container if it's a single element
    const targets = container.current.children.length > 1 
      ? gsap.utils.toArray(container.current.children) 
      : container.current;

    gsap.fromTo(targets, 
      { 
        y: 50, 
        opacity: 0 
      }, 
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        delay: delay,
        stagger: stagger,
        ease: "power3.out",
        scrollTrigger: {
          trigger: container.current,
          start: "top 85%", // Trigger when the top of the element hits 85% down the viewport
          toggleActions: "play none none none", // Play once
        }
      }
    );
  }, { scope: container });

  return (
    <div ref={container} className={className}>
      {children}
    </div>
  );
}

export function GSAPZoomIn({ children, delay = 0, stagger = 0.1, className = "" }) {
  const container = useRef();

  useGSAP(() => {
    const targets = container.current.children.length > 1 
      ? gsap.utils.toArray(container.current.children) 
      : container.current;

    gsap.fromTo(targets, 
      { 
        scale: 0.8, 
        opacity: 0 
      }, 
      {
        scale: 1,
        opacity: 1,
        duration: 0.6,
        delay: delay,
        stagger: stagger,
        ease: "back.out(1.5)",
        scrollTrigger: {
          trigger: container.current,
          start: "top 85%",
          toggleActions: "play none none none",
        }
      }
    );
  }, { scope: container });

  return (
    <div ref={container} className={className}>
      {children}
    </div>
  );
}
