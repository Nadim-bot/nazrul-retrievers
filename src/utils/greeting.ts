/**
 * Dynamic greeting system based on the user's LOCAL TIME.
 *
 * GREETING RULES:
 * 12:00 AM – 4:59 AM  -> 🌙 Good Night
 * 5:00 AM – 11:59 AM  -> ☀️ Good Morning
 * 12:00 PM – 4:59 PM  -> 🌤 Good Afternoon
 * 5:00 PM – 8:59 PM   -> 🌆 Good Evening
 * 9:00 PM – 11:59 PM  -> 🌙 Good Night
 */

export function getGreeting(date: Date = new Date()): string {
  const hours = date.getHours();
  if (hours >= 5 && hours < 12) {
    return 'Good Morning';
  } else if (hours >= 12 && hours < 17) {
    return 'Good Afternoon';
  } else if (hours >= 17 && hours < 21) {
    return 'Good Evening';
  } else {
    return 'Good Night';
  }
}

export function getGreetingEmoji(greeting: string): string {
  switch (greeting) {
    case 'Good Morning':
      return '☀️';
    case 'Good Afternoon':
      return '🌤';
    case 'Good Evening':
      return '🌆';
    case 'Good Night':
      return '🌙';
    default:
      return '👋';
  }
}
