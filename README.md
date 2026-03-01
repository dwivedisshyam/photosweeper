# PhotoSweeper

Minimal Electron app to preview images from a selected folder.

## Features

- **Folder Selection**: Browse and select any folder containing images
- **Lazy-Loaded Thumbnails**: Efficient loading with Intersection Observer—thumbnails load only when visible
- **Image Viewer**: Display selected images with smooth animations
- **Mark for Deletion**: Flag images for batch deletion with visual indicators (red border)
- **Review & Delete**: Review all marked images before permanent deletion
- **Restore Mark for Deletion Images**: Undo deletions directly from the review modal
- **Keyboard Navigation**:
  - **Arrow Right/Left**: Navigate between images
  - **Arrow Up**: Toggle delete flag on current image
- **Delete List Management**: Badge shows count of flagged images
- **Responsive Design**: Works on desktop with intuitive UI controls

## Quick Start

```bash
npm install
npm start
```

## Usage

- Click "Select Folder" and pick a directory containing images
- Thumbnail ribbon loads images lazily as you scroll
- Click a thumbnail to view the full image
- Use the image controls to zoom, rotate, and reset view
- Press the delete/minus button to mark images for deletion
- Review marked images in the modal
- Confirm deletion or restore before closing

Notes:

- This is a lightweight prototype. For production, consider packaging and security hardening.
