#!/usr/bin/env python3
import re
import os

pbxproj_path = os.path.join(os.path.dirname(__file__), '..', 'ios', 'FocusForge.xcodeproj', 'project.pbxproj')

with open(pbxproj_path, 'r') as f:
    content = f.read()

sc_pattern = r'(11F92067524A4D899C01032C /\* "ShieldConfiguration" \*/ = \{[^}]*buildPhases = \()\s*(\);)'
sc_replacement = (
    r'\1'
    '\n\t\t\t\t\t\tA59DAF1C7CC87F9CDD86B116 /* Sources */,'
    '\n\t\t\t\t\t\tCAB8F79DAC0C2E56C514B78E /* Frameworks */,'
    '\n\t\t\t\t\t\t10BAFECA023603EE759C3FEE /* Resources */,'
    '\n\t\t\t\t\t'
    r'\2'
)

result = re.sub(sc_pattern, sc_replacement, content, flags=re.DOTALL)
if result == content:
    print("WARNING: ShieldConfiguration pattern did not match!")
else:
    print("ShieldConfiguration: matched and replaced")
    content = result

sa_pattern = r'(A10CA7A24EC3456082F0E001 /\* "ShieldAction" \*/ = \{[^}]*buildPhases = \()\s*(\);)'
sa_replacement = (
    r'\1'
    '\n\t\t\t\t\t\t54CD24B872AC850115604AD8 /* Sources */,'
    '\n\t\t\t\t\t\t27CE2F7AFE945F1318903F79 /* Frameworks */,'
    '\n\t\t\t\t\t\tE8EBED142B96BEB744B2D7D7 /* Resources */,'
    '\n\t\t\t\t\t'
    r'\2'
)

result2 = re.sub(sa_pattern, sa_replacement, content, flags=re.DOTALL)
if result2 == content:
    print("WARNING: ShieldAction pattern did not match!")
else:
    print("ShieldAction: matched and replaced")
    content = result2

with open(pbxproj_path, 'w') as f:
    f.write(content)

print("Done!")
