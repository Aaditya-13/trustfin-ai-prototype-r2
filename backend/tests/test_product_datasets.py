"""Dataset invariants and decision-cutoff regressions, without database access."""
import json
from pathlib import Path
import unittest

import numpy as np
import pandas as pd

from backend.app.ml.product_policy import (
    POLICIES, add_product_financial_features, label_applications, rejection_flags,
)
from scripts.synthetic_common import (
    ROOT, generate_applicants, generate_boundary_applicants, sha256, validate_dataset,
)


class ProductDatasetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.samples = {p: generate_applicants(p, 3000, 42) for p in POLICIES}
        cls.boundaries = {p: generate_boundary_applicants(p) for p in POLICIES}

    def test_generated_rows_are_valid_and_reproducible(self):
        for product, df in self.samples.items():
            with self.subTest(product=product):
                validate_dataset(df, product)
                pd.testing.assert_frame_equal(df, generate_applicants(product, 3000, 42))
                self.assertGreater(df.Loan_Status.eq("Approved").mean(), .2)
                self.assertLess(df.Loan_Status.eq("Approved").mean(), .8)

    def test_gender_only_changes_do_not_change_labels(self):
        for product, df in self.samples.items():
            changed = df.copy()
            changed["Gender"] = np.where(df.Gender == "Male", "Female", "Male")
            np.testing.assert_array_equal(df.Loan_Status, label_applications(changed, product))

    def test_every_rejection_rule_has_training_examples(self):
        for product, df in self.samples.items():
            for rule, mask in rejection_flags(df, product).items():
                with self.subTest(product=product, rule=rule):
                    self.assertGreaterEqual(int(mask.sum()), 30)
                    self.assertTrue(df.loc[mask, "Loan_Status"].eq("Rejected").all())

    def test_approved_rows_obey_shared_repayment_limit(self):
        for product, df in self.samples.items():
            approved = add_product_financial_features(df[df.Loan_Status == "Approved"], product)
            self.assertTrue(approved.FOIR.le(.5).all())

    def test_joint_credit_payment_stress_is_present(self):
        for product, df in self.samples.items():
            conflict = (df.CIBIL_Score >= 780) & (df.Missed_Payments_12M >= 3)
            self.assertGreaterEqual(int(conflict.sum()), 100)
            self.assertTrue(df.loc[conflict, "Loan_Status"].eq("Rejected").all())
            near_cutoff = (df.CIBIL_Score-POLICIES[product].min_cibil).abs() <= 25
            self.assertGreaterEqual(int(near_cutoff.sum()), 100)

    def test_boundaries_cover_below_at_and_above_each_cutoff(self):
        expected = {"credit_score": 20, "missed_payments": 40, "repayment_burden": 20,
                    "property_value": 20, "card_utilization": 20, "minimum_income": 20}
        for product, df in self.boundaries.items():
            validate_dataset(df, product)
            for rule, flags in rejection_flags(df, product).items():
                with self.subTest(product=product, rule=rule):
                    selected = df.Scenario == rule
                    self.assertEqual(int(flags[selected].sum()), expected[rule])
                    self.assertEqual(int(selected.sum()), 60)
            self.assertTrue(np.array_equal(df.Loan_Status.iloc[::2], df.Loan_Status.iloc[1::2]))

    def test_financial_calculations_use_actual_income_and_amortization(self):
        for product, df in self.samples.items():
            d = df.iloc[:20]
            engineered = add_product_financial_features(d, product)
            r = POLICIES[product].annual_rate/12
            growth = (1+r)**d.Loan_Term
            expected = np.round(d.Loan_Amount*r*growth/(growth-1), 2)
            np.testing.assert_allclose(engineered.Monthly_EMI, expected)
            income = d.Applicant_Income+(d.Coapplicant_Income if product == "home_loan" else 0)
            np.testing.assert_allclose(engineered.FOIR, np.round((d.Existing_EMI+expected)/income, 4))

    def test_generation_does_not_reset_global_random_state(self):
        rng = np.random.RandomState(8)
        expected = rng.random(3)
        np.random.seed(8)
        generate_applicants("home_loan", 10, 42)
        np.testing.assert_array_equal(np.random.random(3), expected)

    def test_saved_cohorts_match_manifest_and_do_not_overlap(self):
        manifest = json.loads((ROOT/"datasets/manifest.json").read_text())
        for product in POLICIES:
            frames = []
            for name, info in manifest[product]["cohorts"].items():
                path = ROOT/info["path"]
                self.assertEqual(sha256(path), info["sha256"])
                df = pd.read_csv(path)
                validate_dataset(df, product)
                self.assertEqual(info["used_for_training"], name == "training")
                frames.append(df.drop(columns=[c for c in ["Loan_ID", "Loan_Status", "Scenario"] if c in df]))
            self.assertFalse(pd.concat(frames, ignore_index=True).duplicated().any())


if __name__ == "__main__":
    unittest.main()
