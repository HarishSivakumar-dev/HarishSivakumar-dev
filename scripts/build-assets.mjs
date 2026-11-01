// Generates the animated banner, stack panel and footer in assets/.
// Run manually after changing them: node scripts/build-assets.mjs
// Icons are fetched once from skillicons.dev and embedded, so the committed SVGs
// have no runtime dependency on that service.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { themes, MONO, SANS, esc } from './theme.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

const SPRING = 'https://spring.io/img/projects';
const SIMPLE = 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons';
const DEVICON = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons';

const ICONIFY = 'https://api.iconify.design';
const onTile = (mode) => (mode === 'dark' ? '#FFFFFF' : '#000000');

// Item kinds: `skill` is a ready-made skillicons tile (`badge` marks it as a variant); `url` is
// a logo placed on a matching tile (`paint` recolours it). pgvector, RAG and RBAC have no
// official logo, so they use a badged Postgres tile and generic Tabler symbols.
const STACK = [
  {
    lane: 'core',
    items: [
      { name: 'Java', skill: 'java' },
      { name: 'Spring Boot', skill: 'spring' },
      { name: 'Hibernate', skill: 'hibernate' },
      { name: 'Spring Security', url: `${SPRING}/spring-security.svg` },
      { name: 'Spring Cloud', url: `${SPRING}/spring-cloud.svg` },
    ],
  },
  {
    lane: 'events + data',
    items: [
      { name: 'Kafka', skill: 'kafka' },
      { name: 'Redis', skill: 'redis' },
      { name: 'PostgreSQL', skill: 'postgres' },
      { name: 'MySQL', skill: 'mysql' },
      { name: 'pgvector', skill: 'postgres', badge: true },
      {
        name: 'WebSockets',
        url: `${ICONIFY}/logos/websocket.svg`,
        paint: (svg, mode) => svg.replace('#231f20', onTile(mode)),
      },
    ],
  },
  {
    lane: 'ai + auth',
    items: [
      { name: 'Spring AI', url: `${SPRING}/spring-ai.svg` },
      { name: 'Gemini', url: `${SIMPLE}/googlegemini.svg`, paint: (svg) => svg.replace('<svg', '<svg fill="#8E75B2"') },
      { name: 'RAG', url: `${ICONIFY}/tabler/file-search.svg`, paint: (svg, _, t) => svg.replaceAll('currentColor', t.stream) },
      { name: 'OAuth2', url: `${DEVICON}/oauth/oauth-original.svg` },
      { name: 'JWT', url: `${SIMPLE}/jsonwebtokens.svg`, paint: (svg, mode) => svg.replace('<svg', `<svg fill="${onTile(mode)}"`) },
      { name: 'RBAC', url: `${ICONIFY}/tabler/user-shield.svg`, paint: (svg, _, t) => svg.replaceAll('currentColor', t.stream) },
    ],
  },
  {
    lane: 'infra',
    items: [
      { name: 'Docker', skill: 'docker' },
      { name: 'AWS', skill: 'aws' },
      { name: 'Nginx', skill: 'nginx' },
      { name: 'Git', skill: 'git' },
      { name: 'GitHub', skill: 'github' },
    ],
  },
];

// Same tile colours as skillicons, so custom tiles sit flush beside its icons.
const TILE = { dark: '#242938', light: '#F4F2ED' };

async function fetchText(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
}

const dataUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

