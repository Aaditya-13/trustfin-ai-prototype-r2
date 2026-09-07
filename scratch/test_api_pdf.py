import requests
import json

# Start FastAPI if not running or test directly
payload_predict = {
    "Gender": "Male",
    "Married": "No",
    "Dependents": 0,
    "Education": "Graduate",
    "Employment_Status": "Salaried",
    "Applicant_Income": 50000,
    "Coapplicant_Income": 0,
    "Loan_Amount": 150000,
    "Loan_Term": 360,
    "Credit_History": 1,
    "Property_Area": "Urban",
    "Age": 30
}

try:
    resp = requests.post("http://localhost:8000/api/v1/loan/predict", json=payload_predict, timeout=5)
    print("Predict Status:", resp.status_code)
    pred_data = resp.json()
    
    pdf_req = {
        "applicantData": payload_predict,
        "predictionResult": pred_data
    }
    
    resp_pdf = requests.post("http://localhost:8000/api/v1/loan/generate-pdf", json=pdf_req, timeout=5)
    print("PDF Status:", resp_pdf.status_code)
    print("PDF Content Type:", resp_pdf.headers.get("content-type"))
    print("PDF Bytes length:", len(resp_pdf.content))
except Exception as e:
    print("Connection error:", e)
