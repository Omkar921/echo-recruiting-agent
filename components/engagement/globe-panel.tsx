"use client";

import { useEffect, useRef } from "react";
import { createSpherePoints, rotateX, rotateY } from "@/components/shared/globe-math";
import styles from "./globe-panel.module.css";

const PARTICLE_COUNT = 1800;

type GlobePanelProps = {
  title?: string;
  subtitle?: string;
};

export function GlobePanel({ title, subtitle }: GlobePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const pointsRef = useRef(createSpherePoints(PARTICLE_COUNT));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const render = (time: number) => {
      if (width <= 0 || height <= 0) {
        frameRef.current = requestAnimationFrame(render);
        return;
      }

      const t = time * 0.001;
      const cx = width * 0.5;
      const cy = height * 0.5;
      const globeRadius = Math.min(width, height) * 0.38;
      ctx.clearRect(0, 0, width, height);

      const rotY = reducedMotion ? 0.35 : t * 0.22;
      const rotX = reducedMotion ? 0.18 : 0.22;
      const waveSpeed = reducedMotion ? 0.15 : 1;
      const projected: { x: number; y: number; z: number; size: number; alpha: number }[] = [];

      for (const base of pointsRef.current) {
        const wave =
          Math.sin(base.theta * 5 + t * 1.6 * waveSpeed) *
            Math.cos(base.phi * 4 - t * 1.1 * waveSpeed) *
            0.11 +
          Math.sin(base.phi * 7 + t * 0.9 * waveSpeed) * 0.05;
        const scale = globeRadius * (1 + wave);
        let point = { ...base, x: base.x * scale, y: base.y * scale, z: base.z * scale };
        point = rotateX(point, rotX);
        point = rotateY(point, rotY);

        const depthDenom = 520 + point.z;
        if (depthDenom <= 1) continue;

        const perspective = 520 / depthDenom;
        const depth = (point.z + globeRadius) / (globeRadius * 2);
        const size = (0.55 + depth * 1.45) * perspective;
        const x = cx + point.x * perspective;
        const y = cy + point.y * perspective;
        const alpha = 0.18 + depth * 0.72;

        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(size) || size <= 0) {
          continue;
        }

        projected.push({ x, y, z: point.z, size, alpha });
      }

      projected.sort((a, b) => a.z - b.z);
      for (const p of projected) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(235, 240, 255, ${p.alpha * 0.85})`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={styles.panel} aria-hidden>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.glow} />
      <div className={styles.vignette} />
      {(title || subtitle) && (
        <div className={styles.caption}>
          {title && <p className="text-sm font-medium text-foreground/90">{title}</p>}
          {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
        </div>
      )}
    </div>
  );
}