async function tile(item, x, y, t, mode, delay) {
  const open = `<g class="node" style="animation-delay:${delay}s" transform-origin="${x} ${y}">`;
  if (item.skill) {
    const href = dataUri(await fetchText(`https://skillicons.dev/icons?i=${item.skill}&theme=${mode}`));
    // Arrow badge: the Postgres tile with this mark stands for pgvector.
    const badge = item.badge
      ? `<circle cx="${x + 39}" cy="${y + 39}" r="10" fill="${t.stream}" stroke="${TILE[mode]}" stroke-width="2"/><path d="M${x + 35} ${y + 43}l8-8m-5 0h5v5" fill="none" stroke="${TILE[mode]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
      : '';
    return `${open}<image href="${href}" x="${x}" y="${y}" width="48" height="48"/>${badge}</g>\n`;
  }
  const base = `<rect x="${x}" y="${y}" width="48" height="48" rx="11" fill="${TILE[mode]}"/>`;
  let svg = await fetchText(item.url);
  if (item.paint) svg = item.paint(svg, mode, t);
  return `${open}${base}<image href="${dataUri(svg)}" x="${x + 8}" y="${y + 8}" width="32" height="32"/></g>\n`;
}

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

async function stack(t, mode) {
  const LANE_H = 76;
  const W = 900;
  const H = STACK.length * LANE_H + 12;
  const CYCLE = 8;
  let body = '';

  for (const [li, { lane, items }] of STACK.entries()) {
    const y = 8 + li * LANE_H;
    const mid = y + 32;
    const delay = li * 0.6;
    body += `<text x="4" y="${mid + 4}" class="lane">${esc(lane)}</text>
<line x1="150" y1="${mid}" x2="${W - 4}" y2="${mid}" stroke="${t.border}" stroke-width="1.5"/>
<rect class="pulse" x="150" y="${mid - 1.5}" width="70" height="3" rx="1.5" fill="${t.signal}" style="animation-delay:${delay}s"/>\n`;

    for (const [i, item] of items.entries()) {
      body += await tile(item, 168 + i * 62, mid - 24, t, mode, (delay + i * 0.5).toFixed(1));
    }
  }

  const label = STACK.map((l) => `${l.lane}: ${l.items.map((i) => i.name).join(', ')}`).join('. ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
<style>
  .lane { font: 600 13px ${MONO}; fill: ${t.muted}; }
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

const TRACKS = ['Video Games', 'Summertime Sadness', 'Young and Beautiful', 'West Coast', 'Cinnamon Girl'];

// A README can't play audio, so this is a looping display card that links out to Spotify.
async function nowPlaying(t, mode) {
  const GREEN = mode === 'dark' ? '#1DB954' : '#15803D';
  const PER_TRACK = 6;
  const logo = (await fetchText(`${SIMPLE}/spotify.svg`)).replace('<svg', `<svg fill="${GREEN}"`);
  const bars = [0, 1, 2, 3, 4]
    .map(
      (i) =>
        `<rect class="bar" x="${816 + i * 10}" y="34" width="6" height="32" rx="1.5" fill="${GREEN}" style="animation-delay:-${(i * 0.37).toFixed(2)}s;animation-duration:${(1 + (i % 3) * 0.25).toFixed(2)}s"/>`
    )
    .join('');
  const titles = TRACKS.map(
    (name, i) =>
      `<text class="title${i === 0 ? ' first' : ''}" x="108" y="53" style="animation-delay:${i * PER_TRACK}s">${esc(name)}</text>`
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 112" role="img" aria-label="On repeat: Lana Del Rey. ${esc(TRACKS.join(', '))}. Click to play.">
<style>
  .kicker { font: 600 11px ${MONO}; fill: ${t.muted}; letter-spacing: 1px; }
  .title { font: 600 19px ${SANS}; fill: ${t.text}; opacity: 0; animation: track ${TRACKS.length * PER_TRACK}s linear infinite; }
  .artist { font: 400 13px ${SANS}; fill: ${t.muted}; }
  @keyframes track { 0% { opacity: 0; } 2%, 18% { opacity: 1; } 20%, 100% { opacity: 0; } }
  .progress { transform-box: fill-box; transform-origin: left; animation: play ${PER_TRACK}s linear infinite; }
  @keyframes play { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  .bar { transform-box: fill-box; transform-origin: bottom; animation: eq 1s ease-in-out infinite alternate; }
  @keyframes eq { from { transform: scaleY(0.2); } to { transform: scaleY(1); } }
  ${motionCss}
  @media (prefers-reduced-motion: reduce) { .first { opacity: 1; } .progress { transform: scaleX(0.4); } }
</style>
<rect x="0.5" y="0.5" width="899" height="111" rx="8" fill="${t.surface}" stroke="${t.border}"/>
<image href="${dataUri(logo)}" x="28" y="28" width="56" height="56"/>
<text x="108" y="28" class="kicker">ON REPEAT</text>
<text x="868" y="24" text-anchor="end" class="kicker" style="fill:${GREEN}">CLICK TO PLAY</text>
${titles}
<text x="108" y="73" class="artist">Lana Del Rey</text>
<rect x="108" y="86" width="670" height="3" rx="1.5" fill="${t.border}"/>
<rect class="progress" x="108" y="86" width="670" height="3" rx="1.5" fill="${GREEN}"/>
${bars}
</svg>`;
}

// Two streams drain into one final committed event, which settles the page.
function footer(t) {
  const left = 'M60 26H450';
  const right = 'M840 26H450';
  const drop = (d, delay) =>
    `<circle class="packet" r="3" fill="${t.signal}" style="offset-path:path('${d}');animation-delay:${delay}s"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 84" role="img" aria-label="End of logs">
<style>
  .end { font: 400 12.5px ${MONO}; fill: ${t.muted}; }
  .packet { opacity: 0; animation: drain 5s ease-in infinite; }
  @keyframes drain {
    0% { offset-distance: 0%; opacity: 0; }
    15% { opacity: 1; }
    60% { offset-distance: 100%; opacity: 1; }
    64%, 100% { offset-distance: 100%; opacity: 0; }
  }
  .halo { transform-box: fill-box; transform-origin: center; animation: ring 5s ease-out infinite; opacity: 0; }
  @keyframes ring {
    0%, 60% { transform: scale(0.4); opacity: 0; }
    64% { opacity: 0.6; }
    90%, 100% { transform: scale(2.4); opacity: 0; }
  }
  ${motionCss}
</style>
<defs>
  <linearGradient id="fadeL"><stop offset="0" stop-color="${t.border}" stop-opacity="0"/><stop offset="1" stop-color="${t.border}"/></linearGradient>
  <linearGradient id="fadeR"><stop offset="0" stop-color="${t.border}"/><stop offset="1" stop-color="${t.border}" stop-opacity="0"/></linearGradient>
</defs>
<rect x="60" y="25" width="380" height="2" fill="url(#fadeL)"/>
<rect x="460" y="25" width="380" height="2" fill="url(#fadeR)"/>
${drop(left, 0)}${drop(right, 0)}
<circle class="halo" cx="450" cy="26" r="7" fill="none" stroke="${t.stream}" stroke-width="1.5"/>
<circle cx="450" cy="26" r="5" fill="${t.stream}"/>
<text x="450" y="66" text-anchor="middle" class="end">End of logs</text>
</svg>`;
}

await mkdir(OUT, { recursive: true });
for (const [mode, t] of Object.entries(themes)) {
  await writeFile(join(OUT, `header-${mode}.svg`), header(t));
  await writeFile(join(OUT, `stack-${mode}.svg`), await stack(t, mode));
  await writeFile(join(OUT, `now-playing-${mode}.svg`), await nowPlaying(t, mode));
  await writeFile(join(OUT, `footer-${mode}.svg`), footer(t));
}
console.log('assets written to', OUT);
