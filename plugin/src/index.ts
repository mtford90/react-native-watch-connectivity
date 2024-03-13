import {ConfigPlugin} from '@expo/config-plugins';
import {IosExtensionTarget} from './@types';
import {withXCodeExtensionTargets} from './ios/withXcodeWatchTargetExtension';

const withWatchConfigs: ConfigPlugin<IosExtensionTarget> = (
  config,
  options,
) => {
  return withXCodeExtensionTargets(config, options);
};

export default withWatchConfigs;
