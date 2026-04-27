import type { PluginActionDefinition } from '../core/types';
import {
  pluginDescription,
  pluginFieldDescription,
  pluginFieldLabel,
  pluginName
} from './i18n';

/**
 * 用于从文件名中删除特定字符的插件。
 * 支持多种删除模式：按字符、按类型、按位置、去重。
 */
export const deleteCharPlugin: PluginActionDefinition = {
  id: 'delete-char',
  name: pluginName('delete-char', 'Delete Character'),
  description: pluginDescription('delete-char', 'Delete specific characters from file names.'),
  configSchema: {
    /**
     * 删除模式选择：
     * - chars: 删除指定字符
     * - type: 按字符类型删除
     * - position: 按位置删除
     * - dedupe: 移除重复字符
     */
    mode: {
      type: 'select',
      label: pluginFieldLabel('delete-char', 'mode', 'Mode'),
      default: 'chars',
      description: pluginFieldDescription('delete-char', 'mode', 'Choose deletion mode.'),
      options: [
        { value: 'chars', label: 'Delete Specific Characters' },
        { value: 'type', label: 'Delete by Type' },
        { value: 'position', label: 'Delete by Position' },
        { value: 'dedupe', label: 'Remove Duplicates' }
      ]
    },
    /**
     * 要删除的字符列表（模式为 chars 时使用）
     */
    chars: {
      type: 'string',
      label: pluginFieldLabel('delete-char', 'chars', 'Characters'),
      default: '',
      description: pluginFieldDescription('delete-char', 'chars', 'Characters to delete.')
    },
    /**
     * 是否区分大小写（模式为 chars 时使用）
     */
    caseSensitive: {
      type: 'boolean',
      label: pluginFieldLabel('delete-char', 'caseSensitive', 'Case Sensitive'),
      default: false,
      description: pluginFieldDescription('delete-char', 'caseSensitive', 'Match case when disabled.')
    },
    /**
     * 要删除的字符类型（模式为 type 时使用）：
     * - space: 空格
     * - alpha: 字母
     * - digit: 数字
     * - upper: 大写字母
     * - lower: 小写字母
     * - punct: 标点符号
     * - chinese: 中文字符
     * - non-ascii: 非ASCII字符
     */
    type: {
      type: 'select',
      label: pluginFieldLabel('delete-char', 'type', 'Type'),
      default: 'space',
      description: pluginFieldDescription('delete-char', 'type', 'Character type to delete.'),
      options: [
        { value: 'space', label: 'Space' },
        { value: 'alpha', label: 'Letter' },
        { value: 'digit', label: 'Digit' },
        { value: 'upper', label: 'Uppercase' },
        { value: 'lower', label: 'Lowercase' },
        { value: 'punct', label: 'Punctuation' },
        { value: 'chinese', label: 'Chinese' },
        { value: 'non-ascii', label: 'Non-ASCII' }
      ]
    },
    /**
     * 删除位置（模式为 position 时使用）：
     * - first: 第一个字符
     * - last: 最后一个字符
     * - firstN: 前N个字符
     * - lastN: 后N个字符
     * - nth: 第N个字符
     */
    position: {
      type: 'select',
      label: pluginFieldLabel('delete-char', 'position', 'Position'),
      default: 'first',
      description: pluginFieldDescription('delete-char', 'position', 'Position to delete from.'),
      options: [
        { value: 'first', label: 'First' },
        { value: 'last', label: 'Last' },
        { value: 'firstN', label: 'First N' },
        { value: 'lastN', label: 'Last N' },
        { value: 'nth', label: 'Nth Character' }
      ]
    },
    /**
     * 要删除的字符数量（位置模式使用时生效）
     */
    count: {
      type: 'number',
      label: pluginFieldLabel('delete-char', 'count', 'Count'),
      default: 1,
      min: 1,
      description: pluginFieldDescription('delete-char', 'count', 'Number of characters to delete.')
    },
    /**
     * 去重风格（模式为 dedupe 时使用）：
     * - adjacent: 仅合并相邻的重复字符
     * - all: 移除所有重复字符
     */
    style: {
      type: 'select',
      label: pluginFieldLabel('delete-char', 'style', 'Style'),
      default: 'adjacent',
      description: pluginFieldDescription('delete-char', 'style', 'Deduplication style.'),
      options: [
        { value: 'adjacent', label: 'Adjacent' },
        { value: 'all', label: 'All' }
      ]
    },
    /**
     * 目标字符（模式为 dedupe 时使用）
     * 为空则应用于所有字符，否则仅处理指定字符
     */
    targetChar: {
      type: 'string',
      label: pluginFieldLabel('delete-char', 'targetChar', 'Target Character'),
      default: '',
      description: pluginFieldDescription('delete-char', 'targetChar', 'Leave empty to apply to all.')
    }
  },
  /**
   * 根据配置删除文件名中的字符。
   * @param currentName - 要处理的当前文件名
   * @param config - 删除选项配置
   * @param config.mode - 删除模式：chars | type | position | dedupe
   * @param config.chars - 要删除的字符（mode为chars时使用）
   * @param config.caseSensitive - 是否区分大小写
   * @param config.type - 字符类型（mode为type时使用）
   * @param config.position - 删除位置（mode为position时使用）
   * @param config.count - 删除数量
   * @param config.style - 去重风格（mode为dedupe时使用）
   * @param config.targetChar - 目标字符（mode为dedupe时使用）
   * @returns 处理后的文件名
   */
  apply: (currentName: string, config: any) => {
    const { mode } = config;

    switch (mode) {
      /**
       * 模式：按指定字符删除
       * 从文件名中移除所有指定的字符
       */
      case 'chars': {
        const { chars, caseSensitive } = config;
        if (!chars) return currentName;
        if (caseSensitive) {
          return currentName.split(chars).join('');
        } else {
          const regex = new RegExp(`[${chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'gi');
          return currentName.replace(regex, '');
        }
      }

      /**
       * 模式：按字符类型删除
       * 根据Unicode属性匹配并删除指定类型的字符
       */
      case 'type': {
        const { type } = config;
        const typeMap: Record<string, string> = {
          'space': ' ',
          'alpha': 'a-zA-Z',
          'digit': '0-9',
          'upper': 'A-Z',
          'lower': 'a-z',
          'punct': '\\p{P}',
          'chinese': '\\u4e00-\\u9fff',
          'non-ascii': '\\x80-\\uffff'
        };
        const pattern = typeMap[type] || ' ';
        const regex = new RegExp(`[${pattern}]`, 'g');
        return currentName.replace(regex, '');
      }

      /**
       * 模式：按位置删除
       * 从文件名的不同位置移除字符
       */
      case 'position': {
        const { position, count = 1 } = config;
        const name = currentName;
        const len = name.length;

        if (count <= 0) return name;

        switch (position) {
          case 'first':
            return name.slice(1);
          case 'last':
            return name.slice(0, -1);
          case 'firstN':
            return name.slice(count);
          case 'lastN':
            return name.slice(0, -count);
          case 'nth':
            if (count < 1 || count > len) return name;
            return name.slice(0, count - 1) + name.slice(count);
          default:
            return name;
        }
      }

      /**
       * 模式：移除重复字符
       * 合并或移除字符串中重复出现的字符
       */
      case 'dedupe': {
        const { style, targetChar } = config;
        if (!targetChar) {
          if (style === 'adjacent') {
            return currentName.replace(/(.)\1+/g, '$1');
          } else {
            const seen = new Set();
            return currentName
              .split('')
              .filter(c => {
                if (seen.has(c)) return false;
                seen.add(c);
                return true;
              })
              .join('');
          }
        } else {
          const escaped = targetChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (style === 'adjacent') {
            const regex = new RegExp(`(${escaped})\\1+`, 'g');
            return currentName.replace(regex, targetChar);
          } else {
            return currentName.split(targetChar).join('');
          }
        }
      }

      default:
        return currentName;
    }
  }
};