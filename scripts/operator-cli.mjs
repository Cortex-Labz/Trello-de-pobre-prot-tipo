#!/usr/bin/env node

const argv = process.argv.slice(2);

function parseArgs(args) {
  const flags = {};
  const positionals = [];

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token.startsWith('--')) {
      const [rawKey, inlineValue] = token.slice(2).split('=', 2);
      const key = rawKey;

      if (inlineValue !== undefined) {
        flags[key] = inlineValue;
        continue;
      }

      const next = args[index + 1];
      if (!next || next.startsWith('--')) {
        flags[key] = true;
        continue;
      }

      flags[key] = next;
      index += 1;
      continue;
    }

    positionals.push(token);
  }

  return { flags, positionals };
}

function usage() {
  console.log(`VersatlyTask operator CLI

Usage:
  npm run operator -- --base-url https://task.meetversatly.com --api-key <key> health
  npm run operator -- --base-url <url> --api-key <key> call POST /api/operator/users '{"email":"a@b.com","password":"secret123","name":"Alice"}'
  npm run operator -- --base-url <url> --api-key <key> create-user --email a@b.com --password secret123 --name Alice
  npm run operator -- --base-url <url> --api-key <key> create-workspace --name Ops --owner-email a@b.com --description "Internal ops"
  npm run operator -- --base-url <url> --api-key <key> create-board --workspace-id <id> --name Launch
  npm run operator -- --base-url <url> --api-key <key> create-list --board-id <id> --title Todo
  npm run operator -- --base-url <url> --api-key <key> create-card --list-id <id> --title "Ship it"

Environment fallbacks:
  VERSATLY_TASK_BASE_URL
  TASK_OPERATOR_API_KEY`);
}

