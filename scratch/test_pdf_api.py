import requests

url = "http://127.0.0.1:8000/api/v1/loan/predict"
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

resp = requests.post(url, json=sample_app)
pred_data = resp.json()
print("Prediction response status:", resp.status_code, pred_data.get("prediction"))

# Now test generate-pdf
pdf_url = "http://127.0.0.1:8000/api/v1/loan/generate-pdf"
payload = {
    "applicantData": sample_app,
    "predictionResult": pred_data
}
pdf_resp = requests.post(pdf_url, json=payload)
print("PDF endpoint status:", pdf_resp.status_code, "Content-Type:", pdf_resp.headers.get("Content-Type"), "Length:", len(pdf_resp.content))

with open("scratch/api_downloaded_report.pdf", "wb") as f:
    f.write(pdf_resp.content)
print("Saved to scratch/api_downloaded_report.pdf")
