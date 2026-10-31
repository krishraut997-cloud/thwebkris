import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ProgressProvider } from './context/ProgressContext.jsx';

const mounts = new WeakMap();

export function mount(container) {
  if (!(container instanceof Element)) throw new TypeError('PythonPath.mount expects a container element.');
  mounts.get(container)?.unmount();
  const root = createRoot(container);
  root.render(<ProgressProvider><App /></ProgressProvider>);
  mounts.set(container, root);
  return () => {
    root.unmount();
    mounts.delete(container);
  };
}
