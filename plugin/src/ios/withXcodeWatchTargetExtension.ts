import * as fs from 'fs';
import * as path from 'path';

import {ConfigPlugin, withXcodeProject} from '@expo/config-plugins';

import {IosExtensionTarget} from '../@types';
import {XcodeProject} from 'xcode';
import {getFilesForXcode} from './getFiles';

export const withXCodeExtensionTargets: ConfigPlugin<IosExtensionTarget> = (
  config,
  options: IosExtensionTarget,
) => {
  return withXcodeProject(config, async (newConfig) => {
    try {
      const xcodeProject = newConfig.modResults;
      const projectName = newConfig.modRequest.projectName;
      const projectRoot = newConfig.modRequest.projectRoot;
      const platformProjectPath = newConfig.modRequest.platformProjectRoot;

      await updateXCodeProj(
        xcodeProject,
        projectRoot,
        platformProjectPath,
        options,
        projectName,
      );

      return newConfig;
    } catch (e) {
      console.error(e);
      throw e;
    }
  });
};

async function updateXCodeProj(
  _xcodeProject: XcodeProject,
  projectRoot: string,
  platformProjectPath: string,
  target: IosExtensionTarget,
  projectName?: string,
) {
  addXcodeTarget(
    _xcodeProject,
    projectRoot,
    platformProjectPath,
    target,
    projectName,
  );
}

