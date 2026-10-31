const PYODIDE_VERSION = '0.27.7';
let worker;
let sequence = 0;
const pending = new Map();
let ready = false;

function startWorker() {
  if (worker) return;
  worker = new Worker(new URL('./python.worker.js', import.meta.url), { type: 'classic' });
  worker.onmessage = ({ data }) => {
    const entry = pending.get(data.id);
    if (!entry) return;
    if (data.ready) {
      ready = true;
      clearTimeout(entry.timer);
      entry.timer = setTimeout(() => {
        pending.delete(data.id);
        worker?.terminate();
        worker = undefined;
        ready = false;
        pending.forEach(({ reject, timer }) => {
          clearTimeout(timer);
          reject(new Error('The Python worker was stopped after taking too long.'));
        });
        pending.clear();
        entry.reject(new Error('This run took longer than 3 seconds, so it was stopped. Check for a loop that does not end.'));
      }, entry.timeout);
      return;
    }
    clearTimeout(entry.timer);
    pending.delete(data.id);
    if (data.ok) entry.resolve(data);
    else entry.reject(new Error(data.error));
  };
  worker.onerror = (event) => {
    pending.forEach(({ reject, timer }) => {
      clearTimeout(timer);
      reject(new Error(event.message || 'The Python worker stopped unexpectedly.'));
    });
    pending.clear();
    worker?.terminate();
    worker = undefined;
    ready = false;
  };
}

function request(action, payload, timeout = 3000) {
  startWorker();
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      worker?.terminate();
      worker = undefined;
      ready = false;
      pending.forEach(({ reject: fail, timer: otherTimer }) => {
        clearTimeout(otherTimer);
        fail(new Error('The Python worker was stopped after taking too long.'));
      });
      pending.clear();
      reject(new Error('Pyodide took too long to start. Check your connection, then try again.'));
    }, 120000);
    pending.set(id, { resolve, reject, timer, timeout });
    worker.postMessage({ id, action, ...payload });
  });
}

export async function runPython(code, inputs = []) {
  const result = await request('run', { code, inputs });
  ready = true;
  return result;
}

export async function testExercise(code, tests) {
  const result = await request('test', { code, tests }, 3000);
  ready = true;
  return result.results;
}

export function stopPython() {
  if (worker) worker.terminate();
  worker = undefined;
  ready = false;
  pending.forEach(({ reject, timer }) => {
    clearTimeout(timer);
    reject(new Error('Python was stopped.'));
  });
  pending.clear();
}

export function isPythonReady() {
  return ready;
}

export { PYODIDE_VERSION };
