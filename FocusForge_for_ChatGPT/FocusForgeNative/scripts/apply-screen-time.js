#!/usr/bin/env node
/**
 * apply-screen-time.js
 *
 * One-shot script that applies the same changes as the withScreenTime plugin
 * to the already-generated ios/ directory. Use this after `expo prebuild` has
 * already run and you don't want to run `--clean` (which would wipe Pods).
 *
 * Safe to re-run: skips work that's already been done.
 */

const fs = require('fs');
const path = require('path');
const plist = require('plist');
const xcode = require('xcode');

const ROOT = path.resolve(__dirname, '..');
const IOS_DIR = path.join(ROOT, 'ios');

const SWIFT_FILE = 'ScreenTimeModule.swift';
const BRIDGE_FILE = 'ScreenTimeModuleBridge.m';
const FRAMEWORKS = ['FamilyControls', 'ManagedSettings', 'DeviceActivity'];

function getAppName() {
  const entries = fs.readdirSync(IOS_DIR);
  const xcodeproj = entries.find((e) => e.endsWith('.xcodeproj'));
  if (!xcodeproj) throw new Error('No *.xcodeproj found in ios/');
  return xcodeproj.replace(/\.xcodeproj$/, '');
}

function applyEntitlements(appName) {
  const entPath = path.join(IOS_DIR, appName, `${appName}.entitlements`);
  let data = { };
  if (fs.existsSync(entPath)) {
    const raw = fs.readFileSync(entPath, 'utf8');
    try { data = plist.parse(raw) || {}; } catch (_) { data = {}; }
  }
  if (data['com.apple.developer.family-controls'] === true) {
    console.log('✓ Entitlement already present');
    return;
  }
  data['com.apple.developer.family-controls'] = true;
  fs.writeFileSync(entPath, plist.build(data), 'utf8');
  console.log('✓ Added family-controls entitlement');
}

function copySwiftFiles(appName) {
  const srcDir = path.join(ROOT, 'modules', 'screen-time', 'swift');
  const dstDir = path.join(IOS_DIR, appName);
  for (const file of [SWIFT_FILE, BRIDGE_FILE]) {
    const from = path.join(srcDir, file);
    const to = path.join(dstDir, file);
    if (!fs.existsSync(from)) {
      throw new Error(`Missing source file: ${from}`);
    }
    fs.copyFileSync(from, to);
    console.log(`✓ Copied ${file} -> ios/${appName}/`);
  }
}

function findTargetKey(proj, appName) {
  const targets = proj.pbxNativeTargetSection();
  for (const key of Object.keys(targets)) {
    if (key.endsWith('_comment')) continue;
    const target = targets[key];
    if (!target || typeof target !== 'object') continue;
    const name = (target.name || '').replace(/"/g, '');
    if (name === appName) return key;
  }
  return null;
}

function findGroupKeyByName(proj, name) {
  const groups = proj.hash.project.objects.PBXGroup;
  for (const key of Object.keys(groups)) {
    if (key.endsWith('_comment')) continue;
    const g = groups[key];
    if (!g || typeof g !== 'object') continue;
    const groupName = (g.name || g.path || '').replace(/"/g, '');
    if (groupName === name) return key;
  }
  return null;
}

function fileInSources(proj, targetKey, fileName) {
  const sources = proj.pbxSourcesBuildPhaseObj(targetKey);
  if (!sources || !sources.files) return false;
  return sources.files.some((f) => (f.comment || '').includes(fileName));
}

function frameworkInBuild(proj, targetKey, fwFile) {
  const fws = proj.pbxFrameworksBuildPhaseObj(targetKey);
  if (!fws || !fws.files) return false;
  return fws.files.some((f) => (f.comment || '').includes(fwFile));
}

function updateXcodeProject(appName) {
  const pbxPath = path.join(IOS_DIR, `${appName}.xcodeproj`, 'project.pbxproj');
  const proj = xcode.project(pbxPath);
  proj.parseSync();

  const targetKey = findTargetKey(proj, appName);
  if (!targetKey) throw new Error(`Target '${appName}' not found in pbxproj`);

  const groupKey = findGroupKeyByName(proj, appName);
  if (!groupKey) throw new Error(`Group '${appName}' not found in pbxproj`);

  for (const file of [SWIFT_FILE, BRIDGE_FILE]) {
    if (fileInSources(proj, targetKey, file)) {
      console.log(`✓ ${file} already registered in target`);
      continue;
    }
    proj.addSourceFile(
      path.join(appName, file),
      { target: targetKey },
      groupKey
    );
    console.log(`✓ Registered ${file} with target ${appName}`);
  }

  for (const fw of FRAMEWORKS) {
    const fwFile = `${fw}.framework`;
    if (frameworkInBuild(proj, targetKey, fwFile)) {
      console.log(`✓ ${fwFile} already linked`);
      continue;
    }
    proj.addFramework(fwFile, { target: targetKey });
    console.log(`✓ Linked ${fwFile}`);
  }

  fs.writeFileSync(pbxPath, proj.writeSync());
  console.log('✓ project.pbxproj saved');
}

function main() {
  const appName = getAppName();
  console.log(`Applying Screen Time changes to iOS target: ${appName}`);
  applyEntitlements(appName);
  copySwiftFiles(appName);
  updateXcodeProject(appName);
  console.log('\nAll done. Rebuild with: npx expo run:ios --device');
}

main();
