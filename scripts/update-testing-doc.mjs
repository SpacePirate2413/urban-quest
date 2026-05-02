#!/usr/bin/env node
/**
 * Run the api test suite, parse the JSON results, and rewrite Testing.md.
 *
 * The doc is intended for a non-coder reader (the project owner): plain-English
 * descriptions, pass/fail icons, and clickable file:line links to both the
 * test and the production code where the failure surfaced.
 *
 * Usage:
 *   node scripts/update-testing-doc.mjs
 *
 * Exits non-zero if any test failed (so CI / hooks can react).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const API_DIR = path.join(REPO_ROOT, 'apps', 'api');
const RESULTS_FILE = path.join(API_DIR, 'test-results.json');
const TESTING_DOC = path.join(REPO_ROOT, 'Testing.md');

// Plain-English descriptions, keyed by `<test-file relative to apps/api>::<full test name>`.
// New tests added without an entry here fall back to the test's own name.
const DESCRIPTIONS = {
  // app.test.ts (pre-existing smoke)
  'tests/app.test.ts::API Application > Health Check > should return health status':
    'Confirms the /health endpoint reports the server is alive.',
  'tests/app.test.ts::API Application > App Bootstrap > should have CORS configured':
    'Confirms the app loaded the CORS plugin so browsers can call it.',
  'tests/app.test.ts::API Application > App Bootstrap > should have JWT configured':
    'Confirms the app loaded the JWT plugin so tokens can be issued and verified.',
  'tests/app.test.ts::API Application > App Bootstrap > should have cookie support':
    'Confirms cookies can be set and read (used by the dev-auth flow).',
  'tests/app.test.ts::API Application > Users Routes > should have users routes registered':
    'Confirms /api/users/me exists (returns 401 without a token, not 404).',
  // auth.test.ts
  'tests/auth.test.ts::Auth: protected routes > rejects /api/users/me with no token':
    'Anonymous request to "who am I" is rejected with 401 instead of leaking data.',
  'tests/auth.test.ts::Auth: protected routes > returns the user for /api/users/me with a valid token':
    'A logged-in user can fetch their own profile and gets back their own row.',
  'tests/auth.test.ts::Auth: protected routes > rejects /api/users/me with a malformed token':
    'A garbage token is rejected with 401 (no crash, no impersonation).',
  // quests.test.ts
  'tests/quests.test.ts::Quests CRUD > creates a quest with the authenticated user as author':
    'A creator can make a new quest; the server stamps them as the author.',
  'tests/quests.test.ts::Quests CRUD > rejects quest creation without auth':
    'You must be logged in to create a quest.',
  'tests/quests.test.ts::Quests CRUD > rejects quest creation with empty title':
    'A quest with no title is rejected at the API boundary.',
  'tests/quests.test.ts::Quests CRUD > returns only my quests from /api/quests/my':
    'GET /quests/my never leaks another user\'s quests.',
  'tests/quests.test.ts::Quests CRUD > updates a quest the user owns':
    'A creator can edit their own quest.',
  'tests/quests.test.ts::Quests CRUD > refuses to update a quest the user does not own':
    'A different user cannot edit your quest (404, not silent overwrite).',
  'tests/quests.test.ts::Quests CRUD > deletes a quest the user owns':
    'A creator can delete their own quest.',
  'tests/quests.test.ts::Quests CRUD > accepts ageRating E10+ (the value the creator-station UI offers)':
    'The age rating dropdown in the creator UI matches what the API accepts.',
  // quest-publish.test.ts
  'tests/quest-publish.test.ts::Quest publish + submit-for-review > refuses to publish a quest with no waypoints':
    'You can\'t publish a quest with no waypoints — the API blocks it.',
  'tests/quest-publish.test.ts::Quest publish + submit-for-review > refuses to publish a quest with no scenes':
    'You can\'t publish a quest with no scenes — the API blocks it.',
  'tests/quest-publish.test.ts::Quest publish + submit-for-review > publishes a quest that has a waypoint and a scene':
    'A complete quest publishes, gets a publish timestamp, and inherits its first waypoint as the start coords.',
  'tests/quest-publish.test.ts::Quest publish + submit-for-review > refuses submit-for-review when any scene is missing media':
    'Submitting a quest for admin review fails if any scene has no audio/video uploaded.',
  'tests/quest-publish.test.ts::Quest publish + submit-for-review > marks the quest pending when all scenes have media':
    'A quest with media on every scene flips to submissionStatus=pending when submitted.',
  'tests/quest-publish.test.ts::Edit-published-quest re-review trigger > flags submissionStatus=needs_re_review when a published quest title changes':
    'Editing a content field on a published quest auto-flags it for admin re-review (without unpublishing).',
  'tests/quest-publish.test.ts::Edit-published-quest re-review trigger > does not flag re-review when the changed field is non-content (e.g. coordinates)':
    'Editing non-content fields on a published quest does NOT trigger a re-review.',
  'tests/quest-publish.test.ts::Edit-published-quest re-review trigger > does not re-flag a quest already pending review':
    'A quest already in pending review stays pending — we don\'t demote it back to needs_re_review.',
  // scenes.test.ts
  'tests/scenes.test.ts::Scene CRUD > creates a scene under a quest the user owns':
    'A creator can add a scene to their own quest.',
  'tests/scenes.test.ts::Scene CRUD > refuses to create a scene under a quest the user does not own':
    'Adding a scene to someone else\'s quest is rejected with 404.',
  'tests/scenes.test.ts::Scene CRUD > updates and deletes a scene':
    'A scene can be edited and deleted by its owner.',
  'tests/scenes.test.ts::Scene media upload > rejects upload to an unknown sceneId with 404 (not "Load failed")':
    'Uploading media to a scene that doesn\'t exist returns a clear 404 (the bug that produced "Load failed" is regression-tested).',
  'tests/scenes.test.ts::Scene media upload > rejects upload of a disallowed mime type':
    'Only audio/video file types are accepted; everything else is rejected at the API.',
  'tests/scenes.test.ts::Scene media upload > accepts an audio upload and attaches mediaUrl to the scene':
    'A valid audio upload is stored, returns a /api/media/ URL, and is persisted on the scene row.',
  // admin.test.ts
  'tests/admin.test.ts::Admin: submissions feed > lists quests with a submissionStatus':
    'The admin submissions endpoint returns every quest awaiting / past review.',
  'tests/admin.test.ts::Admin: submissions feed > omits quests with no submissionStatus (pure drafts)':
    'Pure draft quests (never submitted) don\'t leak into the admin queue.',
  'tests/admin.test.ts::Admin: submissions feed > filters by submissionStatus query param':
    'The admin can filter the submissions queue by status (pending, approved, etc.).',
  'tests/admin.test.ts::Admin: quest-level review > approves the quest and cascades approved status + notes to every scene':
    'Approving a quest cascades the approved status and reviewer notes to every scene under it.',
  'tests/admin.test.ts::Admin: quest-level review > rejects the quest and stamps the rejection note on every scene':
    'Rejecting a quest cascades the rejected status and feedback note to every scene under it.',
  'tests/admin.test.ts::Admin: quest-level review > returns 404 when reviewing a non-existent quest':
    'Reviewing a quest that doesn\'t exist returns 404 cleanly.',
  'tests/admin.test.ts::Admin: quest-level review > rejects a payload with an invalid status enum':
    'Reviewer must pick approved or rejected — anything else is rejected with 400.',
};

// Phase 1 = API integration tests. We tag every test as Integration; later
// phases will introduce Unit and E2E.
function categorize(_filePath) {
  return 'Integration';
}

function relTestPath(absPath) {
  // Vitest reports absolute paths; we want them relative to apps/api so the
  // markdown links stay short and readable.
  return path.relative(API_DIR, absPath).split(path.sep).join('/');
}

function repoRelative(absPath) {
  return path.relative(REPO_ROOT, absPath).split(path.sep).join('/');
}

function runTests() {
  try {
    execSync(
      `pnpm --filter @urban-quest/api exec vitest run --reporter=json --outputFile=${RESULTS_FILE}`,
      { cwd: REPO_ROOT, stdio: 'pipe' },
    );
  } catch {
    // vitest exits non-zero on test failure — that's fine, JSON file still got written
  }
}

function loadResults() {
  if (!fs.existsSync(RESULTS_FILE)) {
    throw new Error(`Test results JSON not found at ${RESULTS_FILE} — did the test run crash?`);
  }
  return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
}

/**
 * Pull a {file, line} location for the production code that surfaced the
 * failure. We look for the first stack frame inside apps/api/src that isn't
 * the test file itself; if there isn't one, we return null and only show the
 * test-file link.
 */
