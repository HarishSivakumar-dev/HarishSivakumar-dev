// Generates project, stats, language and streak cards from live GitHub data.
// Runs in .github/workflows/profile-assets.yml; output is published to the `output` branch.
// Usage: GITHUB_TOKEN=... node scripts/build-cards.mjs <outDir>
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { themes, MONO, SANS, esc } from './theme.mjs';

const USER = 'HarishSivakumar-dev';

// Descriptions are curated here because several repos have long or empty ones.
export const PROJECTS = [
  { repo: 'Tick-It', blurb: 'Event-driven ticketing where escalation and prioritization are first-class workflows.', tags: 'Spring Boot / Kafka / Microservices' },
  { repo: 'SkillSprint', blurb: 'Corporate learning platform modelling real org hierarchies, mentorship and approvals.', tags: 'Spring Boot / RBAC' },
  { repo: 'PersonalChatBot', blurb: 'RAG chatbot with embeddings and vector search for domain-specific retrieval.', tags: 'Spring AI / Phi / Qdrant' },
  { repo: 'JWT-Based-RBAC-and-Refresh-Tokens', title: 'JWT RBAC + Refresh Tokens', blurb: 'Role-based access control with refresh tokens and method-level security.', tags: 'Spring Security / JWT / MySQL' },
];

function headers() {
  const h = { 'User-Agent': USER, Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function rest(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`GET ${path}: HTTP ${res.status}`);
  return res.json();
}

export async function fetchRepoData() {
  const repos = await rest(`/users/${USER}/repos?per_page=100&type=owner`);
  const owned = repos.filter((r) => !r.fork && r.name !== USER);
  const totals = {};
  for (const r of owned) {
    for (const [lang, bytes] of Object.entries(await rest(`/repos/${USER}/${r.name}/languages`))) {
      totals[lang] = (totals[lang] || 0) + bytes;
    }
  }
  return { repos: owned, languages: totals, stars: owned.reduce((n, r) => n + r.stargazers_count, 0) };
}

async function fetchContributions() {
  const query = `query($login: String!) { user(login: $login) { contributionsCollection {
    totalCommitContributions totalPullRequestContributions
    contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
  } } }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ query, variables: { login: USER } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors || res.status)}`);
  const c = json.data.user.contributionsCollection;
  return {
    total: c.contributionCalendar.totalContributions,
    commits: c.totalCommitContributions,
    prs: c.totalPullRequestContributions,
    days: c.contributionCalendar.weeks.flatMap((w) => w.contributionDays),
  };
}

// `days` is chronological. A quiet "today" does not break the streak: the day isn't over.
export function computeStreaks(days) {
  let longest = 0;
  let run = 0;
  let active = 0;
  for (const d of days) {
    if (d.contributionCount > 0) {
      run += 1;
      active += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].contributionCount > 0) current += 1;
    else if (i !== days.length - 1) break;
  }
  return { current, longest, active };
}

