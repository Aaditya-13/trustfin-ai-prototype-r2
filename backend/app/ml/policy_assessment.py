"""Keep mandatory project-policy decisions distinct from model explanations."""
from backend.app.ml.product_policy import POLICY_VERSION, POLICIES, add_product_financial_features, rejection_flags


def assess_policy(frame, product, model_prediction):
    if len(frame) != 1:
        raise ValueError("Policy assessment requires exactly one application")
    p = POLICIES[product]
    data = add_product_financial_features(frame, product).iloc[0]
    flags = rejection_flags(frame, product).iloc[0]
    messages = {
        "credit_score": f"CIBIL score {int(data.CIBIL_Score)} is below the project's minimum of {p.min_cibil}.",
        "missed_payments": f"There are {int(data.Missed_Payments_12M)} missed payments; the project rejects {p.reject_missed_payments_at} or more.",
        "repayment_burden": f"Monthly debt uses {data.FOIR*100:.2f}% of income, above the project's {p.max_foir*100:.0f}% limit.",
    }
    if product == "home_loan":
        messages["property_value"] = f"The loan is {data.LTV_Ratio:.2f}% of property value, above the project's {p.max_ltv_percent:g}% limit."
    else:
        messages["card_utilization"] = f"Card utilisation is {data.Credit_Card_Utilization*100:.1f}%, above the project's {p.max_card_utilization*100:.0f}% limit."
        messages["minimum_income"] = f"Monthly income is Rs. {data.Applicant_Income:,.0f}, below the project's Rs. {p.min_income:,.0f} minimum."
    breaches = [name for name, failed in flags.items() if failed]
    return {"passed": not breaches, "decision": "Rejected" if breaches else model_prediction,
            "violations": breaches, "reasons": [messages[name] for name in breaches], "policyVersion": POLICY_VERSION}
