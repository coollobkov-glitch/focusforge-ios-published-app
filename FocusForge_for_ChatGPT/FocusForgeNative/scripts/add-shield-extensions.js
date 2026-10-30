#!/usr/bin/env node
/**
 * add-shield-extensions.js
 *
 * Adds the ShieldConfiguration and ShieldAction extension targets to the
 * existing Xcode project. This copies the Swift source + Info.plist +
 * entitlements into the ios/ directory and registers them as app extension
 * targets in project.pbxproj.
 *
 * Usage: node scripts/add-shield-extensions.js
 */

const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const IOS_DIR = path.join(PROJECT_ROOT, 'ios');
const PBXPROJ = path.join(IOS_DIR, 'FocusForge.xcodeproj', 'project.pbxproj');
const BUNDLE_ID = 'org.focusforge.app';

const EXTENSIONS = [
  {
    name: 'ShieldConfiguration',
    bundleIdSuffix: '.ShieldConfiguration',
    extensionPoint: 'com.apple.ManagedSettingsUI.shield-configuration',
    srcDir: path.join(PROJECT_ROOT, 'modules', 'screen-time', 'extensions', 'ShieldConfiguration'),
    files: [
      'ShieldConfigurationExtension.swift',
      'Info.plist',
      'ShieldConfiguration.entitlements',
    ],
  },
  {
    name: 'ShieldAction',
    bundleIdSuffix: '.ShieldAction',
    extensionPoint: 'com.apple.ManagedSettingsUI.shield-action',
    srcDir: path.join(PROJECT_ROOT, 'modules', 'screen-time', 'extensions', 'ShieldAction'),
    files: [
      'ShieldActionExtension.swift',
      'Info.plist',
      'ShieldAction.entitlements',
    ],
  },
];

function main() {
  if (!fs.existsSync(PBXPROJ)) {
    console.error('❌ project.pbxproj not found at:', PBXPROJ);
    process.exit(1);
  }

  const proj = xcode.project(PBXPROJ);
  proj.parseSync();

  for (const ext of EXTENSIONS) {
    console.log(`\nAdding extension: ${ext.name}`);

    // 1. Copy files to ios/<ExtName>/
    const targetDir = path.join(IOS_DIR, ext.name);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    for (const file of ext.files) {
      const src = path.join(ext.srcDir, file);
      const dst = path.join(targetDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
        console.log(`  ✓ Copied ${file}`);
      } else {
        console.log(`  ⚠ Source not found: ${src}`);
      }
    }

    // 2. Check if target already exists
    const targets = proj.pbxNativeTargetSection();
    let alreadyExists = false;
    for (const key of Object.keys(targets)) {
      if (key.endsWith('_comment')) continue;
      const t = targets[key];
      if (t && typeof t === 'object') {
        const name = (t.name || '').replace(/"/g, '');
        if (name === ext.name) {
          alreadyExists = true;
          break;
        }
      }
    }

    if (alreadyExists) {
      console.log(`  ✓ Target "${ext.name}" already exists, skipping.`);
      continue;
    }

    // 3. Add app extension target
    const swiftFile = ext.files.find(f => f.endsWith('.swift'));
    const entFile = ext.files.find(f => f.endsWith('.entitlements'));

    const targetOpts = {
      bundleId: BUNDLE_ID + ext.bundleIdSuffix,
      teamId: '', // Will use automatic signing
    };

    // Use addTarget for app extension
    const target = proj.addTarget(ext.name, 'app_extension', ext.name, targetOpts.bundleId);

    if (target && target.uuid) {
      console.log(`  ✓ Added target: ${ext.name} (${target.uuid})`);

      // 4. Set build settings for the new target
      const configs = proj.pbxXCBuildConfigurationSection();
      for (const key of Object.keys(configs)) {
        if (key.endsWith('_comment')) continue;
        const cfg = configs[key];
        if (!cfg || typeof cfg !== 'object') continue;
        const bs = cfg.buildSettings;
        if (!bs) continue;
        const product = bs.PRODUCT_NAME;
        if (product && product.replace(/"/g, '') === ext.name) {
          bs.IPHONEOS_DEPLOYMENT_TARGET = '16.0';
          bs.SWIFT_VERSION = '5.0';
          bs.CODE_SIGN_ENTITLEMENTS = `${ext.name}/${entFile}`;
          bs.INFOPLIST_FILE = `${ext.name}/Info.plist`;
          bs.PRODUCT_BUNDLE_IDENTIFIER = `"${targetOpts.bundleId}"`;
          bs.TARGETED_DEVICE_FAMILY = '"1,2"';
          bs.GENERATE_INFOPLIST_FILE = 'NO';
          bs.CURRENT_PROJECT_VERSION = '1';
          bs.MARKETING_VERSION = '1.0';
          bs.SKIP_INSTALL = 'YES';
          // Link frameworks
          bs.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
        }
      }

      // 5. Add the swift source file to the target's sources build phase
      const group = proj.addPbxGroup(
        [swiftFile, 'Info.plist', entFile],
        ext.name,
        ext.name
      );

      // Add source file to target
      proj.addSourceFile(
        `${ext.name}/${swiftFile}`,
        { target: target.uuid },
        group.uuid
      );

      // Link frameworks
      const frameworks = ['ManagedSettings', 'ManagedSettingsUI'];
      if (ext.name === 'ShieldAction') {
        // ShieldAction only needs ManagedSettings + ManagedSettingsUI
      }
      for (const fw of frameworks) {
        proj.addFramework(`${fw}.framework`, { target: target.uuid });
      }

      console.log(`  ✓ Configured build settings and frameworks`);
    } else {
      console.log(`  ❌ Failed to add target ${ext.name}`);
    }
  }

  // 6. Write updated project file
  fs.writeFileSync(PBXPROJ, proj.writeSync());
  console.log('\n✓ project.pbxproj saved');
  console.log('\nDone! Rebuild with: npx expo run:ios --device');
}

main();
