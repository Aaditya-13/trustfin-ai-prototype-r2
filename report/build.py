"""Build the LaTeX source and publish the report PDF without PowerShell policies."""
import argparse
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

report = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--compiler', help='Path to Tectonic if it is not on PATH')
args = parser.parse_args()
compiler = args.compiler or shutil.which('tectonic')
if not compiler:
    candidate = Path(tempfile.gettempdir())/'trustfin-tectonic-0.17.0'/'tectonic.exe'
    compiler = str(candidate) if candidate.is_file() else None
if not compiler:
    raise SystemExit('Install Tectonic or supply --compiler with its executable path.')
environment = os.environ.copy()
cache = Path(tempfile.gettempdir())/'trustfin-tectonic-cache'
if cache.is_dir():
    environment['TECTONIC_CACHE_DIR'] = str(cache)
output = report/'output'
output.mkdir(exist_ok=True)
completed = subprocess.run([compiler, '--keep-logs', '--keep-intermediates',
                            '--reruns', '2', '-o', 'output', 'main.tex'],
                           cwd=report, env=environment, stdout=subprocess.PIPE,
                           stderr=subprocess.STDOUT)
log = completed.stdout.decode('utf-8', errors='replace')
(output/'build_log.txt').write_text(log, encoding='utf-8')
if completed.returncode:
    print(log[-6000:])
    raise SystemExit(completed.returncode)
target = output/'TrustFin_AI_Group_Project_Report.pdf'
shutil.copyfile(output/'main.pdf', target)
print('Built '+str(target))
