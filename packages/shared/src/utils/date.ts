/**
 * Get today's date string in JST (Asia/Tokyo) as YYYY-MM-DD.
 * Used as the Firestore usage document ID.
 */
export function getTodayJST(): string {
  const now = new Date();
  const jst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const year = jst.getFullYear();
  const month = String(jst.getMonth() + 1).padStart(2, "0");
  const day = String(jst.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
