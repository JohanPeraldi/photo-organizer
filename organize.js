const fs = require('fs');
const path = require('path');

// Get folder path from command line
const folderPath = process.argv[2];

// Check if folder was provided
if (!folderPath) {
  console.log('Usage: node organize.js /path/to/photos');
  process.exit(1);
}

// Check if folder exists
if (!fs.existsSync(folderPath)) {
  console.log(`Error: Folder "${folderPath}" does not exist`);
  process.exit(1);
}

console.log(`Reading files from: ${folderPath}\n`);

// Read all files in the folder using fs.readdirSync()
const files = fs.readdirSync(folderPath);
// Filter to keep image files only (.jpg, .jpeg, .CR2, .NEF, .ARW, .png)
const imageFiles = files.filter(file =>
  /\.(jpe?g|CR2|NEF|ARW|png)$/i.test(file));
// Print each image filename on a separate line
imageFiles.forEach(file => {
  console.log(file);
});

console.log(`\nFound ${imageFiles.length} image files`);
