"""API contract and illustrative arithmetic checks for explanation diagnostics."""
import pytest
from backend.app.trust.trust_score import calculate_trust_score


def test_four_diagnostics_and_three_component_trust_score(api_client, prime_applicant):
    response = api_client.post('/api/v1/loan/predict', json=prime_applicant)
    assert response.status_code == 200
    trust = response.json()['trustScore']
    for metric in ('faithfulness', 'stability', 'consistency', 'fairness'):
        assert 0 <= trust[metric] <= 1
    assert trust['weights'] == {'faithfulness': 1 / 3, 'stability': 1 / 3, 'consistency': 1 / 3}
    expected = (trust['faithfulness'] + trust['stability'] + trust['consistency']) / 3
    assert trust['overallTrustScore'] == pytest.approx(expected)


def test_trust_score_with_illustrative_low_component_values():
    # These supplied values exercise arithmetic without representing a model experiment.
    result = calculate_trust_score(0.127, 0.543, 0.0, fairness=0.621)
    assert result.overallTrustScore == pytest.approx(0.67 / 3)
    different_fairness = calculate_trust_score(0.127, 0.543, 0.0, fairness=1.0)
    assert different_fairness.overallTrustScore == result.overallTrustScore
