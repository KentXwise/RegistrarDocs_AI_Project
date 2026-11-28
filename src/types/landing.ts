export type IconKey =
  | "file-text"
  | "file-badge"
  | "graduation-cap"
  | "folder-open"
  | "user-plus"
  | "file-search"
  | "send"
  | "package-check"
  | "clipboard-list"
  | "laptop"
  | "activity"
  | "footprints"
  | "book-open";

export interface NavItem {
  label: string;
  href: string;
}

export interface DocumentExample {
  id: string;
  title: string;
  description: string;
  note: string;
  icon: IconKey;
}

export interface WorkflowStep {
  number: string;
  title: string;
  description: string;
  icon: IconKey;
}

export interface BenefitItem {
  id: string;
  title: string;
  description: string;
  icon: IconKey;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}
