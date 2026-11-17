# STORY-065-04 proof (rule 7, hand-applied)

- Proof column: Unit + docs pins — `stagesFor` per lane; verdicts on the runner and serial paths; skill-text pins.
- Developer blocked Red-Test (three wrong sealed pins) → QA-Red re-seal b7746b8 (+ R2a Sprint Review test) → Developer c1eee86 → integrated 6bcf9ff → QA-Verify PASS (6/6; stagesFor per lane ends prove, merge; GREEN verdict stops before prove on both paths; buildWaveArgs excludes Sprint Review; recorder exits with --worktree; renderer anchors and §C.0 tokens clean).
- Post-flight FAIL (skill wording: untiered items halted at the barrier; exit-1 rework skipped post-flight on the serial path) → R3a → amendment pins → fix 140faa7 → integrated c5fa1a1 (prebuild/gen:codex/typecheck clean; prove-stage 9/9, segment-stages 8/8, codex render 3/3, loop-spec 9/9, agent-environment 2/2, done-guard 7/7, record-evidence 10/10) → post-flight PASS.
- cli main merge: 70aa235.
