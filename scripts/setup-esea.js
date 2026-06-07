#!/usr/bin/env node
/**
 * scripts/setup-esea.js
 *
 * Seeds the full IBE ESEA audit template and custom report layout by:
 *   1. Logging in as admin
 *   2. Calling POST /api/setup/esea (uses full docxParser — all 34 sections)
 *   3. Verifying section + component counts
 *   4. Confirming templates are available via GET /api/templates
 *
 * Usage:
 *   npm run dev          # terminal 1
 *   node scripts/setup-esea.js   # terminal 2
 */

const http = require('http');

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const EXPECTED_SECTION_COUNT = 34;
const EXPECTED_SECTION_TYPES = {
  rich_content: 16,
  table: 16,
  checklist: 1,
  observation: 1,
};

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = options.body ? Buffer.from(options.body) : null;

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: parsed.pathname + (parsed.search || ''),
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(body ? { 'Content-Length': body.length } : {}),
          ...(options.headers || {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function extractCookie(headers) {
  const raw = headers['set-cookie'];
  if (!raw) return null;
  const arr = Array.isArray(raw) ? raw : [raw];
  const session = arr.find((c) => c.startsWith('veriaudit_session='));
  return session ? session.split(';')[0] : null;
}

function countByType(sections, key = 'type') {
  return sections.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}

function printSectionAudit(sections) {
  console.log('\n    Parsed checklist sections:');
  sections.forEach((s) => {
    const extras = [];
    if (s.fieldCount) extras.push(`${s.fieldCount} fields`);
    if (s.tableCount) extras.push(`${s.tableCount} table(s)`);
    const suffix = extras.length ? ` (${extras.join(', ')})` : '';
    console.log(`      [${String(s.orderIndex).padStart(2, ' ')}] ${s.type.padEnd(14)} ${s.title}${suffix}`);
  });
}

function printComponentAudit(components) {
  console.log('\n    Report layout components:');
  components.forEach((c, i) => {
    const mapped = c.sourceComponentId ? ` → ${c.sourceComponentId}` : '';
    console.log(`      [${String(i + 1).padStart(2, ' ')}] ${c.type.padEnd(22)} ${c.title}${mapped}`);
  });
}

async function main() {
  console.log('\n🚀  Aura Veritas — ESEA Full Setup Script');
  console.log('─'.repeat(60));

  // 1. Login
  console.log(`\n[1/4] Logging in as ${ADMIN_EMAIL} …`);
  const loginRes = await request(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  if (loginRes.status !== 200 || !loginRes.body.success) {
    console.error('❌  Login failed:', loginRes.body);
    process.exit(1);
  }

  const cookie = extractCookie(loginRes.headers);
  if (!cookie) {
    console.error('❌  No session cookie returned. Is the dev server running?');
    console.error('    Run: npm run dev');
    process.exit(1);
  }
  console.log(`    ✅  Logged in as "${loginRes.body.user.name}" (${loginRes.body.user.role})`);

  // 2. Seed via full parser
  console.log('\n[2/4] Parsing DOCX and seeding ALL sections + report components …');
  const setupRes = await request(`${BASE_URL}/api/setup/esea`, {
    method: 'POST',
    headers: { Cookie: cookie },
  });

  if (setupRes.status !== 200 || !setupRes.body.success) {
    console.error('❌  Setup failed:', setupRes.body);
    process.exit(1);
  }

  const { stats, sections, reportComponents } = setupRes.body;
  console.log(`    ✅  Template ID      : ${setupRes.body.templateId}`);
  console.log(`    ✅  Report Layout ID : ${setupRes.body.reportLayoutId}`);
  console.log(`    ✅  Sections parsed  : ${stats.sectionCount} (expected ≥ ${EXPECTED_SECTION_COUNT})`);
  console.log(`    ✅  Report components: ${stats.reportComponentCount}`);
  console.log(`    ✅  Checklist items  : ${stats.checklistFieldCount}`);
  console.log(`    ✅  Inspection points: ${stats.observationFieldCount}`);
  console.log(`    ✅  Data tables      : ${stats.tableCount}`);

  // 3. Validate completeness
  console.log('\n[3/4] Validating section & component completeness …');
  let failed = false;

  if (stats.sectionCount < EXPECTED_SECTION_COUNT) {
    console.error(`    ❌  Section count ${stats.sectionCount} < expected ${EXPECTED_SECTION_COUNT}`);
    failed = true;
  } else {
    console.log(`    ✅  Section count OK (${stats.sectionCount})`);
  }

  const actualTypes = stats.sectionSummary || countByType(sections);
  for (const [type, expected] of Object.entries(EXPECTED_SECTION_TYPES)) {
    const actual = actualTypes[type] || 0;
    if (actual < expected) {
      console.error(`    ❌  Section type "${type}": got ${actual}, expected ≥ ${expected}`);
      failed = true;
    } else {
      console.log(`    ✅  ${type}: ${actual} (expected ≥ ${expected})`);
    }
  }

  if (stats.checklistFieldCount < 20) {
    console.error(`    ❌  Safety checklist too small (${stats.checklistFieldCount} fields)`);
    failed = true;
  } else {
    console.log(`    ✅  Safety checklist fields: ${stats.checklistFieldCount}`);
  }

  if (stats.observationFieldCount < 10) {
    console.error(`    ❌  Inspection details too small (${stats.observationFieldCount} fields)`);
    failed = true;
  } else {
    console.log(`    ✅  Inspection detail fields: ${stats.observationFieldCount}`);
  }

  const mappedComponents = (reportComponents || []).filter((c) => c.sourceComponentId);
  if (mappedComponents.length < stats.tableCount + 2) {
    console.warn(`    ⚠️  Only ${mappedComponents.length} report components have data mappings`);
  } else {
    console.log(`    ✅  Mapped report components: ${mappedComponents.length}`);
  }

  if (sections?.length) printSectionAudit(sections);
  if (reportComponents?.length) printComponentAudit(reportComponents);

  if (failed) {
    console.error('\n❌  Validation failed — template is incomplete.');
    process.exit(1);
  }

  // 4. Verify via /api/templates
  console.log('\n[4/4] Verifying server templates …');
  const tplRes = await request(`${BASE_URL}/api/templates`, { headers: { Cookie: cookie } });

  if (tplRes.status !== 200) {
    console.error('❌  Could not fetch templates:', tplRes.body);
    process.exit(1);
  }

  const templates = Array.isArray(tplRes.body) ? tplRes.body : [];
  const esea = templates.find((t) => t.id === setupRes.body.templateId);
  const reportLayout = templates.find((t) => t.id === setupRes.body.reportLayoutId);

  console.log(`    ✅  ${templates.length} template(s) on server`);
  console.log(`    ✅  Audit template : "${esea?.title || 'found'}"`);
  console.log(`    ✅  Report layout  : "${reportLayout?.title || 'found'}" (${reportLayout?.components?.length || stats.reportComponentCount} components)`);

  console.log('\n' + '─'.repeat(60));
  console.log('✅  Full ESEA setup complete!\n');
  console.log('  Next steps:');
  console.log('  1. Open http://localhost:3000 → login (admin@example.com / admin)');
  console.log('  2. Templates auto-sync on load — find "IBE ESEA" on Dashboard');
  console.log('  3. Start Audit → fill all sections → Complete Audit');
  console.log('  4. Download report:  🔴 PDF  or  🔵 Word  buttons on completed session');
  console.log('─'.repeat(60) + '\n');
}

main().catch((err) => {
  console.error('Fatal:', err.message || err);
  process.exit(1);
});
