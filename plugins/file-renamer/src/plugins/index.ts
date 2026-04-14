import { replacePlugin } from './replace';
import { addPrefixSuffixPlugin } from './add-prefix-suffix';
import { caseTransformPlugin } from './case-transform';
import { sequencePlugin } from './sequence';
import { templatePlugin } from './template';
import { timestampPlugin } from './timestamp';
import { cleanNamePlugin } from './clean-name';
import { extensionTransformPlugin } from './extension-transform';
import { uniqueifyPlugin } from './uniqueify';

export const builtInPlugins = [
  replacePlugin,
  addPrefixSuffixPlugin,
  caseTransformPlugin,
  sequencePlugin,
  templatePlugin,
  timestampPlugin,
  cleanNamePlugin,
  extensionTransformPlugin,
  uniqueifyPlugin
];
