import { createInterface } from 'readline';
import { existsSync, mkdirSync, readdirSync, renameSync } from 'fs';
import { join } from 'path';
import { exiftool } from 'exiftool-vendored';
import { COMPRESSED_EXTENSIONS, IMAGE_EXTENSIONS, RAW_EXTENSIONS } from './constants.js';
import createNewPath from './createNewPath.js';
import padNumber from './padNumber.js';

// Function to ask user for confirmation before moving files
async function askConfirmation(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

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

console.log('\n'); // Blank line for readability

const confirmed = await askConfirmation('Proceed with organising files? (y/n): ');

if (!confirmed) {
  console.log('Operation cancelled');
  await exiftool.end();
  process.exit(0);
}

console.log('\n'); // Another blank line for readability

// Create parent folders for every new date and
// child folders inside them for raw and compressed (jpg) files
for (const date in photosByDate) {
  const dateFolder = join(folderPath, date);

  // Check which file types exist for the current date
  const hasRaw = photosByDate[date].some(file => RAW_EXTENSIONS.test(file));
  const hasJpg = photosByDate[date].some(file => COMPRESSED_EXTENSIONS.test(file));

  try {
    // Always create the date folder
    mkdirSync(dateFolder, { recursive: true });
    
    // Only create a -raw folder if there are RAW files
    if (hasRaw) {
      const rawFolder = join(dateFolder, `${date}-raw`);
      mkdirSync(rawFolder, { recursive: true });
    }
    
    // Only create a -jpg folder if there are JPG files
    if (hasJpg) {
      const jpgFolder = join(dateFolder, `${date}-jpg`);
      mkdirSync(jpgFolder, { recursive: true });
    }

    console.log(`✅ Created folders for ${date} (${hasRaw ? 'RAW' : ''}${hasRaw && hasJpg ? ' + ' : ''}${hasJpg ? 'JPG' : ''})`);
  } catch (err) {
    console.error(`❌ Error creating folders for ${date}:`, err.message);
  }
};

// Move and rename files
console.log('\nMoving files...');

let successCount = 0;
let skippedCount = 0;
let errorCount = 0;

for (const date in photosByDate) {
  console.log(`\nProcessing ${date}...`);

  for (const photo of photosByDate[date]) {
    try {
      const oldPath = join(folderPath, photo);
      const newPath = createNewPath(folderPath, date, photo);

      // Check if destination file already exists
      if (existsSync(newPath)) {
        console.log(` ⏩️ ${photo} - destination already exists, skipping`);
        skippedCount++;
        continue;
      }

      // Move the file
      renameSync(oldPath, newPath);
      console.log(` ✅ ${photo} -> ${newPath.split('/').pop()}`);
      successCount++;
    } catch(error) {
      console.log(` ❌ ${photo} - Error: ${error.message}`);
      errorCount++;
    }
  }
}

// Print summary
console.log('\n===================');
console.log('Operation Complete!');
console.log('===================\n');
console.log(`✅ Successfully moved: ${successCount} files`);
if (skippedCount > 0) {
  console.log(`⏩️ Skipped (already exists): ${skippedCount} files`);
}
if (errorCount > 0) {
  console.log(`❌ Errors: ${errorCount} files`);
}
console.log('');
