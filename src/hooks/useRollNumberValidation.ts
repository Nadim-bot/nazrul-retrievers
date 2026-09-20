import { useMemo } from 'react';
import { validateRollNumber, getSessionEndYear } from '../utils/validation';

/**
 * Custom validation hook for student roll numbers based on academic session.
 * Ensures the roll number is exactly 8 digits long and its first two digits
 * match the selected academic session year (e.g., "23" for "2022-23" followed by 6 digits).
 * 
 * @param rollNumber The roll number to validate
 * @param sessionYear The academic session year (e.g. "2022-23" or "20-21")
 * @param isRequired Whether roll number is mandatory (default: false for flexible profile editing)
 */
export function useRollNumberValidation(rollNumber: string, sessionYear: string, isRequired = false) {
  const error = useMemo(() => {
    if (!rollNumber || rollNumber.trim() === '') {
      return isRequired ? 'Roll Number is required.' : null;
    }

    return validateRollNumber(rollNumber, sessionYear);
  }, [rollNumber, sessionYear, isRequired]);

  const expectedPrefix = useMemo(() => {
    return getSessionEndYear(sessionYear);
  }, [sessionYear]);

  const isValid = error === null;

  return {
    error,
    isValid,
    expectedPrefix
  };
}
