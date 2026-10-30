const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withAppBlocker(config) {
  // Step 1: Modify AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    // Add permissions
    if (!manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.QUERY_ALL_PACKAGES',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.PACKAGE_USAGE_STATS',
    ];

    for (const perm of permissions) {
      const exists = manifest.manifest['uses-permission'].some(
        (p) => p.$['android:name'] === perm
      );
      if (!exists) {
        manifest.manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    }

    // Add AccessibilityService declaration
    if (!application.service) {
      application.service = [];
    }

    const serviceExists = application.service.some(
      (s) => s.$['android:name'] === '.blocker.AppBlockerService'
    );

    if (!serviceExists) {
      application.service.push({
        $: {
          'android:name': '.blocker.AppBlockerService',
          'android:label': 'FocusForge App Blocker',
          'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name':
                    'android.accessibilityservice.AccessibilityService',
                },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.accessibilityservice',
              'android:resource': '@xml/accessibility_service_config',
            },
          },
        ],
      });
    }

    // Add AppMonitorService (foreground service)
    const monitorServiceExists = application.service.some(
      (s) => s.$['android:name'] === '.blocker.AppMonitorService'
    );

    if (!monitorServiceExists) {
      application.service.push({
        $: {
          'android:name': '.blocker.AppMonitorService',
          'android:exported': 'false',
          'android:foregroundServiceType': 'specialUse',
        },
      });
    }

    // Add BlockOverlayActivity declaration
    if (!application.activity) {
      application.activity = [];
    }

    const activityExists = application.activity.some(
      (a) => a.$['android:name'] === '.blocker.BlockOverlayActivity'
    );

    if (!activityExists) {
      application.activity.push({
        $: {
          'android:name': '.blocker.BlockOverlayActivity',
          'android:theme': '@android:style/Theme.NoTitleBar.Fullscreen',
          'android:excludeFromRecents': 'true',
          'android:exported': 'false',
        },
      });
    }

    return config;
  });

  // Step 2: Copy Java source files and XML resources into the android project
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidDir = path.join(projectRoot, 'android');
      const packageName = config.android?.package || 'org.focusforge.app';
      const packagePath = packageName.replace(/\./g, '/');

      // Source directories
      const moduleSrcDir = path.join(
        projectRoot,
        'modules',
        'app-blocker',
        'android',
        'src'
      );
      const moduleResDir = path.join(
        projectRoot,
        'modules',
        'app-blocker',
        'android',
        'res'
      );

      // Target directories
      const targetJavaDir = path.join(
        androidDir,
        'app',
        'src',
        'main',
        'java',
        packagePath,
        'blocker'
      );
      const targetResDir = path.join(
        androidDir,
        'app',
        'src',
        'main',
        'res'
      );

      // Create target directories
      fs.mkdirSync(targetJavaDir, { recursive: true });

      // Copy Java files with correct package name
      const javaFiles = [
        'AppBlockerService.java',
        'AppBlockerModule.java',
        'AppBlockerPackage.java',
        'BlockOverlayActivity.java',
        'AppMonitorService.java',
      ];

      for (const file of javaFiles) {
        const srcFile = path.join(moduleSrcDir, file);
        if (fs.existsSync(srcFile)) {
          let content = fs.readFileSync(srcFile, 'utf8');
          // Replace package name if it differs from the default
          content = content.replace(
            /package org\.focusforge\.app\.blocker;/g,
            `package ${packageName}.blocker;`
          );
          fs.writeFileSync(path.join(targetJavaDir, file), content, 'utf8');
        }
      }

      // Copy XML resources
      const xmlSrcDir = path.join(moduleResDir, 'xml');
      const xmlTargetDir = path.join(targetResDir, 'xml');
      fs.mkdirSync(xmlTargetDir, { recursive: true });

      if (fs.existsSync(path.join(xmlSrcDir, 'accessibility_service_config.xml'))) {
        fs.copyFileSync(
          path.join(xmlSrcDir, 'accessibility_service_config.xml'),
          path.join(xmlTargetDir, 'accessibility_service_config.xml')
        );
      }

      // Copy string resources
      const valuesSrcDir = path.join(moduleResDir, 'values');
      const valuesTargetDir = path.join(targetResDir, 'values');
      fs.mkdirSync(valuesTargetDir, { recursive: true });

      if (fs.existsSync(path.join(valuesSrcDir, 'blocker_strings.xml'))) {
        fs.copyFileSync(
          path.join(valuesSrcDir, 'blocker_strings.xml'),
          path.join(valuesTargetDir, 'blocker_strings.xml')
        );
      }

      return config;
    },
  ]);

  // Step 3: Register the AppBlockerPackage in MainApplication
  config = withMainApplication(config, (config) => {
    let contents = config.modResults.contents;
    const language = config.modResults.language;
    const packageName = config.android?.package || 'org.focusforge.app';

    if (language === 'kt' || language === 'kotlin') {
      // Kotlin MainApplication
      const importStatement = `import ${packageName}.blocker.AppBlockerPackage`;
      if (!contents.includes(importStatement)) {
        // Add import after the last import line
        const lastImportIndex = contents.lastIndexOf('import ');
        const endOfLastImport = contents.indexOf('\n', lastImportIndex);
        contents =
          contents.slice(0, endOfLastImport + 1) +
          importStatement +
          '\n' +
          contents.slice(endOfLastImport + 1);
      }

      // Add package to getPackages()
      if (!contents.includes('AppBlockerPackage()')) {
        contents = contents.replace(
          /packages\.apply\s*\{/,
          'packages.apply {\n          add(AppBlockerPackage())'
        );
      }
    } else {
      // Java MainApplication
      const importStatement = `import ${packageName}.blocker.AppBlockerPackage;`;
      if (!contents.includes(importStatement)) {
        const lastImportIndex = contents.lastIndexOf('import ');
        const endOfLastImport = contents.indexOf('\n', lastImportIndex);
        contents =
          contents.slice(0, endOfLastImport + 1) +
          importStatement +
          '\n' +
          contents.slice(endOfLastImport + 1);
      }

      // Add package to getPackages()
      if (!contents.includes('new AppBlockerPackage()')) {
        contents = contents.replace(
          /packages\.add\(/,
          'packages.add(new AppBlockerPackage());\n          packages.add('
        );

        // Alternative pattern if the above doesn't match
        if (!contents.includes('new AppBlockerPackage()')) {
          contents = contents.replace(
            /return packages;/,
            'packages.add(new AppBlockerPackage());\n          return packages;'
          );
        }
      }
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
}

module.exports = withAppBlocker;
