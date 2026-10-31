import { useEffect, useRef, useState } from 'react';

export default function HomeScene() {
  const hostRef = useRef(null);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let renderer;
    let frame;
    let inView = false;
    let pageVisible = !document.hidden;
    let disposed = false;
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; });
    observer.observe(host);
    const visibility = () => { pageVisible = !document.hidden; };
    document.addEventListener('visibilitychange', visibility);
    const loadTimer = setTimeout(() => import('three').then((THREE) => {
      if (disposed) return;
      try {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
        camera.position.z = 8;
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        host.appendChild(renderer.domElement);
        const material = new THREE.MeshBasicMaterial({ color: '#829f35', wireframe: true, transparent: true, opacity: 0.24 });
        const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4, 1), material);
        sphere.position.set(1.7, 0.2, 0);
        scene.add(sphere);
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(2.8, 0.008, 6, 90),
          new THREE.MeshBasicMaterial({ color: '#b5d943', transparent: true, opacity: 0.35 }),
        );
        ring.rotation.set(0.7, 0.3, 0.2);
        ring.position.set(1.7, 0.2, 0);
        scene.add(ring);
        const resize = () => {
          if (!renderer) return;
          const width = host.clientWidth || 400;
          const height = host.clientHeight || 340;
          renderer.setSize(width, height);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        resize();
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        host._pcResizeObserver = resizeObserver;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) {
          renderer.render(scene, camera);
          return;
        }
        const animate = () => {
          frame = requestAnimationFrame(animate);
          if (!inView || !pageVisible || !renderer) return;
          sphere.rotation.y += 0.0009;
          sphere.rotation.x += 0.0003;
          ring.rotation.z -= 0.0005;
          renderer.render(scene, camera);
        };
        animate();
      } catch {
        setFallback(true);
      }
    }).catch(() => setFallback(true)), 1200);
    return () => {
      disposed = true;
      clearTimeout(loadTimer);
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      host._pcResizeObserver?.disconnect();
      renderer?.dispose();
      host.replaceChildren();
    };
  }, []);
  return <div ref={hostRef} className={`pc-home-scene${fallback ? ' pc-home-scene-fallback' : ''}`} aria-hidden="true" />;
}
