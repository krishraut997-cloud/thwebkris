import { useEffect, useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { indentWithTab, toggleLineComment } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { useProgress } from '../context/ProgressContext.jsx';

export default function CodeEditor({ value, onChange, onRun, label = 'Python code editor', className = '' }) {
  const { state } = useProgress();
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const extensions = useMemo(() => [
    python(),
    keymap.of([
      indentWithTab,
      { key: 'Mod-Enter', run: () => { onRun?.(); return true; } },
      { key: 'Mod-/', run: toggleLineComment },
    ]),
  ], [onRun]);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: dark)');
    const update = (event) => setSystemDark(event.matches);
    preference.addEventListener?.('change', update);
    return () => preference.removeEventListener?.('change', update);
  }, []);

  return (
    <div className={`pc-editor ${className}`}>
      <CodeMirror
        value={value}
        height="230px"
        extensions={extensions}
        onChange={onChange}
        theme={state.theme === 'dark' || (state.theme === 'system' && systemDark) ? 'dark' : 'light'}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          bracketMatching: true,
          autocompletion: true,
          indentOnInput: true,
          tabSize: 4,
        }}
        aria-label={label}
      />
      <div className="pc-editor-hint">Python <span>⌘ / Ctrl + Enter to run · ⌘ / Ctrl + / to comment</span></div>
    </div>
  );
}
