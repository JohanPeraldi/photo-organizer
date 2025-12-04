// This function takes as input a file path, a file date, and a file name,
// and returns a new file path based on the file extension and the date
// extracted from the file EXIF data.
import { extname } from 'path';
import extractFileNumber from "./extractFileNumber.js";
import { RAW_EXTENSIONS } from "./constants.js";

export default function createNewPath(filePath, date, fileName) {
  // 1. Extract file number: IMG_5498.CR2 → "5498"
  const fileNumber = extractFileNumber(fileName);
  // 2. Determine if RAW or compressed (check extension)
  const isRaw = RAW_EXTENSIONS.test(fileName);
  // 3. Extract extension
  const ext = extname(fileName);
  // 4. Build path: folderPath/2025_10_26/2025_10_26-raw/2025_10_26_5498.CR2
  const newFilePath = `${filePath}/${date}/${date}-${isRaw ? "raw" : "jpg"}/${date}_${fileNumber}${ext}`;
  
  // 5. Return the new path
  return newFilePath;
}
