/**
 * segment_stages.mjs — the one source for "which stages does this lane run".
 *
 * Contract C1 (SPRINT-46, EPIC-066). Owner: STORY-066-06. Consumers: STORY-066-11, STORY-066-12.
 * The skill, launch_wave.mjs, dispatch_serial.mjs and the shipped runner read this table;
 * none restates the list.
 *
 * Pure module: no imports, no file or host access, synchronous.
 *
 * Frozen (STORY-066-06 may restructure internals and add JSDoc, never these):
 *   - STAGE_NAMES: names and order.
 *   - stagesFor(lane): each lane's list, and every `when`, agent, mode and script value;
 *     unknown, missing, non-string or non-own-key lanes return the standard list.
 *   - laneOf(storyId, { state, plan }): precedence state, then plan, then 'standard'.
 * Neither function becomes async.
 * Additive (STORY-066-06, C-10): normaliseLane(lane), the lane name stagesFor would use.
 * Additive (STORY-065-04): the 'prove' barrier-script stage, before 'merge' in every lane.
 *
 * Stage = { name, kind: 'agent' | 'barrier-script', agent?, mode?, when: 'always' | 'scan-flagged', script? }
 */

export const STAGE_NAMES = Object.freeze([
  'story-plan',
  'qa-red',
  'architect-tpv',
  'developer',
  'qa-verify',
  'architect-review',
  'prove',
  'merge',
]);

const STAGE_DEFS = {
  'story-plan': { name: 'story-plan', kind: 'agent', agent: 'architect', mode: 'STORY-PLAN' },
  'qa-red': { name: 'qa-red', kind: 'agent', agent: 'qa', mode: 'RED' },
  'architect-tpv': { name: 'architect-tpv', kind: 'agent', agent: 'architect', mode: 'TPV' },
  developer: { name: 'developer', kind: 'agent', agent: 'developer' },
  'qa-verify': { name: 'qa-verify', kind: 'agent', agent: 'qa', mode: 'VERIFY' },
  'architect-review': { name: 'architect-review', kind: 'agent', agent: 'architect', mode: 'POST-FLIGHT' },
  prove: { name: 'prove', kind: 'barrier-script', script: 'record_evidence.mjs' },
  merge: { name: 'merge', kind: 'barrier-script', script: 'merge_story.mjs' },
};

// A bare string is `when: 'always'`; [name, when] overrides it.
const LANE_STAGES = {
  fast: ['developer', 'prove', 'merge'],
  standard: [
    'qa-red',
    ['architect-tpv', 'scan-flagged'],
    'developer',
    'qa-verify',
    ['architect-review', 'scan-flagged'],
    'prove',
    'merge',
  ],
  runtime: [
    'story-plan',
    'qa-red',
    ['architect-tpv', 'scan-flagged'],
    'developer',
    'qa-verify',
    'architect-review',
    'prove',
    'merge',
  ],
};

/**
 * The lane name `stagesFor` resolves a value to: the value when it is an own key of the lane
 * table, else 'standard'. Pure; callers use it to label a segment with the lane that ran.
 * @param {unknown} lane
 * @returns {string}
 */
export function normaliseLane(lane) {
  return typeof lane === 'string' && Object.prototype.hasOwnProperty.call(LANE_STAGES, lane)
    ? lane
    : 'standard';
}

/**
 * @param {unknown} lane
 * @returns {ReadonlyArray<Readonly<object>>} a fresh frozen array of frozen stage objects
 */
export function stagesFor(lane) {
  return Object.freeze(
    LANE_STAGES[normaliseLane(lane)].map((entry) => {
      const [name, when = 'always'] = Array.isArray(entry) ? entry : [entry];
      return Object.freeze({ ...STAGE_DEFS[name], when });
    }),
  );
}

/**
 * state.stories[storyId].lane when a string, else plan.lane_assignments[storyId], else 'standard'.
 * Does not validate the name.
 * @param {string} storyId
 * @param {{ state?: object | null, plan?: object | null }} [ctx]
 * @returns {string}
 */
export function laneOf(storyId, { state, plan } = {}) {
  const fromState = state?.stories?.[storyId]?.lane;
  if (typeof fromState === 'string') return fromState;
  const fromPlan = plan?.lane_assignments?.[storyId];
  if (typeof fromPlan === 'string') return fromPlan;
  return 'standard';
}
