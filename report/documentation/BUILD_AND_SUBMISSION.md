# Building the report

Run from the repository root:

```powershell
.venv/Scripts/python.exe report/build.py
```

Tectonic must be installed or supplied explicitly:

```powershell
.venv/Scripts/python.exe report/build.py --compiler C:/path/to/tectonic.exe
```

The helper also detects the existing temporary Tectonic installation used for
this report. The first build may download TeX resources. Subsequent builds reuse
the compiler cache. The source can also be built with a compatible LaTeX/BibTeX
installation.

The final PDF is `report/output/TrustFin_AI_Group_Project_Report.pdf`.
Compilation diagnostics are retained in `report/output/build_log.txt` and
`report/output/main.log`. Generated intermediates are ignored by Git.

With PyMuPDF available, run the report checks from the repository root:

```powershell
.venv/Scripts/python.exe report/tools/check_report.py
```

The checks cover chapter openings and closing recaps, the Gantt chart, reserved
figures, unresolved references, overflowing text, and an optional application
source snapshot. The results are written to `report/output/verification.json`.

To refresh the data-derived graphs and supplied SVG conversion:

```powershell
.venv/Scripts/python.exe report/tools/prepare_figures.py
```

This optional step uses pandas, NumPy, Matplotlib and PyMuPDF; it does not train
models or change application data. See `IMAGE_MANIFEST.md` for drop-in image paths.
