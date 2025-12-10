import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { exiftool } from 'exiftool-vendored';
import { IMAGE_EXTENSIONS, RAW_EXTENSIONS, COMPRESSED_EXTENSIONS } from './constants.js';
import createNewPath from './createNewPath.js';
import padNumber from './padNumber.js';

export async function analyseFolder(folderPath) {
  try {
    // Check if folder exists
    if (!existsSync(folderPath)) {
      throw new Error(`Folder does not exist: ${folderPath}`);
    }

    // Read all files
    const files = readdirSync(folderPath);
    
    // Filter for image files
    const imageFiles = files.filter(file => IMAGE_EXTENSIONS.test(file));

    if (imageFiles.length === 0) {
      return {
        success: false,
        error: 'No image files found in this folder',
        totalFiles: files.length,
        imageFiles: 0
      };
    }

    // Separate RAW and JPEG
    const rawFiles = imageFiles.filter(file => RAW_EXTENSIONS.test(file));
    const jpegFiles = imageFiles.filter(file => COMPRESSED_EXTENSIONS.test(file));

    // Read EXIF from ALL files to get accurate date counts
    const allDates = new Set();
    const datesByFile = new Map();

    for (const fileName of imageFiles) {     
      try {
        const fullPath = join(folderPath, fileName);
        const tags = await exiftool.read(fullPath);
        
        if (tags.DateTimeOriginal) {
          const year = tags.DateTimeOriginal.year;
          const month = padNumber(tags.DateTimeOriginal.month);
          const day = padNumber(tags.DateTimeOriginal.day);
          const fileDate = `${year}_${month}_${day}`;
          
          allDates.add(fileDate);
          datesByFile.set(fileName, fileDate);
        }
      } catch (err) {
        // Skip files with EXIF errors
        console.error(`Could not read EXIF from ${fileName}:`, err.message);
      }
    }

    // Generate preview of operations (first 5 files only)
    const previewOperations = [];
    const filesToPreview = imageFiles.slice(0, 5);
    
    for (const fileName of filesToPreview) {
      const isRaw = RAW_EXTENSIONS.test(fileName);
      const fileDate = datesByFile.get(fileName);
      let newPath = 'Unknown';
      let error = null;

      if (fileDate) {
        try {
          newPath = createNewPath(folderPath, fileDate, fileName);
        } catch (err) {
          error = `Path error: ${err.message}`;
        }
      } else {
        error = 'No EXIF date found';
      }

      previewOperations.push({
        oldName: fileName,
        newPath: newPath,
        date: fileDate,
        type: isRaw ? 'RAW' : 'JPEG',
        error: error
      });
    }

    // Close exiftool
    await exiftool.end();

    // Convert Set to sorted array
    const uniqueDates = Array.from(allDates).sort();

    return {
      success: true,
      totalFiles: files.length,
      imageFiles: imageFiles.length,
      rawFiles: rawFiles.length,
      jpegFiles: jpegFiles.length,
      uniqueDates: uniqueDates,
      filesWithoutExif: imageFiles.length - datesByFile.size,
      previewOperations: previewOperations,
      hasMoreFiles: imageFiles.length > 5
    };

  } catch (error) {
    // Make sure to close exiftool even on error
    try {
      await exiftool.end();
    } catch (e) {
      // Ignore if already closed
    }

    return {
      success: false,
      error: error.message
    };
  }
}
