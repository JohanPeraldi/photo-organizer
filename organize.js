import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { exiftool } from 'exiftool-vendored';
import padNumber from './padNumber.js';
import logFileInfo from './logFileInfo.js';

// Regex patterns for file filtering
const IMAGE_EXTENSIONS = /\.(jpe?g|CR2|NEF|ARW|png)$/i;
const RAW_EXTENSIONS = /\.(CR2|NEF|ARW)$/i;
const COMPRESSED_EXTENSIONS = /\.(jpe?g|png)$/i;

// Get folder path from command line
const folderPath = process.argv[2];

// Check if folder was provided
if (!folderPath) {
  console.log('Usage: node organize.js /path/to/photos');
  process.exit(1);
}

// Check if folder exists
if (!existsSync(folderPath)) {
  console.log(`Error: Folder "${folderPath}" does not exist`);
  process.exit(1);
}

console.log(`Reading files from: ${folderPath}`);

// Read all files in the folder using fs.readdirSync()
const files = readdirSync(folderPath);
// Filter to keep image files only (.jpg, .jpeg, .CR2, .NEF, .ARW, .png)
const imageFiles = files.filter(file => IMAGE_EXTENSIONS.test(file));
// Extract the date from the first photo's EXIF data
// and format it as YYYY_MM_DD
const firstPhoto = join(folderPath, imageFiles[0]);
try {
  const tags = await exiftool.read(firstPhoto);
  
  // Check for parsing warnings
  if (tags.errors && tags.errors.length > 0) {
    console.warn("Metadata warnings:", tags.errors);
  }

  const year = tags.DateTimeOriginal.year;
  // Pass the month and day to the padNumber() function
  // to enforce two-character value 
  const month = padNumber(tags.DateTimeOriginal.month);
  const day = padNumber(tags.DateTimeOriginal.day);
  const fullDate = `${year}_${month}_${day}`;

  console.log("Date from EXIF: " + fullDate + "\n");

  // Shut down the `exiftool` child process so node can exit cleanly
  await exiftool.end();
} catch (error) {
  console.error("Failed to read file:", error.message);
}
// Store jpg/jpeg/png files and raw files in two separate arrays
const rawFiles = imageFiles.filter(file => RAW_EXTENSIONS.test(file));
const compressedFiles = imageFiles.filter(file => COMPRESSED_EXTENSIONS.test(file));
// Print each image filename on a separate line with stats and additional info
console.log(`RAW files (${rawFiles.length}):`);
logFileInfo(rawFiles, folderPath);
console.log(`\nCompressed files (${compressedFiles.length}):`);
logFileInfo(compressedFiles, folderPath);

console.log(`\nTotal: ${imageFiles.length} image files`);
