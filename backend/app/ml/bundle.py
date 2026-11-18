"""Load product artifacts only when their recorded versions agree."""
import hashlib
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from xgboost import XGBClassifier

from backend.app.ml.product_policy import DATASET_VERSION, POLICY_VERSION, policy_dict

ROOT = Path(__file__).resolve().parents[3]
REQUIRED = ("model.ubj", "model.pkl", "preprocessor.pkl", "feature_names.json",
            "background_data.npy", "background_raw.csv", "metrics.json", "split_indices.json")


def fingerprint(path):
    path = Path(path)
    data = path.read_bytes()
    if path.suffix == ".py":
        data = data.replace(b"\r\n", b"\n")
    return hashlib.sha256(data).hexdigest()


def load_product_bundle(directory, product, feature_fn, project_root=ROOT):
    directory, project_root = Path(directory), Path(project_root)
    try:
        meta = json.loads((directory/"provenance.json").read_text(encoding="utf-8"))
        if meta["product_id"] != product or meta["dataset_version"] != DATASET_VERSION or meta["policy_version"] != POLICY_VERSION or meta["policy"] != policy_dict(product):
            raise ValueError("product, dataset or policy version differs")
        for name in REQUIRED:
            if fingerprint(directory/name) != meta["artifact_sha256"][name]:
                raise ValueError(f"artifact fingerprint differs: {name}")
        policy_source = "backend/app/ml/product_policy.py"
        if fingerprint(project_root/policy_source) != meta["source_sha256"][policy_source]:
            raise ValueError("policy source changed since training")
        feature_source = feature_fn.__module__.replace('.', '/')+'.py'
        if fingerprint(project_root/feature_source) != meta['source_sha256'][feature_source]:
            raise ValueError('financial feature calculations changed since training')
        manifest = json.loads((project_root/"datasets/manifest.json").read_text(encoding="utf-8"))[product]
        if manifest != meta["generation_manifest"]:
            raise ValueError("dataset manifest differs from the trained bundle")
        for cohort in manifest["cohorts"].values():
            if fingerprint(project_root/cohort["path"]) != cohort["sha256"]:
                raise ValueError("dataset fingerprint differs")
        model = XGBClassifier()
        model.load_model(directory/"model.ubj")
        pre = joblib.load(directory/"preprocessor.pkl")
        names = json.loads((directory/"feature_names.json").read_text())
        actual_names = [name.split("__", 1)[-1] for name in pre.get_feature_names_out()]
        if names != actual_names or model.n_features_in_ != len(names):
            raise ValueError("model/preprocessor feature order differs")
        bg = np.load(directory/"background_data.npy", allow_pickle=False)
        raw = pd.read_csv(directory/"background_raw.csv")
        np.testing.assert_allclose(bg, pre.transform(feature_fn(raw)), rtol=0, atol=1e-10)
        splits = json.loads((directory/"split_indices.json").read_text())
        train, holdout = set(splits["training_ids"]), set(splits["holdout_ids"])
        if train & holdout or not set(raw.Loan_ID).issubset(train) or set(raw.Loan_ID) != set(splits["background_ids"]):
            raise ValueError("training/holdout/background membership differs")
        metrics = json.loads((directory/"metrics.json").read_text())
        if metrics["model_version"] != meta["model_version"]:
            raise ValueError("model and metrics versions differ")
        return model, pre, names, metrics, bg, meta
    except (OSError, ValueError, KeyError, AssertionError) as exc:
        raise ValueError(f"Invalid {product} model bundle; rebuild its datasets and model. {exc}") from exc