function frame(w, h, t, body, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
<style>
  .h { font: 600 15px ${SANS}; fill: ${t.text}; }
  .p { font: 400 13px ${SANS}; fill: ${t.muted}; }
  .m { font: 400 12px ${MONO}; fill: ${t.muted}; }
  .num { font: 600 26px ${SANS}; fill: ${t.text}; }
</style>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="8" fill="${t.surface}" stroke="${t.border}"/>
${body}</svg>`;
}

function wrap(text, max) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const cur = lines[lines.length - 1];
    if ((cur + ' ' + word).trim().length > max) lines.push(word);
    else lines[lines.length - 1] = (cur + ' ' + word).trim();
  }
  return lines;
}

export function projectCard(project, repo, t) {
  const lines = wrap(project.blurb, 56);
  const star = repo.stargazers_count ? ` / ${repo.stargazers_count} star${repo.stargazers_count > 1 ? 's' : ''}` : '';
  const body = `<rect x="20" y="22" width="4" height="16" rx="2" fill="${t.signal}"/>
<text x="32" y="35" class="h">${esc(project.title || project.repo)}</text>
${lines.map((l, i) => `<text x="20" y="${62 + i * 19}" class="p">${esc(l)}</text>`).join('\n')}
<text x="20" y="122" class="m">${esc(project.tags)}${esc(star)}</text>`;
  return frame(440, 142, t, body, `${project.title || project.repo}: ${project.blurb}`);
}

export function statsCard({ total, commits, prs, stars, repoCount }, t) {
  const cells = [
    [total, 'contributions, 12 mo'],
    [commits, 'commits, 12 mo'],
    [prs, 'pull requests, 12 mo'],
    [stars, `stars across ${repoCount} repos`],
  ];
  const body = `<text x="20" y="34" class="h">Activity</text>
${cells
  .map(([n, label], i) => {
    const x = 20 + (i % 2) * 205;
    const y = 80 + Math.floor(i / 2) * 68;
    return `<text x="${x}" y="${y}" class="num">${n}</text><text x="${x}" y="${y + 20}" class="m">${esc(label)}</text>`;
  })
  .join('\n')}`;
  return frame(440, 200, t, body, `Activity: ${cells.map(([n, l]) => `${n} ${l}`).join(', ')}`);
}

export function languagesCard(languages, t) {
  const sorted = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const sum = sorted.reduce((n, [, b]) => n + b, 0);
  const top = sorted.slice(0, 4);
  const other = sorted.slice(4).reduce((n, [, b]) => n + b, 0);
  if (other) top.push(['Other', other]);
  const rows = top.map(([name, bytes]) => [name, (bytes / sum) * 100]);

  let x = 20;
  const bar = rows
    .map(([, pct], i) => {
      const w = (pct / 100) * 400;
      const r = `<rect x="${x.toFixed(1)}" y="50" width="${w.toFixed(1)}" height="8" fill="${t.series[i]}"/>`;
      x += w;
      return r;
    })
    .join('');
  const list = rows
    .map(([name, pct], i) => {
      const y = 84 + i * 22;
      return `<rect x="20" y="${y - 9}" width="10" height="10" rx="2" fill="${t.series[i]}"/><text x="38" y="${y}" class="p">${esc(name)}</text><text x="420" y="${y}" text-anchor="end" class="m">${pct.toFixed(1)}%</text>`;
    })
    .join('\n');
  const body = `<text x="20" y="34" class="h">Languages</text>
<clipPath id="b"><rect x="20" y="50" width="400" height="8" rx="4"/></clipPath>
<g clip-path="url(#b)">${bar}</g>
${list}`;
  return frame(440, 200, t, body, `Languages: ${rows.map(([n, p]) => `${n} ${p.toFixed(1)}%`).join(', ')}`);
}

export function streakCard({ current, longest, active }, t) {
  const cells = [
    [current, 'current streak (days)'],
    [longest, 'longest streak, 12 mo'],
    [active, 'active days, 12 mo'],
  ];
  const body = cells
    .map(([n, label], i) => {
      const x = 150 + i * 300;
      const fill = i === 0 ? ` style="fill:${t.signal}"` : '';
      return `<text x="${x}" y="50" text-anchor="middle" class="num"${fill}>${n}</text><text x="${x}" y="74" text-anchor="middle" class="m">${esc(label)}</text>`;
    })
    .join('\n');
  return frame(900, 100, t, body, `Streaks: ${cells.map(([n, l]) => `${n} ${l}`).join(', ')}`);
}

export async function writeCards(outDir, data) {
  await mkdir(outDir, { recursive: true });
  for (const [mode, t] of Object.entries(themes)) {
    for (const project of PROJECTS) {
      const repo = data.repos.find((r) => r.name === project.repo);
      if (!repo) throw new Error(`Featured repo not found: ${project.repo}`);
      await writeFile(join(outDir, `project-${project.repo}-${mode}.svg`), projectCard(project, repo, t));
    }
    await writeFile(join(outDir, `stats-${mode}.svg`), statsCard({ ...data.contrib, stars: data.stars, repoCount: data.repos.length }, t));
    await writeFile(join(outDir, `languages-${mode}.svg`), languagesCard(data.languages, t));
    await writeFile(join(outDir, `streak-${mode}.svg`), streakCard(computeStreaks(data.contrib.days), t));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required');
  const outDir = process.argv[2] || 'dist';
  const [repoData, contrib] = await Promise.all([fetchRepoData(), fetchContributions()]);
  await writeCards(outDir, { ...repoData, contrib });
  console.log('cards written to', outDir);
}
