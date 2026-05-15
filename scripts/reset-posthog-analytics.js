#!/usr/bin/env node

/**
 * PostHog Analytics Reset Script
 *
 * Cleans up old PostHog insights/dashboards (which reference the old 27-event schema)
 * and creates a fresh set of 18 insights aligned with the new 8-event lineup.
 *
 * After running this script, manually create dashboards in the PostHog UI and add
 * the insights. The PostHog REST API does not support adding tiles to dashboards.
 *
 * Usage:
 *   node scripts/reset-posthog-analytics.js
 *
 * Requires these vars in frontend/.env:
 *   POSTHOG_PERSONAL_API_KEY=phx_...
 *   POSTHOG_PROJECT_ID=12345
 *   VITE_POSTHOG_HOST=https://us.i.posthog.com
 */

const fs = require('fs');
const path = require('path');

// ── Load env ──────────────────────────────────────────────────────────────
const envPath = path.resolve(__dirname, '../frontend/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#=]+)=(.+)$/);
  if (m) envVars[m[1].trim()] = m[2].trim();
}

const API_KEY = envVars.POSTHOG_PERSONAL_API_KEY;
const PROJECT_ID = envVars.POSTHOG_PROJECT_ID;
const HOST = envVars.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

if (!API_KEY || !PROJECT_ID) {
  console.error('Missing POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID in frontend/.env');
  process.exit(1);
}

const BASE = `${HOST}/api/projects/${PROJECT_ID}`;
const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

// ── Helpers ───────────────────────────────────────────────────────────────
async function api(method, endpoint, body = null) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${endpoint}`, opts);
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`${method} ${endpoint} → ${res.status}: ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function getAll(endpoint) {
  const results = [];
  let offset = 0;
  while (true) {
    const data = await api('GET', `${endpoint}?limit=100&offset=${offset}`);
    results.push(...data.results);
    if (!data.next) break;
    offset += 100;
  }
  return results;
}

// ── Insight query builders ────────────────────────────────────────────────

function trend(event, { breakdown, display } = {}) {
  const source = {
    kind: 'TrendsQuery',
    series: [{ kind: 'EventsNode', name: event, event }],
    interval: 'day',
    dateRange: { date_from: '-30d' },
    trendsFilter: { display: display || 'ActionsLineGraph' },
    version: 2,
  };
  if (breakdown) {
    source.breakdownFilter = { breakdown, breakdown_type: 'event' };
  }
  return { kind: 'InsightVizNode', source };
}

function funnel(steps) {
  return {
    kind: 'InsightVizNode',
    source: {
      kind: 'FunnelsQuery',
      series: steps.map(e => ({ kind: 'EventsNode', name: e, event: e })),
      dateRange: { date_from: '-30d' },
      version: 2,
    },
  };
}

// ── Insight definitions ───────────────────────────────────────────────────

const INSIGHT_DEFS = [
  // ── User Lifecycle ──
  { name: 'Signups by Method', query: trend('user_signed_up', { breakdown: '$method', display: 'ActionsBar' }) },
  { name: 'Signup Trend', query: trend('user_signed_up') },

  // ── Core Conversion ──
  { name: 'Visits Logged', query: trend('visit_logged') },
  { name: 'Visits with Review', query: trend('visit_logged', { breakdown: 'includes_review', display: 'ActionsBar' }) },
  { name: 'Reviews Created', query: trend('review_created') },
  { name: 'Reviews by Source', query: trend('review_created', { breakdown: 'source', display: 'ActionsBar' }) },
  { name: 'Average WFC Rating Given', query: trend('review_created') },

  // ── Discovery ──
  { name: 'Cafe Views Trend', query: trend('cafe_viewed') },
  { name: 'Cafe Views by Source', query: trend('cafe_viewed', { breakdown: 'source', display: 'ActionsBar' }) },
  { name: 'Search Volume', query: trend('search_performed') },
  { name: 'Search Zero-Result Rate', query: trend('search_performed') },

  // ── Real-World Intent ──
  { name: 'Directions Clicked', query: trend('directions_clicked') },

  // ── Virality ──
  { name: 'Share Links Copied', query: trend('share_link_copied') },

  // ── Onboarding Friction ──
  { name: 'Location Permission Grant Rate', query: trend('location_permission_responded', { breakdown: 'granted', display: 'ActionsPie' }) },

  // ── Funnels ──
  { name: 'Activation Funnel (Signup → Visit → Review)', query: funnel(['user_signed_up', 'visit_logged', 'review_created']) },
  { name: 'Discovery Funnel (View → Visit)', query: funnel(['cafe_viewed', 'visit_logged']) },
  { name: 'Search Funnel (Search → View → Visit)', query: funnel(['search_performed', 'cafe_viewed', 'visit_logged']) },
  { name: 'Real-World Funnel (View → Directions)', query: funnel(['cafe_viewed', 'directions_clicked']) },
];

