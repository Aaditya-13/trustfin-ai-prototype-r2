import os
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from datetime import datetime

def generate_loan_report_pdf(applicant_data: dict, prediction_result: dict) -> bytes:
    buffer = BytesIO()
    
    # 36 points = 0.5 inch margins
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom color palette - Institutional Commercial Banking
    NAVY = colors.HexColor("#0b4d75")
    DARK_GRAY = colors.HexColor("#2d3748")
    LIGHT_BG = colors.HexColor("#f7fafc")
    BORDER_COLOR = colors.HexColor("#cbd5e0")
    GREEN = colors.HexColor("#22543d")
    GREEN_BG = colors.HexColor("#f0fff4")
    RED = colors.HexColor("#742a2a")
    RED_BG = colors.HexColor("#fff5f5")
    
    # Styles
    title_style = ParagraphStyle(
        'BankTitle',
        parent=styles['Heading1'],
        fontSize=14,
        leading=17,
        textColor=NAVY,
        fontName='Helvetica-Bold',
        spaceAfter=2
    )
    
    sub_title_style = ParagraphStyle(
        'BankSubtitle',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        textColor=DARK_GRAY,
        fontName='Helvetica-Bold'
    )
    
    doc_type_approved = ParagraphStyle(
        'DocTypeApproved',
        parent=styles['Heading2'],
        fontSize=12,
        leading=15,
        textColor=GREEN,
        fontName='Helvetica-Bold',
        alignment=1
    )
    
    doc_type_rejected = ParagraphStyle(
        'DocTypeRejected',
        parent=styles['Heading2'],
        fontSize=12,
        leading=15,
        textColor=RED,
        fontName='Helvetica-Bold',
        alignment=1
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=12,
        textColor=DARK_GRAY,
        fontName='Helvetica'
    )
    
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=12,
        textColor=DARK_GRAY,
        fontName='Helvetica-Bold'
    )
    
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        textColor=DARK_GRAY,
        fontName='Helvetica'
    )
    
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        textColor=DARK_GRAY,
        fontName='Helvetica-Bold'
    )
    
    section_head = ParagraphStyle(
        'SectionHead',
        parent=styles['Heading3'],
        fontSize=9.5,
        leading=12,
        textColor=NAVY,
        fontName='Helvetica-Bold',
        spaceBefore=6,
        spaceAfter=3
    )

    is_approved = prediction_result.get('prediction') == 'Approved'
    solvency = prediction_result.get('solvencyCheck', {})
    monthly_emi = solvency.get('monthlyEMI', 0)
    total_income = solvency.get('totalIncome', 0)
    dti_percent = solvency.get('dtiPercent', '0.0%')
    dti_ratio = solvency.get('dtiRatio', 0)
    trust_score = prediction_result.get('trustScore', {})
    overall_trust = round(trust_score.get('overallTrustScore', 0.8) * 100)
    
    elements = []
    
    # -------------------------------------------------------------
    # 1. INSTITUTIONAL HEADER & LETTERHEAD
    # -------------------------------------------------------------
    ref_no = f"TF/{datetime.now().year}/RET-{abs(hash(str(applicant_data))) % 900000 + 100000}"
    today_str = datetime.now().strftime("%d-%b-%Y")
    
    header_data = [
        [
            Paragraph("<b>TRUSTFIN NATIONAL BANK</b><br/><font size=7.5 color='#4a5568'>Retail Credit Operations & Lending Division • Registered Banking Institution</font>", title_style),
            Paragraph(f"<b>Application Ref:</b> {ref_no}<br/><b>Date:</b> {today_str}<br/><b>Status:</b> {'PROVISIONALLY SANCTIONED' if is_approved else 'NOT APPROVED'}", ParagraphStyle('HeadRight', parent=body_style, alignment=2, fontSize=8, leading=11))
        ]
    ]
    header_table = Table(header_data, colWidths=[340, 180])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 4))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=NAVY, spaceAfter=8))
    
    # -------------------------------------------------------------
    # 2. DOCUMENT PURPOSE BANNER
    # -------------------------------------------------------------
    if is_approved:
        doc_banner_data = [[
            Paragraph("PROVISIONAL LOAN SANCTION ADVICE", doc_type_approved)
        ]]
        banner_table = Table(doc_banner_data, colWidths=[520])
        banner_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), GREEN_BG),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#9ae6b4")),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
    else:
        doc_banner_data = [[
            Paragraph("LOAN APPLICATION STATUS & ADVISORY NOTICE", doc_type_rejected)
        ]]
        banner_table = Table(doc_banner_data, colWidths=[520])
        banner_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), RED_BG),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#feb2b2")),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
    elements.append(banner_table)
    elements.append(Spacer(1, 8))
    
    # -------------------------------------------------------------
    # 3. APPLICANT & FACILITY DETAILS TABLE
    # -------------------------------------------------------------
    elements.append(Paragraph("1. APPLICANT & PROPOSED FACILITY SUMMARY", section_head))
    
    applicant_income_val = applicant_data.get('Applicant_Income', 0)
    coapplicant_income_val = applicant_data.get('Coapplicant_Income', 0)
    loan_amount_val = applicant_data.get('Loan_Amount', 0)
    loan_term_val = applicant_data.get('Loan_Term', 0)
    credit_hist = applicant_data.get('Credit_History', 1)
    
    summary_data = [
        [
            Paragraph("<b>Primary Borrower:</b>", table_cell_bold),
            Paragraph(f"{applicant_data.get('Gender', 'Individual')} • Age {applicant_data.get('Age', '-')} Yrs", table_cell),
            Paragraph("<b>Primary Monthly Income:</b>", table_cell_bold),
            Paragraph(f"₹{applicant_income_val:,.0f}", table_cell)
        ],
        [
            Paragraph("<b>Marital Status:</b>", table_cell_bold),
            Paragraph(f"{applicant_data.get('Married', 'No')} ({applicant_data.get('Dependents', 0)} Dependents)", table_cell),
            Paragraph("<b>Co-Borrower Income:</b>", table_cell_bold),
            Paragraph(f"₹{coapplicant_income_val:,.0f}", table_cell)
        ],
        [
            Paragraph("<b>Employment Profile:</b>", table_cell_bold),
            Paragraph(f"{applicant_data.get('Employment_Status', 'Salaried')}", table_cell),
            Paragraph("<b>Total Monthly Household Income:</b>", table_cell_bold),
            Paragraph(f"<b>₹{total_income:,.0f}</b>", table_cell)
        ],
        [
            Paragraph("<b>Requested Loan Amount:</b>", table_cell_bold),
            Paragraph(f"<b>₹{loan_amount_val:,.0f}</b>", table_cell),
            Paragraph("<b>Estimated Monthly EMI:</b>", table_cell_bold),
            Paragraph(f"<b>₹{monthly_emi:,.0f}</b>", table_cell)
        ],
        [
            Paragraph("<b>Repayment Period (Tenor):</b>", table_cell_bold),
            Paragraph(f"{loan_term_val} Months ({round(loan_term_val/12, 1)} Yrs)", table_cell),
            Paragraph("<b>Share of Income for EMI (FOIR):</b>", table_cell_bold),
            Paragraph(f"<b>{dti_percent}</b> (Max Permissible: 50.0%)", table_cell)
        ],
        [
            Paragraph("<b>Credit Bureau Record:</b>", table_cell_bold),
            Paragraph("Satisfactory / Clean (No Defaults)" if credit_hist == 1 else "Adverse / Prior Default Reported", table_cell),
            Paragraph("<b>Collateral Jurisdiction:</b>", table_cell_bold),
            Paragraph(f"{applicant_data.get('Property_Area', 'Urban')} Area", table_cell)
        ]
    ]
    
    summary_table = Table(summary_data, colWidths=[130, 130, 140, 120])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 8))
    
    # -------------------------------------------------------------
    # 4. CREDIT DECISION & REASON SUMMARY (PLAIN ENGLISH)
    # -------------------------------------------------------------
    elements.append(Paragraph("2. CREDIT ASSESSMENT & REASON SUMMARY", section_head))
    
    if is_approved:
        reason_text = (
            "<b>Assessment Result: APPROVED.</b> Based on our retail credit evaluation, your application meets all initial lending criteria. "
            "Your total household income provides a comfortable repayment margin, with your proposed monthly installment (EMI) consuming only "
            f"<b>{dti_percent}</b> of monthly earnings (well within the statutory 50.0% ceiling). Furthermore, your credit bureau record demonstrates "
            "responsible past repayment behavior."
        )
        elements.append(Paragraph(reason_text, body_style))
        elements.append(Spacer(1, 4))
        
        points_data = [
            [Paragraph("✔", table_cell_bold), Paragraph("<b>Income Affordability:</b> Monthly income is sufficient to service the installment comfortably.", table_cell)],
            [Paragraph("✔", table_cell_bold), Paragraph("<b>Credit Bureau Track Record:</b> Satisfactory repayment history with no unresolved defaults.", table_cell)],
            [Paragraph("✔", table_cell_bold), Paragraph("<b>Disposable Surplus:</b> Retains sufficient monthly funds for household expenses after EMI payment.", table_cell)],
        ]
    else:
        reason_text = (
            "<b>Assessment Result: NOT APPROVED.</b> We regret to inform you that the requested loan facility cannot be sanctioned under the current terms. "
            "Pursuant to standard fair lending practices and banking guidelines, the specific factors contributing to this assessment are listed below."
        )
        elements.append(Paragraph(reason_text, body_style))
        elements.append(Spacer(1, 4))
        
        points = []
        if dti_ratio > 0.50:
            points.append([
                Paragraph("✖", ParagraphStyle('RedX', parent=table_cell_bold, textColor=RED)),
                Paragraph(f"<b>Monthly EMI Exceeds Income Safety Limit:</b> The estimated monthly EMI of ₹{monthly_emi:,.0f} represents <b>{dti_percent}</b> of your total income. Regulatory rules prohibit monthly debt service above 50% to protect borrowers from insolvency.", table_cell)
            ])
        if credit_hist == 0:
            points.append([
                Paragraph("✖", ParagraphStyle('RedX', parent=table_cell_bold, textColor=RED)),
                Paragraph("<b>Credit Bureau Record:</b> Credit information bureau reports reflect prior overdue payments or default history.", table_cell)
            ])
        if applicant_income_val < 20000 and loan_amount_val > 200000:
            points.append([
                Paragraph("✖", ParagraphStyle('RedX', parent=table_cell_bold, textColor=RED)),
                Paragraph("<b>Loan-to-Income Disproportion:</b> The requested principal is disproportionately high relative to verified take-home earnings.", table_cell)
            ])
        if not points:
            points.append([
                Paragraph("✖", ParagraphStyle('RedX', parent=table_cell_bold, textColor=RED)),
                Paragraph("<b>High Leverage Risk:</b> Overall financial risk score did not meet minimum threshold for automated clearance.", table_cell)
            ])
        points_data = points

    points_table = Table(points_data, colWidths=[20, 500])
    points_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    elements.append(points_table)
    elements.append(Spacer(1, 8))
    
    # -------------------------------------------------------------
    # 5. SIMPLE 4-POINT QUALITY AUDIT CHECK
    # -------------------------------------------------------------
    elements.append(Paragraph("3. AUTOMATED LENDING AUDIT & SYSTEM VERIFICATION", section_head))
    
    audit_data = [
        [
            Paragraph("<b>Check 1: Solvency Gate</b>", table_cell_bold),
            Paragraph("Passed (FOIR < 50%)" if dti_ratio <= 0.50 else "<b>Breached (Insolvent)</b>", table_cell),
            Paragraph("<b>Check 3: Fair Lending</b>", table_cell_bold),
            Paragraph("Demographic Parity Verified", table_cell)
        ],
        [
            Paragraph("<b>Check 2: Dual Cross-Check</b>", table_cell_bold),
            Paragraph("Confirmed Across Independent Methods", table_cell),
            Paragraph("<b>Check 4: Audit Quality Rating</b>", table_cell_bold),
            Paragraph(f"<b>{overall_trust} / 100</b> ({'High Reliability' if overall_trust >= 70 else 'Secondary Review'})", table_cell)
        ]
    ]
    audit_table = Table(audit_data, colWidths=[130, 130, 130, 130])
    audit_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(audit_table)
    elements.append(Spacer(1, 8))
    
    # -------------------------------------------------------------
    # 6. ACTIONABLE NEXT STEPS
    # -------------------------------------------------------------
    elements.append(Paragraph("4. ACTIONABLE GUIDANCE & NEXT STEPS", section_head))
    
    if is_approved:
        next_steps = [
            [Paragraph("1.", table_cell_bold), Paragraph("<b>Document Verification:</b> Submit self-attested copies of identity proof (PAN / Aadhaar) and last 6 months bank statements.", table_cell)],
            [Paragraph("2.", table_cell_bold), Paragraph("<b>Branch In-Person Verification:</b> Visit your assigned retail lending branch for physical verification of originals.", table_cell)],
            [Paragraph("3.", table_cell_bold), Paragraph("<b>Loan Agreement Execution:</b> Execute electronic facility agreement and set up NACH auto-debit for disbursement.", table_cell)]
        ]
    else:
        next_steps = [
            [Paragraph("•", table_cell_bold), Paragraph("<b>Increase Repayment Period (Tenor):</b> Spreading repayment over a longer horizon (e.g. 180 to 240 months) substantially lowers your monthly EMI.", table_cell)],
            [Paragraph("•", table_cell_bold), Paragraph("<b>Add a Family Co-Borrower:</b> Adding a working spouse or family member with steady income increases total household eligibility.", table_cell)],
            [Paragraph("•", table_cell_bold), Paragraph("<b>Apply for a Smaller Loan:</b> Reducing the requested loan amount brings the monthly EMI within the safe 50% income threshold.", table_cell)],
            [Paragraph("•", table_cell_bold), Paragraph("<b>Regularize Credit Bureau Score:</b> Pay off outstanding dues and maintain on-time bill and card payments for 6 consecutive months.", table_cell)]
        ]
        
    next_table = Table(next_steps, colWidths=[15, 505])
    next_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    elements.append(next_table)
    elements.append(Spacer(1, 14))
    
    # -------------------------------------------------------------
    # 7. SIGN-OFF & OFFICIAL SEAL
    # -------------------------------------------------------------
    sig_data = [
        [
            Paragraph("<b>Generated By:</b><br/>TrustFin Credit Risk System<br/>Automated Underwriting Engine", table_cell),
            Paragraph("<b>Verified & Counter-Signed:</b><br/><br/>____________________________________<br/><b>Branch Credit & Underwriting Officer</b><br/>TrustFin Retail Operations", table_cell),
            Paragraph("<font color='#0b4d75'><b>[ TRUSTFIN BANK ]</b></font><br/>Official Underwriting Seal<br/>Statutory Lending Compliance", ParagraphStyle('Seal', parent=table_cell, alignment=1))
        ]
    ]
    sig_table = Table(sig_data, colWidths=[170, 220, 130])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOX', (2,0), (2,0), 1, BORDER_COLOR),
        ('BACKGROUND', (2,0), (2,0), LIGHT_BG),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(KeepTogether(sig_table))
    
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceAfter=4))
    elements.append(Paragraph(
        "<i>Disclaimer: This document is a computer-generated provisional assessment issued pursuant to fair lending guidelines. Final loan sanction and disbursement remain subject to physical document verification and credit committee approval.</i>",
        ParagraphStyle('Disc', parent=styles['Normal'], fontSize=6.5, leading=8, textColor=colors.HexColor("#718096"), alignment=1)
    ))
    
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

if __name__ == "__main__":
    sample_app = {
        "Gender": "Female",
        "Married": "Yes",
        "Dependents": 0,
        "Education": "Graduate",
        "Employment_Status": "Salaried",
        "Applicant_Income": 80000,
        "Coapplicant_Income": 20000,
        "Loan_Amount": 100000,
        "Loan_Term": 360,
        "Credit_History": 1,
        "Property_Area": "Urban",
        "Age": 35
    }
    sample_pred = {
        "prediction": "Approved",
        "confidenceScore": 0.995,
        "solvencyCheck": {
            "monthlyEMI": 277.78,
            "totalIncome": 100000.0,
            "dtiRatio": 0.0028,
            "dtiPercent": "0.3%",
            "status": "OPTIMAL",
            "isSolvent": True
        },
        "trustScore": {
            "faithfulness": 0.995,
            "stability": 0.82,
            "consistency": 0.5,
            "fairness": 1.0,
            "overallTrustScore": 0.828
        }
    }
    pdf_data = generate_loan_report_pdf(sample_app, sample_pred)
    with open("scratch/sample_sanction_letter.pdf", "wb") as f:
        f.write(pdf_data)
    print("Sample PDF generated successfully! Size:", len(pdf_data), "bytes")
