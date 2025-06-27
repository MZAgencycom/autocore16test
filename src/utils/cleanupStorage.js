export default function cleanupStorage() {
  try {
    // Removing the full sessionStorage caused unexpected refreshes when coming
    // back from a PDF view. Only clean up the specific localStorage items used
    // during the PDF generation flow.
    ['analysisData', 'downloadData'].forEach((key) => localStorage.removeItem(key));
    console.log('Temporary storage cleared');
  } catch (err) {
    console.error('Error clearing storage:', err);
  }
}
