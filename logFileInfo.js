// This function takes an array of file names and a folder path
// as input and log to the console the file names and the file sizes
// on separate lines
import { statSync } from 'fs';
import { join } from 'path';

export default function logFileInfo(filesArray, folderPath) {
  filesArray.forEach(file => {
    const fullPath = join(folderPath, file);
    const stats = statSync(fullPath);
    const sizeInBytes = stats.size;
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(1);
    console.log(`  ${file} - ${sizeInMB} MB`);
  });
}
