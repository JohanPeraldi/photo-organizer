import { existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { exiftool } from 'exiftool-vendored';
import padNumber from './padNumber.js';

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
const imageFiles = files.filter(file => /\.(jpe?g|CR2|NEF|ARW|png)$/i.test(file));
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
// Print each image filename on a separate line with stats and additional info
imageFiles.forEach(file => {
  const fullPath = join(folderPath, file);
  const stats = statSync(fullPath);
  const sizeInBytes = stats.size;
  const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(1);
  const ext = extname(file);
  console.log(`${file} (${ext}) - ${sizeInMB} MB`);
});

console.log(`\nFound ${imageFiles.length} image files`);
