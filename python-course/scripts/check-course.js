import { loadPyodide } from 'pyodide';
import { course } from '../src/content/course.js';

const pyodide = await loadPyodide();
let failures = 0;
let checked = 0;

function normalize(value) {
  return String(value).replace(/\r\n/g, '\n').split('\n').map((line) => line.replace(/[ \t]+$/g, '')).join('\n').replace(/\n+$/, '');
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

for (const level of course) {
  for (const lesson of level.modules) {
    for (const exercise of lesson.exercises) {
      checked += 1;
      for (const test of exercise.tests) {
        try {
          pyodide.globals.set('_pc_source', exercise.solution);
          pyodide.globals.set('_pc_test', pyodide.toPy(test));
          let actual;
          if (test.type === 'structure') {
            pyodide.globals.set('_pc_query', test.query);
            await pyodide.runPythonAsync(`
import ast
_pc_tree = ast.parse(_pc_source)
_pc_nodes = list(ast.walk(_pc_tree))
_pc_result = any(
    (isinstance(node, ast.FunctionDef) and node.name == _pc_query) or
    (isinstance(node, ast.AsyncFunctionDef) and node.name == _pc_query) or
    (isinstance(node, ast.ClassDef) and node.name == _pc_query) or
    (isinstance(node, (ast.For, ast.AsyncFor, ast.While)) and _pc_query == "loop")
    for node in _pc_nodes
)
`);
            actual = await pyodide.runPythonAsync('_pc_result');
          } else {
            pyodide.globals.set('_pc_inputs', pyodide.toPy(test.inputs || []));
            await pyodide.runPythonAsync(`
import builtins, contextlib, io, json, os, shutil, tempfile
_pc_capture = io.StringIO()
_pc_old_input = builtins.input
_pc_iter = iter(_pc_inputs)
_pc_old_cwd = os.getcwd()
_pc_temp = tempfile.mkdtemp()
os.chdir(_pc_temp)
def _pc_input(prompt=""):
    if prompt:
        print(prompt, end="")
    return next(_pc_iter, "")
builtins.input = _pc_input
_pc_namespace = {"__builtins__": builtins.__dict__}
try:
    with contextlib.redirect_stdout(_pc_capture):
        exec(_pc_source, _pc_namespace)
finally:
    builtins.input = _pc_old_input
    os.chdir(_pc_old_cwd)
    shutil.rmtree(_pc_temp, ignore_errors=True)
`);
            if (test.type === 'function') {
              pyodide.globals.set('_pc_function_name', test.function);
              const args = JSON.stringify(test.args || []);
              const kwargs = JSON.stringify(test.kwargs || {});
              const result = await pyodide.runPythonAsync(`
import json
_pc_function_result = _pc_namespace[_pc_function_name](*json.loads(${JSON.stringify(args)},), **json.loads(${JSON.stringify(kwargs)},))
json.dumps(_pc_function_result, default=repr, sort_keys=True)
`);
              actual = JSON.parse(result);
            } else {
              actual = await pyodide.runPythonAsync('_pc_capture.getvalue()');
            }
          }
          const matches = test.type === 'output'
            ? normalize(actual) === normalize(test.expected)
            : JSON.stringify(stable(actual)) === JSON.stringify(stable(test.expected));
          if (!matches) {
            failures += 1;
            console.error(`FAIL ${level.id}/${lesson.id}/${exercise.id}: expected ${JSON.stringify(test.expected)}, got ${JSON.stringify(actual)}`);
          }
        } catch (error) {
          failures += 1;
          console.error(`FAIL ${level.id}/${lesson.id}/${exercise.id}: ${error.message}`);
        } finally {
          pyodide.globals.delete('_pc_source');
          pyodide.globals.delete('_pc_test');
          if (test.type !== 'structure') pyodide.globals.delete('_pc_inputs');
          if (test.type === 'structure') {
            pyodide.globals.delete('_pc_query');
            pyodide.globals.delete('_pc_result');
          }
          if (test.type === 'function') pyodide.globals.delete('_pc_function_name');
        }
      }
    }
  }
}

console.log(`Checked ${checked} reference exercises across ${course.reduce((count, item) => count + item.modules.length, 0)} lessons.`);
if (failures) {
  console.error(`${failures} reference test(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('All reference solutions pass their output tests.');
}
