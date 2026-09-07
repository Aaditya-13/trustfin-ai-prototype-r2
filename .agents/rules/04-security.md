# Security and Privacy Rules

TrustFin processes financial/loan-related information.

Never commit:
- API keys
- passwords
- database credentials
- JWT secrets
- environment secrets
- private datasets containing identifying information

Use environment variables for secrets.

Maintain a .env.example file containing placeholders only.

Do not log:
- passwords
- authentication tokens
- unnecessary personal information
- sensitive applicant information

Validate all API inputs using Pydantic.

Use parameterized database queries / ORM mechanisms.

Do not expose internal stack traces through production APIs.

Treat uploaded datasets as untrusted input.

Do not include real personally identifiable information in test data.
