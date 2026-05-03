const { withGradleProperties } = require('@expo/config-plugins');

const withArm64Only = (config) =>
  withGradleProperties(config, (props) => {
    props.modResults = props.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'reactNativeArchitectures')
    );
    props.modResults.push({ type: 'property', key: 'reactNativeArchitectures', value: 'arm64-v8a' });
    return props;
  });

module.exports = withArm64Only({
  expo: {
    name: "BookMyFit",
    slug: "bookmyfit",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "bookmyfit",
    userInterfaceStyle: "dark",
    splash: {
      backgroundColor: "#0a0f0a",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "in.bookmyfit.app",
    },
    android: {
      package: "in.bookmyfit.app",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
      ],
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-secure-store",
      [
        "expo-camera",
        {
          cameraPermission:
            "BookMyFit needs camera access to scan member QR codes at check-in.",
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow BookMyFit to use your location to find nearby gyms.",
        },
      ],
    ],
    extra: {
      cashfreeBaseUrl: "https://sandbox.cashfree.com",
      apiUrl: "https://bookmyfit.in",
      // To point to a local server during development, uncomment below and comment the line above:
      // apiUrl: "http://192.168.1.4:3003",
      router: {},
      eas: {
        projectId: "deab094a-848d-483d-9e83-d7f69adac2da",
      },
    },
    owner: "qwegle",
  },
});
