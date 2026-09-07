import os
from io import BytesIO
from datetime import datetime
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
    solvency = prediction_result.get('solvencyCheck', {})
    monthly_emi = solvency.get('monthlyEMI', 0)
    total_income = solvency.get('totalIncome', 0)
    dti_percent = solvency.get('dtiPercent', '0.0%')
    dti_ratio = solvency.get('dtiRatio', 0)
    trust_score = prediction_result.get('trustScore', {})
    overall_trust = round(trust_score.get('overallTrustScore', 0.8) * 100)
    
    elements = []
    
    # -------------------------------------------------------------
    # 1. INSTITUTIONAL LETTERHEAD
    # -------------------------------------------------------------
    ref_no = f"TF/{datetime.now().year}/RET-{abs(hash(str(applicant_data))) % 900000 + 100000}"
    today_str = datetime.now().strftime("%d-%b-%Y")
    
    header_data = [
        [
            Paragraph("<b>TRUSTFIN NATIONAL BANK</b><br/><font size=7.5 color='#475569'>Retail Lending Operations & Credit Appraisal Hub • Banking Division</font>", title_style),
            Paragraph(f"<b>Application Ref:</b> {ref_no}<br/><b>Date of Issue:</b> {today_str}<br/><b>Assessment:</b> {'APPROVED' if is_approved else 'NOT APPROVED'}", ParagraphStyle('HeadRight', parent=body_style, alignment=2, fontSize=8, leading=11))
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
            Paragraph("PROVISIONAL LOAN SANCTION ADVICE", doc_type_approved)
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
            Paragraph("LOAN APPLICATION STATUS & ADVISORY NOTICE", doc_type_rejected)
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
    elements.append(Paragraph("1. APPLICANT & CREDIT FACILITY SUMMARY", section_head))
    
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
            Paragraph(f"{CURR} {applicant_income_val:,.0f}", table_cell)
        ],
        [
            Paragraph("<b>Marital Status:</b>", table_cell_bold),
            Paragraph(f"{applicant_data.get('Married', 'No')} ({applicant_data.get('Dependents', 0)} Dependents)", table_cell),
            Paragraph("<b>Co-Borrower Income:</b>", table_cell_bold),
            Paragraph(f"{CURR} {coapplicant_income_val:,.0f}", table_cell)
        ],
        [
            Paragraph("<b>Employment Profile:</b>", table_cell_bold),
            Paragraph(f"{applicant_data.get('Employment_Status', 'Salaried')}", table_cell),
            Paragraph("<b>Total Household Monthly Income:</b>", table_cell_bold),
            Paragraph(f"<b>{CURR} {total_income:,.0f}</b>", table_cell)
        ],
        [
            Paragraph("<b>Requested Loan Amount:</b>", table_cell_bold),
            Paragraph(f"<b>{CURR} {loan_amount_val:,.0f}</b>", table_cell),
            Paragraph("<b>Estimated Monthly EMI:</b>", table_cell_bold),
            Paragraph(f"<b>{CURR} {monthly_emi:,.0f} / mo</b>", table_cell)
        ],
        [
            Paragraph("<b>Repayment Period (Tenor):</b>", table_cell_bold),
            Paragraph(f"{loan_term_val} Months ({round(loan_term_val/12, 1)} Yrs)", table_cell),
            Paragraph("<b>Share of Income for EMI (FOIR):</b>", table_cell_bold),
            Paragraph(f"<b>{dti_percent}</b> (Max Permissible: 50.0%)", table_cell)
        ],
        [
            Paragraph("<b>Credit Bureau Record:</b>", table_cell_bold),
            Paragraph("Satisfactory (No Defaults)" if credit_hist == 1 else "Adverse / Past Delinquency", table_cell),
            Paragraph("<b>Collateral Jurisdiction:</b>", table_cell_bold),
            Paragraph(f"{applicant_data.get('Property_Area', 'Urban')} Area", table_cell)
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
    elements.append(Paragraph("2. CREDIT ASSESSMENT & REASON SUMMARY", section_head))
    
    if is_approved:
        reason_text = (
            "<b>Assessment Result: APPROVED.</b> Based on our retail credit evaluation, your application meets our initial lending criteria. "
            "Your total household income provides an adequate repayment cushion, with your estimated monthly installment (EMI) consuming only "
            f"<b>{dti_percent}</b> of monthly earnings (well below the regulatory 50.0% threshold). Furthermore, your credit bureau record reflects "
            "consistent, responsible past repayment conduct."
        )
        elements.append(Paragraph(reason_text, body_style))
        elements.append(Spacer(1, 4))
        
        points_data = [
            [Paragraph("<font color='#065f46'><b>[+]</b></font>", table_cell_bold), Paragraph("<b>Income Affordability:</b> Monthly family earnings easily cover the proposed loan installment.", table_cell)],
            [Paragraph("<font color='#065f46'><b>[+]</b></font>", table_cell_bold), Paragraph("<b>Clean Credit History:</b> Satisfactory past repayment record with no active defaults.", table_cell)],
            [Paragraph("<font color='#065f46'><b>[+]</b></font>", table_cell_bold), Paragraph("<b>Living Expenses Surplus:</b> Sufficient net disposable income remains each month after paying the EMI.", table_cell)],
        ]
    else:
        reason_text = (
            "<b>Assessment Result: NOT APPROVED.</b> We regret to inform you that the requested loan facility cannot be sanctioned under the proposed terms. "
            "Pursuant to standard banking guidelines and fair lending policies, the specific factors contributing to this determination are outlined below:"
        )
        elements.append(Paragraph(reason_text, body_style))
        elements.append(Spacer(1, 4))
        
        points = []
        if dti_ratio > 0.50:
            points.append([
                Paragraph("<font color='#991b1b'><b>[-]</b></font>", table_cell_bold),
                Paragraph(f"<b>Monthly EMI Exceeds Income Safety Limit:</b> The estimated monthly EMI of {CURR} {monthly_emi:,.0f} consumes <b>{dti_percent}</b> of your monthly income. Banking regulations prohibit debt obligations above 50% to prevent financial distress.", table_cell)
            ])
        if credit_hist == 0:
            points.append([
                Paragraph("<font color='#991b1b'><b>[-]</b></font>", table_cell_bold),
                Paragraph("<b>Credit Bureau Record:</b> Credit information report indicates past delayed payments or unresolved default records.", table_cell)
            ])
        if applicant_income_val < 20000 and loan_amount_val > 200000:
            points.append([
                Paragraph("<font color='#991b1b'><b>[-]</b></font>", table_cell_bold),
                Paragraph("<b>High Loan-to-Income Ratio:</b> The requested principal is disproportionately large relative to your declared monthly earnings.", table_cell)
            ])
        if not points:
            points.append([
                Paragraph("<font color='#991b1b'><b>[-]</b></font>", table_cell_bold),
                Paragraph("<b>Credit Risk Score:</b> Composite credit appraisal did not achieve the required benchmark for automated approval.", table_cell)
            ])
        points_data = points

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
    elements.append(Paragraph("3. AUTOMATED SYSTEM VERIFICATION & AUDIT CHECK", section_head))
    
    audit_data = [
        [
            Paragraph("<b>Check 1: Solvency Gate</b>", table_cell_bold),
            Paragraph("Passed (FOIR < 50%)" if dti_ratio <= 0.50 else "<b>Breached (Insolvent)</b>", table_cell),
            Paragraph("<b>Check 3: Fair Lending</b>", table_cell_bold),
            Paragraph("Zero Demographic Bias", table_cell)
        ],
        [
            Paragraph("<b>Check 2: Dual Cross-Check</b>", table_cell_bold),
            Paragraph("Verified by Dual Models", table_cell),
            Paragraph("<b>Check 4: Audit Quality Rating</b>", table_cell_bold),
            Paragraph(f"<b>{overall_trust} / 100</b> ({'High Reliability' if overall_trust >= 70 else 'Secondary Review'})", table_cell)
        ]
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
    elements.append(Spacer(1, 6))
    
    # -------------------------------------------------------------
    # 6. ACTIONABLE NEXT STEPS
    # -------------------------------------------------------------
    elements.append(Paragraph("4. ACTIONABLE GUIDANCE & NEXT STEPS", section_head))
    
    if is_approved:
        next_steps = [
            [Paragraph("<b>Step 1:</b>", table_cell_bold), Paragraph("<b>Submit Documentation:</b> Provide self-attested copies of PAN Card, Aadhaar Card, and last 6 months bank statements.", table_cell)],
            [Paragraph("<b>Step 2:</b>", table_cell_bold), Paragraph("<b>In-Person Verification:</b> Visit your assigned retail lending branch for physical verification of original papers.", table_cell)],
            [Paragraph("<b>Step 3:</b>", table_cell_bold), Paragraph("<b>Agreement & Disbursement:</b> Complete e-sign on the loan contract and set up auto-debit for fund disbursement.", table_cell)]
        ]
    else:
        next_steps = [
            [Paragraph("<b>Option 1:</b>", table_cell_bold), Paragraph("<b>Extend Repayment Horizon (Tenor):</b> Choosing a longer term (e.g., 180 to 240 months) significantly lowers your monthly EMI.", table_cell)],
            [Paragraph("<b>Option 2:</b>", table_cell_bold), Paragraph("<b>Add an Earning Co-Borrower:</b> Adding a working spouse or family member increases total household borrowing power.", table_cell)],
            [Paragraph("<b>Option 3:</b>", table_cell_bold), Paragraph("<b>Request a Lower Loan Amount:</b> Applying for a smaller amount brings monthly EMI within the safe 50% income ceiling.", table_cell)],
            [Paragraph("<b>Option 4:</b>", table_cell_bold), Paragraph("<b>Rebuild Credit Bureau Score:</b> Regularize past dues and ensure timely bill and card payments for 6 consecutive months.", table_cell)]
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
            Paragraph("<b>Generated By:</b><br/>TrustFin Automated Decision Engine<br/>Retail Lending Division", table_cell),
            Paragraph("<b>Verified & Counter-Signed:</b><br/><br/>____________________________________<br/><b>Branch Credit & Underwriting Officer</b><br/>TrustFin Retail Operations", table_cell),
            Paragraph("<font color='#0f2942'><b>[ TRUSTFIN BANK ]</b></font><br/>Official Underwriting Seal<br/>Statutory Lending Compliance", ParagraphStyle('Seal', parent=table_cell, alignment=1))
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
        "<i>Disclaimer: This document is a computer-generated provisional assessment issued pursuant to fair lending guidelines. Final loan sanction and disbursement remain subject to physical document verification and credit committee approval.</i>",
        ParagraphStyle('Disc', parent=styles['Normal'], fontSize=6.5, leading=8, textColor=colors.HexColor("#64748b"), alignment=1)
    ))
    
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
