"use client";

import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  phaseOffset: number;
  isStar?: boolean;
}

interface ParticleCanvasProps {
  particleCount?: number;
  className?: string;
  mouseInteraction?: boolean;
  starCount?: number;
  connectionDistance?: number;
}

export function ParticleCanvas({
  particleCount = 80,
  className = "",
  mouseInteraction = false,
  starCount = 0,
  connectionDistance = 100,
}: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const isVisibleRef = useRef(true);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const initParticles = useCallback(
    (width: number, height: number) => {
      const particles: Particle[] = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          radius: 0.3 + Math.random() * 1.2,
          opacity: 0.3 + Math.random() * 0.7,
          phaseOffset: Math.random() * Math.PI * 2,
        });
      }
      for (let i = 0; i < starCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0,
          vy: 0,
          radius: 2 + Math.random(),
          opacity: 0.2 + Math.random() * 0.8,
          phaseOffset: Math.random() * Math.PI * 2,
          isStar: true,
        });
      }
      particlesRef.current = particles;
    },
    [particleCount, starCount]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx!.scale(dpr, dpr);
      initParticles(rect.width, rect.height);
    }

    resize();
    window.addEventListener("resize", resize);

    function handleVisibility() {
      isVisibleRef.current = !document.hidden;
    }
    document.addEventListener("visibilitychange", handleVisibility);

    function handleMouseMove(e: MouseEvent) {
      if (!mouseInteraction || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    }

    function handleMouseLeave() {
      mouseRef.current.active = false;
    }

    if (mouseInteraction) {
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseleave", handleMouseLeave);
    }

    let time = 0;

    function animate() {
      if (!canvas || !ctx) return;

      animFrameRef.current = requestAnimationFrame(animate);

      if (!isVisibleRef.current) return;

      time += 0.016;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      // Update positions
      for (const p of particles) {
        if (p.isStar) continue;

        // Mouse attraction
        if (mouseInteraction && mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150 && dist > 0) {
            p.vx += (dx / dist) * 0.02;
            p.vy += (dy / dist) * 0.02;
          }
        }

        // Dampen velocity
        p.vx *= 0.99;
        p.vy *= 0.99;

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
      }

      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        if (particles[i].isStar) continue;
        for (let j = i + 1; j < particles.length; j++) {
          if (particles[j].isStar) continue;
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectionDistance) {
            const lineOpacity = (1 - dist / connectionDistance) * 0.05;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(212, 132, 90, ${lineOpacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        const pulse = Math.sin(time * 1.5 + p.phaseOffset) * 0.3 + 0.7;

        if (p.isStar) {
          // Star twinkle
          const twinkle = Math.sin(time * (1 + p.phaseOffset * 0.3) + p.phaseOffset) * 0.4 + 0.6;
          ctx.save();
          ctx.shadowBlur = 6;
          ctx.shadowColor = `rgba(212, 132, 90, ${twinkle * 0.5})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(212, 132, 90, ${p.opacity * twinkle})`;
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(212, 132, 90, ${p.opacity * pulse})`;
          ctx.fill();
        }
      }
    }

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (mouseInteraction && canvas) {
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [initParticles, mouseInteraction, connectionDistance]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    />
  );
}
