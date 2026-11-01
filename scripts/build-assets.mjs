// Generates the animated banner, stack panel and footer in assets/.
// Run manually after changing them: node scripts/build-assets.mjs
// Icons are fetched once from skillicons.dev and embedded, so the committed SVGs
// have no runtime dependency on that service.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { themes, MONO, SANS, esc } from './theme.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

const STACK = [
  { lane: 'core', icons: ['java', 'spring', 'hibernate'], chips: ['Spring Security', 'Spring Cloud'] },
  { lane: 'events + data', icons: ['kafka', 'redis', 'postgres', 'mysql'], chips: ['pgvector', 'WebSockets'] },
  { lane: 'ai + auth', icons: [], chips: ['Spring AI', 'Gemini', 'RAG', 'OAuth2', 'JWT', 'RBAC'] },
  { lane: 'infra', icons: ['docker', 'aws', 'nginx', 'git', 'github'], chips: [] },
];

const motionCss = `
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; }
  .packet { display: none; }
}`;

function header(t) {
  const CYCLE = 9;
  const cells = Array.from({ length: 10 }, (_, i) => 310 + i * 28);
  const paths = [
    'M170 172 C230 172 240 200 310 200',
    'M170 228 C230 228 240 200 310 200',
    'M590 200 C660 200 670 172 730 172',
    'M590 200 C660 200 670 228 730 228',
  ];
  const box = (x, y, label) => `
    <rect x="${x}" y="${y - 19}" width="130" height="38" rx="6" fill="${t.surface}" stroke="${t.border}"/>
    <text x="${x + 65}" y="${y + 4}" text-anchor="middle" class="label">${label}</text>`;
  const packet = (path, delay) =>
    `<circle class="packet" r="4" fill="${t.signal}" style="offset-path:path('${path}');animation-delay:${delay}s"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 270" role="img" aria-label="Harish Sivakumar. Backend developer building event-driven systems. Events flow from producers through a log to consumers.">
<style>
  .name { font: 700 44px ${SANS}; fill: ${t.text}; letter-spacing: -0.5px; }
  .tag { font: 400 15px ${MONO}; fill: ${t.muted}; }
  .label { font: 400 12px ${MONO}; fill: ${t.muted}; }
  .packet { opacity: 0; animation: travel ${CYCLE / 3}s linear infinite; }
  @keyframes travel {
    0% { offset-distance: 0%; opacity: 0; }
    6% { opacity: 1; }
    30% { offset-distance: 100%; opacity: 1; }
    33%, 100% { offset-distance: 100%; opacity: 0; }
  }
  .cell { fill: ${t.surface}; animation: commit ${CYCLE}s linear infinite; }
  @keyframes commit {
    0%, 2% { fill: ${t.surface}; }
    4%, 12% { fill: ${t.stream}; }
    22%, 100% { fill: ${t.surface}; }
  }
  ${motionCss}
</style>
<text x="40" y="66" class="name">Harish Sivakumar</text>
<text x="42" y="98" class="tag">backend developer / event-driven systems / java + spring boot + kafka</text>
${paths.map((d) => `<path d="${d}" fill="none" stroke="${t.border}" stroke-width="1.5"/>`).join('\n')}
${box(40, 172, 'POST /tickets')}${box(40, 228, 'auth.service')}
${box(730, 172, 'notify.service')}${box(730, 228, 'search.index')}
${cells
  .map(
    (x, i) =>
      `<rect class="cell" x="${x}" y="183" width="24" height="34" rx="3" stroke="${t.border}" style="animation-delay:${((i * CYCLE) / 10).toFixed(1)}s"/>`
  )
  .join('\n')}
<text x="450" y="166" text-anchor="middle" class="label">topic: profile.events</text>
<text x="450" y="240" text-anchor="middle" class="label">partition 0 / append-only</text>
${packet(paths[0], 0)}${packet(paths[1], 1.5)}${packet(paths[2], 0.75)}${packet(paths[3], 2.25)}
</svg>`;
}

