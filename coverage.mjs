// Board — which parts of index.html does test.mjs never execute?
//
// Run: node coverage.mjs            (report)
//      node coverage.mjs --max=155  (fail if MORE functions are unexecuted than N)
//      node coverage.mjs --list=40  (show N worst offenders, default 30)
//
// WHY THIS EXISTS
// Three real bugs in two releases came out of code paths the suite never ran:
//   v1.7.71  the share link was plaintext            (found by reading code)
//   v1.7.75  deflate never ran at all — share URLs ~7x oversized (found only once the
//            harness could call Share; an unused getWriter() locked the stream)
//   v1.7.76  WebRTC connection failure was silent    (found only once the harness
//            stubbed RTCPeerConnection)
// In each case index.html *read* as if it worked. A green suite of 1600+ checks proves
// nothing about a function it never calls, and in one case a harness gap had even been
// promoted into a backlog blocker ("cannot be verified"). This tool replaces luck with
// a list: it names the functions that are still invisible, so the next such bug is
// looked for on purpose.
//
// Zero dependencies, like everything else here — Node's built-in V8 coverage
// (NODE_V8_COVERAGE) already reports eval'd sources, and test.mjs runs index.html's
// inline <script> through new Function().
//
// TWO CAVEATS WHEN READING THE NUMBER
// 1. Coverage is FUNCTION-level, not line- or branch-level: a function counts as covered
//    the moment it is entered, even if most branches inside it never run. The blind spot
//    is therefore always AT LEAST this large — never smaller.
// 2. V8 compiles inner functions lazily, so the TOTAL grows as coverage improves: calling
//    an outer function for the first time makes its nested closures exist to be counted.
//    Covering the ~7KB keydown dispatcher moved the total 529 → 533 while the unexecuted
//    count fell by only 1. Compare the absolute unexecuted count across runs, not the
//    percentage, and expect the denominator to drift upward.

import { readFileSync, rmSync, mkdtempSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

const args = process.argv.slice(2);
const argOf = (name, dflt) => {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  return hit ? Number(hit.slice(name.length + 3)) : dflt;
};
const LIST = argOf('list', 30);
const MAX = argOf('max', NaN);

const html = readFileSync('./index.html', 'utf8');
const js = (html.match(/<script>([\s\S]*?)<\/script>/) || [])[1];
if (!js) { console.error('coverage: could not find the inline <script> in index.html'); process.exit(1); }
// index.html line = inline-script line + this
const LINE_BASE = html.slice(0, html.indexOf('<script>')).split('\n').length - 1;

const dir = mkdtempSync(join(tmpdir(), 'board-cov-'));
try {
  execFileSync(process.execPath, ['test.mjs'], {
    env: { ...process.env, NODE_V8_COVERAGE: dir },
    stdio: 'ignore',
  });
} catch (e) {
  console.error('coverage: test.mjs failed — fix the suite before measuring coverage');
  process.exit(1);
}

// The inline script is compiled via new Function(), so V8 reports it with an empty url.
let script = null;
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.json')) continue;
  for (const s of JSON.parse(readFileSync(join(dir, f), 'utf8')).result) {
    if (s.url === '' && (s.functions || []).length > 100) script = s;
  }
}
rmSync(dir, { recursive: true, force: true });
if (!script) { console.error('coverage: no coverage recorded for the inline script'); process.exit(1); }

// new Function() prepends a synthetic `function anonymous(...params\n) {\n` header, so V8
// offsets are shifted from offsets into `js`. Derive the shift empirically rather than
// reconstructing that header: take every uniquely-named top-level function, compute its
// implied shift, and use the value the majority agrees on. Robust to Node changing the
// header format.
const votes = new Map();
for (const fn of script.functions) {
  const n = fn.functionName;
  if (!n) continue;
  const needle = `function ${n}(`;
  const first = js.indexOf(needle);
  if (first < 0 || js.indexOf(needle, first + 1) !== -1) continue;   // must be unique
  const shift = fn.ranges[0].startOffset - first;
  votes.set(shift, (votes.get(shift) || 0) + 1);
}
const ranked = [...votes].sort((a, b) => b[1] - a[1]);
if (!ranked.length) { console.error('coverage: could not align offsets to source'); process.exit(1); }
const [shift, agree] = ranked[0];
const total = [...votes.values()].reduce((a, b) => a + b, 0);

const lineOf = off => js.slice(0, off - shift).split('\n').length + LINE_BASE;
// A one-line excerpt makes an anonymous function identifiable without opening the file.
const excerpt = off => {
  const at = off - shift;
  if (at < 0 || at > js.length) return '';
  return js.slice(at, at + 90).split('\n')[0].trim().slice(0, 72);
};

const dead = [];
for (const fn of script.functions) {
  const r = fn.ranges[0];
  if (r.count !== 0) continue;
  dead.push({
    name: fn.functionName || '(anonymous)',
    size: r.endOffset - r.startOffset,
    line: lineOf(r.startOffset),
    src: excerpt(r.startOffset),
  });
}
dead.sort((a, b) => b.size - a.size);

const pct = (dead.length / script.functions.length * 100).toFixed(1);
console.log(`\nindex.html inline script — function coverage`);
console.log(`  offset alignment: shift=${shift} (${agree}/${total} named functions agree)`);
console.log(`  ${script.functions.length} functions, ${dead.length} never executed (${pct}%)\n`);
console.log(`  Never executed, largest first — size is a proxy for unverified logic:`);
for (const d of dead.slice(0, LIST)) {
  console.log(`  ${String(d.size).padStart(6)}B  index.html:${String(d.line).padEnd(5)}  ${d.name}`);
  if (d.name === '(anonymous)' && d.src) console.log(`             ${d.src}`);
}
if (dead.length > LIST) console.log(`  … and ${dead.length - LIST} more (--list=${dead.length} for all)`);

if (Number.isFinite(MAX)) {
  if (dead.length > MAX) {
    console.log(`\n✗ ${dead.length} unexecuted functions exceeds the --max=${MAX} baseline.`);
    console.log(`  Either cover the new code, or raise the baseline deliberately.`);
    console.log(`  NOTE: covering an outer function for the first time can RAISE this count,`);
    console.log(`  because V8 then compiles its nested closures and they start being counted.`);
    console.log(`  Covering openCtxMenu once moved it 137 -> 147. A rise is not automatically`);
    console.log(`  a regression — check whether total functions grew by a similar amount.`);
    process.exit(1);
  }
  console.log(`\n✓ ${dead.length} unexecuted functions is within the --max=${MAX} baseline.`);
}
console.log();
