import { Evaluator, SelectorPart } from './types';
import { Cue } from './cues';

/* eslint-disable @typescript-eslint/no-var-requires */
let evaluator: Evaluator;
try {
  // wrap in try-catch for server side tests
  evaluator = require('playwright-evaluator');
} catch (e) {}

const { querySelectorAll } = evaluator || {};
/* eslint-enable @typescript-eslint/no-var-requires */

type IsMatch = {
  selectorParts: SelectorPart[];
  target: HTMLElement;
};

export const buildSelectorParts = (cues: Cue[]): SelectorPart[] => {
  const levels = [...new Set(cues.map((cue) => cue.level))];

  // sort descending
  levels.sort((a, b) => b - a);

  const parts: SelectorPart[] = [];

  levels.forEach((level) => {
    const cuesForLevel = cues.filter((cue) => cue.level === level);

    const textCues = cuesForLevel.filter((cue) => cue.type === 'text');
    if (textCues.length) {
      parts.push({ name: 'text', body: textCues[0].value });
      return;
    }

    cuesForLevel.sort((a, b) => {
      if (a.type === 'tag') return -1;
      if (b.type === 'tag') return 1;
      return 0;
    });

    const bodyValues = cuesForLevel.map((cue) => cue.value);

    parts.push({ name: 'css', body: bodyValues.join('') });
  });

  return parts;
};

export const isMatch = ({ selectorParts, target }: IsMatch): boolean => {
  const result = querySelectorAll({ parts: selectorParts }, document);

  // console.debug('Try selector', selectorParts[0], selectorParts[1], target);

  // if (result[0] !== target && !target.contains(result[0])) {
  //   // console.error('Selector matches another element');
  //   return false;
  // }

  return result[0] === target;
};
