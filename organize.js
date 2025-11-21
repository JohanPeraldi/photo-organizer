import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { exiftool } from 'exiftool-vendored';
import { IMAGE_EXTENSIONS } from './constants.js';
import createNewPath from './createNewPath.js';
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
const imageFiles = files.filter(file => IMAGE_EXTENSIONS.test(file));
// Create an empty object to organize photos by date
const photosByDate = {};
// Extract the date
try {
  for (const image of imageFiles) {
    const fullPath = join(folderPath, image);
    const tags = await exiftool.read(fullPath);
    
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

    // Check if an array already exists for the given date...
    if (!photosByDate[fullDate]) {
      photosByDate[fullDate] = [];  // ... if not, create it
    }
    photosByDate[fullDate].push(image);  // Add current file to array
  }
} catch (error) {
  console.error("Failed to read file:", error.message);
}
// Shut down the `exiftool` child process so node can exit cleanly
await exiftool.end();

// Log old and new paths
for (const date in photosByDate) {
  // Log date of current batch of photos
  console.log(`=== Photos from ${date} (${photosByDate[date].length} file${photosByDate[date].length > 1 ? "s" : ""}) ===`);
  // Loop through the array of photos from the current date
  for (const photo of photosByDate[date]) {
    const fullPath = join(folderPath, photo);
    const newPath = createNewPath(folderPath, date, photo);
    console.log(`OLD: ${fullPath}\nNEW: ${newPath}`);
  }
}
