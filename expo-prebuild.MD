This library is available as a prebuild for Expo apps. To use it, add the following to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      "react-native-watch-connectivity",
      {
        "name": "watch",
        "bundleId": "com.expo.watch.example",
        "displayName": "EAS WATCH",
        "sourceDir": "watch",
        "deploymentTarget": "7.0"
      }
    ]
  }
}
```

Available options are:

- `name` (required) - the name of the watch app
- `bundleId` (required) - the bundle identifier of the companion iOS app (your main app)
- `displayName` (required) - the display name of the watch app
- `sourceDir` (required) - the directory where the watch files are located
- `deploymentTarget` (required) - the deployment target of the watch app

you can see a example integration [here](https://github.com/CristiCeban/watch-example).

Mainly, you will need a new folder with your watch app files.
`watch` folder should contain `Info.plist` (it also could be empty) like that:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
</dict>
</plist>
```

and `Assets.xcassets` folder with `AppIcon.appiconset`. Here you can change the icon for your watch app. (be sure to change it's name also in `Contents.json` file)
Note - icon should be 1024x1024px.

After that, you can run `expo prebuild` and it will generate a `ios/watch` folder with the watch app files.
