# Set the environment variables for the build
$env:EXPO_PUBLIC_APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1"
$env:EXPO_PUBLIC_APPWRITE_PROJECT_ID = "6788eec10030d43b31c1"
$env:EXPO_PUBLIC_APPWRITE_DATABASE_ID = "67b661af00086f1eb426"
$env:EXPO_PUBLIC_APPWRITE_USER_CATEGORIES_COLLECTION_ID = "67b664ee000d9f64506f"

# Check if user is logged in to EAS
Write-Host "Checking EAS login status..."
$easWhoami = eas whoami 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "You're not logged in to EAS. Please login first with: expo login"
    exit 1
}

Write-Host "Building APK locally with the local-android profile..."
# Run the EAS build command for local APK
eas build --platform android --profile local-android --local

Write-Host "Build completed. Check the output directory for your APK file." 