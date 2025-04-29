# Set the environment variables for the build
$env:EXPO_PUBLIC_APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1"
$env:EXPO_PUBLIC_APPWRITE_PROJECT_ID = "6788eec10030d43b31c1"
$env:EXPO_PUBLIC_APPWRITE_DATABASE_ID = "67b661af00086f1eb426"
$env:EXPO_PUBLIC_APPWRITE_USER_CATEGORIES_COLLECTION_ID = "67b664ee000d9f64506f"

# Run the EAS build command for APK
eas build --platform android --profile android-apk-obb --non-interactive

Write-Host "Build command submitted. You can check the build status on the Expo dashboard."
Write-Host "Ensure you're logged in to your Expo account (expo login) before running this script." 