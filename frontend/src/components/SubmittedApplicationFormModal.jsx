import React from 'react';
import { X } from 'lucide-react';

const SubmittedApplicationFormModal = ({ isOpen, onClose, applicantData, applicationReference }) => {
  if (!isOpen) return null;

  const isPersonalLoan = applicantData?.loan_type === 'personal_loan' || Boolean(applicantData?.Loan_Purpose);
  const sections = [
    {
      title: 'Applicant details',
      fields: [
        ['Gender', 'Gender'],
        ['Marital status', 'Married'],
        ['Dependents', 'Dependents'],
        ['Age', 'Age'],
        ['Education', 'Education'],
        ['Employment status', 'Employment_Status'],
        ['Work experience', 'Work_Experience'],
      ],
    },
    {
      title: 'Income and existing commitments',
      fields: [
        ['Applicant monthly income', 'Applicant_Income'],
        ...(isPersonalLoan ? [['Credit card utilization', 'Credit_Card_Utilization']] : [['Co-applicant monthly income', 'Coapplicant_Income']]),
        ['Existing monthly EMIs', 'Existing_EMI'],
      ],
    },
    {
      title: 'Credit profile',
      fields: [
        ['CIBIL score', 'CIBIL_Score'],
        ['Missed payments in past 12 months', 'Missed_Payments_12M'],
      ],
    },
    {
      title: 'Requested loan details',
      fields: [
        ['Loan product', 'loan_type'],
        ['Requested loan amount', 'Loan_Amount'],
        ['Loan tenure', 'Loan_Term'],
        ...(isPersonalLoan ? [['Loan purpose', 'Loan_Purpose']] : [['Property market value', 'Property_Value'], ['Property area', 'Property_Area']]),
      ],
    },
  ];

  const formatValue = (field, value) => {
    if (value === null || value === undefined || value === '') return 'Not provided';
    if (field === 'loan_type') return isPersonalLoan ? 'Personal Loan' : 'Home Loan';
    if (['Applicant_Income', 'Coapplicant_Income', 'Existing_EMI', 'Loan_Amount', 'Property_Value'].includes(field)) {
      return `\u20B9${Number(value).toLocaleString('en-IN')}`;
    }
    if (field === 'Credit_Card_Utilization') {
      const utilization = Number(value);
      return `${(utilization <= 1 ? utilization * 100 : utilization).toFixed(0)}%`;
    }
    if (field === 'Loan_Term') return `${value} months`;
    if (field === 'Age' || field === 'Work_Experience') return `${value} years`;
    return String(value).replace(/_/g, ' ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-form-title"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-sm border border-gray-400 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-blue-900 bg-gov-blue px-5 py-4 text-white">
          <div>
            <h2 id="application-form-title" className="text-base font-bold uppercase tracking-wide">Submitted Application Form</h2>
            <p className="mt-1 text-sm text-blue-100">Application #{applicationReference} | Values submitted for this evaluation</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-2 text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Close application form"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-4 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
          {sections.map((section) => {
            const visibleFields = section.fields.filter(([, field]) =>
              field === 'loan_type' || Object.prototype.hasOwnProperty.call(applicantData || {}, field)
            );
            if (visibleFields.length === 0) return null;

            return (
              <section key={section.title} className="rounded-sm border border-gray-300 bg-white">
                <h3 className="border-b border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-800">
                  {section.title}
                </h3>
                <dl className="divide-y divide-gray-100 px-3.5">
                  {visibleFields.map(([label, field]) => (
                    <div key={field} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                      <dt className="text-gray-600">{label}</dt>
                      <dd className="text-right font-semibold text-gray-950">
                        {formatValue(field, field === 'loan_type' ? applicantData?.loan_type : applicantData?.[field])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-gray-300 bg-gray-50 px-5 py-3">
          <p className="text-xs text-gray-600">Read-only copy of the values submitted for this assessment.</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm bg-gov-blue px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gov-blue"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
};

export default SubmittedApplicationFormModal;
