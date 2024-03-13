import * as fs from 'fs';

export type WidgetFiles = {
  resourcesFiles: string[];
  sourceFiles: string[];
};

// TODO: check if need more extensions here???
const resourceFileExtensions = ['png', 'jpg', 'jpeg', 'plist', 'xcassets'];

const isResourceFile = (fileExtension?: string) => {
  if (!fileExtension) {
    return false;
  }
  return resourceFileExtensions.includes(fileExtension);
};

export function getFilesForXcode(filesPath: string): WidgetFiles {
  const widgetFiles: WidgetFiles = {
    resourcesFiles: [],
    sourceFiles: [],
  };

  if (fs.lstatSync(filesPath).isDirectory()) {
    const files = fs.readdirSync(filesPath);

    files.forEach((file) => {
      const fileExtension = file.split('.').pop();
      if (isResourceFile(fileExtension)) {
        widgetFiles.resourcesFiles.push(file);
      } else {
        widgetFiles.sourceFiles.push(file);
      }
    });
  }

  const allFiles = [...widgetFiles.resourcesFiles, ...widgetFiles.sourceFiles];

  if (!allFiles.find((file) => file.includes('Info.plist'))) {
    console.warn(
      'Info.plist file is required for the watch, please add it to the folder declared as `sourceDir` in `app.json`',
    );
  }

  if (!allFiles.find((file) => file.includes('Assets.xcassets'))) {
    console.warn(
      'Assets.xcassets file is required for the watch, please add it to the folder declared as `sourceDir` in `app.json`',
    );
  }

  return widgetFiles;
}
