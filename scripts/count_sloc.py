import os
import json

target_dirs = ['backend/app', 'frontend/src']
extensions = {
    '.py': 'Python',
    '.js': 'JavaScript',
    '.jsx': 'React JSX',
    '.css': 'CSS',
    '.html': 'HTML'
}

file_records = []

for root_dir in target_dirs:
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Exclude non-useful directories
        dirnames[:] = [d for d in dirnames if d not in ['__pycache__', '.pytest_cache', 'tests', 'node_modules', 'dist', 'build', '.git']]
        for f in filenames:
            ext = os.path.splitext(f)[1].lower()
            if ext in extensions:
                filepath = os.path.join(dirpath, f).replace('\\', '/')
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as fp:
                    lines = fp.readlines()
                
                total = len(lines)
                blank = 0
                comment = 0
                code = 0
                in_multiline = False
                
                for line in lines:
                    trimmed = line.strip()
                    if not trimmed:
                        blank += 1
                        continue
                    
                    if ext == '.py':
                        if trimmed.startswith('#'):
                            comment += 1
                        elif trimmed.startswith('"""') or trimmed.startswith("'''"):
                            comment += 1
                            if (trimmed.count('"""') == 1 or trimmed.count("'''") == 1) and not (trimmed.endswith('"""') or trimmed.endswith("'''")):
                                in_multiline = not in_multiline
                        elif in_multiline:
                            comment += 1
                            if trimmed.endswith('"""') or trimmed.endswith("'''"):
                                in_multiline = False
                        else:
                            code += 1
                    else:
                        if trimmed.startswith('//'):
                            comment += 1
                        elif trimmed.startswith('/*') and trimmed.endswith('*/'):
                            comment += 1
                        elif trimmed.startswith('/*'):
                            comment += 1
                            in_multiline = True
                        elif in_multiline:
                            comment += 1
                            if '*/' in trimmed:
                                in_multiline = False
                        else:
                            code += 1
                
                # Tag tier/subsystem
                subsystem = "Backend Core" if "backend/app" in filepath else "Frontend UI"
                
                file_records.append({
                    'path': filepath,
                    'subsystem': subsystem,
                    'language': extensions[ext],
                    'total': total,
                    'code': code,
                    'comment': comment,
                    'blank': blank
                })

print("="*75)
print("TRUSTFIN AI - PRODUCTION CODEBASE SIZING (EXCLUDING DOCS, TESTS & CACHES)")
print("="*75)
print(f"Total Useful Production Files: {len(file_records)}")
tot_lines = sum(r['total'] for r in file_records)
tot_code = sum(r['code'] for r in file_records)
tot_comm = sum(r['comment'] for r in file_records)
tot_blank = sum(r['blank'] for r in file_records)

print(f"Total Physical Lines:        {tot_lines:,}")
print(f"Total Source Code (SLOC):    {tot_code:,}")
print(f"Total Comments & Docstrings: {tot_comm:,}")
print(f"Total Blank Lines:           {tot_blank:,}")
print(f"Size in KLOC (Logical Code): {tot_code / 1000.0:.3f} KLOC")
print(f"Size in KLOC (Physical):     {tot_lines / 1000.0:.3f} KLOC")
print("-" * 75)

print("\nBREAKDOWN BY SUBSYSTEM:")
by_sub = {}
for r in file_records:
    sub = r['subsystem']
    if sub not in by_sub:
        by_sub[sub] = {'files': 0, 'total': 0, 'code': 0, 'comment': 0, 'blank': 0}
    by_sub[sub]['files'] += 1
    by_sub[sub]['total'] += r['total']
    by_sub[sub]['code'] += r['code']
    by_sub[sub]['comment'] += r['comment']
    by_sub[sub]['blank'] += r['blank']

for sub, d in by_sub.items():
    print(f"  {sub:<15} : {d['files']:2} files | {d['code']:5,} SLOC ({d['code']/1000.0:.3f} KLOC) | {d['total']:5,} Physical Lines")

print("\nBREAKDOWN BY LANGUAGE:")
by_lang = {}
for r in file_records:
    lang = r['language']
    if lang not in by_lang:
        by_lang[lang] = {'files': 0, 'total': 0, 'code': 0, 'comment': 0, 'blank': 0}
    by_lang[lang]['files'] += 1
    by_lang[lang]['total'] += r['total']
    by_lang[lang]['code'] += r['code']
    by_lang[lang]['comment'] += r['comment']
    by_lang[lang]['blank'] += r['blank']

for lang, d in sorted(by_lang.items(), key=lambda x: x[1]['code'], reverse=True):
    print(f"  {lang:<15} : {d['files']:2} files | {d['code']:5,} SLOC ({d['code']/1000.0:.3f} KLOC) | {d['total']:5,} Physical Lines")

print("\nTOP PRODUCTION FILES BY SLOC:")
for r in sorted(file_records, key=lambda x: x['code'], reverse=True)[:12]:
    print(f"  {r['path']:50} : {r['code']:4} SLOC ({r['language']})")

# Save structured summary to json
with open('scratch_sloc_summary.json', 'w') as f:
    json.dump({
        'total_files': len(file_records),
        'total_physical_lines': tot_lines,
        'total_sloc': tot_code,
        'kloc_sloc': tot_code / 1000.0,
        'kloc_physical': tot_lines / 1000.0,
        'by_subsystem': by_sub,
        'by_language': by_lang,
        'files': file_records
    }, f, indent=2)