// ── Dashboard definitions (for manual creation) ───────────────────────────

const DASHBOARD_DEFS = [
  {
    name: 'Product Health',
    description: 'Core platform health — signups, activation, retention indicators.',
    insightNames: [
      'Signup Trend', 'Signups by Method',
      'Visits Logged', 'Visits with Review',
      'Reviews Created', 'Reviews by Source',
      'Location Permission Grant Rate',
      'Activation Funnel (Signup → Visit → Review)',
    ],
  },
  {
    name: 'Discovery & Search',
    description: 'How users discover cafes and whether search is effective.',
    insightNames: [
      'Cafe Views Trend', 'Cafe Views by Source',
      'Search Volume', 'Search Zero-Result Rate',
      'Discovery Funnel (View → Visit)',
      'Search Funnel (Search → View → Visit)',
    ],
  },
  {
    name: 'Growth & Intent',
    description: 'Real-world intent signals, sharing behavior, and conversion funnels.',
    insightNames: [
      'Directions Clicked',
      'Share Links Copied',
      'Real-World Funnel (View → Directions)',
      'Activation Funnel (Signup → Visit → Review)',
    ],
  },
];

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔧 PostHog Analytics Reset\n');
  console.log(`   Project: ${PROJECT_ID}`);
  console.log(`   Host:    ${HOST}\n`);

  // ── Step 1: Soft-delete old insights ─────────────────────────────────
  console.log('📋 Step 1: Fetching existing insights...');
  const oldInsights = await getAll('/insights/');
  console.log(`   Found ${oldInsights.length} insights`);

  let deletedInsights = 0;
  for (const insight of oldInsights) {
    try {
      await api('PATCH', `/insights/${insight.id}`, { deleted: true });
      deletedInsights++;
    } catch (e) {
      console.error(`   ⚠ Failed to delete "${insight.name}" (${insight.id}): ${e.message}`);
    }
  }
  console.log(`   ✅ Soft-deleted ${deletedInsights} insights\n`);

  // ── Step 2: Soft-delete old dashboards ───────────────────────────────
  console.log('📋 Step 2: Fetching existing dashboards...');
  const oldDashboards = await getAll('/dashboards/');
  console.log(`   Found ${oldDashboards.length} dashboards`);

  let deletedDashboards = 0;
  for (const db of oldDashboards) {
    try {
      await api('PATCH', `/dashboards/${db.id}`, { deleted: true });
      deletedDashboards++;
    } catch (e) {
      console.error(`   ⚠ Failed to delete "${db.name}" (${db.id}): ${e.message}`);
    }
  }
  console.log(`   ✅ Soft-deleted ${deletedDashboards} dashboards\n`);

  // ── Step 3: Create new insights ─────────────────────────────────────
  console.log('📊 Step 3: Creating new insights...\n');

  const createdInsights = [];
  for (const def of INSIGHT_DEFS) {
    try {
      const result = await api('POST', '/insights/', {
        name: def.name,
        query: def.query,
        description: '',
      });
      createdInsights.push(result);
      console.log(`   ✅ ${def.name} (id=${result.id})`);
    } catch (e) {
      console.error(`   ⚠ ${def.name}: ${e.message}`);
    }
  }
  console.log(`\n   Created ${createdInsights.length}/${INSIGHT_DEFS.length} insights\n`);

  // ── Step 4: Create dashboards and link insights ──────────────────────
  console.log('📊 Step 4: Creating dashboards...\n');

  const byName = name => createdInsights.find(i => i.name === name);

  for (const dd of DASHBOARD_DEFS) {
    try {
      const db = await api('POST', '/dashboards/', {
        name: dd.name,
        description: dd.description,
        filters: {},
      });

      let linked = 0;
      for (const name of dd.insightNames) {
        const insight = byName(name);
        if (!insight) continue;

        const currentDashboards = insight.dashboards || [];
        await api('PATCH', `/insights/${insight.id}/`, {
          dashboards: [...currentDashboards, db.id],
        });
        linked++;
      }

      console.log(`   ✅ "${dd.name}" — ${linked} insights`);
    } catch (e) {
      console.error(`   ⚠ "${dd.name}": ${e.message}`);
    }
  }

  console.log('\n🎉 Done!\n');
  console.log('   Old insights/dashboards are soft-deleted (recoverable in PostHog UI).');
  console.log('   Historical event data is preserved — old event names still exist in');
  console.log('   PostHog but are no longer sent by the app.\n');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
