/**
 * triage-classifier.ts — CR-047: Mid-Sprint Triage Rubric classifier
 *
 * Pure function: no I/O, no globals, no side effects. Classifies free-text user
 * input into one of four triage classes using keyword heuristics.
 *
 * Classes:
 *   'bug'           — Defect in current story (broken, crashes, doesn't work, regression)
 *   'clarification' — Removes ambiguity, no new scope (what does X mean, is X also Y, clarify)
 *   'scope'         — Net-new requirement (also need, plus, additionally, new requirement)
 *   'approach'      — Different impl, same spec (instead of, switch to, different way)
 *
 * Confidence:
 *   'high' — at least one keyword matched; class determined by keyword priority
 *   'low'  — no keyword matched; defaults to 'clarification' (safest routing)
 *
 * False-negative note: keyword approach misses paraphrasing ("the system isn't
 * behaving" has no 'broken' keyword). The 'low' confidence + 'clarification'
 * default signals the orchestrator and human to verify the classification manually.
 *
 * Reference: `.cleargate/knowledge/mid-sprint-triage-rubric.md`
 */

export type TriageClass = 'bug' | 'clarification' | 'scope' | 'approach';

export interface TriageResult {
  class: TriageClass;
  confidence: 'high' | 'low';
  reasoning: string;
}

/**
 * Keyword banks per class. Priority order (highest first):
 *   bug → approach → scope → clarification
 *
 * Priority ensures unambiguous single-class routing when multiple keywords match.
 * 'bug' is highest priority — a defect report should never be mis-routed.
 * 'clarification' is lowest — the safe default when nothing else matches.
 */
const BUG_KEYWORDS: readonly string[] = [
  'broken',
  'crashes',
  "doesn't work",
  'does not work',
  'regression',
  'nothing works',
  'not working',
  'failed',
  'failure',
  'error',
  'exception',
  'bug',
  'defect',
  'broke',
];

const APPROACH_KEYWORDS: readonly string[] = [
  'instead of',
  'switch to',
  'different way',
  'different approach',
  'replace with',
  'rather than',
  'alternative',
  'migrate to',
];

const SCOPE_KEYWORDS: readonly string[] = [
  'also need',
  'we also need',
  'plus add',
  'additionally',
  'new requirement',
  'add a ',
  'add an ',
  'plus ',
  'as well',
  'in addition',
  'new feature',
  'extend with',
];

const CLARIFICATION_KEYWORDS: readonly string[] = [
  'what does',
  'what is',
  'clarify',
  'clarification',
  'is the same as',
  'the same as',
  'same as',
  'mean in',
  'mean by',
  'what do you mean',
  'does it include',
  'does this include',
  'is this',
  'should it',
  'should this',
];

/** Scan input (lowercased) for any keyword from a bank. Returns matched keyword or null. */
function findKeyword(inputLower: string, keywords: readonly string[]): string | null {
  for (const kw of keywords) {
    if (inputLower.includes(kw)) {
      return kw;
    }
  }
  return null;
}

/**
 * Classify free-text user input into a triage class.
 *
 * @param userInput - Raw user message, any casing
 * @returns TriageResult with class, confidence, and reasoning
 */
export function classify(userInput: string): TriageResult {
  const lower = userInput.toLowerCase();

  // Priority 1: Bug — highest priority, defect always routes to bug
  const bugKw = findKeyword(lower, BUG_KEYWORDS);
  if (bugKw !== null) {
    return {
      class: 'bug',
      confidence: 'high',
      reasoning: `Matched bug keyword "${bugKw}": indicates a defect in existing behaviour.`,
    };
  }

  // Priority 2: Approach change — different implementation, same spec
  const approachKw = findKeyword(lower, APPROACH_KEYWORDS);
  if (approachKw !== null) {
    return {
      class: 'approach',
      confidence: 'high',
      reasoning: `Matched approach keyword "${approachKw}": indicates a request to change implementation method without changing the spec.`,
    };
  }

  // Priority 3: Scope change — net-new requirement
  const scopeKw = findKeyword(lower, SCOPE_KEYWORDS);
  if (scopeKw !== null) {
    return {
      class: 'scope',
      confidence: 'high',
      reasoning: `Matched scope keyword "${scopeKw}": indicates a net-new requirement that extends current scope.`,
    };
  }

  // Priority 4: Clarification — removes ambiguity, no new scope
  const clarificationKw = findKeyword(lower, CLARIFICATION_KEYWORDS);
  if (clarificationKw !== null) {
    return {
      class: 'clarification',
      confidence: 'high',
      reasoning: `Matched clarification keyword "${clarificationKw}": indicates a request to clarify spec without adding new scope.`,
    };
  }

  // Default: no keyword matched → safe fallback to clarification + low confidence
  return {
    class: 'clarification',
    confidence: 'low',
    reasoning: 'No keyword matched any triage class; defaulting to clarification (safe fallback). Orchestrator and human should verify this classification manually.',
  };
}
