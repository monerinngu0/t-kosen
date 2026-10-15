import { dirname, relative, resolve, sep } from 'node:path';

// Directory structure is the source of truth; new features need no rule entries.
function moduleInfo(root, filename) {
  const path = relative(root, filename).split(sep).join('/');
  if (path.startsWith('../') || path === '..') return null;
  const parts = path.split('/');
  const layer = parts[0];
  if (!['app', 'core', 'features', 'shared'].includes(layer)) return null;
  const area = parts[layer === 'features' ? 2 : 1];
  const runtime = /^app\/main(?:\.[cm]?[jt]sx?)?$/.test(path)
    ? 'client'
    : /^app\/worker(?:\.[cm]?[jt]sx?)?$/.test(path)
      ? 'server'
      : ['client', 'server'].includes(area)
        ? area
        : 'shared';
  return {
    layer,
    runtime,
    feature: layer === 'features' ? parts[1] : null,
    publicEntry:
      /^features\/[^/]+\/(client|server|shared)(\/index(?:\.[cm]?[jt]sx?)?)?$/.test(
        path,
      ),
  };
}

export default {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      runtime:
        '{{from}} code cannot import {{to}} code. Put reusable types and logic in shared.',
      layer: '{{from}} cannot depend on {{to}}. Compose features in app.',
      internal:
        'Import another feature through its client, server, or shared index entry, not its internal files.',
      dynamic:
        'Local module paths must be static strings so architecture boundaries can be checked.',
    },
  },
  create(context) {
    const root = resolve(context.cwd, 'src');
    const filename = context.filename;
    const source = moduleInfo(root, filename);
    if (!source) return {};
    function check(node, value) {
      if (typeof value !== 'string') {
        context.report({ node, messageId: 'dynamic' });
        return;
      }
      if (!value.startsWith('.')) return; // External package; no aliases are configured.
      const target = moduleInfo(
        root,
        resolve(dirname(filename), value.split(/[?#]/)[0]),
      );
      if (!target) return;
      if (
        (source.runtime === 'shared' && target.runtime !== 'shared') ||
        (source.runtime === 'client' && target.runtime === 'server') ||
        (source.runtime === 'server' && target.runtime === 'client')
      ) {
        context.report({
          node,
          messageId: 'runtime',
          data: { from: source.runtime, to: target.runtime },
        });
        return;
      }
      if (
        (source.layer !== 'app' && target.layer === 'app') ||
        (source.layer === 'core' && target.layer === 'features') ||
        (source.layer === 'shared' &&
          ['core', 'features'].includes(target.layer))
      ) {
        context.report({
          node,
          messageId: 'layer',
          data: { from: source.layer, to: target.layer },
        });
        return;
      }
      if (
        source.layer === 'features' &&
        target.layer === 'features' &&
        source.feature !== target.feature &&
        !target.publicEntry
      )
        context.report({ node, messageId: 'internal' });
    }
    return {
      ImportDeclaration: (node) => check(node, node.source.value),
      ExportNamedDeclaration: (node) => {
        if (node.source) check(node, node.source.value);
      },
      ExportAllDeclaration: (node) => check(node, node.source.value),
      ImportExpression: (node) => check(node, node.source.value),
      TSImportType: (node) =>
        check(
          node,
          node.source?.value ??
            node.argument?.value ??
            node.argument?.literal?.value,
        ),
      TSImportEqualsDeclaration: (node) => {
        if (node.moduleReference.type === 'TSExternalModuleReference')
          check(node, node.moduleReference.expression.value);
      },
      CallExpression: (node) => {
        if (node.callee.type === 'Identifier' && node.callee.name === 'require')
          check(node, node.arguments[0]?.value);
      },
    };
  },
};
