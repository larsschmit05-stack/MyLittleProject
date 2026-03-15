## Steps 1 To 4 Review

**Findings**

1. [lib/flow/validation.ts#L250](/C:/Users/Lars%20(School)/MyLittleProject/MyLittleProject/lib/flow/validation.ts#L250) only validates split ratios for process nodes with `>= 2` real outputs. That misses two required cases from the PRD and implementation plan:
   - source-node splits are allowed in V1.5 ([docs/V1.5_PRD.md#L46](/C:/Users/Lars%20(School)/MyLittleProject/MyLittleProject/docs/V1.5_PRD.md#L46))
   - scrap/loss edges also contribute to the split ratio sum ([docs/V1.5_IMPLEMENTATION_PLAN.md#L16](/C:/Users/Lars%20(School)/MyLittleProject/MyLittleProject/docs/V1.5_IMPLEMENTATION_PLAN.md#L16), [docs/V1.5_PRD.md#L72](/C:/Users/Lars%20(School)/MyLittleProject/MyLittleProject/docs/V1.5_PRD.md#L72))

   As written, a `95% real + 5% scrap` split is not validated at all if it has only one real edge, and a branching source node is also skipped. That means step 2 is not fully implemented to spec.

2. [utils/calculations.test.ts#L549](/C:/Users/Lars%20(School)/MyLittleProject/MyLittleProject/utils/calculations.test.ts#L549), [utils/calculations.test.ts#L577](/C:/Users/Lars%20(School)/MyLittleProject/MyLittleProject/utils/calculations.test.ts#L577), [utils/calculations.test.ts#L640](/C:/Users/Lars%20(School)/MyLittleProject/MyLittleProject/utils/calculations.test.ts#L640), and [utils/calculations.test.ts#L662](/C:/Users/Lars%20(School)/MyLittleProject/MyLittleProject/utils/calculations.test.ts#L662) use scrap targets that do not exist in `model.nodes`. The approved plan defines scrap targets as dead-end nodes, not dangling references ([docs/V1.5_IMPLEMENTATION_PLAN.md#L56](/C:/Users/Lars%20(School)/MyLittleProject/MyLittleProject/docs/V1.5_IMPLEMENTATION_PLAN.md#L56)). The tests pass, but they are proving the engine tolerates malformed fixtures rather than proving valid scrap-topology behavior.

3. [utils/calculations.test.ts#L277](/C:/Users/Lars%20(School)/MyLittleProject/MyLittleProject/utils/calculations.test.ts#L277) calls `topologicalSort([], edges)` in every new topo test, while the public API is `topologicalSort(nodes, edges)` in [utils/calculations.ts#L188](/C:/Users/Lars%20(School)/MyLittleProject/MyLittleProject/utils/calculations.ts#L188). That couples the suite to the current implementation detail that the `nodes` parameter is ignored. It weakens step 4 coverage because the tests do not exercise the real function contract.

**Open Questions**

- Should split-ratio validation be extended to source nodes and to all outgoing edges, including scrap, to match the PRD and plan exactly?
- Do you want the scrap-path tests rewritten to use explicit dead-end nodes so they represent valid editor-produced models?

**Assessment**

Steps 1 and 3 are mostly in place, and the step 4 test suites run cleanly: `95` tests passed across [lib/flow/validation.test.ts](/C:/Users/Lars%20(School)/MyLittleProject/MyLittleProject/lib/flow/validation.test.ts), [utils/calculations.test.ts](/C:/Users/Lars%20(School)/MyLittleProject/MyLittleProject/utils/calculations.test.ts), and [store/useFlowStore.test.ts](/C:/Users/Lars%20(School)/MyLittleProject/MyLittleProject/store/useFlowStore.test.ts). But I would not call steps 1 through 4 fully correct yet because step 2’s split validation is incomplete, and step 4 still has a few tests built on invalid fixtures.
