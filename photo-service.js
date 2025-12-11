import { readdirSync, existsSync, mkdirSync, renameSync } from 'fs';
import { join } from 'path';
import { exiftool } from 'exiftool-vendored';
import { IMAGE_EXTENSIONS, RAW_EXTENSIONS, COMPRESSED_EXTENSIONS } from './constants.js';
import createNewPath from './createNewPath.js';
import padNumber from './padNumber.js';

export async function analyzeFolder(folderPath) {
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
    return {
      success: false,
      error: error.message
    };
  }
}

export async function organizePhotos(folderPath) {
  try {
    console.log('Starting organisation for:', folderPath);
    
    // Check if folder exists
    if (!existsSync(folderPath)) {
      throw new Error(`Folder does not exist: ${folderPath}`);
    }

    // Read all files
    const files = readdirSync(folderPath);
    const imageFiles = files.filter(file => IMAGE_EXTENSIONS.test(file));

    console.log('Found image files:', imageFiles.length);

    if (imageFiles.length === 0) {
      return {
        success: false,
        error: 'No image files found'
      };
    }

    // Group photos by date (just like organize.js does)
    const photosByDate = {};
    
    for (const image of imageFiles) {
      try {
        const fullPath = join(folderPath, image);
        console.log('Reading EXIF from:', image);
        const tags = await exiftool.read(fullPath);
        
        if (tags.DateTimeOriginal) {
          const year = tags.DateTimeOriginal.year;
          const month = padNumber(tags.DateTimeOriginal.month);
          const day = padNumber(tags.DateTimeOriginal.day);
          const fullDate = `${year}_${month}_${day}`;

          if (!photosByDate[fullDate]) {
            photosByDate[fullDate] = [];
          }
          photosByDate[fullDate].push(image);
          console.log(`Added ${image} to date ${fullDate}`);
        }
      } catch (error) {
        console.error(`Failed to read EXIF from ${image}:`, error.message);
      }
    }

    console.log('Photos grouped by date:', Object.keys(photosByDate));

    // Create folders for each date
    for (const date in photosByDate) {
      const dateFolder = join(folderPath, date);

      // Check which file types exist for this date
      const hasRaw = photosByDate[date].some(file => RAW_EXTENSIONS.test(file));
      const hasJpg = photosByDate[date].some(file => COMPRESSED_EXTENSIONS.test(file));

      try {
        console.log(`Creating folder: ${dateFolder}`);
        // Always create the date folder
        mkdirSync(dateFolder, { recursive: true });
        
        // Only create subfolders for file types that exist
        if (hasRaw) {
          const rawFolder = join(dateFolder, `${date}-raw`);
          console.log(`Creating RAW folder: ${rawFolder}`);
          mkdirSync(rawFolder, { recursive: true });
        }
        
        if (hasJpg) {
          const jpgFolder = join(dateFolder, `${date}-jpg`);
          console.log(`Creating JPG folder: ${jpgFolder}`);
          mkdirSync(jpgFolder, { recursive: true });
        }
      } catch (err) {
        console.error(`Error creating folders for ${date}:`, err.message);
      }
    }

    // Move and rename files
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const date in photosByDate) {
      for (const photo of photosByDate[date]) {
        try {
          const oldPath = join(folderPath, photo);
          const newPath = createNewPath(folderPath, date, photo);

          console.log(`Moving: ${oldPath} -> ${newPath}`);

          // Check if destination already exists
          if (existsSync(newPath)) {
            console.log(`Skipping ${photo} - destination exists`);
            skippedCount++;
            continue;
          }

          // Move the file
          renameSync(oldPath, newPath);
          console.log(`Successfully moved ${photo}`);
          successCount++;
        } catch (error) {
          console.error(`Error moving ${photo}:`, error.message);
          errorCount++;
          errors.push({ file: photo, error: error.message });
        }
      }
    }

    console.log(`Organisation complete: ${successCount} success, ${skippedCount} skipped, ${errorCount} errors`);

    return {
      success: true,
      successCount,
      skippedCount,
      errorCount,
      totalDates: Object.keys(photosByDate).length,
      dates: Object.keys(photosByDate).sort(),
      errors: errors
    };

  } catch (error) {
    console.error('Organisation failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export a function to cleanly shut down exiftool when app closes
export async function cleanup() {
  try {
    await exiftool.end();
  } catch (e) {
    // Ignore if already closed
  }
}
