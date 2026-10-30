#!/usr/bin/env python3
"""
Cleanup duplicate PBXBuildFile entries created by earlier sed mistakes.
Removes the line with fileRef pointing to the WRONG (no-directory-prefix)
file references: B8DECC32BA3F43B9B2E6E3D0 and 4B6094812B38423698CE8F38.
Also removes those now-unused PBXFileReference entries and their group refs.
"""
import re
import os

pbxproj_path = os.path.join(os.path.dirname(__file__), '..', 'ios', 'FocusForge.xcodeproj', 'project.pbxproj')

with open(pbxproj_path, 'r') as f:
    lines = f.readlines()

# Remove the specific duplicate PBXBuildFile lines (those with wrong fileRef, no dir prefix)
wrong_refs = ['B8DECC32BA3F43B9B2E6E3D0', '4B6094812B38423698CE8F38']

new_lines = []
removed_count = 0
for line in lines:
    should_remove = False
    if 'isa = PBXBuildFile' in line:
        for ref in wrong_refs:
            if f'fileRef = {ref} ' in line:
                should_remove = True
                removed_count += 1
                break
    if not should_remove:
        new_lines.append(line)

print(f"Removed {removed_count} duplicate PBXBuildFile lines")

content = ''.join(new_lines)

# Remove the now-unused PBXFileReference declarations for wrong refs
for ref in wrong_refs:
    pattern = r'\t*' + ref + r' /\* [^\n]*\n'
    content, n = re.subn(pattern, '', content)
    print(f"Removed {n} PBXFileReference lines for {ref}")

# Remove references to these UUIDs from PBXGroup children arrays
for ref in wrong_refs:
    pattern = r'\t*' + ref + r' /\* [^\n]*\*/,\n'
    content, n = re.subn(pattern, '', content)
    print(f"Removed {n} group child references for {ref}")

with open(pbxproj_path, 'w') as f:
    f.write(content)

print("Done!")