function addXcodeTarget(
  xcodeProject: XcodeProject,
  projectRoot: string,
  platformProjectPath: string,
  target: IosExtensionTarget,
  projectName?: string,
) {
  const targetSourceDirPath = path.join(projectRoot, target.sourceDir);

  const targetFilesDir = path.join(platformProjectPath, target.name);
  fs.cpSync(targetSourceDirPath, targetFilesDir, {recursive: true});

  const files = getFilesForXcode(targetFilesDir);
  const infoPlistFile = files.resourcesFiles.find((file) =>
    file.includes('Info.plist'),
  );

  files.resourcesFiles = files.resourcesFiles.map((file) =>
    path.join(target.name, file),
  );
  files.sourceFiles = files.sourceFiles.map((file) =>
    path.join(target.name, file),
  );

  const targetFiles = [...files.sourceFiles, ...files.resourcesFiles];

  const pbxGroup = xcodeProject.addPbxGroup(
    targetFiles,
    target.name,
    target.name,
  );

  // fix path because parser is adding a path by default, and we need to remove it
  // this is because in process of pod install react native is resolving all files with suffix `Info.Plist`
  // and internally it's based of PBXFileReference files, and we need to inject path there.
  // example:
  // CE58CC31F8C44FB1AF07D819 /* Watch-Info.plist */ = {isa = PBXFileReference; explicitFileType = undefined; fileEncoding = 4; includeInIndex = 0; lastKnownFileType = text.plist.xml; name = "Watch-Info.plist"; path = "watch/Watch-Info.plist"; sourceTree = "<group>"; };
  // react native will use `path` to resolve the file, and do pod install.
  // now, if we also are having a path to the pbxGroup, xcode will resolve it to the wrong path.
  // so we need to remove it.
  // reference: https://github.com/facebook/react-native/blob/v0.73.2/packages/react-native/scripts/cocoapods/utils.rb#L545
  //
  delete pbxGroup.pbxGroup.path;

  // // Add the new PBXGroup to the top level group. This makes the
  // // files / folder appear in the file explorer in Xcode.
  const groups = xcodeProject.hash.project.objects.PBXGroup;
  Object.keys(groups).forEach(function (groupKey) {
    if (groups[groupKey].name === undefined) {
      // @ts-expect-error type error
      xcodeProject.addToPbxGroup(pbxGroup.uuid, groupKey);
    }
  });

  // WORK AROUND for codeProject.addTarget BUG
  // Xcode projects don't contain these if there is only one target
  // An upstream fix should be made to the code referenced in this link:
  //   - https://github.com/apache/cordova-node-xcode/blob/8b98cabc5978359db88dc9ff2d4c015cba40f150/lib/pbxProject.js#L860
  const projObjects = xcodeProject.hash.project.objects;
  projObjects.PBXTargetDependency = projObjects.PBXTargetDependency || {};
  // @ts-expect-error type error
  projObjects.PBXContainerItemProxy = projObjects.PBXTargetDependency || {};

  // add target
  // use application not watch2_app https://stackoverflow.com/a/75432468
  const targetType = 'application';

  const newTarget = xcodeProject.addTarget(
    target.name,
    targetType,
    target.name,
    // @ts-expect-error typings are showing only 3 args, but the 4th is bundleId, and it works
    target.bundleId,
  );

  // add build phase
  // source files
  xcodeProject.addBuildPhase(
    files.sourceFiles,
    'PBXSourcesBuildPhase',
    'Sources',
    newTarget.uuid,
    targetType,
    target.name,
  );

  // resources
  xcodeProject.addBuildPhase(
    files.resourcesFiles,
    'PBXResourcesBuildPhase',
    'Resources',
    newTarget.uuid,
    targetType,
    target.name,
  );

  // frameworks
  if (target.frameworks) {
    xcodeProject.addBuildPhase(
      target.frameworks,
      'PBXFrameworksBuildPhase',
      'Frameworks',
      newTarget.uuid,
      targetType,
      target.name,
    );
  }

  // // We need to embed the watch app into the main app, this is done automatically for
  // // watchos2 apps, but not for the new regular application coded watch apps
  // // Create CopyFiles phase in first target
  // // Xcode by default is creating a different build phase with name "Embed Watch Content".
  // // Parser doesn't have this build phase, but after some research "Embed Watch Content"
  // // is just a renamed version of "Copy Files" build phase with dstSubfolderSpec set to 16 ("Products Directory").
  // // So we can just create a new "Copy Files" build phase and set dstSubfolderSpec set to 16 later.
  // // more information here: https://stackoverflow.com/questions/45104037/need-to-add-an-embed-watch-content-build-phase-to-my-ios-app
  const watchBuildPhase = xcodeProject.addBuildPhase(
    [quoted(target.name + '.app')],
    'PBXCopyFilesBuildPhase',
    'Embed Watch Content',
    xcodeProject.getFirstTarget().uuid,
    targetType,
    quoted('$(CONTENTS_FOLDER_PATH)/Watch'),
  );

  // // by default xcode PBXCopyFilesBuildPhase have "wrapper" for dstSubfolderSpec, but the correct one for the watch app is "Products Directory"
  // //   # dstSubfolderSpec property value used in a PBXCopyFilesBuildPhase object.
  // // 'BUILT_PRODUCTS_DIR': 16,  # Products Directory
  // //  : 1,                      # Wrapper
  // //  : 6,                      # Executables: 6
  // //  : 7,                      # Resources
  // //  : 15,                     # Java Resources
  // //  : 10,                     # Frameworks
  // //  : 11,                     # Shared Frameworks
  // //  : 12,                     # Shared Support
  // //  : 13,                     # PlugIns
  // // more info here: https://stackoverflow.com/a/16619840
  // @ts-expect-error addBuildPhase below have dstSubfolderSpec.
  watchBuildPhase.buildPhase.dstSubfolderSpec = 16;

  // change order of the "Embed Watch Content" build phase to be higher in the build order
  // this is a new feature/bug ??? introduced in Xcode 15.x.
  // reference: https://forums.developer.apple.com/forums/thread/730974
  const nativeTargetSections = xcodeProject.pbxNativeTargetSection();
  Object.keys(nativeTargetSections).forEach((key) => {
    const nativeTarget = nativeTargetSections[key];
    // find the one which have .name to "projectName"
    if (nativeTarget.name === projectName) {
      const buildPhases = nativeTarget.buildPhases;
      // find the "Embed Watch Content" build phase
      const embedWatchContentIndex = buildPhases.findIndex(
        (buildPhase) => buildPhase.comment === 'Embed Watch Content',
      );
      // remove it from the array
      const embedWatchContent = buildPhases.splice(embedWatchContentIndex, 1);

      // find the "[Expo] Configure project" build phase
      const startPackagerIndex = buildPhases.findIndex(
        (buildPhase) => buildPhase.comment === '[Expo] Configure project',
      );

      // add it to before the "Start Packager" build phase
      buildPhases.splice(startPackagerIndex, 0, embedWatchContent[0]);
    }
  });

  const PRODUCT_BUNDLE_IDENTIFIER = quoted(`${target.bundleId}.watchkitapp`);
  const INFOPLIST_FILE = quoted(`${target.name}/${infoPlistFile}`);
  const buildSettings = {
    INFOPLIST_FILE,
    PRODUCT_BUNDLE_IDENTIFIER,
    ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES: 'YES',
    ASSETCATALOG_COMPILER_APPICON_NAME: 'AppIcon',
    ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: 'AccentColor',
    CLANG_ANALYZER_NONNULL: 'YES',
    CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: 'YES_AGGRESSIVE',
    CLANG_CXX_LANGUAGE_STANDARD: '"gnu++20"',
    CLANG_ENABLE_OBJC_WEAK: 'YES',
    CLANG_WARN_DOCUMENTATION_COMMENTS: 'YES',
    GENERATE_INFOPLIST_FILE: 'YES',
    CLANG_WARN_UNGUARDED_AVAILABILITY: 'YES_AGGRESSIVE',
    CODE_SIGN_STYLE: 'Automatic',
    CURRENT_PROJECT_VERSION: quoted(1),
    DEBUG_INFORMATION_FORMAT: 'dwarf',
    SWIFT_VERSION: '5.0',
    GCC_C_LANGUAGE_STANDARD: 'gnu11',
    LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks"',
    MARKETING_VERSION: quoted(1),
    MTL_ENABLE_DEBUG_INFO: 'INCLUDE_SOURCE',
    MTL_FAST_MATH: 'YES',
    PRODUCT_NAME: '"$(TARGET_NAME)"',
    SWIFT_EMIT_LOC_STRINGS: 'YES',
    // 4 is watchkit App and Watchkit Extension
    TARGETED_DEVICE_FAMILY: 4,
    CLANG_ENABLE_MODULES: 'YES',
    ENABLE_PREVIEWS: 'YES',
    INFOPLIST_KEY_CFBundleDisplayName: quoted(target.displayName),
    INFOPLIST_KEY_UISupportedInterfaceOrientations:
      '"UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown"',
    INFOPLIST_KEY_WKCompanionAppBundleIdentifier: quoted(target.bundleId),
    SDKROOT: 'watchos',
    SKIP_INSTALL: 'YES',
    SWIFT_ACTIVE_COMPILATION_CONDITIONS: 'DEBUG',
    SWIFT_OPTIMIZATION_LEVEL: '"-Onone"',
    WATCHOS_DEPLOYMENT_TARGET: quoted(target.deploymentTarget ?? '7.0'),
  };
  /* Update build configurations */
  const configurations = xcodeProject.pbxXCBuildConfigurationSection();

  for (const key in configurations) {
    if (typeof configurations[key].buildSettings !== 'undefined') {
      const productName = configurations[key].buildSettings.PRODUCT_NAME;
      if (productName === quoted(target.name)) {
        // add the build settings
        configurations[key].buildSettings = {
          ...configurations[key].buildSettings,
          ...buildSettings,
        };
      }
    }
  }
}

function quoted<T>(t: T) {
  return `"${t}"`;
}
