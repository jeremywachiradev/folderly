import { format } from 'date-fns';

interface FileIcon {
  icon: 'image-outline' | 'videocam-outline' | 'musical-notes-outline' | 'document-text-outline' | 'document-outline';
  color: string;
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatDate(timestamp: number): string {
  return format(new Date(timestamp), 'MMM d, yyyy');
}

export function getFileIcon(type: string): FileIcon {
  // Image files
  if (/^image\//i.test(type)) {
    return { icon: 'image-outline', color: '#10B981' };
  }
  
  // Video files
  if (/^video\//i.test(type)) {
    return { icon: 'videocam-outline', color: '#F59E0B' };
  }
  
  // Audio files
  if (/^audio\//i.test(type)) {
    return { icon: 'musical-notes-outline', color: '#8B5CF6' };
  }
  
  // Text files
  if (/^text\//i.test(type) || /\/(pdf|doc|docx|txt|md|json|xml)$/i.test(type)) {
    return { icon: 'document-text-outline', color: '#3B82F6' };
  }
  
  // Default
  return { icon: 'document-outline', color: '#6B7280' };
}

export function getFileName(path: string): string {
  if (!path) return '';
  const parts = path.split('/');
  return parts[parts.length - 1];
}

export function formatDisplayName(name: string): string {
  if (!name) return '';
  // Extract just the file ID and extension
  const parts = name.split('/');
  const fileName = parts[parts.length - 1];
  
  // If it's a complex name with encoded characters, extract just the ID portion
  if (fileName.includes('%')) {
    const matches = fileName.match(/[a-f0-9]{32}\.[a-zA-Z0-9]+$/i);
    if (matches) {
      return matches[0];
    }
  }
  
  return fileName;
}

export function formatDisplayPath(path: string): string {
  if (!path) return '';
  // Convert complex paths to a simpler format
  const matches = path.match(/Android\/media\/com\.whatsapp\/WhatsApp\/Media\/\.Statuses\/[^\/]+$/);
  if (matches) {
    return matches[0];
  }
  return path;
} 