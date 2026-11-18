# Equal Trust Score weights

The project owner requested equal weights on 19 November 2026. New assessments
use the arithmetic mean of faithfulness, stability and consistency:

`Trust Score = (faithfulness + stability + consistency) / 3`

Each weight is exactly `1 / 3` in the backend. The interface and generated PDF
display 33.33%, rounded for presentation; the calculation does not use 0.3333.
Fairness remains a separate audit and has no contribution to the combined score.
Saved assessments retain their recorded weights and scores.

Equal weighting is an experimental project choice giving each of the three
checks the same importance. It is not a weighting scheme derived from Bhatt
et al., a calibrated probability, or evidence that the explanations improved.

For illustrative pillar values of 50, 100 and 80, the former 40/30/30 weights
give 74.00; equal weights give 76.67. Equal weighting increases the total when
faithfulness is below the average of the other two components, decreases it
when faithfulness is higher, and leaves it unchanged when they are equal.
Relative to 40/30/30, the largest possible increase is 6.67 percentage points
for component scores between 0 and 100.

The weight change initially left individual metrics unchanged. Later on the
same date, the project owner approved replacing deletion-based faithfulness
with 60% SHAP and 40% LIME top-five local concordance. That inner combination
does not alter the equal weights of the three outer pillars. See
[the current faithfulness protocol](FAITHFULNESS_PROTOCOL.md).
Bhatt correlation and its signed results remain research outputs.
