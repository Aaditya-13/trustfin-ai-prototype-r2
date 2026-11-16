"""Regenerate report figures from the current datasets, metrics and supplied SVG."""
import os,json
from pathlib import Path
import pymupdf
ROOT=Path(__file__).resolve().parents[1]
PROJECT=ROOT.parent
os.environ.setdefault('MPLCONFIGDIR',str(PROJECT/'.matplotlib_cache'))
derived=ROOT/'figures/derived'
derived.mkdir(parents=True,exist_ok=True)
svg=ROOT/'figures/images/methodology.svg'
document=pymupdf.open(stream=svg.read_bytes(),filetype='svg')
(derived/'methodology.pdf').write_bytes(document.convert_to_pdf())
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
out = ROOT / 'figures/graphs'
out.mkdir(parents=True, exist_ok=True)
products = ['Home loan', 'Personal loan']
stems = ['homeloan', 'personalloan']
counts = [pd.read_csv(PROJECT / f'datasets/{stem}_train.csv').Loan_Status.value_counts() for stem in stems]
fig, ax = plt.subplots(figsize=(8, 3.5))
x = np.arange(2)
for offset, label, color in [(-.18, 'Approved', '#245c86'), (.18, 'Rejected', '#b76b3e')]:
    bars = ax.bar(x+offset, [int(c[label]) for c in counts], .36, label=label, color=color)
    ax.bar_label(bars, padding=3)
ax.set_xticks(x, products); ax.set_ylabel('Generated records'); ax.set_ylim(0, 1850)
ax.legend(frameon=False, loc='upper right'); ax.spines[['top','right']].set_visible(False)
fig.tight_layout(); fig.savefig(out/'dataset_class_distribution.pdf'); plt.close(fig)
metrics = [json.loads((PROJECT / f'models/{stem}/metrics.json').read_text()) for stem in stems]
keys = ['accuracy','precision','recall','f1','roc_auc']
fig, ax = plt.subplots(figsize=(8, 3.8))
x = np.arange(len(keys))
for offset, record, label, color in zip([-.18,.18], metrics, products, ['#245c86','#b76b3e']):
    bars = ax.bar(x+offset, [record[k] for k in keys], .36, label=label, color=color)
    ax.bar_label(bars, labels=[f'{record[k]:.3f}' for k in keys], padding=3, fontsize=8)
ax.set_xticks(x, ['Accuracy','Precision','Recall','F1','ROC-AUC']); ax.set_ylim(0,1.12)
ax.set_ylabel('Saved metric value'); ax.legend(loc='lower right', frameon=False)
ax.spines[['top','right']].set_visible(False)
fig.tight_layout(); fig.savefig(out/'saved_model_metrics.pdf'); plt.close(fig)
