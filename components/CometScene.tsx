import React, { useEffect, useRef } from 'react';

interface CometSceneProps {
    state?: 'none' | 'entering' | 'cruising' | 'exploding' | 'gone';
    cometSpeed: number; // Speed of the comet (affects star movement and particle generation)
}

type GameState = 'betting' | 'flying' | 'exploding';
type CometInternalState = 'none' | 'entering' | 'cruising' | 'exploding' | 'gone';

const CometScene: React.FC<CometSceneProps> = ({ state, cometSpeed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cometStateRef = useRef<CometInternalState>('none');
  const cometState = cometStateRef.current;
  const cometSpeedRef = useRef<number>(cometSpeed);
  const shakeIntensityRef = useRef<number>(1.5);
  const cometXRef = useRef<number>(-100);

    useEffect(() => {
    cometSpeedRef.current = cometSpeed;
    // Shake intensity can be adjusted based on speed and should start at a base value (e.g., 1.5) and increase with speed
    // CometSpeed starts at minimum 5, so we can use that as a baseline for shake intensity
    shakeIntensityRef.current = 1.5 + (cometSpeed - 5.5) * 0.2; // Adjust the multiplier as needed for desired effect

    console.log("Shake intensity: ", shakeIntensityRef.current);
    }, [cometSpeed]);

  useEffect(() => {
    console.log(">>> CometScene received state:", state);
    if (state === 'betting') {
        cometStateRef.current = 'none';
        shakeIntensityRef.current = 0; // Reset to base shake
    }

    if (state === 'flying') {
        cometStateRef.current = 'entering';
    }

    if (state === 'crashed') {
        cometStateRef.current = 'exploding';
    }
    }, [state]);

  useEffect(() => {
    console.log("renderizando!");
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const parent = canvas.parentElement;
    if (!parent) return;

    let width = parent.clientWidth-1;
    let height = parent.clientHeight-1;

    // Configuration
    const starCount = 200;
    const tailParticleRate = 10; // Particles per frame
    const speed = cometSpeedRef.current; // Simulated speed of the comet (stars moving left)
    const shakeIntensity = shakeIntensityRef.current;//1.5;

    // State
    let stars: Star[] = [];
    let particles: Particle[] = [];
    let explosionParticles: ExplosionParticle[] = [];
    let time = 0;
    
    // Comet Logic
    
    // let cometX = -100;
    let cometY = height / 2;
    let cruiseStartTime = 0;
    // Random explosion time between 5 and 10 seconds (in frames, approx 60fps)
    // 5s * 60 = 300 frames, 10s * 60 = 600 frames
    const explosionDelay = 300 + Math.random() * 300; 

    // Classes
    class Star {
      x: number;
      y: number;
      size: number;
      speed: number;
        speedFactor: number; // For parallax effect
      brightness: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2;
        // this.speed = (Math.random() * 0.5 + 0.1) * speed; // Parallax effect
        this.speedFactor = Math.random() * 0.5 + 0.1;
        this.brightness = Math.random();
      }

      update() {
        // this.x -= this.speed;
        this.x -= this.speedFactor * cometSpeedRef.current;
        if (this.x < 0) {
          this.x = width;
          this.y = Math.random() * height;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      color: string;
      speedFactor: number;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        // Particles move left (trail) with some random spread
        this.vx = -speed * 0.8 + (Math.random() - 0.5) * 2; 
        this.speedFactor = -0.8 + (Math.random() - 0.5) * 0.1;
        this.vy = (Math.random() - 0.5) * 2;
        this.maxLife = Math.random() * 40 + 20;
        this.life = this.maxLife;
        this.size = Math.random() * 3 + 1;
        
        // Color variation: White -> Cyan -> Blue
        const rand = Math.random();
        if (rand > 0.7) this.color = '255, 255, 255'; // White
        else if (rand > 0.3) this.color = '100, 200, 255'; // Light Blue
        else this.color = '50, 100, 255'; // Darker Blue
      }

      update() {
        // this.x += this.vx;
        this.x += this.speedFactor * cometSpeedRef.current;
        this.y += this.vy;
        this.life--;
        this.size *= 0.95; // Shrink
      }

      draw(ctx: CanvasRenderingContext2D) {
        const opacity = this.life / this.maxLife;
        ctx.fillStyle = `rgba(${this.color}, ${opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    class ExplosionParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      color: string;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 8 + 2;
        this.vx = Math.cos(angle) * spd;
        this.vy = Math.sin(angle) * spd;
        this.maxLife = Math.random() * 50 + 30;
        this.life = this.maxLife;
        this.size = Math.random() * 4 + 2;
        
        const rand = Math.random();
        if (rand > 0.6) this.color = '255, 200, 50'; // Orange/Yellow
        else if (rand > 0.3) this.color = '255, 100, 50'; // Red/Orange
        else this.color = '255, 255, 255'; // White
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.size *= 0.96;
      }

      draw(ctx: CanvasRenderingContext2D) {
        const opacity = this.life / this.maxLife;
        ctx.fillStyle = `rgba(${this.color}, ${opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Initialization
    const init = () => {
      if (!canvas.parentElement) return;

        width = canvas.parentElement.clientWidth;
        height = canvas.parentElement.clientHeight;

        canvas.width = width;
        canvas.height = height;
      cometY = height / 2;

      stars = [];
      for (let i = 0; i < starCount; i++) {
        stars.push(new Star());
      }
    };

    // Animation Loop
    const render = () => {
      time++;
      
      // Clear with trail effect (optional, but clean clear is better for this specific look)
      ctx.fillStyle = '#050510'; // Dark night sky
      ctx.fillRect(0, 0, width, height);

      // Screen Shake (only when comet is present)
      if (cometStateRef.current !== 'gone') {
        const dx = (Math.random() - 0.5) * shakeIntensityRef.current;
        const dy = (Math.random() - 0.5) * shakeIntensityRef.current;
        ctx.save();
        ctx.translate(dx, dy);
      }

      // Draw Stars
      stars.forEach(star => {
        star.update();
        star.draw(ctx);
      });

      // Comet Logic
      const targetX = width / 2;
      
      if (cometStateRef.current === 'entering') {
        // Move towards center
        cometXRef.current += (targetX - cometXRef.current) * 0.02; // Ease in
        if (Math.abs(cometXRef.current - targetX) < 1) {
        //   cometStateRef.current = 'cruising';
          cruiseStartTime = time;
        }
      } else if (cometStateRef.current === 'cruising') {
        cometXRef.current = targetX;
        // Check for explosion time
        if (time - cruiseStartTime > explosionDelay) {
          cometStateRef.current = 'exploding';
        }
      }

      // Hover effect
      const hoverY = Math.sin(time * 0.05) * 10;
      const currentCometY = cometY + hoverY;

      if (cometStateRef.current === 'exploding') {
        console.log(">>> Comet is exploding!");
        // Spawn explosion particles once
        for (let i = 0; i < 100; i++) {
          explosionParticles.push(new ExplosionParticle(cometXRef.current, currentCometY));
        }
        cometStateRef.current = 'gone';
      }

      // Generate Tail Particles (only if comet is visible)
      if (cometStateRef.current === 'entering' || cometStateRef.current === 'cruising') {
        for (let i = 0; i < tailParticleRate; i++) {
          const offsetY = (Math.random() - 0.5) * 10;
          const offsetX = (Math.random() - 0.5) * 10;
          particles.push(new Particle(cometXRef.current + offsetX, currentCometY + offsetY));
        }
      }

      // Update and Draw Tail Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx);
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }

      // Update and Draw Explosion Particles
      for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const p = explosionParticles[i];
        p.update();
        p.draw(ctx);
        if (p.life <= 0) {
          explosionParticles.splice(i, 1);
        }
      }

      // Draw Comet Head (Core)
      if (cometStateRef.current === 'entering' || cometStateRef.current === 'cruising') {
        // Glow
        const gradient = ctx.createRadialGradient(cometXRef.current, currentCometY, 5, cometXRef.current, currentCometY, 40);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(200, 240, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(50, 150, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cometXRef.current, currentCometY, 40, 0, Math.PI * 2);
        ctx.fill();

        // Solid Core
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cometXRef.current, currentCometY, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      if (cometStateRef.current !== 'gone') {
        ctx.restore(); // Restore shake
      }

      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('resize', init);
    init();
    
    render();

    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block bg-black"
    />
  );
};

export default CometScene;
