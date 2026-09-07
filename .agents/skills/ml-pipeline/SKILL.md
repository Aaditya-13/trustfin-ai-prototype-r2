---
name: ML Pipeline
description: Guidelines and instructions for building dataset-independent ML pipelines.
---

# ML Pipeline Skill

When working on datasets, preprocessing, feature selection, training, evaluation, serialization, and reproducibility:

1. **Datasets**: Implement clear dataset adapters. Check for class imbalance, missing values, and potential leakage during EDA.
2. **Preprocessing**: Build reusable `scikit-learn` Pipelines or ColumnTransformers. Ensure no data leakage (do not fit on test sets).
3. **Feature Selection**: Document the selection criteria (predictive usefulness, domain relevance, interpretability).
4. **Training**: Default to XGBoost as a baseline. Configure deterministic random seeds.
5. **Evaluation**: Report accuracy, precision, recall, F1, ROC-AUC, and confusion matrix.
6. **Serialization**: Save the trained model, preprocessor, and configurations (e.g., as `.pkl` and `.json`) to the `models/` directory.
7. **Reproducibility**: Always document dataset versions, config, seeds, and metrics.
