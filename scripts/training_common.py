"""Build and verify a coherent model/preprocessing/explainer-reference bundle."""
import json
from importlib.metadata import version
from pathlib import Path
import shutil

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from backend.app.ml.product_policy import DATASET_VERSION, POLICY_VERSION, policy_dict, rejection_flags
from backend.app.ml.preprocessing_homeloan import add_homeloan_financial_features, build_homeloan_preprocessor, get_homeloan_feature_names
from backend.app.ml.preprocessing_personalloan import add_personalloan_financial_features, build_personalloan_preprocessor, get_personalloan_feature_names
from scripts.synthetic_common import ROOT, PRODUCT_DIRS, sha256, validate_dataset

MODEL_PARAMS = dict(n_estimators=120, max_depth=4, learning_rate=.08, subsample=.85,
                    colsample_bytree=.85, random_state=42, eval_metric="logloss", n_jobs=2)


def evaluate_model(model, preprocessor, feature_fn, df, product):
    z = preprocessor.transform(feature_fn(df))
    truth = df.Loan_Status.eq("Approved").astype(int).to_numpy()
    pred = model.predict(z)
    prob = model.predict_proba(z)[:, 1]
    flags = rejection_flags(df, product)
    bad = (pred == 1) & flags.any(axis=1).to_numpy()
    flipped = df.copy()
    flipped["Gender"] = np.where(df.Gender == "Male", "Female", "Male")
    flipped_z = preprocessor.transform(feature_fn(flipped))
    return {
        "rows": len(df), "accuracy": float(accuracy_score(truth, pred)),
        "precision": float(precision_score(truth, pred, zero_division=0)),
        "recall": float(recall_score(truth, pred, zero_division=0)),
        "f1": float(f1_score(truth, pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(truth, prob)) if len(np.unique(truth)) > 1 else None,
        "confusion_matrix_labels": ["Rejected", "Approved"], "confusion_matrix": confusion_matrix(truth, pred, labels=[0, 1]).tolist(),
        "raw_model_policy_violations": int(bad.sum()), "policy_violation_ids": df.loc[bad, "Loan_ID"].tolist(),
        "policy_violation_by_rule": {k: int(((pred == 1) & mask.to_numpy()).sum()) for k, mask in flags.items()},
        "gender_only_model_decision_flips": int((pred != model.predict(flipped_z)).sum()),
        "max_gender_only_probability_change": float(np.max(np.abs(prob-model.predict_proba(flipped_z)[:, 1]))),
        "by_gender": {g: {"rows": int((df.Gender == g).sum()), "accuracy": float(accuracy_score(truth[df.Gender == g], pred[df.Gender == g]))} for g in ["Male", "Female"]},
        "accuracy_before_policy_overrides": True,
    }


def train_product(product):
    suffix = PRODUCT_DIRS[product]
    manifest = json.loads((ROOT/"datasets/manifest.json").read_text())[product]
    if manifest["dataset_version"] != DATASET_VERSION or manifest["policy_version"] != POLICY_VERSION:
        raise ValueError("Dataset policy version mismatch; regenerate datasets first")
    if manifest["policy_sha256"] != sha256(ROOT/"backend/app/ml/product_policy.py"):
        raise ValueError("Policy source changed since data generation")
    cohorts = {}
    for name, info in manifest["cohorts"].items():
        path = ROOT/info["path"]
        if sha256(path) != info["sha256"]:
            raise ValueError(f"Dataset fingerprint mismatch: {path}")
        frame = pd.read_csv(path)
        validate_dataset(frame, product)
        cohorts[name] = frame
    main = cohorts["training"]
    train, holdout = train_test_split(main, test_size=.20, random_state=42, stratify=main.Loan_Status)
    home = product == "home_loan"
    feature_fn = add_homeloan_financial_features if home else add_personalloan_financial_features
    pre = build_homeloan_preprocessor() if home else build_personalloan_preprocessor()
    cats, nums = get_homeloan_feature_names() if home else get_personalloan_feature_names()
    raw_features = [c for c in main if c not in ["Loan_ID", "Loan_Status"]]
    ztrain = pre.fit_transform(feature_fn(train[raw_features]))
    names = list(pre.named_transformers_["cat"].named_steps["onehot"].get_feature_names_out(cats))+nums
    assert "Gender_Male" in names
    model = XGBClassifier(**MODEL_PARAMS)
    model.fit(ztrain, train.Loan_Status.eq("Approved").astype(int))
    evaluations = {name: evaluate_model(model, pre, feature_fn, df, product) for name, df in {"holdout": holdout, "independent": cohorts["independent"], "boundary": cohorts["boundary"]}.items()}
    _, bg = train_test_split(train, test_size=200, random_state=17, stratify=train.Loan_Status)
    assert not set(bg.Loan_ID) & set(holdout.Loan_ID)
    stage = ROOT/"experiments/model_rebuild_2026-11-18"/suffix/DATASET_VERSION
    stage.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, stage/"model.pkl")
    model.save_model(stage/"model.ubj")
    joblib.dump(pre, stage/"preprocessor.pkl")
    (stage/"feature_names.json").write_text(json.dumps(names, indent=2)+"\n", encoding="utf-8", newline="\n")
    bg[["Loan_ID"]+raw_features].to_csv(stage/"background_raw.csv", index=False, lineterminator="\n")
    np.save(stage/"background_data.npy", pre.transform(feature_fn(bg[raw_features])))
    splits = {"training_ids": train.Loan_ID.tolist(), "holdout_ids": holdout.Loan_ID.tolist(), "background_ids": bg.Loan_ID.tolist()}
    (stage/"split_indices.json").write_text(json.dumps(splits, indent=2)+"\n", encoding="utf-8", newline="\n")
    held = evaluations["holdout"]
    metrics = {"model_type": "XGBClassifier", "product": "Home Loan" if home else "Personal Loan", "n_samples": len(main),
               **{k: held[k] for k in ["accuracy", "precision", "recall", "f1", "roc_auc"]},
               "feature_count": len(names), "evaluation": evaluations}
    testz = pre.transform(feature_fn(holdout.iloc[:30]))
    loaded = XGBClassifier()
    loaded.load_model(stage/"model.ubj")
    np.testing.assert_allclose(loaded.predict_proba(testz), model.predict_proba(testz), rtol=0, atol=1e-7)
    raw_bg = pd.read_csv(stage/"background_raw.csv")
    np.testing.assert_allclose(joblib.load(stage/"preprocessor.pkl").transform(feature_fn(raw_bg)), np.load(stage/"background_data.npy"), rtol=0, atol=1e-10)
    model_version = product+"_v5-"+sha256(stage/"model.ubj")[:12]
    metrics["model_version"] = model_version
    (stage/"metrics.json").write_text(json.dumps(metrics, indent=2)+"\n", encoding="utf-8", newline="\n")
    files = ["model.pkl", "model.ubj", "preprocessor.pkl", "feature_names.json", "background_raw.csv", "background_data.npy", "split_indices.json", "metrics.json"]
    provenance = {"model_version": model_version, "dataset_version": DATASET_VERSION, "policy_version": POLICY_VERSION,
                  "product_id": product, "target": "simulated_underwriting_approval", "policy": policy_dict(product),
                  "gender_in_prediction": True, "labels_use_gender": False, "predictive_raw_features": raw_features,
                  "training_rows": len(train), "holdout_rows": len(holdout), "model_params": MODEL_PARAMS,
                  "generation_manifest": manifest, "artifact_sha256": {f: sha256(stage/f) for f in files},
                  "source_sha256": {f: sha256(ROOT/f) for f in ["scripts/training_common.py", "scripts/synthetic_common.py", "backend/app/ml/product_policy.py", f"backend/app/ml/preprocessing_{suffix}.py"]},
                  "package_versions": {p: version(p) for p in ["numpy", "pandas", "scikit-learn", "xgboost", "shap", "lime", "joblib"]},
                  "explanations": {"SHAP": "TreeExplainer(model), raw log-odds, implicit tree-path background", "LIME": "200 stratified training rows; background_data.npy exactly transformed from background_raw.csv; no holdout/evaluation data"}}
    (stage/"provenance.json").write_text(json.dumps(provenance, indent=2)+"\n", encoding="utf-8", newline="\n")
    out = ROOT/"models"/suffix
    out.mkdir(parents=True, exist_ok=True)
    # Publish metadata last; serving verifies fingerprints rather than silently
    # combining old model/reference files if a build is interrupted.
    for f in files+["provenance.json"]:
        shutil.copy2(stage/f, out/f)
    print(json.dumps({"product": product, "model_version": model_version, "evaluation": evaluations}, indent=2))
    return metrics
