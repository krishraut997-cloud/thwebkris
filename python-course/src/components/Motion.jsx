import { useEffect, useRef } from 'react';

export function useGsapReveal(target, options = {}) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    let active = true;
    import('gsap').then(({ gsap }) => {
      if (!active || !ref.current) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap.fromTo(ref.current, { y: reduced ? 0 : 10, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: reduced ? 0.01 : (options.duration || 0.42),
        ease: 'power2.out',
        delay: options.delay || 0,
      });
    });
    return () => { active = false; };
  }, [target, options.delay, options.duration]);
  return ref;
}

export function useProgressTween(value) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    let active = true;
    import('gsap').then(({ gsap }) => {
      if (!active || !ref.current) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap.to(ref.current, {
        width: `${Math.min(100, Math.max(0, value))}%`,
        duration: reduced ? 0.01 : 0.7,
        ease: 'power2.out',
      });
    });
    return () => { active = false; };
  }, [value]);
  return ref;
}

export function Confetti({ active, onDone }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!active || !canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) {
      onDone?.();
      return undefined;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      onDone?.();
      return undefined;
    }
    const scale = window.devicePixelRatio || 1;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    canvas.width = viewportWidth * scale;
    canvas.height = viewportHeight * scale;
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${viewportHeight}px`;
    context.scale(scale, scale);
    const colors = ['#b5d943', '#829f35', '#d4eb8d', '#20211f'];
    const pieces = Array.from({ length: 60 }, () => ({
      x: viewportWidth * 0.55,
      y: viewportHeight * 0.44,
      vx: (Math.random() - 0.5) * 9,
      vy: Math.random() * -8 - 2,
      size: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 6,
    }));
    let frame;
    let tick = 0;
    const draw = () => {
      context.clearRect(0, 0, viewportWidth, viewportHeight);
      pieces.forEach((piece) => {
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.vy += 0.22;
        piece.rotation += 0.08;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.rotation);
        context.fillStyle = piece.color;
        context.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.65);
        context.restore();
      });
      tick += 1;
      if (tick < 72) frame = requestAnimationFrame(draw);
      else {
        context.clearRect(0, 0, viewportWidth, viewportHeight);
        onDone?.();
      }
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, onDone]);
  return active ? <canvas ref={canvasRef} className="pc-confetti" aria-hidden="true" /> : null;
}

export function LoopDrawing() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;
    const scale = window.devicePixelRatio || 1;
    const width = 240;
    const height = 140;
    canvas.width = width * scale;
    canvas.height = height * scale;
    context.scale(scale, scale);
    const points = [[0, 0], [100, 0], [100, 80], [20, 80], [20, 20], [80, 20], [80, 60], [40, 60], [40, 40], [60, 40]];
    const offsetX = 64;
    const offsetY = 28;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--pc-accent').trim();
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    let segment = 1;
    let frame;
    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.beginPath();
      context.moveTo(points[0][0] + offsetX, points[0][1] + offsetY);
      for (let index = 1; index < segment; index += 1) context.lineTo(points[index][0] + offsetX, points[index][1] + offsetY);
      context.stroke();
      if (segment < points.length) {
        segment += 1;
        frame = requestAnimationFrame(draw);
      }
    };
    if (reduced) segment = points.length;
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="pc-loop-art" role="img" aria-label="A line tracing a square spiral, drawn one segment at a time to illustrate repeated loop steps.">
    <canvas ref={canvasRef} aria-hidden="true" />
    <span>One loop, one step at a time.</span>
  </div>;
}
