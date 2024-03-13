# React Native Watch Connectivity

Communicate with your Apple Watch apps over the React Native bridge.

**Note:** This library does not allow you to write your Apple Watch apps in React Native but rather allows your RN iOS app to communicate with a watch app written in Obj-C/Swift. If you want to build a Wear OS app using react-native refer to [react-native-wear-connectivity](https://github.com/fabOnReact/react-native-wear-connectivity).

<img height=600 src="https://github.com/mtford90/react-native-watch-connectivity/blob/06001bb1d15bcdb9607c35d75c7c7ab463c71e86/assets/screenshot.png?raw=true"/>

## Documentation

http://mtford.co.uk/react-native-watch-connectivity/

## Demo

The featured screenshot is from the [example app](https://github.com/mtford90/react-native-watch-connectivity/tree/master/example). To run the example:

```
git clone https://github.com/mtford90/react-native-watch-connectivity.git
cd react-native-watch-connectivity/example
yarn install
cd ios
pod install
cd ..
yarn ios # Run app
open ios/RNWatchExample.xcworkspace # Run watch app from Xcode
```

## Install

```bash
npm install react-native-watch-connectivity --save
# or
yarn add react-native-watch-connectivity
```

### Link

Note: this library now supports autolinking for RN 0.60+.

For RN <0.60 link via:

```bash
react-native link
```

Or else add the xcodeproj or .h/.m files directly to your project via XCode

#### Manual Linking

Or you can link the library manually by adding `node_modules/react-native-watch-connectivity/ios/RNWatch.xcodeproj` to your project and ensuring that `libRNWatch.a` is present in the **Link Binary With Libraries** build phase.

Alternatively, if you're using CocoaPods, you can add the following to your Podfile:

```
pod 'RNWatch', :path => '../node_modules/react-native-watch-connectivity'
```

and run `pod install`.

### Expo Support

This library has been successfully used in Expo apps (Bare Workflow with EAS Build).

## Generating watch target in expo prebuild

This library is available as a [prebuild](https://docs.expo.dev/workflow/prebuild/) for Expo apps. It will automatically generate a watch target for you. For more information about integration, see [expo-prebuild.MD](expo-prebuild.MD).