function extractCodeLocation(failureMessages) {
  if (!Array.isArray(failureMessages) || failureMessages.length === 0) return null;
  for (const msg of failureMessages) {
    const lines = String(msg).split('\n');
    for (const line of lines) {
      const m = line.match(/\(?([^()\s]+\.ts):(\d+):\d+\)?/);
      if (!m) continue;
      const file = m[1];
      // Prefer src/ over tests/. If only test file appears, skip — it's already linked.
      if (file.includes(`${path.sep}apps${path.sep}api${path.sep}src${path.sep}`)
        || file.includes('/apps/api/src/')) {
        return { file: repoRelative(file), line: Number(m[2]) };
      }
    }
  }
  return null;
}

function buildDoc(results) {
  const tests = [];
  let n = 0;
  for (const file of results.testResults || []) {
    const fileRel = relTestPath(file.name);
    const fileRepoRel = repoRelative(file.name);
    for (const a of file.assertionResults || []) {
      n += 1;
      const fullName = a.fullName || a.title;
      const key = `${fileRel}::${fullName}`;
      const description = DESCRIPTIONS[key] || a.title;
      const passed = a.status === 'passed';
      const codeLoc = passed ? null : extractCodeLocation(a.failureMessages);
      tests.push({
        n,
        name: fullName,
        description,
        category: categorize(fileRel),
        passed,
        testFile: fileRepoRel,
        // Vitest's JSON reporter doesn't expose per-assertion line numbers reliably.
        // We link the file; the reader can grep for the test name.
        codeLoc,
      });
    }
  }
  return tests;
}

