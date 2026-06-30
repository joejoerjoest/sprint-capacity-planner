import Resolver from '@forge/resolver';
import { kvs } from '@forge/kvs';

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

export const handler = resolver.getDefinitions();
