import os
import pymupdf
from backend.app.reporting.pdf_generator import generate_loan_report_pdf

os.makedirs("scratch", exist_ok=True)

# Sample 1: Approved profile
app_data_appr = {
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

res_appr = {
    "prediction": "Approved",
    "confidenceScore": 0.942,
    "solvencyCheck": {
        "monthlyEMI": 278,
        "totalIncome": 100000,
        "dtiRatio": 0.0028,
        "dtiPercent": "0.3%",
        "status": "OPTIMAL",
        "isSolvent": True,
        "overrideWarning": None
    },
    "trustScore": {
        "overallTrustScore": 0.85
    }
}

pdf_bytes_appr = generate_loan_report_pdf(app_data_appr, res_appr)
with open("scratch/sample_approved.pdf", "wb") as f:
    f.write(pdf_bytes_appr)

doc1 = pymupdf.open("scratch/sample_approved.pdf")
print("Approved PDF Page count:", len(doc1))
page1 = doc1[0]
pix1 = page1.get_pixmap(dpi=150)
pix1.save("scratch/sample_approved.png")

# Sample 2: Rejected profile (stress test)
app_data_rej = {
    "Gender": "Male",
    "Married": "No",
    "Dependents": 0,
    "Education": "Graduate",
    "Employment_Status": "Salaried",
    "Applicant_Income": 2500,
    "Coapplicant_Income": 0,
    "Loan_Amount": 80000,
    "Loan_Term": 3,
    "Credit_History": 1,
    "Property_Area": "Urban",
    "Age": 22
}

res_rej = {
    "prediction": "Rejected",
    "confidenceScore": 0.996,
    "solvencyCheck": {
        "monthlyEMI": 26667,
        "totalIncome": 2500,
        "dtiRatio": 10.667,
        "dtiPercent": "1066.7%",
        "status": "INSOLVENT",
        "isSolvent": False,
        "overrideWarning": "CRITICAL RISK: Exceeds 50% limit"
    },
    "trustScore": {
        "overallTrustScore": 0.62
    }
}

pdf_bytes_rej = generate_loan_report_pdf(app_data_rej, res_rej)
with open("scratch/sample_rejected.pdf", "wb") as f:
    f.write(pdf_bytes_rej)

doc2 = pymupdf.open("scratch/sample_rejected.pdf")
print("Rejected PDF Page count:", len(doc2))
page2 = doc2[0]
pix2 = page2.get_pixmap(dpi=150)
pix2.save("scratch/sample_rejected.png")
print("Rendered PNGs saved successfully.")
