/**
 * Lightweight Canvas Particle System for Mystery Box animations.
 * No dependencies. Respects prefers-reduced-motion.
 */

export interface ParticleConfig {
  maxParticles: number;
  gravity: number;
  fadeRate: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

const DEFAULT_CONFIG: ParticleConfig = {
  maxParticles: 50,
  gravity: 0.05,
  fadeRate: 0.015,
};

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private config: ParticleConfig;
  private rafId: number | null = null;
  private reducedMotion: boolean;

  constructor(canvas: HTMLCanvasElement, config?: Partial<ParticleConfig>) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.reducedMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** One-time particle burst from a point */
  burst(count: number, color: string, originX?: number, originY?: number): void {
    if (this.reducedMotion) return;

    const cx = originX ?? this.canvas.width / 2;
    const cy = originY ?? this.canvas.height / 2;
    const actualCount = Math.min(count, this.config.maxParticles - this.particles.length);

    for (let i = 0; i < actualCount; i++) {
      const angle = (Math.PI * 2 * i) / actualCount + (Math.random() - 0.5) * 0.5;
      const speed = 1.5 + Math.random() * 4;
      const life = 40 + Math.random() * 40;

      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color,
        alpha: 1,
        life,
        maxLife: life,
      });
    }

    if (this.rafId === null) this.animate();
  }

  /** Radial glow ring effect */
  glow(color: string, intensity: number, duration: number): void {
    if (this.reducedMotion) return;

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const startTime = performance.now();
    const maxRadius = Math.min(this.canvas.width, this.canvas.height) * 0.4;

    const drawGlow = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress >= 1) return;

      const radius = Math.max(1, maxRadius * progress);
      const alpha = intensity * (1 - progress);

      const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, `${color}${Math.round(alpha * 60).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, `${color}00`);

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      requestAnimationFrame(drawGlow);
    };

    requestAnimationFrame(drawGlow);
  }

  private animate = (): void => {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.vy += this.config.gravity;
      p.vx *= 0.99; // friction
      p.life -= 1;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;

    if (this.particles.length > 0) {
      this.rafId = requestAnimationFrame(this.animate);
    } else {
      this.rafId = null;
    }
  };

  /** Clean up everything */
  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.particles = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
