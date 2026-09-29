/**
 * CivicPulse Shared Test Harness
 *
 * Zero-dependency assertion + reporting helper so the suites stay runnable with
 * plain `node`, matching the project's "no test framework" constraint.
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

let passed = 0;
let failed = 0;
const failures = [];
let currentSuite = '';

export function suite(name) {
  currentSuite = name;
  console.log('\n============================================================');
  console.log(` ${name}`);
  console.log('============================================================');
}

export function group(name) {
  console.log(`\n--- ${name} ---`);
}

export function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failures.push(`[${currentSuite}] ${message}`);
    failed++;
  }
  return !!condition;
}

export function assertEqual(actual, expected, message) {
  const ok = Object.is(actual, expected);
  return assert(ok, ok ? message : `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

export function assertClose(actual, expected, tolerance, message) {
  const ok = typeof actual === 'number' && Math.abs(actual - expected) <= tolerance;
  return assert(ok, ok ? message : `${message} (expected ~${expected}±${tolerance}, got ${actual})`);
}

export function assertBetween(actual, min, max, message) {
  const ok = typeof actual === 'number' && actual >= min && actual <= max;
  return assert(ok, ok ? message : `${message} (expected ${min}..${max}, got ${actual})`);
}

export function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  return assert(a === e, a === e ? message : `${message} (expected ${e}, got ${a})`);
}

/**
 * Asserts an async call rejects. Returns the caught error for further checks.
 */
export async function assertRejects(fn, message) {
  try {
    await fn();
    return assert(false, `${message} (expected a rejection, but it resolved)`);
  } catch (err) {
    return assert(true, `${message} (rejected with: ${err.message})`);
  }
}

export function summary(label) {
  console.log('\n============================================================');
  if (failed === 0) {
    console.log(` ${label}: ALL ${passed} ASSERTIONS PASSED`);
  } else {
    console.log(` ${label}: ${passed} passed, ${failed} FAILED`);
    console.log(' Failing assertions:');
    failures.forEach(f => console.log(`   - ${f}`));
  }
  console.log('============================================================\n');
  if (failed > 0) process.exitCode = 1;
  return failed;
}

export function counts() {
  return { passed, failed };
}

/**
 * Boots the Express app on an ephemeral port and returns a fetch-based client.
 * `configure` runs before the import of `../src/index.js` so suites can flip
 * env flags (e.g. strict rate limiting) prior to module initialisation.
 */
export async function startTestServer(configure) {
  if (typeof configure === 'function') configure();
  const { default: app } = await import('../src/index.js');
  const http = await import('node:http');
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    async close() {
      await new Promise(resolve => server.close(resolve));
    },
    async get(path, headers) {
      return fetch(`${baseUrl}${path}`, { headers });
    },
    async postJson(path, body, headers = {}) {
      return fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });
    },
    async postForm(path, formData, headers = {}) {
      return fetch(`${baseUrl}${path}`, { method: 'POST', body: formData, headers });
    },
  };
}
