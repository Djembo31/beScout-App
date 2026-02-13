import sys
fp = r'c:\bescout-app\src\app\(app)\fantasy\page.tsx'
with open(fp, 'r', encoding='utf-8') as f:
    lines = f.readlines()
print(f'Original lines: {len(lines)}')
# Remove lines 1820-1918 (0-indexed: 1819-1917)
new_lines = lines[:1819] + lines[1918:]
print(f'New lines: {len(new_lines)}')
print(f'Removed: {len(lines) - len(new_lines)}')
with open(fp, 'w', encoding='utf-8', newline='') as f:
    f.writelines(new_lines)
print('Done!')
