const PYODIDE_VERSION = '0.27.7';
let runtimePromise;

async function getRuntime() {
  if (!runtimePromise) {
    importScripts(`https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`);
    runtimePromise = loadPyodide({
      indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,
    });
  }
  return runtimePromise;
}

function normalized(text) {
  return String(text).replace(/\r\n/g, '\n').split('\n').map((line) => line.replace(/[ \t]+$/g, '')).join('\n').replace(/\n+$/, '');
}

function sameValue(actual, expected) {
  if (actual === expected) return true;
  if (Array.isArray(actual) || Array.isArray(expected)) {
    return Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length &&
      actual.every((value, index) => sameValue(value, expected[index]));
  }
  if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    return sameValue(actualKeys, expectedKeys) && actualKeys.every((key) => sameValue(actual[key], expected[key]));
  }
  return false;
}

async function execute(pyodide, code, test) {
  await pyodide.runPythonAsync(`
import builtins, contextlib, io, json, os, shutil, tempfile
_pc_capture = io.StringIO()
_pc_inputs = iter(json.loads(${JSON.stringify(JSON.stringify(test.inputs || []))}))
_pc_old_input = builtins.input
_pc_old_cwd = os.getcwd()
_pc_temp = tempfile.mkdtemp()
os.chdir(_pc_temp)
def _pc_input(prompt=""):
    if prompt:
        print(prompt, end="")
    return next(_pc_inputs, "")
builtins.input = _pc_input
_pc_namespace = {"__builtins__": builtins.__dict__}
`);
  if (test.type === 'function') pyodide.globals.set('_pc_test_data', pyodide.toPy(test));
  try {
    const output = await pyodide.runPythonAsync(`
with contextlib.redirect_stdout(_pc_capture):
    exec(${JSON.stringify(code)}, _pc_namespace)
_pc_capture.getvalue()
`);
    if (test.type !== 'function') return { output: normalized(output) };
    const value = await pyodide.runPythonAsync(`
_pc_result = _pc_namespace[_pc_test_data["function"]](*_pc_test_data.get("args", []), **_pc_test_data.get("kwargs", {}))
json.dumps(_pc_result, default=repr, sort_keys=True)
`);
    return { value: JSON.parse(value), output: normalized(output) };
  } catch (error) {
    return { error: error.message || String(error), output: normalized(await pyodide.runPythonAsync('_pc_capture.getvalue()')) };
  } finally {
    if (test.type === 'function') pyodide.globals.delete('_pc_test_data');
    await pyodide.runPythonAsync('builtins.input = _pc_old_input\nos.chdir(_pc_old_cwd)\nshutil.rmtree(_pc_temp, ignore_errors=True)');
  }
}

async function runCode(pyodide, code, inputs = []) {
  await pyodide.runPythonAsync(`
import builtins, contextlib, io, json
_pc_capture = io.StringIO()
_pc_inputs = iter(json.loads(${JSON.stringify(JSON.stringify(inputs))}))
_pc_original_input = builtins.input
def _pc_input(prompt=""):
    if prompt:
        print(prompt, end="")
    return next(_pc_inputs, "")
builtins.input = _pc_input
_pc_namespace = {"__builtins__": builtins.__dict__}
`);
  try {
    await pyodide.runPythonAsync(`with contextlib.redirect_stdout(_pc_capture):\n    exec(${JSON.stringify(code)}, _pc_namespace)`);
    return { output: normalized(await pyodide.runPythonAsync('_pc_capture.getvalue()')) };
  } catch (error) {
    return { output: normalized(await pyodide.runPythonAsync('_pc_capture.getvalue()')), error: error.message || String(error) };
  } finally {
    await pyodide.runPythonAsync('builtins.input = _pc_original_input');
  }
}

async function runTests(pyodide, code, tests) {
  const results = [];
  for (const test of tests) {
    let result;
    if (test.type === 'structure') {
      const source = JSON.stringify(code);
      const query = JSON.stringify(test.query);
      const found = await pyodide.runPythonAsync(`
import ast, json
_tree = ast.parse(json.loads(${JSON.stringify(source)}))
_query = json.loads(${JSON.stringify(query)})
_nodes = list(ast.walk(_tree))
any((isinstance(n, ast.FunctionDef) and n.name == _query) or
    (isinstance(n, ast.AsyncFunctionDef) and n.name == _query) or
    (isinstance(n, ast.ClassDef) and n.name == _query) or
    (isinstance(n, (ast.For, ast.AsyncFor, ast.While)) and _query == "loop")
    for n in _nodes)
`);
      result = { value: Boolean(found), expected: true };
    } else {
        const fresh = await getRuntime();
        const value = await execute(fresh, code, test);
      result = test.type === 'function'
        ? { value: value.value, expected: test.expected, error: value.error }
        : { value: value.output, expected: normalized(test.expected), error: value.error };
    }
    const passed = !result.error && sameValue(result.value, result.expected);
    results.push({ passed, description: test.description, actual: result.value, expected: result.expected, error: result.error });
  }
  return results;
}

self.onmessage = async ({ data }) => {
  const { id, action, code = '', tests = [], inputs = [] } = data;
  try {
    const pyodide = await getRuntime();
    self.postMessage({ id, ready: true });
    const result = action === 'test'
      ? { results: await runTests(pyodide, code, tests) }
      : await runCode(pyodide, code, inputs);
    self.postMessage({ id, ok: true, ...result });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error.message || String(error) });
  }
};
