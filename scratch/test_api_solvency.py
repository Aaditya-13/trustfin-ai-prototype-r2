import urllib.request, json

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/v1/loan/predict',
    data=json.dumps({
        'Gender': 'Male', 'Married': 'No', 'Dependents': 0,
        'Education': 'Graduate', 'Employment_Status': 'Salaried',
        'Applicant_Income': 2500, 'Coapplicant_Income': 0,
        'Loan_Amount': 80000, 'Loan_Term': 3, 'Credit_History': 1,
        'Property_Area': 'Urban', 'Age': 22
    }).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
resp = urllib.request.urlopen(req)
data = json.loads(resp.read().decode('utf-8'))
print('Prediction:', data['prediction'])
print('Confidence:', data['confidenceScore'])
print('Solvency Check:', json.dumps(data.get('solvencyCheck'), indent=2))
print('Trust Score:', json.dumps(data.get('trustScore'), indent=2))
print('\nTop SHAP features:')
for f in sorted(data['shap']['features'], key=lambda x: abs(x['contribution']), reverse=True)[:5]:
    print(f"  {f['feature']}: {f['contribution']:+.4f} ({f['direction']})")
