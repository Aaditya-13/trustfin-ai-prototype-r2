# Build and submission notes

## Compile the report

From the report directory, run: tectonic --keep-logs --keep-intermediates --reruns 2 -o output main.tex.

Tectonic builds the IEEE-style bibliography from references/references.bib. Use another LaTeX distribution with BibTeX if preferred. Missing diagrams, charts, and screenshots are rendered as named placeholders, so the source remains compilable before those assets are supplied.

## Files to update before institutional submission

- Replace the placeholders listed in IMAGE_MANIFEST.md with actual exported diagrams, plots, and screenshots.
- Confirm official certificate wording and arrange the institute's signatures and approval date.
- Confirm each group member's contribution in Chapter 8.
- Compare the title-page and front-matter wording against the official abstract and current institute template when those source documents are available.
- The Testing and Validation chapter summarizes the automated test coverage included in the repository and distinguishes it from model-evaluation results.

The compiled report at output/TrustFin_AI_Group_Project_Report.pdf contains the requested image placeholders and blank certificate signature/date lines.
