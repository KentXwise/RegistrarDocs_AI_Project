export type DocumentRequestStatus =
  | "pending"
  | "processing"
  | "needs_correction"
  | "ready_for_release"
  | "released"
  | "rejected";

export interface RequesterDocumentRequestSummary {
  id: string;
  referenceNumber: string;
  documentType: string;
  submittedAt: string;
  status: DocumentRequestStatus;
}

export interface RequesterNotificationItem {
  id: string;
  category:
    | "status_update"
    | "missing_requirements"
    | "processing_update"
    | "ready_for_release"
    | "collection_instructions"
    | "calendar_reminder"
    | "public_announcement";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface RequesterRequestCounts {
  total: number;
  pending: number;
  processing: number;
  readyForRelease: number;
}

export interface RequesterDashboardData {
  counts: RequesterRequestCounts;
  recentRequests: RequesterDocumentRequestSummary[];
  notifications: RequesterNotificationItem[];
  requestsModuleEnabled: boolean;
  notificationsModuleEnabled: boolean;
}
