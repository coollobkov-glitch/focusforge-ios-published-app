#!/usr/bin/env node
/**
 * fix-extension-build-phases.js
 *
 * Adds missing Sources, Resources, and Frameworks build phases
 * to the ShieldConfiguration and ShieldAction extension targets.
 */

const fs = require('fs');
const path = require('path');

const PBXPROJ = path.join(__dirname, '..', 'ios', 'FocusForge.xcodeproj', 'project.pbxproj');

let content = fs.readFileSync(PBXPROJ, 'utf8');

// Generate unique-looking UUIDs (24 hex chars)
function uuid() {
  return Array.from({ length: 24 }, () =>
    '0123456789ABCDEF'[Math.floor(Math.random() * 16)]
  ).join('');
}

// Build phase UUIDs
const SC_SOURCES = uuid();
const SC_RESOURCES = uuid();
const SC_FRAMEWORKS = uuid();
const SA_SOURCES = uuid();
const SA_RESOURCES = uuid();
const SA_FRAMEWORKS = uuid();

// Framework build file UUIDs (for linking ManagedSettings / ManagedSettingsUI)
const SC_FW_MANAGEDSETTINGS_BF = uuid();
const SC_FW_MANAGEDSETTINGSUI_BF = uuid();
const SA_FW_MANAGEDSETTINGS_BF = uuid();

// File references for frameworks (reuse existing)
// ManagedSettings.framework: 223C88AB861C45B4AEFB0BCC
// ManagedSettingsUI.framework: FFBD7C9598B7479E9F897AB6

// Existing build file refs from the PBXBuildFile section:
// ShieldConfiguration:
//   39850EA188104D8B840CDF7A /* ShieldConfigurationExtension.swift in Sources */
//   35A72B5D300041E3B52A8720 /* Info.plist in Resources */
//   18BBE1B845284E40958EBCB9 /* ShieldConfiguration.entitlements in Resources */
// ShieldAction:
//   F2019964B1414130B81BE7EB /* ShieldActionExtension.swift in Sources */
//   EF2C6E1AE02C45EAB10A77AB /* ShieldAction.entitlements in Resources */

// Add framework build files to PBXBuildFile section
const buildFilesEnd = '/* End PBXBuildFile section */';
const newBuildFiles = `\t\t\t\t${SC_FW_MANAGEDSETTINGS_BF} /* ManagedSettings.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = 223C88AB861C45B4AEFB0BCC /* ManagedSettings.framework */; };
\t\t\t\t${SC_FW_MANAGEDSETTINGSUI_BF} /* ManagedSettingsUI.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = FFBD7C9598B7479E9F897AB6 /* ManagedSettingsUI.framework */; };
\t\t\t\t${SA_FW_MANAGEDSETTINGS_BF} /* ManagedSettings.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = 223C88AB861C45B4AEFB0BCC /* ManagedSettings.framework */; };
`;
content = content.replace(buildFilesEnd, newBuildFiles + buildFilesEnd);

// Add build phases to PBXSourcesBuildPhase section
const sourcesEnd = '/* End PBXSourcesBuildPhase section */';
const newSources = `\t\t\t\t${SC_SOURCES} /* Sources */ = {
\t\t\t\t\tisa = PBXSourcesBuildPhase;
\t\t\t\t\tbuildActionMask = 2147483647;
\t\t\t\t\tfiles = (
\t\t\t\t\t\t39850EA188104D8B840CDF7A /* ShieldConfigurationExtension.swift in Sources */,
\t\t\t\t\t);
\t\t\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t\t\t};
\t\t\t\t${SA_SOURCES} /* Sources */ = {
\t\t\t\t\tisa = PBXSourcesBuildPhase;
\t\t\t\t\tbuildActionMask = 2147483647;
\t\t\t\t\tfiles = (
\t\t\t\t\t\tF2019964B1414130B81BE7EB /* ShieldActionExtension.swift in Sources */,
\t\t\t\t\t);
\t\t\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t\t\t};
`;
content = content.replace(sourcesEnd, newSources + sourcesEnd);

