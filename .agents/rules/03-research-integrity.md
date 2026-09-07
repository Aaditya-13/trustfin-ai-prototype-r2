# TrustFin Research Integrity Rules

TrustFin is an academic final-year project involving Explainable AI.

Research claims must be supported by experiments, literature, or clearly stated assumptions.

## No Invented Methodology

The agent must not invent a scientific methodology and silently implement it.

For:
- faithfulness
- stability
- consistency
- fairness
- Trust Score

the agent must first propose the methodology and explain:

1. definition
2. mathematical formulation
3. inputs
4. outputs
5. interpretation
6. limitations
7. relevant literature
8. alternatives

Human approval is required before implementation.

## No Arbitrary Trust Score

Never create arbitrary Trust Score weights merely to produce a desirable result.

If:

TrustScore =
w1 × Faithfulness +
w2 × Stability +
w3 × Consistency +
w4 × Fairness

is proposed, the agent must explain the justification for the weights.

## Validation Metrics

Every validation metric must have:
- clear definition
- calculation procedure
- range
- interpretation
- limitations

## Fairness

Fairness must not be reduced to a generic numerical score without defining:

- protected/sensitive attributes
- groups
- fairness criterion
- metric
- threshold or interpretation

Do not remove sensitive features solely to make fairness results look better.

## Experimental Integrity

Never manipulate:
- dataset splits
- random seeds
- metrics
- thresholds
- samples
- results

to improve reported performance.

## Results

Never fabricate experimental results.

If an experiment has not been executed, explicitly state:

"Not evaluated yet."

## Research Claims

Distinguish between:

- measured result
- literature-supported claim
- implementation assumption
- hypothesis
- inference

Never present an assumption as an experimental result.
