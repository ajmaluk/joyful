import { atom } from 'nanostores';

export const mobileSidebarOpen = atom(false);

export function toggleMobileSidebar() {
  mobileSidebarOpen.set(!mobileSidebarOpen.get());
}

export function closeMobileSidebar() {
  mobileSidebarOpen.set(false);
}
