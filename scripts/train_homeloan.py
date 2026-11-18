"""Rebuild a verified home-loan XGBoost bundle and report raw model accuracy."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.training_common import train_product


def train_homeloan_model():
    return train_product('home_loan')


if __name__ == '__main__':
    train_homeloan_model()
