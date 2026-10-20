import type { Href } from 'expo-router';

export type NavItem = {
  label: string;
  href: Href;
  /** Pathname that marks this item as the current page. */
  match: string;
};

/** Primary navigation, in header and drawer order. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Home', href: '/', match: '/' },
  { label: 'About', href: '/about', match: '/about' },
  { label: 'Rates', href: '/rates', match: '/rates' },
  { label: 'Rides', href: '/rides', match: '/rides' },
  { label: 'Receipts', href: '/receipts', match: '/receipts' },
  { label: 'Profile', href: '/profile', match: '/profile' },
  { label: 'Addresses', href: '/addresses', match: '/addresses' },
  { label: 'Contacts', href: '/contacts', match: '/contacts' },
  { label: 'Preferences', href: '/preferences', match: '/preferences' },
  { label: 'Reservation', href: '/reserve', match: '/reserve' },
  { label: 'Reservation 2', href: '/reserver-2', match: '/reserver-2' },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return pathname === item.match;
}
