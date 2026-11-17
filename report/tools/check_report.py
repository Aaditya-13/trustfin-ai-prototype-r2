"""Check report structure, compiled references, reserved slots and source integrity."""
import hashlib
import json
import re
import unicodedata
from pathlib import Path

import pymupdf

REPORT = Path(__file__).resolve().parents[1]
PROJECT = REPORT.parent
pdf_path = REPORT / 'output/TrustFin_AI_Group_Project_Report.pdf'
pdf = pymupdf.open(pdf_path)
texts = [unicodedata.normalize('NFKC', page.get_text()) for page in pdf]
all_text = '\n'.join(texts)
chapters = sorted((REPORT/'chapters').glob('*.tex'))
assert len(chapters) == 9
expected_main_sections = [5, 5, 5, 5, 6, 5, 5, 1, 3]
for number, path in enumerate(chapters):
    source = path.read_text(encoding='utf-8')
    assert len(re.findall(r'^\\section\{', source, re.M)) == expected_main_sections[number], path.name
    assert not re.search(r'^\\subsubsection\{', source, re.M), path.name
    opening = re.split(r'\\chapter(?:\[[^\]]*\])?\{[^}]*\}', source, maxsplit=1)[1].split('\\section', 1)[0]
    assert len(opening.split()) >= 20, path.name
    assert '\\section' not in opening and '\\subsection' not in opening, path.name
    assert 'This chapter has' in source[-1000:], path.name
    assert 'To be confirmed' not in source, path.name
assert sum(t.startswith('Chapter ') for t in texts) == 9
assert all_text.count('This chapter has') == 9
assert 'Authentication and Security' not in all_text
toc = (REPORT/'output/main.toc').read_text(encoding='utf-8')
assert re.search(r'\\contentsline\s*\{subsection\}\s*\{\\numberline\s*\{5\.5\.1\}', toc)
assert re.search(r'\\contentsline\s*\{subsection\}\s*\{\\numberline\s*\{5\.5\.4\}', toc)
first_body_page = next(i for i, text in enumerate(texts) if text.startswith('Chapter 1'))
contents_text = '\n'.join(texts[:first_body_page])
assert re.search(r'5\.5\.1\s+Backend and API Communication', contents_text)
assert re.search(r'5\.5\.4\s+PDF Report Generation', contents_text)
contents_flat = ' '.join(contents_text.split())
numbered_subsections = 0
for chapter_number, path in enumerate(chapters, 1):
    section_number = subsection_number = 0
    headings = re.findall(r'^\\(section|subsection)\{([^}]+)\}', path.read_text(encoding='utf-8'), re.M)
    for kind, title in headings:
        if kind == 'section':
            section_number += 1
            subsection_number = 0
        else:
            subsection_number += 1
            numbered_subsections += 1
            entry = f'{chapter_number}.{section_number}.{subsection_number} {title}'
            assert entry in contents_flat, entry
implementation = (REPORT/'chapters/ch05_implementation_methodology.tex').read_text(encoding='utf-8')
application_section = implementation.split(r'\section{Application Implementation}', 1)[1].split(r'\section{End-to-End System Workflow}', 1)[0]
assert len(re.findall(r'^\\subsection\{', application_section, re.M)) == 4
screenshot_pages = {}
for number in range(1, 7):
    matches = [i for i, text in enumerate(texts) if re.search(rf'Figure\s+5\.{number}:', text)]
    assert len(matches) == 1, (number, matches)
    screenshot_pages[number] = matches[0]
assert screenshot_pages[1] == screenshot_pages[2]
assert screenshot_pages[3] == screenshot_pages[4]
assert screenshot_pages[5] == screenshot_pages[6]
assert len(set(screenshot_pages.values())) == 3
figure_paths = re.findall(r'\\reportfigure\{([^}]+)\}', '\n'.join(p.read_text(encoding='utf-8') for p in chapters))
reserved_figures = sum(not (REPORT/path).is_file() for path in figure_paths)
assert all_text.count('Figure reserved for final insertion') == reserved_figures
assert 'Week-based development work plan' in all_text
assert 'Team Responsibilities' not in all_text
assert 'Project Timeline and Milestones' not in all_text
assert '\ufffd' not in all_text
assert '??' not in all_text
out_of_bounds = []
for number, page in enumerate(pdf, 1):
    for word in page.get_text('words'):
        if word[0] < 0 or word[1] < 0 or word[2] > page.rect.width + .5 or word[3] > page.rect.height + .5:
            out_of_bounds.append(number)
assert not out_of_bounds, out_of_bounds
log = (REPORT/'output/main.log').read_text(encoding='utf-8', errors='replace')
assert 'Overfull \\hbox' not in log
assert 'undefined references' not in log.lower()
assert 'citation' not in '\n'.join(line.lower() for line in log.splitlines() if 'undefined' in line.lower())
snapshot_path = REPORT/'output/review/source_snapshot.json'
source_unchanged = None
changed = []
if snapshot_path.exists():
    snapshot = json.loads(snapshot_path.read_text())
    changed = [name for name, digest in snapshot.items()
               if not (PROJECT/name).is_file() or hashlib.sha256((PROJECT/name).read_bytes()).hexdigest() != digest]
    source_unchanged = not changed
result = {
    'pdf': pdf_path.name, 'pages_including_frontmatter_and_references': len(pdf),
    'chapters_with_plain_openings_and_closing_recaps': len(chapters),
    'main_sections_per_chapter': expected_main_sections,
    'authentication_and_security_section_removed': True,
    'contents_includes_numbered_subsections': True,
    'numbered_subsections_verified_in_contents': numbered_subsections,
    'interface_screenshots_paired_on_three_pages': True,
    'reserved_dfd_and_interface_figures': reserved_figures, 'gantt_chart_present': True,
    'undefined_references': False, 'overfull_text_boxes': False,
    'application_models_and_datasets_unchanged': source_unchanged,
    'changed_application_files_since_report_snapshot': changed,
    'pdf_sha256': hashlib.sha256(pdf_path.read_bytes()).hexdigest(),
}
(REPORT/'output/verification.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result, indent=2))