function renderDoc(tests, runStartedAt) {
  const passed = tests.filter((t) => t.passed);
  const failed = tests.filter((t) => !t.passed);

  const out = [];
  out.push('# Testing');
  out.push('');
  out.push('Auto-generated by `/testing` (see `scripts/update-testing-doc.mjs`). Do not edit by hand.');
  out.push('');
  out.push(`_Last run: ${runStartedAt}_`);
  out.push('');
  out.push('## Summary');
  out.push('');
  out.push(`- ✅ **${passed.length} passing**`);
  out.push(`- ❌ **${failed.length} failing**`);
  out.push(`- **${tests.length} total**`);
  out.push('');

  if (failed.length > 0) {
    out.push('### ❌ Failing tests');
    out.push('');
    for (const t of failed) {
      out.push(`- ❌ [#${t.n}](#test-${t.n}) — ${t.name}`);
    }
    out.push('');
  }
  if (passed.length > 0) {
    out.push('### ✅ Passing tests');
    out.push('');
    for (const t of passed) {
      out.push(`- ✅ [#${t.n}](#test-${t.n}) — ${t.name}`);
    }
    out.push('');
  }

  out.push('---');
  out.push('');
  out.push('## Tests');
  out.push('');

  for (const t of tests) {
    out.push(`### <a id="test-${t.n}"></a>${t.passed ? '✅' : '❌'} #${t.n} — ${t.name}`);
    out.push('');
    out.push(`**Category:** ${t.category}`);
    out.push('');
    out.push(`**What it does:** ${t.description}`);
    out.push('');
    out.push(`**Test location:** [\`${t.testFile}\`](${t.testFile})`);
    out.push('');
    if (!t.passed && t.codeLoc) {
      out.push(`**Code error location:** [\`${t.codeLoc.file}:${t.codeLoc.line}\`](${t.codeLoc.file}#L${t.codeLoc.line})`);
      out.push('');
    }
  }

  return out.join('\n') + '\n';
}

function main() {
  runTests();
  const results = loadResults();
  const tests = buildDoc(results);
  const doc = renderDoc(tests, new Date().toISOString());
  fs.writeFileSync(TESTING_DOC, doc, 'utf8');

  const failed = tests.filter((t) => !t.passed);
  if (failed.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`\n⚠️  ${failed.length} test(s) failing. See Testing.md.\n`);
    failed.forEach((t) => console.error(`  ❌ #${t.n} ${t.name}`));
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`✅ ${tests.length} tests passing. Testing.md updated.`);
}

main();
