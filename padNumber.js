// This function takes a number as input
// and returns a two-character string representing
// that same number, adding a "0" in front of it
// if it only has one digit.
export default function padNumber(number) {
  return number.toString().padStart(2, "0");
}
