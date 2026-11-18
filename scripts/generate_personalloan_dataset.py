"""Generate reproducible, policy-aligned synthetic personal-loan applications."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.synthetic_common import generate_applicants, write_product_datasets


def generate_personalloan_dataset(n_samples: int = 3000, random_state: int = 42):
    return generate_applicants('personal_loan', n_samples, random_state)


if __name__ == '__main__':
    write_product_datasets('personal_loan')
