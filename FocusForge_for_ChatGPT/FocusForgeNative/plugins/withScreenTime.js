/**
 * withScreenTime — Expo config plugin
 *
 * Wires up the iOS Screen Time / Family Controls native module into the
 * generated Xcode project when `expo prebuild` runs. Does NOT touch Android.
 *
 * Steps performed:
 *   1. Adds `com.apple.developer.family-controls` to the app entitlements.
 *   2. Copies ScreenTimeModule.swift + ScreenTimeModuleBridge.m from
 *      modules/screen-time/swift/ into ios/<AppName>/.
 *   3. Registers those files with the app's Xcode target and links the
 *      FamilyControls / ManagedSettings / DeviceActivity frameworks.
 *   4. Copies and registers ShieldConfiguration and ShieldAction extensions.
 */

const {
  withEntitlementsPlist,
  withXcodeProject,
  withDangerousMod,
} = require('@expo/config-plugins');
const IOS_MIN_DEPLOYMENT_TARGET = '16.0';
const fs = require('fs');
const path = require('path');

const SWIFT_FILE = 'ScreenTimeModule.swift';
const BRIDGE_FILE = 'ScreenTimeModuleBridge.m';
const FRAMEWORKS = ['FamilyControls', 'ManagedSettings', 'DeviceActivity'];
const EXTENSION_FRAMEWORKS = ['ManagedSettings', 'ManagedSettingsUI'];
const MONITOR_FRAMEWORKS = ['ManagedSettings', 'DeviceActivity', 'FamilyControls'];
const APP_GROUP = 'group.org.focusforge.app';

function withScreenTime(config) {
  // 1. Entitlement (family-controls + shared App Group for extension IPC)
  config = withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.family-controls'] = true;
    const groups = cfg.modResults['com.apple.security.application-groups'] || [];
    if (!groups.includes(APP_GROUP)) groups.push(APP_GROUP);
    cfg.modResults['com.apple.security.application-groups'] = groups;
    return cfg;
  });

  // 2. Copy source files into ios/<AppName>/ AND copy extension folders
  config = withDangerousMod(config, [
    'ios',
    (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const appName = getIosAppName(platformRoot);
      const targetDir = path.join(platformRoot, appName);
      const srcDir = path.join(projectRoot, 'modules', 'screen-time', 'swift');
      const extSrcDir = path.join(projectRoot, 'modules', 'screen-time', 'extensions');

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Copy main module files
      for (const file of [SWIFT_FILE, BRIDGE_FILE]) {
        const from = path.join(srcDir, file);
        if (fs.existsSync(from)) {
          fs.copyFileSync(from, path.join(targetDir, file));
        }
      }

      // Copy ShieldConfiguration extension folder
      const shieldConfigSrc = path.join(extSrcDir, 'ShieldConfiguration');
      const shieldConfigDst = path.join(platformRoot, 'ShieldConfiguration');
      if (fs.existsSync(shieldConfigSrc)) {
        copyFolderSync(shieldConfigSrc, shieldConfigDst);
      }

      // Copy ShieldAction extension folder
      const shieldActionSrc = path.join(extSrcDir, 'ShieldAction');
      const shieldActionDst = path.join(platformRoot, 'ShieldAction');
      if (fs.existsSync(shieldActionSrc)) {
        copyFolderSync(shieldActionSrc, shieldActionDst);
      }

      // Copy DeviceActivityMonitor extension folder
      const monitorSrc = path.join(extSrcDir, 'DeviceActivityMonitor');
      const monitorDst = path.join(platformRoot, 'DeviceActivityMonitor');
      if (fs.existsSync(monitorSrc)) {
        copyFolderSync(monitorSrc, monitorDst);
      }

      return cfg;
    },
  ]);

  // 3. Register files + frameworks in the Xcode project AND add extensions
  config = withXcodeProject(config, (cfg) => {
    const proj = cfg.modResults;
    const platformRoot = cfg.modRequest.platformProjectRoot;
    const appName = getIosAppName(platformRoot);
    const bundleId = cfg.ios?.bundleIdentifier || 'org.focusforge.app';

    addSourceFileToTarget(proj, appName, SWIFT_FILE);
    addSourceFileToTarget(proj, appName, BRIDGE_FILE);

    for (const fw of FRAMEWORKS) {
      addFrameworkIfMissing(proj, `${fw}.framework`);
    }

    bumpDeploymentTarget(proj, IOS_MIN_DEPLOYMENT_TARGET);

    // Add ShieldConfiguration extension target
    addExtensionTarget(proj, 'ShieldConfiguration', `${bundleId}.ShieldConfiguration`, platformRoot, EXTENSION_FRAMEWORKS);
    
    // Add ShieldAction extension target
    addExtensionTarget(proj, 'ShieldAction', `${bundleId}.ShieldAction`, platformRoot, EXTENSION_FRAMEWORKS);

    // Add DeviceActivityMonitor extension target (background re-blocking)
    addExtensionTarget(proj, 'DeviceActivityMonitor', `${bundleId}.DeviceActivityMonitor`, platformRoot, MONITOR_FRAMEWORKS);

    return cfg;
  });

  // 4. Ensure Podfile.properties.json enforces the min iOS target too
  config = withDangerousMod(config, [
    'ios',
    (cfg) => {
      const propsPath = path.join(
        cfg.modRequest.platformProjectRoot,
        'Podfile.properties.json'
      );
      let props = {};
      if (fs.existsSync(propsPath)) {
        try { props = JSON.parse(fs.readFileSync(propsPath, 'utf8')); } catch {}
      }
      const current = props['ios.deploymentTarget'];
      if (!current || compareVersion(current, IOS_MIN_DEPLOYMENT_TARGET) < 0) {
        props['ios.deploymentTarget'] = IOS_MIN_DEPLOYMENT_TARGET;
        fs.writeFileSync(propsPath, JSON.stringify(props, null, 2) + '\n');
      }
      return cfg;
    },
  ]);

  return config;
}

function copyFolderSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function addExtensionTarget(proj, extName, bundleId, platformRoot, frameworks = EXTENSION_FRAMEWORKS) {
  const extPath = path.join(platformRoot, extName);
  if (!fs.existsSync(extPath)) {
    console.warn(`[withScreenTime] Extension folder not found: ${extPath}`);
    return;
  }

  // Check if target already exists
  const targets = proj.pbxNativeTargetSection();
  for (const key of Object.keys(targets)) {
    if (key.endsWith('_comment')) continue;
    const target = targets[key];
    if (target && typeof target === 'object') {
      const name = (target.name || '').replace(/"/g, '');
      if (name === extName) {
        console.log(`[withScreenTime] Target ${extName} already exists, skipping`);
        return;
      }
    }
  }

  // Add the extension target
  const targetUuid = proj.generateUuid();
  const buildConfigListUuid = proj.generateUuid();
  const debugConfigUuid = proj.generateUuid();
  const releaseConfigUuid = proj.generateUuid();
  const sourcesBuildPhaseUuid = proj.generateUuid();
  const frameworksBuildPhaseUuid = proj.generateUuid();
  const resourcesBuildPhaseUuid = proj.generateUuid();
  const productRefUuid = proj.generateUuid();
  const groupUuid = proj.generateUuid();
  const containerItemProxyUuid = proj.generateUuid();
  const targetDependencyUuid = proj.generateUuid();
  const copyFilesBuildPhaseUuid = proj.generateUuid();

  // Find the main target to add dependency
  const mainTargetKey = findTargetKey(proj, getIosAppName(platformRoot));

  // Create PBXGroup for extension files
  const extFiles = fs.readdirSync(extPath).filter(f => !f.startsWith('.'));
  const fileRefs = [];
  
  for (const file of extFiles) {
    const fileRefUuid = proj.generateUuid();
    const filePath = `${extName}/${file}`;
    let fileType = 'text';
    let lastKnownFileType = 'text';
    
    if (file.endsWith('.swift')) {
      lastKnownFileType = 'sourcecode.swift';
    } else if (file.endsWith('.plist')) {
      lastKnownFileType = 'text.plist.xml';
    } else if (file.endsWith('.entitlements')) {
      lastKnownFileType = 'text.plist.entitlements';
    }

    // Add file reference
    proj.hash.project.objects.PBXFileReference[fileRefUuid] = {
      isa: 'PBXFileReference',
      lastKnownFileType: lastKnownFileType,
      path: file,
      sourceTree: '"<group>"',
    };
    proj.hash.project.objects.PBXFileReference[`${fileRefUuid}_comment`] = file;
    
    fileRefs.push({ value: fileRefUuid, comment: file });
  }

  // Create PBXGroup
  proj.hash.project.objects.PBXGroup[groupUuid] = {
    isa: 'PBXGroup',
    children: fileRefs,
    path: extName,
    sourceTree: '"<group>"',
  };
  proj.hash.project.objects.PBXGroup[`${groupUuid}_comment`] = extName;

  // Add group to main group
  const mainGroupKey = proj.getFirstProject().firstProject.mainGroup;
  const mainGroup = proj.hash.project.objects.PBXGroup[mainGroupKey];
  if (mainGroup && mainGroup.children) {
    mainGroup.children.push({ value: groupUuid, comment: extName });
  }

  // Create build phases
  const swiftFileRefs = fileRefs.filter(f => f.comment.endsWith('.swift'));
  const sourcesFiles = swiftFileRefs.map(f => {
    const buildFileUuid = proj.generateUuid();
    proj.hash.project.objects.PBXBuildFile[buildFileUuid] = {
      isa: 'PBXBuildFile',
      fileRef: f.value,
      fileRef_comment: f.comment,
    };
    proj.hash.project.objects.PBXBuildFile[`${buildFileUuid}_comment`] = `${f.comment} in Sources`;
    return { value: buildFileUuid, comment: `${f.comment} in Sources` };
  });

  proj.hash.project.objects.PBXSourcesBuildPhase[sourcesBuildPhaseUuid] = {
    isa: 'PBXSourcesBuildPhase',
    buildActionMask: 2147483647,
    files: sourcesFiles,
    runOnlyForDeploymentPostprocessing: 0,
  };
  proj.hash.project.objects.PBXSourcesBuildPhase[`${sourcesBuildPhaseUuid}_comment`] = 'Sources';

  // Frameworks build phase
  const frameworkFiles = [];
  for (const fw of frameworks) {
    const fwFileUuid = proj.generateUuid();
    const fwRefUuid = proj.generateUuid();
    
    proj.hash.project.objects.PBXFileReference[fwRefUuid] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'wrapper.framework',
      name: `${fw}.framework`,
      path: `System/Library/Frameworks/${fw}.framework`,
      sourceTree: 'SDKROOT',
    };
    proj.hash.project.objects.PBXFileReference[`${fwRefUuid}_comment`] = `${fw}.framework`;
    
    proj.hash.project.objects.PBXBuildFile[fwFileUuid] = {
      isa: 'PBXBuildFile',
      fileRef: fwRefUuid,
      fileRef_comment: `${fw}.framework`,
    };
    proj.hash.project.objects.PBXBuildFile[`${fwFileUuid}_comment`] = `${fw}.framework in Frameworks`;
    
    frameworkFiles.push({ value: fwFileUuid, comment: `${fw}.framework in Frameworks` });
  }

  proj.hash.project.objects.PBXFrameworksBuildPhase[frameworksBuildPhaseUuid] = {
    isa: 'PBXFrameworksBuildPhase',
    buildActionMask: 2147483647,
    files: frameworkFiles,
    runOnlyForDeploymentPostprocessing: 0,
  };
  proj.hash.project.objects.PBXFrameworksBuildPhase[`${frameworksBuildPhaseUuid}_comment`] = 'Frameworks';

  // Resources build phase (empty for now)
  proj.hash.project.objects.PBXResourcesBuildPhase = proj.hash.project.objects.PBXResourcesBuildPhase || {};
  proj.hash.project.objects.PBXResourcesBuildPhase[resourcesBuildPhaseUuid] = {
    isa: 'PBXResourcesBuildPhase',
    buildActionMask: 2147483647,
    files: [],
    runOnlyForDeploymentPostprocessing: 0,
  };
  proj.hash.project.objects.PBXResourcesBuildPhase[`${resourcesBuildPhaseUuid}_comment`] = 'Resources';

  // Product reference
  proj.hash.project.objects.PBXFileReference[productRefUuid] = {
    isa: 'PBXFileReference',
    explicitFileType: '"wrapper.app-extension"',
    includeInIndex: 0,
    path: `${extName}.appex`,
    sourceTree: 'BUILT_PRODUCTS_DIR',
  };
  proj.hash.project.objects.PBXFileReference[`${productRefUuid}_comment`] = `${extName}.appex`;

  // Add to Products group
  const productsGroupKey = findGroupKeyByName(proj, 'Products');
  if (productsGroupKey) {
    const productsGroup = proj.hash.project.objects.PBXGroup[productsGroupKey];
    if (productsGroup && productsGroup.children) {
      productsGroup.children.push({ value: productRefUuid, comment: `${extName}.appex` });
    }
  }

  // Build configurations
  const commonBuildSettings = {
    CLANG_ENABLE_MODULES: 'YES',
    CODE_SIGN_STYLE: 'Automatic',
    CURRENT_PROJECT_VERSION: 1,
    DEVELOPMENT_TEAM: 'XKQ2SMQBHH',
    GENERATE_INFOPLIST_FILE: 'NO',
    INFOPLIST_FILE: `${extName}/Info.plist`,
    IPHONEOS_DEPLOYMENT_TARGET: IOS_MIN_DEPLOYMENT_TARGET,
    LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
    MARKETING_VERSION: '1.0',
    PRODUCT_BUNDLE_IDENTIFIER: `"${bundleId}"`,
    PRODUCT_NAME: `"$(TARGET_NAME)"`,
    SKIP_INSTALL: 'YES',
    SWIFT_EMIT_LOC_STRINGS: 'YES',
    SWIFT_VERSION: '5.0',
    TARGETED_DEVICE_FAMILY: '"1,2"',
    CODE_SIGN_ENTITLEMENTS: `${extName}/${extName}.entitlements`,
  };

  proj.hash.project.objects.XCBuildConfiguration[debugConfigUuid] = {
    isa: 'XCBuildConfiguration',
    buildSettings: { ...commonBuildSettings, DEBUG_INFORMATION_FORMAT: '"dwarf-with-dsym"' },
    name: 'Debug',
  };
  proj.hash.project.objects.XCBuildConfiguration[`${debugConfigUuid}_comment`] = 'Debug';

  proj.hash.project.objects.XCBuildConfiguration[releaseConfigUuid] = {
    isa: 'XCBuildConfiguration',
    buildSettings: { ...commonBuildSettings, DEBUG_INFORMATION_FORMAT: '"dwarf-with-dsym"' },
    name: 'Release',
  };
  proj.hash.project.objects.XCBuildConfiguration[`${releaseConfigUuid}_comment`] = 'Release';

  // Build configuration list
  proj.hash.project.objects.XCConfigurationList[buildConfigListUuid] = {
    isa: 'XCConfigurationList',
    buildConfigurations: [
      { value: debugConfigUuid, comment: 'Debug' },
      { value: releaseConfigUuid, comment: 'Release' },
    ],
    defaultConfigurationIsVisible: 0,
    defaultConfigurationName: 'Release',
  };
  proj.hash.project.objects.XCConfigurationList[`${buildConfigListUuid}_comment`] = `Build configuration list for PBXNativeTarget "${extName}"`;

  // Native target
  proj.hash.project.objects.PBXNativeTarget[targetUuid] = {
    isa: 'PBXNativeTarget',
    buildConfigurationList: buildConfigListUuid,
    buildConfigurationList_comment: `Build configuration list for PBXNativeTarget "${extName}"`,
    buildPhases: [
      { value: sourcesBuildPhaseUuid, comment: 'Sources' },
      { value: frameworksBuildPhaseUuid, comment: 'Frameworks' },
      { value: resourcesBuildPhaseUuid, comment: 'Resources' },
    ],
    buildRules: [],
    dependencies: [],
    name: `"${extName}"`,
    productName: `"${extName}"`,
    productReference: productRefUuid,
    productReference_comment: `${extName}.appex`,
    productType: '"com.apple.product-type.app-extension"',
  };
  proj.hash.project.objects.PBXNativeTarget[`${targetUuid}_comment`] = extName;

  // Add target to project
  const projectSection = proj.hash.project.objects.PBXProject;
  for (const key of Object.keys(projectSection)) {
    if (key.endsWith('_comment')) continue;
    const project = projectSection[key];
    if (project && project.targets) {
      project.targets.push({ value: targetUuid, comment: extName });
    }
  }

  // Add target dependency to main app
  if (mainTargetKey) {
    // Container item proxy
    proj.hash.project.objects.PBXContainerItemProxy = proj.hash.project.objects.PBXContainerItemProxy || {};
    proj.hash.project.objects.PBXContainerItemProxy[containerItemProxyUuid] = {
      isa: 'PBXContainerItemProxy',
      containerPortal: proj.getFirstProject().uuid,
      containerPortal_comment: 'Project object',
      proxyType: 1,
      remoteGlobalIDString: targetUuid,
      remoteInfo: `"${extName}"`,
    };
    proj.hash.project.objects.PBXContainerItemProxy[`${containerItemProxyUuid}_comment`] = 'PBXContainerItemProxy';

    // Target dependency
    proj.hash.project.objects.PBXTargetDependency = proj.hash.project.objects.PBXTargetDependency || {};
    proj.hash.project.objects.PBXTargetDependency[targetDependencyUuid] = {
      isa: 'PBXTargetDependency',
      target: targetUuid,
      target_comment: extName,
      targetProxy: containerItemProxyUuid,
      targetProxy_comment: 'PBXContainerItemProxy',
    };
    proj.hash.project.objects.PBXTargetDependency[`${targetDependencyUuid}_comment`] = 'PBXTargetDependency';

    // Add dependency to main target
    const mainTarget = proj.hash.project.objects.PBXNativeTarget[mainTargetKey];
    if (mainTarget) {
      mainTarget.dependencies = mainTarget.dependencies || [];
      mainTarget.dependencies.push({ value: targetDependencyUuid, comment: 'PBXTargetDependency' });
    }

    // Add copy files build phase to embed extension
    proj.hash.project.objects.PBXCopyFilesBuildPhase = proj.hash.project.objects.PBXCopyFilesBuildPhase || {};
    
    // Check if embed extensions phase exists
    let embedPhaseKey = null;
    for (const key of Object.keys(proj.hash.project.objects.PBXCopyFilesBuildPhase)) {
      if (key.endsWith('_comment')) continue;
      const phase = proj.hash.project.objects.PBXCopyFilesBuildPhase[key];
      if (phase && phase.name === '"Embed Foundation Extensions"') {
        embedPhaseKey = key;
        break;
      }
    }

    const embedBuildFileUuid = proj.generateUuid();
    proj.hash.project.objects.PBXBuildFile[embedBuildFileUuid] = {
      isa: 'PBXBuildFile',
      fileRef: productRefUuid,
      fileRef_comment: `${extName}.appex`,
      settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
    };
    proj.hash.project.objects.PBXBuildFile[`${embedBuildFileUuid}_comment`] = `${extName}.appex in Embed Foundation Extensions`;

    if (!embedPhaseKey) {
      embedPhaseKey = proj.generateUuid();
      proj.hash.project.objects.PBXCopyFilesBuildPhase[embedPhaseKey] = {
        isa: 'PBXCopyFilesBuildPhase',
        buildActionMask: 2147483647,
        dstPath: '""',
        dstSubfolderSpec: 13,
        files: [{ value: embedBuildFileUuid, comment: `${extName}.appex in Embed Foundation Extensions` }],
        name: '"Embed Foundation Extensions"',
        runOnlyForDeploymentPostprocessing: 0,
      };
      proj.hash.project.objects.PBXCopyFilesBuildPhase[`${embedPhaseKey}_comment`] = 'Embed Foundation Extensions';

      // Add to main target build phases
      if (mainTarget && mainTarget.buildPhases) {
        mainTarget.buildPhases.push({ value: embedPhaseKey, comment: 'Embed Foundation Extensions' });
      }
    } else {
      // Add to existing embed phase
      const embedPhase = proj.hash.project.objects.PBXCopyFilesBuildPhase[embedPhaseKey];
      if (embedPhase && embedPhase.files) {
        embedPhase.files.push({ value: embedBuildFileUuid, comment: `${extName}.appex in Embed Foundation Extensions` });
      }
    }
  }

  console.log(`[withScreenTime] Added extension target: ${extName}`);
}