// Add build phases to PBXResourcesBuildPhase section
const resourcesEnd = '/* End PBXResourcesBuildPhase section */';
const newResources = `\t\t\t\t${SC_RESOURCES} /* Resources */ = {
\t\t\t\t\tisa = PBXResourcesBuildPhase;
\t\t\t\t\tbuildActionMask = 2147483647;
\t\t\t\t\tfiles = (
\t\t\t\t\t);
\t\t\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t\t\t};
\t\t\t\t${SA_RESOURCES} /* Resources */ = {
\t\t\t\t\tisa = PBXResourcesBuildPhase;
\t\t\t\t\tbuildActionMask = 2147483647;
\t\t\t\t\tfiles = (
\t\t\t\t\t);
\t\t\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t\t\t};
`;
content = content.replace(resourcesEnd, newResources + resourcesEnd);

// Add build phases to PBXFrameworksBuildPhase section
const frameworksEnd = '/* End PBXFrameworksBuildPhase section */';
const newFrameworks = `\t\t\t\t${SC_FRAMEWORKS} /* Frameworks */ = {
\t\t\t\t\tisa = PBXFrameworksBuildPhase;
\t\t\t\t\tbuildActionMask = 2147483647;
\t\t\t\t\tfiles = (
\t\t\t\t\t\t${SC_FW_MANAGEDSETTINGS_BF} /* ManagedSettings.framework in Frameworks */,
\t\t\t\t\t\t${SC_FW_MANAGEDSETTINGSUI_BF} /* ManagedSettingsUI.framework in Frameworks */,
\t\t\t\t\t);
\t\t\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t\t\t};
\t\t\t\t${SA_FRAMEWORKS} /* Frameworks */ = {
\t\t\t\t\tisa = PBXFrameworksBuildPhase;
\t\t\t\t\tbuildActionMask = 2147483647;
\t\t\t\t\tfiles = (
\t\t\t\t\t\t${SA_FW_MANAGEDSETTINGS_BF} /* ManagedSettings.framework in Frameworks */,
\t\t\t\t\t);
\t\t\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t\t\t};
`;
content = content.replace(frameworksEnd, newFrameworks + frameworksEnd);

// Now update the ShieldConfiguration target to reference build phases
// Target UUID: 11F92067524A4D899C01032C
content = content.replace(
  /11F92067524A4D899C01032C \/\* "ShieldConfiguration" \*\/ = \{[^}]*buildPhases = \(\s*\);/s,
  (match) => match.replace(
    'buildPhases = (\n\t\t\t\t\t);',
    `buildPhases = (\n\t\t\t\t\t\t${SC_SOURCES} /* Sources */,\n\t\t\t\t\t\t${SC_FRAMEWORKS} /* Frameworks */,\n\t\t\t\t\t\t${SC_RESOURCES} /* Resources */,\n\t\t\t\t\t);`
  )
);

// Update the ShieldAction target to reference build phases
// Target UUID: A10CA7A24EC3456082F0E001
content = content.replace(
  /A10CA7A24EC3456082F0E001 \/\* "ShieldAction" \*\/ = \{[^}]*buildPhases = \(\s*\);/s,
  (match) => match.replace(
    'buildPhases = (\n\t\t\t\t\t);',
    `buildPhases = (\n\t\t\t\t\t\t${SA_SOURCES} /* Sources */,\n\t\t\t\t\t\t${SA_FRAMEWORKS} /* Frameworks */,\n\t\t\t\t\t\t${SA_RESOURCES} /* Resources */,\n\t\t\t\t\t);`
  )
);

fs.writeFileSync(PBXPROJ, content);
console.log('✓ Fixed build phases for ShieldConfiguration and ShieldAction targets');
console.log(`  ShieldConfiguration: Sources=${SC_SOURCES}, Frameworks=${SC_FRAMEWORKS}, Resources=${SC_RESOURCES}`);
console.log(`  ShieldAction: Sources=${SA_SOURCES}, Frameworks=${SA_FRAMEWORKS}, Resources=${SA_RESOURCES}`);
