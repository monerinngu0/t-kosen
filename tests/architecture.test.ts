import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';

// Load the actual project config so a disabled or mis-scoped rule fails these tests.
const eslint = new ESLint({ cwd: resolve(import.meta.dirname, '..') });
const featureClient = 'src/features/home/client/Example.ts';
const invalid = [
  [
    'client → server',
    featureClient,
    "import '../../../core/server/auth';",
    'runtime',
  ],
  [
    'server → client',
    'src/core/server/example.ts',
    "import '../client/preferences';",
    'runtime',
  ],
  [
    'shared → client',
    'src/features/timetable/shared/example.ts',
    "import '../client/Timetable';",
    'runtime',
  ],
  [
    'shared → server',
    'src/shared/utils/example.ts',
    "import '../../core/server/env';",
    'runtime',
  ],
  [
    'app client → server registry',
    'src/app/main.tsx',
    "import './server/features';",
    'runtime',
  ],
  [
    'app server → client registry',
    'src/app/worker.ts',
    "import './client/features';",
    'runtime',
  ],
  [
    'extensionless Worker import',
    'src/app/main.tsx',
    "import './worker';",
    'runtime',
  ],
  [
    'extensionless client entry import',
    'src/app/worker.ts',
    "import './main';",
    'runtime',
  ],
  [
    'core → feature',
    'src/core/client/example.ts',
    "import '../../features/timetable/client';",
    'layer',
  ],
  [
    'feature → app',
    featureClient,
    "import '../../../app/client/features';",
    'layer',
  ],
  [
    'shared → core',
    'src/shared/client/example.ts',
    "import '../../core/client/preferences';",
    'layer',
  ],
  [
    'shared → feature',
    'src/shared/utils/example.ts',
    "import '../../features/timetable/shared';",
    'layer',
  ],
  [
    'cross-feature internal file',
    featureClient,
    "import '../../timetable/shared/model';",
    'internal',
  ],
  [
    'cross-feature nested file',
    featureClient,
    "import '../../bus/client/nested/Example';",
    'internal',
  ],
  [
    'new feature is checked automatically',
    'src/features/new/client/example.ts',
    "import '../../timetable/client/useTimetable';",
    'internal',
  ],
  [
    'normalized path cannot bypass rule',
    featureClient,
    "import '../../bus/../timetable/shared/model';",
    'internal',
  ],
  [
    'type-only import',
    featureClient,
    "import type { Env } from '../../../core/server/env';",
    'runtime',
  ],
  [
    're-export',
    featureClient,
    "export { scheduleSchema } from '../../timetable/shared/model';",
    'internal',
  ],
  [
    'export all',
    featureClient,
    "export * from '../../timetable/server/routes';",
    'runtime',
  ],
  [
    'dynamic import',
    featureClient,
    "void import('../../../core/server/auth');",
    'runtime',
  ],
  [
    'import type expression',
    featureClient,
    "export type Env = import('../../../core/server/env').Env;",
    'runtime',
  ],
  [
    'CommonJS require',
    featureClient,
    "require('../../../core/server/auth');",
    'runtime',
  ],
  [
    'TS import equals',
    featureClient,
    "import auth = require('../../../core/server/auth');",
    'runtime',
  ],
  [
    'computed import',
    featureClient,
    "void import('./' + 'Example');",
    'dynamic',
  ],
] as const;
const valid = [
  [
    'app assembles client',
    'src/app/client/features.ts',
    "import '../../features/timetable/client/Timetable';",
  ],
  [
    'app assembles server',
    'src/app/server/features.ts',
    "import '../../features/timetable/server/routes';",
  ],
  [
    'feature uses core',
    featureClient,
    "import '../../../core/client/preferences';",
  ],
  [
    'feature uses shared',
    featureClient,
    "import '../../../shared/utils/date';",
  ],
  [
    'own internal file',
    'src/features/timetable/client/example.ts',
    "import '../shared/model';",
  ],
  [
    'other feature client API',
    featureClient,
    "import '../../timetable/client';",
  ],
  ['other feature shared API', featureClient, "import '../../bus/shared';"],
  [
    'explicit index extension',
    featureClient,
    "import '../../bus/shared/index.ts';",
  ],
  [
    'server public API',
    'src/features/new/server/example.ts',
    "import '../../timetable/server';",
  ],
  [
    'core uses shared',
    'src/core/client/example.ts',
    "import '../../shared/utils/date';",
  ],
  [
    'shared uses shared',
    'src/shared/client/example.ts',
    "import '../utils/date';",
  ],
  ['external package', featureClient, "import 'react';"],
] as const;

describe('architecture boundaries', () => {
  it.each(invalid)('rejects %s', async (_, filePath, code, messageId) => {
    const [result] = await eslint.lintText(code, { filePath });
    expect(result.messages.filter((message) => message.fatal)).toEqual([]);
    expect(
      result.messages
        .filter((message) => message.ruleId === 'architecture/boundaries')
        .map((message) => message.messageId),
    ).toEqual([messageId]);
  });
  it.each(valid)('allows %s', async (_, filePath, code) => {
    const [result] = await eslint.lintText(code, { filePath });
    expect(result.messages).toEqual([]);
  });
});
