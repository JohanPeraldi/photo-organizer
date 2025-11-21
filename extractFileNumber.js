// This function extracts the file number from the full file name,
// assuming the file name follows the following pattern: IMG_number.extension
// Example:
// IMG_1234.CR2 -> 1234
export default function extractFileNumber(fileName) {
  const match = fileName.match(/IMG_(\d+)\./);
  const fileNumber = match[1];

  return fileNumber;
}
