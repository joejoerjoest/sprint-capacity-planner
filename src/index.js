import Resolver from '@forge/resolver';
import { kvs } from '@forge/kvs';
import api, { route } from '@forge/api';

const resolver = new Resolver();

// Build a per-project storage key. Prefer the extension context project id,
// fall back to a projectId passed in the payload, else 'global'.
function projectKey(req) {
    const ctxProjectId = req?.context?.extension?.project?.id;
    const payloadProjectId = req?.payload?.projectId;
    const projectId = ctxProjectId || payloadProjectId || 'global';
    return `cap:${projectId}`;
}

resolver.define('getData', async (req) => {
    const key = projectKey(req);
    const histKey = `${key}:hist`;

    const main = await kvs.get(key);
    const history = await kvs.get(histKey);

    return {
        config: main?.config ?? null,
        members: main?.members ?? [],
        leaves: main?.leaves ?? [],
        bufferPct: main?.bufferPct ?? 0,
        history: history ?? [],
    };
});

resolver.define('saveData', async (req) => {
    const key = projectKey(req);
    const { config, members, leaves, bufferPct } = req.payload ?? {};

    await kvs.set(key, {
        config: config ?? null,
        members: members ?? [],
        leaves: leaves ?? [],
        bufferPct: bufferPct ?? 0,
    });

    return { ok: true };
});

const MAX_HISTORY = 20;

// Append the current sprint as a snapshot to the per-project history key.
resolver.define('saveSnapshot', async (req) => {
    const histKey = `${projectKey(req)}:hist`;
    const { snapshot } = req.payload ?? {};

    const existing = (await kvs.get(histKey)) ?? [];
    const entry = {
        id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        savedAt: new Date().toISOString(),
        ...snapshot,
    };
    // Newest first, capped to MAX_HISTORY.
    const history = [entry, ...existing].slice(0, MAX_HISTORY);

    await kvs.set(histKey, history);
    return { history };
});

// Remove one snapshot by id from the per-project history key.
resolver.define('deleteSnapshot', async (req) => {
    const histKey = `${projectKey(req)}:hist`;
    const { id } = req.payload ?? {};

    const existing = (await kvs.get(histKey)) ?? [];
    const history = existing.filter((s) => s.id !== id);

    await kvs.set(histKey, history);
    return { history };
});

// ── Jira integration (asApp — uses the app's install-time consent) ──
function projectIdOrKey(req) {
    return (
        req?.context?.extension?.project?.key ||
        req?.context?.extension?.project?.id ||
        req?.payload?.projectIdOrKey
    );
}

async function jiraJson(routeValue, label = '') {
    const res = await api.asApp().requestJira(routeValue);
    if (!res.ok) {
        let body = '';
        try { body = (await res.text()).slice(0, 300); } catch (e) { /* ignore */ }
        console.error(`Jira ${res.status} ${res.statusText} on [${label}] :: ${body}`);
        throw new Error(`Jira ${res.status} ${res.statusText} :: ${body}`);
    }
    return res.json();
}

resolver.define('jiraSprints', async (req) => {
    const pid = projectIdOrKey(req);
    const boardData = await jiraJson(route`/rest/agile/1.0/board?projectKeyOrId=${pid}&maxResults=50`);
    const boards = boardData?.values ?? [];
    if (boards.length === 0) return { sprints: [], reason: 'no-board' };

    // Only Scrum boards have sprints; try them (most relevant first) and skip
    // any board that returns "does not support sprints".
    const ordered = boards.slice().sort((a, b) => (b.type === 'scrum') - (a.type === 'scrum'));
    let sprints = [];
    for (const board of ordered) {
        try {
            const sprintData = await jiraJson(
                route`/rest/agile/1.0/board/${board.id}/sprint?state=active,future&maxResults=50`
            );
            sprints = (sprintData?.values ?? []).map((s) => ({
                id: s.id, name: s.name, state: s.state, startDate: s.startDate, endDate: s.endDate,
            }));
            if (sprints.length > 0) break;
        } catch (e) {
            // Kanban / non-sprint board — skip it.
        }
    }
    if (sprints.length === 0) {
        const hasScrum = boards.some((b) => b.type === 'scrum');
        return { sprints: [], reason: hasScrum ? 'no-sprints' : 'no-scrum-board' };
    }
    return { sprints };
});

// Unique assignees across the linked sprint's issues — the people actually
// doing the work. Uses the agile issue scopes (no user-search scope needed).
resolver.define('jiraUsers', async (req) => {
    const { sprintId } = req.payload ?? {};
    if (!sprintId) return { users: [], reason: 'no-sprint' };

    const seen = new Map();
    let startAt = 0;
    while (true) {
        const data = await jiraJson(
            route`/rest/agile/1.0/sprint/${sprintId}/issue?startAt=${startAt}&maxResults=50&fields=assignee`
        );
        const issues = data?.issues ?? [];
        for (const it of issues) {
            const a = it.fields?.assignee;
            if (a?.accountId && !seen.has(a.accountId)) {
                seen.set(a.accountId, { accountId: a.accountId, displayName: a.displayName });
            }
        }
        startAt += issues.length;
        if (issues.length === 0 || startAt >= (data?.total ?? startAt)) break;
    }
    return { users: [...seen.values()] };
});

resolver.define('jiraCommitted', async (req) => {
    const { sprintId } = req.payload ?? {};
    if (!sprintId) return { committed: null };

    // Find the board behind this sprint, then its configured estimation field
    // (Story Points). Uses agile scopes only — avoids /rest/api/3/field.
    let estField = null;
    try {
        const sprint = await jiraJson(route`/rest/agile/1.0/sprint/${sprintId}`, 'sprint');
        const boardId = sprint?.originBoardId;
        if (boardId) {
            const cfg = await jiraJson(route`/rest/agile/1.0/board/${boardId}/configuration`, 'board-config');
            const fid = cfg?.estimation?.field?.fieldId;
            if (fid && fid !== 'none') estField = fid;
        }
    } catch (e) {
        // Fall back to issue count only.
    }

    let totalSP = 0;
    let issueCount = 0;
    let startAt = 0;
    while (true) {
        const fieldsParam = estField || 'summary';
        const data = await jiraJson(
            route`/rest/agile/1.0/sprint/${sprintId}/issue?startAt=${startAt}&maxResults=50&fields=${fieldsParam}`,
            'sprint-issue'
        );
        const issues = data?.issues ?? [];
        issueCount += issues.length;
        if (estField) {
            for (const it of issues) {
                const v = it.fields?.[estField];
                if (typeof v === 'number') totalSP += v;
            }
        }
        startAt += issues.length;
        if (issues.length === 0 || startAt >= (data?.total ?? startAt)) break;
    }
    return { committed: { totalSP: Math.round(totalSP * 10) / 10, issueCount, hasSP: !!estField } };
});

export const handler = resolver.getDefinitions();
