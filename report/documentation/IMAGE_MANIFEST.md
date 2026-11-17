# Report figures

The architecture and UML originals remain in `report/figures/images/`. The
supplied DFDs were moved to `report/figures/diagrams/`, and the six supplied
screenshots were renamed to match the chapter references. The image bytes are
unchanged. Interface screenshots are arranged in three pairs: loan selection
with the application form, officer results with applicant results, and
application history with the PDF report. Sizes preserve the original aspect
ratios and allow both images and their captions to share a page.

The institute emblem is stored at `report/figures/institution/kk-wagh-emblem.png`
and appears on the title and certificate pages. Project identity fields, including
the updated roll numbers, are maintained in `report/frontmatter/details.tex`.

| Figure | File | Location |
|---|---|---|
| System architecture | `images/system architecture.png` | Chapter 4 |
| Methodology | `images/methodology.svg`, converted to `derived/methodology.pdf` | Chapter 4 |
| Level 0 DFD | `diagrams/context_level_dfd.png` | Chapter 4 |
| Level 1 DFD | `diagrams/level_1_dfd.png` | Chapter 4 |
| Components | `images/Component_Diagram.jpeg` | Chapter 4 |
| Classes | `images/Class_Diagram_Final (1).png` | Chapter 4 |
| Sequence | `images/Sequence_Diagram_Updated.png` | Chapter 4 |
| Packages | `images/Package_Diagram.jpeg` | Chapter 4 |
| Deployment | `images/deployment-diagram.png` | Chapter 4 |
| Loan selection | `screenshots/loan_selection.png` | Chapter 5 |
| Application form | `screenshots/loan_application_form.png` | Chapter 5 |
| Officer results | `screenshots/bank_officer_results.png` | Chapter 5 |
| Applicant results | `screenshots/applicant_results.png` | Chapter 5 |
| Application history | `screenshots/application_history.png` | Chapter 5 |
| PDF preview | `screenshots/pdf_report_preview.png` | Chapter 5 |
| Gantt chart | Drawn directly in `ch08_project_planning.tex` | Chapter 8 |

Paths in the table are relative to `report/figures/`. All listed diagram and
interface images are now inserted. Replacing an image at the same path updates
it on the next build. Figure labels and references remain intact.

The two graphs are generated from the current data and saved metrics:

- `graphs/dataset_class_distribution.pdf`: current CSV label counts.
- `graphs/saved_model_metrics.pdf`: values read from the product metric JSON files.

`tools/prepare_figures.py` regenerates the graphs and the SVG's PDF conversion.
No SHAP/LIME plot or application screenshot has been fabricated.