async function request(baseUrl, apiKey, method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let parsed;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    console.error(JSON.stringify({ status: response.status, body: parsed }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(parsed, null, 2));
}

function pick(flags, ...keys) {
  for (const key of keys) {
    if (flags[key] !== undefined) {
      return flags[key];
    }
  }

  return undefined;
}

(function main() {
  const { flags, positionals } = parseArgs(argv);
  const command = positionals[0];

  if (!command || flags.help) {
    usage();
    process.exit(command ? 0 : 1);
  }

  const baseUrl = (pick(flags, 'base-url', 'baseUrl') ?? process.env.VERSATLY_TASK_BASE_URL ?? process.env.TASK_OPERATOR_BASE_URL ?? '').replace(/\/$/, '');
  const apiKey = pick(flags, 'api-key', 'apiKey') ?? process.env.TASK_OPERATOR_API_KEY;

  if (!baseUrl) {
    console.error('Missing --base-url or VERSATLY_TASK_BASE_URL');
    process.exit(1);
  }

  if (!apiKey) {
    console.error('Missing --api-key or TASK_OPERATOR_API_KEY');
    process.exit(1);
  }

  const run = async () => {
    switch (command) {
      case 'health':
        await request(baseUrl, apiKey, 'GET', '/api/operator/health');
        return;
      case 'call': {
        const method = positionals[1];
        const path = positionals[2];
        const bodyText = positionals[3];

        if (!method || !path) {
          console.error('Usage: call <METHOD> <PATH> [JSON_BODY]');
          process.exit(1);
        }

        const body = bodyText ? JSON.parse(bodyText) : undefined;
        await request(baseUrl, apiKey, method.toUpperCase(), path, body);
        return;
      }
      case 'list-users': {
        const email = pick(flags, 'email');
        const q = pick(flags, 'q');
        const params = new URLSearchParams();
        if (email) params.set('email', email);
        if (q) params.set('q', q);
        await request(baseUrl, apiKey, 'GET', `/api/operator/users${params.toString() ? `?${params}` : ''}`);
        return;
      }
      case 'create-user':
        await request(baseUrl, apiKey, 'POST', '/api/operator/users', {
          email: pick(flags, 'email'),
          password: pick(flags, 'password'),
          name: pick(flags, 'name'),
        });
        return;
      case 'update-user':
        await request(baseUrl, apiKey, 'PATCH', `/api/operator/users/${pick(flags, 'id')}`, {
          ...(pick(flags, 'email') ? { email: pick(flags, 'email') } : {}),
          ...(pick(flags, 'password') ? { password: pick(flags, 'password') } : {}),
          ...(pick(flags, 'name') ? { name: pick(flags, 'name') } : {}),
          ...(pick(flags, 'avatar-url', 'avatarUrl') ? { avatarUrl: pick(flags, 'avatar-url', 'avatarUrl') } : {}),
        });
        return;
      case 'list-workspaces': {
        const params = new URLSearchParams();
        if (pick(flags, 'owner-user-id', 'ownerUserId')) params.set('ownerUserId', pick(flags, 'owner-user-id', 'ownerUserId'));
        if (pick(flags, 'owner-email', 'ownerEmail')) params.set('ownerEmail', pick(flags, 'owner-email', 'ownerEmail'));
        await request(baseUrl, apiKey, 'GET', `/api/operator/workspaces${params.toString() ? `?${params}` : ''}`);
        return;
      }
      case 'create-workspace':
        await request(baseUrl, apiKey, 'POST', '/api/operator/workspaces', {
          name: pick(flags, 'name'),
          description: pick(flags, 'description'),
          ...(pick(flags, 'owner-user-id', 'ownerUserId') ? { ownerUserId: pick(flags, 'owner-user-id', 'ownerUserId') } : {}),
          ...(pick(flags, 'owner-email', 'ownerEmail') ? { ownerEmail: pick(flags, 'owner-email', 'ownerEmail') } : {}),
        });
        return;
      case 'create-board':
        await request(baseUrl, apiKey, 'POST', '/api/operator/boards', {
          workspaceId: pick(flags, 'workspace-id', 'workspaceId'),
          name: pick(flags, 'name'),
          description: pick(flags, 'description'),
          ...(pick(flags, 'owner-user-id', 'ownerUserId') ? { ownerUserId: pick(flags, 'owner-user-id', 'ownerUserId') } : {}),
          ...(pick(flags, 'owner-email', 'ownerEmail') ? { ownerEmail: pick(flags, 'owner-email', 'ownerEmail') } : {}),
        });
        return;
      case 'create-list':
        await request(baseUrl, apiKey, 'POST', '/api/operator/lists', {
          boardId: pick(flags, 'board-id', 'boardId'),
          title: pick(flags, 'title'),
          ...(pick(flags, 'position') ? { position: Number(pick(flags, 'position')) } : {}),
          ...(pick(flags, 'background-color', 'backgroundColor') ? { backgroundColor: pick(flags, 'background-color', 'backgroundColor') } : {}),
        });
        return;
      case 'create-card':
        await request(baseUrl, apiKey, 'POST', '/api/operator/cards', {
          listId: pick(flags, 'list-id', 'listId'),
          title: pick(flags, 'title'),
          ...(pick(flags, 'description') ? { description: pick(flags, 'description') } : {}),
          ...(pick(flags, 'position') ? { position: Number(pick(flags, 'position')) } : {}),
          ...(pick(flags, 'created-by-user-id', 'createdByUserId') ? { createdByUserId: pick(flags, 'created-by-user-id', 'createdByUserId') } : {}),
          ...(pick(flags, 'created-by-email', 'createdByEmail') ? { createdByEmail: pick(flags, 'created-by-email', 'createdByEmail') } : {}),
        });
        return;
      case 'archive-board':
        await request(baseUrl, apiKey, 'DELETE', `/api/operator/boards/${pick(flags, 'id')}`);
        return;
      case 'archive-list':
        await request(baseUrl, apiKey, 'DELETE', `/api/operator/lists/${pick(flags, 'id')}`);
        return;
      case 'archive-card':
        await request(baseUrl, apiKey, 'DELETE', `/api/operator/cards/${pick(flags, 'id')}`);
        return;
      default:
        console.error(`Unknown command: ${command}`);
        usage();
        process.exit(1);
    }
  };

  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
})();