async function iconUri(name, mode) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`https://skillicons.dev/icons?i=${name}&theme=${mode}`);
      if (!res.ok) throw new Error(`skillicons ${name}: HTTP ${res.status}`);
      return `data:image/svg+xml;base64,${Buffer.from(await res.text()).toString('base64')}`;
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
}

async function stack(t, mode) {
  const LANE_H = 76;
  const W = 900;
  const H = STACK.length * LANE_H + 12;
  const CYCLE = 8;
  let body = '';

  for (const [li, { lane, icons, chips }] of STACK.entries()) {
    const y = 8 + li * LANE_H;
    const mid = y + 32;
    const delay = li * 0.6;
    body += `<text x="4" y="${mid + 4}" class="lane">${esc(lane)}</text>
<line x1="150" y1="${mid}" x2="${W - 4}" y2="${mid}" stroke="${t.border}" stroke-width="1.5"/>
<rect class="pulse" x="150" y="${mid - 1.5}" width="70" height="3" rx="1.5" fill="${t.signal}" style="animation-delay:${delay}s"/>\n`;

    let x = 168;
    for (const [i, name] of icons.entries()) {
      const href = await iconUri(name, mode);
      body += `<image class="node" href="${href}" x="${x}" y="${mid - 24}" width="48" height="48" style="animation-delay:${(delay + i * 0.5).toFixed(1)}s"/>\n`;
      x += 62;
    }
    for (const chip of chips) {
      const w = chip.length * 7.6 + 24;
      body += `<g><rect x="${x}" y="${mid - 15}" width="${w}" height="30" rx="6" fill="${t.surface}" stroke="${t.border}"/><text x="${x + w / 2}" y="${mid + 4.5}" text-anchor="middle" class="chip">${esc(chip)}</text></g>\n`;
      x += w + 10;
    }
  }

  const label = STACK.map((l) => `${l.lane}: ${[...l.icons, ...l.chips].join(', ')}`).join('. ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
<style>
  .lane { font: 600 13px ${MONO}; fill: ${t.muted}; }
  .chip { font: 400 12.5px ${MONO}; fill: ${t.text}; }
  .pulse { opacity: 0; animation: sweep ${CYCLE}s ease-in-out infinite; }
  @keyframes sweep {
    0% { transform: translateX(0); opacity: 0; }
    5% { opacity: 1; }
    45% { opacity: 1; }
    50% { transform: translateX(${W - 224}px); opacity: 0; }
    100% { transform: translateX(${W - 224}px); opacity: 0; }
  }
  .node { animation: lift ${CYCLE}s ease-in-out infinite; }
  @keyframes lift {
    0%, 10%, 100% { transform: translateY(0); }
    5% { transform: translateY(-3px); }
  }
  ${motionCss}
</style>
${body}</svg>`;
}

function footer(t) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 70" role="img" aria-label="End of log. Consumer caught up, lag zero.">
<style>
  .end { font: 400 13px ${MONO}; fill: ${t.muted}; }
  .run { stroke-dasharray: 6 10; animation: flow 3s linear infinite; }
  @keyframes flow { to { stroke-dashoffset: -64; } }
  .dot { animation: blink 3s ease-in-out infinite; }
  @keyframes blink { 50% { opacity: 0.25; } }
  ${motionCss}
</style>
<line class="run" x1="4" y1="20" x2="896" y2="20" stroke="${t.stream}" stroke-width="2"/>
<circle class="dot" cx="306" cy="50" r="4" fill="${t.signal}"/>
<text x="320" y="55" class="end">end of log / consumer lag: 0</text>
</svg>`;
}

await mkdir(OUT, { recursive: true });
for (const [mode, t] of Object.entries(themes)) {
  await writeFile(join(OUT, `header-${mode}.svg`), header(t));
  await writeFile(join(OUT, `stack-${mode}.svg`), await stack(t, mode));
  await writeFile(join(OUT, `footer-${mode}.svg`), footer(t));
}
console.log('assets written to', OUT);
