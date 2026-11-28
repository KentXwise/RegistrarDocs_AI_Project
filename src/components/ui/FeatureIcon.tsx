import {
  Activity,
  BookOpen,
  ClipboardList,
  FileBadge,
  FileSearch,
  FileText,
  FolderOpen,
  Footprints,
  GraduationCap,
  Laptop,
  PackageCheck,
  Send,
  UserPlus,
} from "lucide-react";
import type { IconKey } from "@/types/landing";

interface FeatureIconProps {
  name: IconKey;
  className?: string;
}

const ICON_MAP = {
  "file-text": FileText,
  "file-badge": FileBadge,
  "graduation-cap": GraduationCap,
  "folder-open": FolderOpen,
  "user-plus": UserPlus,
  "file-search": FileSearch,
  send: Send,
  "package-check": PackageCheck,
  "clipboard-list": ClipboardList,
  laptop: Laptop,
  activity: Activity,
  footprints: Footprints,
  "book-open": BookOpen,
} as const;

export function FeatureIcon({ name, className = "h-5 w-5" }: FeatureIconProps) {
  const IconComponent = ICON_MAP[name];
  return <IconComponent className={className} aria-hidden="true" />;
}
