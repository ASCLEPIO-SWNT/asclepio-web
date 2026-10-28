import { compile } from '@inlang/paraglide-js';
import { checkMessages } from './check-messages.mjs';
await checkMessages();
await compile({
  project: './project.inlang',
  outdir: './src/paraglide',
  strategy: ['globalVariable', 'baseLocale'],
  emitTsDeclarations: true,
});
