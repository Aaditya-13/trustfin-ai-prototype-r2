import os
from io import BytesIO
from datetime import datetime
from html import escape
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register TrueType fonts (Windows Segoe UI supports Unicode Indian Rupee symbol ₹)
HAS_SEGOE = False
try:
    segoe_path = "C:/Windows/Fonts/segoeui.ttf"
    segoe_bold_path = "C:/Windows/Fonts/segoeuib.ttf"
    if os.path.exists(segoe_path) and os.path.exists(segoe_bold_path):
        registered = pdfmetrics.getRegisteredFontNames()
        if 'SegoeUI' not in registered:
            pdfmetrics.registerFont(TTFont('SegoeUI', segoe_path))
        if 'SegoeUI-Bold' not in registered:
            pdfmetrics.registerFont(TTFont('SegoeUI-Bold', segoe_bold_path))
        HAS_SEGOE = True
except Exception:
    HAS_SEGOE = False

FONT_REG = 'SegoeUI' if HAS_SEGOE else 'Helvetica'
FONT_BOLD = 'SegoeUI-Bold' if HAS_SEGOE else 'Helvetica-Bold'
CURR = '₹' if HAS_SEGOE else 'Rs.'


def _display_feature_name(feature):
    """Keep the saved model feature unchanged and format its report label."""
    labels = {
        'Applicant_Income': 'Applicant Monthly Income',
        'Coapplicant_Income': 'Co-Applicant Monthly Income',
        'Existing_EMI': 'Existing Monthly EMIs',
        'Loan_Amount': 'Requested Loan Amount', 'Loan_Term': 'Loan Term',
        'Property_Value': 'Property Market Value', 'Property_Area': 'Property Area',
        'CIBIL_Score': 'CIBIL Score', 'Credit_History': 'Credit History',
        'Missed_Payments_12M': 'Missed Payments in the Last 12 Months',
        'Credit_Card_Utilization': 'Credit Card Use', 'Monthly_EMI': 'Estimated Monthly EMI',
        'FOIR': 'Monthly Debt / Income (FOIR)', 'DTI_Ratio': 'Monthly Debt / Income',
        'LTV_Ratio': 'Loan / Property Value (LTV)', 'Work_Experience': 'Work Experience',
        'Gender': 'Gender', 'Married': 'Marital Status', 'Education': 'Education',
        'Employment_Status': 'Employment Status', 'Loan_Purpose': 'Loan Purpose',
    }
    name = str(feature)
    for category in ['Employment_Status', 'Property_Area', 'Loan_Purpose', 'Education', 'Married', 'Gender']:
        if name.startswith(category + '_'):
            return labels[category] + ': ' + name[len(category) + 1:].replace('_', ' ')
    return labels.get(name, name.replace('_', ' '))

