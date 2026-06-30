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

export const handler = resolver.getDefinitions();
