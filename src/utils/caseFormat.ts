/**
 * Utility to format report and conversation case IDs into clean, professional, human-readable references.
 * Prevents redundant/awkward raw timestamps like "#R-rep-1789327149342".
 */

export function formatCaseId(id: string | number | undefined | null): string {
  if (!id) return '#CR-1001';
  const raw = String(id).trim();
  
  // Strip common redundant prefixes (longest first)
  const cleaned = raw.replace(/^(#?\s*(?:report|rep|case|cr|r)[-_:]*\s*)/i, '');
  if (!cleaned) return '#CR-1001';

  // If long unix timestamp (e.g. 1789327149342), format as concise 7-digit ID
  if (/^\d{10,}$/.test(cleaned)) {
    return `#CR-${cleaned.slice(-7)}`;
  }

  // Extract digits if mixed
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
    return `#CR-${digitsOnly.slice(-7)}`;
  }

  return `#CR-${cleaned.toUpperCase()}`;
}

export function formatThreadId(id: string | number | undefined | null): string {
  if (!id) return '#TH-1001';
  const raw = String(id).trim();
  // Strip common redundant prefixes (longest first)
  const cleaned = raw.replace(/^(#?\s*(?:thread|convo|conv|th)[-_:]*\s*)/i, '');
  if (!cleaned) return '#TH-1001';
  
  if (/^\d{10,}$/.test(cleaned)) {
    return `#TH-${cleaned.slice(-6)}`;
  }

  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
    return `#TH-${digitsOnly.slice(-6)}`;
  }

  return `#TH-${cleaned.toUpperCase()}`;
}
