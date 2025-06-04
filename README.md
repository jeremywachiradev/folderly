# Folderly

A modern file organization app for Android that helps you manage and access your files across different directories.

## Features

### Categories
- Create categories with custom names and colors
- Add multiple directories to each category
- View all files from selected categories in a unified feed
- Toggle category visibility using checkmarks
- Long press to enter selection mode for managing multiple categories
- Edit or delete categories individually or in bulk

### File Management
- View files from all selected categories in a unified feed
- Sort files by date, name, or type (ascending/descending)
- Files are automatically deduplicated if they appear in multiple categories
- Infinite scroll for smooth browsing of large file collections
- Preview files with type-specific icons and details

### User Experience
- Dark/Light mode support
- Modern and intuitive interface
- Smooth animations and transitions
- Efficient file loading with pagination
- Responsive design that adapts to different screen sizes

### Navigation
- Two main tabs: Home and Profile
- Home tab: Manage categories and view files
- Profile tab: User settings and account management

## Category Interaction Modes

### Normal Mode
- Tap a category to view its files in detail
- Tap the checkmark to toggle category visibility in the unified feed
- Files from all checked categories appear in the main feed

### Selection Mode (Long Press)
- Long press a category to enter selection mode
- Selected categories are highlighted with a border
- Options appear at the top for bulk actions:
  - Select All: Select all categories
  - Invert: Invert current selection
  - Delete: Delete selected categories
  - Edit: Edit a single selected category
- Tap Cancel to exit selection mode

## Installation

1. Download from the Play Store (coming soon)
2. Download from GitHub Releases
3. Grant necessary storage permissions
4. Start organizing your files!

## Development

### Environment Setup

1. Clone the repository
2. Install dependencies:
   ```
   yarn install
   ```
3. Create a `.env` file in the project root with the following variables:
   ```
   EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   EXPO_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_APPWRITE_DATABASE_ID=your_database_id
   EXPO_PUBLIC_APPWRITE_USER_CATEGORIES_COLLECTION_ID=your_collection_id
   ```
4. Start the development server:
   ```
   yarn start
   ```

### GitHub Actions

This project uses GitHub Actions for continuous integration and automated builds. To set up GitHub Actions for your fork:

1. Go to your repository's Settings > Secrets and Variables > Actions
2. Add the following repository secrets:
   - `EXPO_TOKEN`: Your Expo access token (get it from https://expo.dev/accounts/[username]/settings/access-tokens)
   - `EXPO_PUBLIC_APPWRITE_ENDPOINT`: Your Appwrite endpoint URL
   - `EXPO_PUBLIC_APPWRITE_PROJECT_ID`: Your Appwrite project ID
   - `EXPO_PUBLIC_APPWRITE_DATABASE_ID`: Your Appwrite database ID
   - `EXPO_PUBLIC_APPWRITE_USER_CATEGORIES_COLLECTION_ID`: Your Appwrite collection ID for user categories

The GitHub Actions workflow will:
1. Run on every push to the main branch
2. Set up the environment with your secrets
3. Build an Android APK using the configured EAS profile
4. Create a new GitHub Release with each successful build

## Requirements

- Android 6.0 (API level 23) or higher
- Storage permissions for accessing files

##Contributing
- Clone the repo and work on a branch of it locally with your changes
- Pull request. I will review it and push it

## Privacy & Security

- All file access is local to your device
- No data is uploaded to external servers
- Permissions are only used for accessing local storage

## Support

For issues, feature requests, or general feedback:
- Open an issue on GitHub
- Contact support at [support email]

## License

[License information] 
