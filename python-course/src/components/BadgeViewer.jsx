import { useEffect, useRef, useState } from 'react';
import AchievementMark from './AchievementMark.jsx';

export default function BadgeViewer({ label = 'Course achievement badge' }) {
  const mountRef = useRef(null);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const host = mountRef.current;
    if (!host) return undefined;
    let renderer;
    let frame;
    let inView = false;
    let pageVisible = !document.hidden;
    let disposed = false;
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; });
    observer.observe(host);
    const onVisibility = () => { pageVisible = !document.hidden; };
    document.addEventListener('visibilitychange', onVisibility);

    const loadTimer = setTimeout(() => import('three').then((THREE) => {
      if (disposed || !host) return;
      try {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.z = 5;
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(150, 150);
        renderer.setClearColor(0x000000, 0);
        host.replaceChildren(renderer.domElement);
        const medal = new THREE.Mesh(
          new THREE.CylinderGeometry(0.9, 0.9, 0.22, 48),
          new THREE.MeshStandardMaterial({ color: '#b5d943', metalness: 0.58, roughness: 0.32 }),
        );
        medal.rotation.x = 0.18;
        scene.add(medal);
        const center = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.43, 0),
          new THREE.MeshStandardMaterial({ color: '#829f35', metalness: 0.28, roughness: 0.35 }),
        );
        center.position.z = 0.2;
        scene.add(center);
        scene.add(new THREE.AmbientLight(0xffffff, 1.8));
        const light = new THREE.DirectionalLight(0xffffff, 3);
        light.position.set(2, 3, 5);
        scene.add(light);
        const resize = () => {
          if (!host || !renderer) return;
          const size = Math.min(168, Math.max(110, host.clientWidth));
          renderer.setSize(size, size);
          camera.aspect = 1;
          camera.updateProjectionMatrix();
        };
        resize();
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) {
          renderer.render(scene, camera);
          host._pcResizeObserver = resizeObserver;
          return;
        }
        const animate = () => {
          frame = requestAnimationFrame(animate);
          if (!inView || !pageVisible || !renderer) return;
          medal.rotation.y += 0.006;
          center.rotation.y -= 0.009;
          renderer.render(scene, camera);
        };
        animate();
        host._pcResizeObserver = resizeObserver;
      } catch {
        setFallback(true);
      }
    }).catch(() => setFallback(true)), 1200);

    return () => {
      disposed = true;
      clearTimeout(loadTimer);
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      host._pcResizeObserver?.disconnect();
      renderer?.dispose();
      host.replaceChildren();
    };
  }, []);

  return (
    <div className="pc-badge-stage">
      {fallback && <AchievementMark className="pc-badge-fallback" />}
      <div ref={mountRef} className="pc-badge-canvas" aria-hidden="true" />
      {!fallback && <span className="pc-badge-emblem" aria-hidden="true">Py</span>}
      <span className="pc-sr-only">{label}; a green and lime three-dimensional medal.</span>
    </div>
  );
}
