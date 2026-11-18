"""Rebuild a verified personal-loan XGBoost bundle and report raw model accuracy."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.training_common import train_product


def train_personalloan_model():
    return train_product('personal_loan')


if __name__ == '__main__':
    train_personalloan_model()
