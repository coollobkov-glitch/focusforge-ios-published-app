#!/usr/bin/env python3
"""
Fixes:
1. Swift file references path doubling (group already has directory path)
2. Shared Info.plist file reference between two groups -> split into two
   distinct file references, each in its own group, with correct build files.
"""
import re
import os

pbxproj_path = os.path.join(os.path.dirname(__file__), '..', 'ios', 'FocusForge.xcodeproj', 'project.pbxproj')

with open(pbxproj_path, 'r') as f:
    content = f.read()

# --- Fix 1: swift file reference paths (remove directory prefix, since group already has it) ---
content = content.replace(
    'path = "ShieldConfiguration/ShieldConfigurationExtension.swift"',
    'path = "ShieldConfigurationExtension.swift"'
)
content = content.replace(
    'path = "ShieldAction/ShieldActionExtension.swift"',
    'path = "ShieldActionExtension.swift"'
)

# --- Fix 2: split shared Info.plist file reference into two ---
NEW_SC_INFOPLIST_REF = 'AA11BB22CC33DD44EE55FF66'
NEW_SC_INFOPLIST_BUILDFILE = 'AA11BB22CC33DD44EE55FF77'

# Add new PBXFileReference for ShieldConfiguration's Info.plist
old_fileref_decl = '\t\t\t\t038E760430EF437DACF3983B /* Info.plist */ = {isa = PBXFileReference; name = "Info.plist"; path = "Info.plist"; sourceTree = "<group>"; fileEncoding = 4; lastKnownFileType = text.plist.xml; explicitFileType = undefined; includeInIndex = 0; };\n'
new_fileref_decl = old_fileref_decl + f'\t\t\t\t{NEW_SC_INFOPLIST_REF} /* Info.plist */ = {{isa = PBXFileReference; name = "Info.plist"; path = "Info.plist"; sourceTree = "<group>"; fileEncoding = 4; lastKnownFileType = text.plist.xml; explicitFileType = undefined; includeInIndex = 0; }};\n'

if old_fileref_decl in content:
    content = content.replace(old_fileref_decl, new_fileref_decl, 1)
    print("Added new Info.plist file reference for ShieldConfiguration")
else:
    print("WARNING: old_fileref_decl not found exactly, trying regex")
    pattern = r'(\t*038E760430EF437DACF3983B /\* Info\.plist \*/ = \{[^\n]*\n)'
    content, n = re.subn(pattern, lambda m: m.group(1) + f'\t\t\t\t{NEW_SC_INFOPLIST_REF} /* Info.plist */ = {{isa = PBXFileReference; name = "Info.plist"; path = "Info.plist"; sourceTree = "<group>"; fileEncoding = 4; lastKnownFileType = text.plist.xml; explicitFileType = undefined; includeInIndex = 0; }};\n', content)
    print(f"Regex replaced {n} occurrence(s)")

# Add new PBXBuildFile for the new Info.plist ref
old_buildfile_decl = '\t\t\t\t35A72B5D300041E3B52A8720 /* Info.plist in Resources */ = {isa = PBXBuildFile; fileRef = 038E760430EF437DACF3983B /* Info.plist */; };\n'
new_buildfile_decl = old_buildfile_decl + f'\t\t\t\t{NEW_SC_INFOPLIST_BUILDFILE} /* Info.plist in Resources */ = {{isa = PBXBuildFile; fileRef = {NEW_SC_INFOPLIST_REF} /* Info.plist */; }};\n'

if old_buildfile_decl in content:
    content = content.replace(old_buildfile_decl, new_buildfile_decl, 1)
    print("Added new Info.plist build file for ShieldConfiguration")
else:
    print("WARNING: old_buildfile_decl not found exactly, trying regex")
    pattern = r'(\t*35A72B5D300041E3B52A8720 /\* Info\.plist in Resources \*/ = \{[^\n]*\n)'
    content, n = re.subn(pattern, lambda m: m.group(1) + f'\t\t\t\t{NEW_SC_INFOPLIST_BUILDFILE} /* Info.plist in Resources */ = {{isa = PBXBuildFile; fileRef = {NEW_SC_INFOPLIST_REF} /* Info.plist */; }};\n', content)
    print(f"Regex replaced {n} occurrence(s)")

# Now find the ShieldConfiguration PBXGroup and swap its Info.plist child reference
# to point to the new ref
sc_group_pattern = r'(7A051C1959A54127A45B39DF /\* ShieldConfiguration \*/ = \{\s*isa = PBXGroup;\s*children = \(\s*)038E760430EF437DACF3983B( /\* Info\.plist \*/,)'
content, n = re.subn(sc_group_pattern, r'\1' + NEW_SC_INFOPLIST_REF + r'\2', content, flags=re.DOTALL)
print(f"Updated ShieldConfiguration group children: {n} replacement(s)")

# Update the ShieldConfiguration target's Resources build phase to use new build file
sc_resources_pattern = r'(10BAFECA023603EE759C3FEE /\* Resources \*/ = \{\s*isa = PBXResourcesBuildPhase;\s*buildActionMask = 2147483647;\s*files = \(\s*)(\);)'
content, n = re.subn(
    sc_resources_pattern,
    r'\1\t\t\t\t\t\t' + NEW_SC_INFOPLIST_BUILDFILE + r' /* Info.plist in Resources */,\n\t\t\t\t\t\2',
    content,
    flags=re.DOTALL
)
print(f"Updated ShieldConfiguration Resources build phase: {n} replacement(s)")

with open(pbxproj_path, 'w') as f:
    f.write(content)

print("Done!")