function compareVersion(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function bumpDeploymentTarget(proj, minTarget) {
  const configs = proj.pbxXCBuildConfigurationSection();
  for (const key of Object.keys(configs)) {
    if (key.endsWith('_comment')) continue;
    const entry = configs[key];
    if (!entry || typeof entry !== 'object') continue;
    const settings = entry.buildSettings;
    if (!settings) continue;
    const current = settings.IPHONEOS_DEPLOYMENT_TARGET;
    if (!current || compareVersion(String(current), minTarget) < 0) {
      settings.IPHONEOS_DEPLOYMENT_TARGET = minTarget;
    }
  }
}

// --- helpers ---

function getIosAppName(platformRoot) {
  // Find the first xcodeproj folder (e.g. FocusForge.xcodeproj -> FocusForge)
  const entries = fs.readdirSync(platformRoot);
  const xcodeproj = entries.find((e) => e.endsWith('.xcodeproj'));
  if (!xcodeproj) {
    throw new Error('withScreenTime: could not find *.xcodeproj in ' + platformRoot);
  }
  return xcodeproj.replace(/\.xcodeproj$/, '');
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
    const group = groups[key];
    if (!group || typeof group !== 'object') continue;
    const groupName = (group.name || group.path || '').replace(/"/g, '');
    if (groupName === name) return key;
  }
  return null;
}

function isFileInTarget(proj, targetKey, fileName) {
  const target = proj.pbxNativeTargetSection()[targetKey];
  if (!target || !target.buildPhases) return false;
  const sources = proj.pbxSourcesBuildPhaseObj(targetKey);
  if (!sources || !sources.files) return false;
  return sources.files.some((f) => (f.comment || '').includes(fileName));
}

function addSourceFileToTarget(proj, appName, fileName) {
  const targetKey = findTargetKey(proj, appName);
  if (!targetKey) {
    throw new Error(`withScreenTime: target ${appName} not found`);
  }

  if (isFileInTarget(proj, targetKey, fileName)) {
    return; // already added
  }

  const groupKey = findGroupKeyByName(proj, appName);
  if (!groupKey) {
    throw new Error(`withScreenTime: group ${appName} not found`);
  }

  proj.addSourceFile(
    path.join(appName, fileName),
    { target: targetKey },
    groupKey
  );
}

function addFrameworkIfMissing(proj, fwFile) {
  const frameworksSection = proj.pbxFrameworksBuildPhaseObj(
    proj.getFirstTarget().uuid
  );
  if (
    frameworksSection &&
    frameworksSection.files &&
    frameworksSection.files.some((f) => (f.comment || '').includes(fwFile))
  ) {
    return;
  }
  proj.addFramework(fwFile, { target: proj.getFirstTarget().uuid });
}

module.exports = withScreenTime;