def generate_loan_report_pdf(applicant_data: dict, prediction_result: dict) -> bytes:
    buffer = BytesIO()
    
    # 36 points = 0.5 inch margins
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=32
    )
    
    styles = getSampleStyleSheet()
    
    # Institutional Commercial Banking Color Palette
    NAVY = colors.HexColor("#0f2942")
    BLUE_ACCENT = colors.HexColor("#1e40af")
    DARK_GRAY = colors.HexColor("#1f2937")
    LIGHT_BG = colors.HexColor("#f8fafc")
    BORDER_COLOR = colors.HexColor("#cbd5e1")
    GREEN = colors.HexColor("#065f46")
    GREEN_BG = colors.HexColor("#ecfdf5")
    GREEN_BORDER = colors.HexColor("#6ee7b7")
    RED = colors.HexColor("#991b1b")
    RED_BG = colors.HexColor("#fef2f2")
    RED_BORDER = colors.HexColor("#fca5a5")
    
    title_style = ParagraphStyle(
        'BankTitle',
        parent=styles['Heading1'],
        fontSize=14,
        leading=17,
        textColor=NAVY,
        fontName=FONT_BOLD,
        spaceAfter=2
    )
    
    doc_type_approved = ParagraphStyle(
        'DocTypeApproved',
        parent=styles['Heading2'],
        fontSize=12,
        leading=15,
        textColor=GREEN,
        fontName=FONT_BOLD,
        alignment=1
    )
    
    doc_type_rejected = ParagraphStyle(
        'DocTypeRejected',
        parent=styles['Heading2'],
        fontSize=12,
        leading=15,
        textColor=RED,
        fontName=FONT_BOLD,
        alignment=1
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=12,
        textColor=DARK_GRAY,
        fontName=FONT_REG
    )
    
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        textColor=DARK_GRAY,
        fontName=FONT_REG
    )
    
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        textColor=DARK_GRAY,
        fontName=FONT_BOLD
    )
    
    section_head = ParagraphStyle(
        'SectionHead',
        parent=styles['Heading3'],
        fontSize=9.5,
        leading=12,
        textColor=NAVY,
        fontName=FONT_BOLD,
        spaceBefore=6,
        spaceAfter=4
    )

    is_approved = prediction_result.get('prediction') == 'Approved'
    solvency = prediction_result.get('solvencyCheck') or {}
    monthly_emi = solvency.get('monthlyEMI', 0)
    existing_emi = solvency.get('existingEMI', float(applicant_data.get('Existing_EMI', 0) or 0))
    total_obligation = solvency.get('totalMonthlyObligation', monthly_emi + existing_emi)
    net_disposable = solvency.get('netDisposableIncome', solvency.get('totalIncome', 0) - total_obligation)
    total_income = solvency.get('totalIncome', 0)
    dti_percent = solvency.get('dtiPercent', '0.0%')
    dti_ratio = solvency.get('dtiRatio', 0)
    affordability_failed = dti_ratio > 0.50 or solvency.get('isSolvent') is False or solvency.get('status') == 'INSOLVENT'
    trust_score = prediction_result.get('trustScore', {})
    overall_trust = round(trust_score.get('overallTrustScore', 0.8) * 100)
    
    elements = []
    
    # -------------------------------------------------------------
    # 1. INSTITUTIONAL LETTERHEAD
    # -------------------------------------------------------------
    # Keep the report reference tied to the evaluation shown in the application.
    # Older saved evaluations may not have a dossier ID, so retain a fallback.
    ref_no = prediction_result.get('dossierId') or f"TF/{datetime.now().year}/RET-{abs(hash(str(applicant_data))) % 900000 + 100000}"
    today_str = datetime.now().strftime("%d-%b-%Y")
    
    header_data = [
        [
            Paragraph("<b>TRUSTFIN AI</b><br/><font size=7.5 color='#475569'>Explainable Loan Assessment</font>", title_style),
            Paragraph(f"<b>Application Ref:</b> {ref_no}<br/><b>Date of Issue:</b> {today_str}<br/><b>Model:</b> {'APPROVED' if is_approved else 'REJECTED'}", ParagraphStyle('HeadRight', parent=body_style, alignment=2, fontSize=8, leading=11))
        ]
    ]
    header_table = Table(header_data, colWidths=[330, 190])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 3))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=NAVY, spaceAfter=6))
    
    # -------------------------------------------------------------
    # 2. DOCUMENT PURPOSE BANNER
    # -------------------------------------------------------------
    if is_approved:
        doc_banner_data = [[
            Paragraph("LOAN ASSESSMENT REPORT", doc_type_approved)
        ]]
        banner_table = Table(doc_banner_data, colWidths=[520])
        banner_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), GREEN_BG),
            ('BOX', (0,0), (-1,-1), 1, GREEN_BORDER),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
    else:
        doc_banner_data = [[
            Paragraph("LOAN ASSESSMENT REPORT", doc_type_rejected)
        ]]
        banner_table = Table(doc_banner_data, colWidths=[520])
        banner_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), RED_BG),
            ('BOX', (0,0), (-1,-1), 1, RED_BORDER),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
    elements.append(banner_table)
    elements.append(Spacer(1, 6))
    
    # -------------------------------------------------------------
    # 3. APPLICANT & FACILITY DETAILS TABLE (NO UNICODE TOFU!)
    # -------------------------------------------------------------
    elements.append(Paragraph("1. APPLICANT AND LOAN DETAILS", section_head))
    
    applicant_income_val = applicant_data.get('Applicant_Income', 0)
    coapplicant_income_val = applicant_data.get('Coapplicant_Income', 0)
    loan_amount_val = applicant_data.get('Loan_Amount', 0)
    loan_term_val = applicant_data.get('Loan_Term', 0)
    credit_hist = applicant_data.get('Credit_History')
    cibil_score = applicant_data.get('CIBIL_Score')
    loan_type = applicant_data.get('loan_type') or ('home_loan' if 'Property_Value' in applicant_data else 'legacy')
    loan_purpose = applicant_data.get('Loan_Purpose')
    credit_util = applicant_data.get('Credit_Card_Utilization')

    cibil_num = None
    if cibil_score is not None:
        try:
            cibil_num = int(float(cibil_score))
        except (ValueError, TypeError):
            cibil_num = None

    util_float = None
    if credit_util is not None:
        try:
            util_float = float(credit_util)
        except (ValueError, TypeError):
            util_float = None

    bureau_str = "Good history (submitted)" if credit_hist == 1 else ("Poor history (submitted)" if credit_hist == 0 else "Not provided")
    facility_title = "<b>Property Area:</b>"
    facility_val = f"{applicant_data.get('Property_Area', 'Urban')} Area"

    # Format Credit Bureau Info
    if cibil_num is not None:
        if cibil_num >= 750:
            tier = "Higher score"
        elif cibil_num >= 650:
            tier = "Middle score"
        else:
            tier = "Lower score"
        bureau_str = f"<b>CIBIL {cibil_num}</b> ({tier})"

    # Format Facility / Collateral Info
    if loan_type == 'personal_loan':
        purpose_str = str(loan_purpose).replace('_', ' ') if loan_purpose else "Personal Loan"
        facility_title = "<b>Loan and Purpose:</b>"
        facility_val = f"Personal Loan • {purpose_str}"
        if util_float is not None:
            facility_val += f" ({util_float*100:.0f}% card use)"
    elif loan_type == 'home_loan':
        facility_title = "<b>Loan and Property Area:</b>"
        facility_val = f"Home Loan • {applicant_data.get('Property_Area', 'Urban')} Area"

    summary_data = [
        [
            Paragraph("<b>Applicant:</b>", table_cell_bold),
            Paragraph(f"{applicant_data.get('Gender', 'Individual')} • Age {applicant_data.get('Age', '-')} Yrs", table_cell),
            Paragraph("<b>Applicant Monthly Income:</b>", table_cell_bold),
            Paragraph(f"{CURR} {applicant_income_val:,.0f}", table_cell)
        ],
        [
            Paragraph("<b>Marital Status:</b>", table_cell_bold),
            Paragraph(f"{'Married' if applicant_data.get('Married') == 'Yes' else 'Not Married' if applicant_data.get('Married') == 'No' else 'Not provided'} ({applicant_data.get('Dependents', 0)} Dependents)", table_cell),
            Paragraph("<b>Existing Monthly EMIs:</b>", table_cell_bold),
            Paragraph(f"{CURR} {existing_emi:,.0f} / mo" if existing_emi > 0 else "Nil (₹0)", table_cell)
        ],
        [
            Paragraph("<b>Employment Profile:</b>", table_cell_bold),
            Paragraph(f"{applicant_data.get('Employment_Status', 'Salaried')}", table_cell),
            Paragraph("<b>Monthly Income Used:</b>", table_cell_bold),
            Paragraph(f"<b>{CURR} {total_income:,.0f}</b>", table_cell)
        ],
        [
            Paragraph("<b>Requested Loan Amount:</b>", table_cell_bold),
            Paragraph(f"<b>{CURR} {loan_amount_val:,.0f}</b>", table_cell),
            Paragraph("<b>Estimated EMI for New Loan:</b>", table_cell_bold),
            Paragraph(f"<b>{CURR} {monthly_emi:,.0f} / mo</b>", table_cell)
        ],
        [
            Paragraph("<b>Loan Term:</b>", table_cell_bold),
            Paragraph(f"{loan_term_val} Months ({round(loan_term_val/12, 1)} Yrs)", table_cell),
            Paragraph("<b>Total Monthly EMIs:</b>", table_cell_bold),
            Paragraph(f"<b>{CURR} {total_obligation:,.0f}</b> ({dti_percent} FOIR)", table_cell)
        ],
        [
            Paragraph("<b>Submitted Credit Details:</b>", table_cell_bold),
            Paragraph(bureau_str, table_cell),
            Paragraph(facility_title, table_cell_bold),
            Paragraph(facility_val, table_cell)
        ]
    ]
    
    summary_table = Table(summary_data, colWidths=[135, 130, 145, 110])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 6))
    
    # -------------------------------------------------------------
    # 4. CREDIT DECISION & REASON SUMMARY (PLAIN ENGLISH)
    # -------------------------------------------------------------
    elements.append(Paragraph("2. MODEL PREDICTION AND ASSESSMENT FINDINGS", section_head))
    
    model_label = 'APPROVED' if is_approved else 'REJECTED'
    elements.append(Paragraph(
        f"<b>Model prediction: {model_label}.</b> The lender must review the submitted details before a lending decision. "
        "The model score does not estimate the chance of failing to repay.", body_style
    ))
    policy_check = prediction_result.get('policyCheck')
    if policy_check:
        check_label = 'PASSED' if policy_check.get('passed') else 'FAILED'
        elements.append(Paragraph(
            f"<b>Project policy checks: {check_label}. Assessment outcome: {policy_check.get('decision', 'Unavailable')}.</b> "
            "SHAP and LIME explain the model prediction. Project lending rules are checked separately.", body_style
        ))
        for reason in policy_check.get('reasons', []):
            elements.append(Paragraph(escape(str(reason)), body_style))
    if affordability_failed:
        review_text = (
            "<b>AFFORDABILITY REVIEW REQUIRED.</b> Monthly debt exceeds the project's configured 50% review limit "
            f"(recorded FOIR: {dti_percent}). Officer review is required, even if the model predicts approval."
        )
    elif solvency:
        review_text = (
            f"<b>Affordability check:</b> Recorded FOIR is {dti_percent}, within the project's configured 50% review limit. "
            "This check does not establish that all lending criteria have been met."
        )
    else:
        review_text = "<b>Affordability check:</b> Not available for this record; officer review is required."
    elements.append(Paragraph(review_text, body_style))
    elements.append(Spacer(1, 4))

    features = prediction_result.get('shap', {}).get('features', [])
    supporting = sorted(
        [f for f in features if (f.get('contribution', 0) > 0 if is_approved else f.get('contribution', 0) < 0)],
        key=lambda f: abs(f.get('contribution', 0)), reverse=True
    )[:3]
    factor_names = ', '.join(escape(_display_feature_name(f.get('feature', ''))) for f in supporting)
    direction = 'increased' if is_approved else 'reduced'
    factor_text = (
        f"<b>Main model factors (SHAP):</b> {factor_names} {direction} the model's approval output."
        if supporting else "<b>Main model factors (SHAP):</b> No matching factors are available in this assessment."
    )
    points_data = [
        [Paragraph("<b>1.</b>", table_cell_bold), Paragraph(
            f"<b>Recorded monthly debt:</b> Proposed EMI {CURR} {monthly_emi:,.0f} plus existing EMIs {CURR} {existing_emi:,.0f}; "
            f"total {CURR} {total_obligation:,.0f}.", table_cell)],
        [Paragraph("<b>2.</b>", table_cell_bold), Paragraph(
            f"<b>Income remaining after debt:</b> {CURR} {net_disposable:,.0f} per month, before living expenses. "
            "A positive balance alone does not establish affordability.", table_cell)],
        [Paragraph("<b>3.</b>", table_cell_bold), Paragraph(factor_text, table_cell)],
    ]

    points_table = Table(points_data, colWidths=[25, 495])
    points_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 1.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
    ]))
    elements.append(points_table)
    elements.append(Spacer(1, 6))
    
    # -------------------------------------------------------------
    # 5. AUTOMATED LENDING AUDIT & SYSTEM VERIFICATION
    # -------------------------------------------------------------
    elements.append(Paragraph("3. EXPLANATION QUALITY CHECKS", section_head))
    
    trust_score = prediction_result.get('trustScore', {})
    overall_trust = round(trust_score.get('overallTrustScore', 0.8) * 100)
    weights = trust_score.get('weights')
    pillars = [
        ('Faithfulness', trust_score.get('faithfulness'), 'faithfulness'),
        ('Stability', trust_score.get('stability'), 'stability'),
        ('Consistency', trust_score.get('consistency'), 'consistency'),
        ('Fairness', trust_score.get('fairness'), 'fairness'),
    ]

    def format_pillar(value):
        return f"{float(value) * 100:.1f}%" if value is not None else "N/A"

    def pillar_heading(name, metric):
        if not weights:
            return name
        weight = weights.get(metric, 0)
        percentage = f"{weight * 100:.2f}".rstrip("0").rstrip(".")
        suffix = f"{percentage}%" if weight > 0 else "audit"
        return f"{name} ({suffix})"

    if overall_trust >= 85:
        trust_badge = "High Trust Score"
    elif overall_trust >= 70:
        trust_badge = "Moderate Trust Score"
    else:
        trust_badge = "Low Trust Score"

    audit_data = [
        [Paragraph(f"<b>{pillar_heading(name, metric)}</b>", table_cell_bold) for name, _, metric in pillars],
        [Paragraph(format_pillar(value), table_cell) for _, value, _ in pillars],
    ]
    audit_table = Table(audit_data, colWidths=[130, 130, 130, 130])
    audit_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(audit_table)
    faithfulness_check = prediction_result.get('faithfulnessCheck')
    if faithfulness_check and faithfulness_check.get('method') == 'local_concordance':
        elements.append(Paragraph(
            f"<b>Faithfulness (local concordance):</b> "
            f"SHAP {float(faithfulness_check['shap']['score'])*100:.1f}% "
            f"(weight {float(faithfulness_check['weights']['shap'])*100:.0f}%); "
            f"LIME {float(faithfulness_check['lime']['score'])*100:.1f}% "
            f"(weight {float(faithfulness_check['weights']['lime'])*100:.0f}%). "
            f"Uses up to {int(faithfulness_check['topK'])} features per explanation. "
            "Checks reconstruction of the original prediction, not correct feature assignment or behavior on other applicants.",
            body_style,
        ))
    else:
        elements.append(Paragraph("Faithfulness method was not recorded for this assessment.", body_style))
    stability_check = prediction_result.get('stabilityCheck')
    if stability_check:
        elements.append(Paragraph(
            f"<b>SHAP stability:</b> average across {int(stability_check['testedSamples'])} nearby applications; "
            f"lowest comparison {float(stability_check['minimumScore'])*100:.1f}%; "
            f"model decision changed in {int(stability_check['predictionChanges'])} tests. "
            "Small financial changes are tested and related values are recalculated. All tested cases remain in the average. "
            "This compares feature importance order and contribution direction; it does not prove correctness.", body_style
        ))
    if not weights:
        elements.append(Paragraph("Weighting was not recorded for this saved assessment.", body_style))
    elements.append(Spacer(1, 3))
    solvency_label = "Review required" if affordability_failed else ("Within configured limit" if solvency else "Not available")
    elements.append(Paragraph(
        f"<b>Affordability check:</b> {solvency_label} (FOIR {dti_percent})"
        f" &nbsp;&nbsp; <b>Overall trust:</b> {overall_trust} / 100 ({trust_badge})",
        body_style
    ))
    elements.append(Spacer(1, 6))
    
    # -------------------------------------------------------------
    # 6. ACTIONABLE NEXT STEPS
    # -------------------------------------------------------------
    elements.append(Paragraph("4. SUGGESTED NEXT STEPS", section_head))
    
    next_steps = [
        [Paragraph("<b>Step 1:</b>", table_cell_bold), Paragraph("Review the model result, explanation factors and affordability check with the lender.", table_cell)],
        [Paragraph("<b>Step 2:</b>", table_cell_bold), Paragraph("Verify the declared income, existing repayments, credit information and required documents.", table_cell)],
        [Paragraph("<b>Step 3:</b>", table_cell_bold), Paragraph("If monthly debt is high, discuss a lower loan amount or a different loan term. Calculator changes are estimates; submit a new assessment to obtain a new model prediction.", table_cell)],
    ]

    next_table = Table(next_steps, colWidths=[65, 455])
    next_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 1.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
    ]))
    elements.append(next_table)
    elements.append(Spacer(1, 10))
    
    # -------------------------------------------------------------
    # 7. SIGN-OFF & OFFICIAL SEAL
    # -------------------------------------------------------------
    sig_data = [
        [
            Paragraph("<b>Generated By:</b><br/>TrustFin AI<br/>Loan Assessment System", table_cell),
            Paragraph("<b>Officer Review:</b><br/><br/>____________________________________<br/>For completion by the reviewing officer", table_cell),
            Paragraph("<font color='#0f2942'><b>ASSESSMENT ONLY</b></font><br/>Subject to lender review", ParagraphStyle('Seal', parent=table_cell, alignment=1))
        ]
    ]
    sig_table = Table(sig_data, colWidths=[170, 220, 130])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOX', (2,0), (2,0), 1, BORDER_COLOR),
        ('BACKGROUND', (2,0), (2,0), LIGHT_BG),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    elements.append(KeepTogether(sig_table))
    
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceAfter=3))
    elements.append(Paragraph(
        "<i>This report supports application review. Final lending decisions require lender verification and approval. The Trust Score describes explanation checks. Gender sensitivity is shown separately and does not establish fairness across groups.</i>",
        ParagraphStyle('Disc', parent=styles['Normal'], fontSize=6.5, leading=8, textColor=colors.HexColor("#64748b"), alignment=1)
    ))
    
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
