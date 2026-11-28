import {
  getDocumentCatalogItem,
  type DocumentTypeCode,
} from "@/lib/requester/document-catalog";

export interface VerificationChecklistItem {
  id: string;
  label: string;
  required: boolean;
}

export interface PersistedChecklistResult {
  id: string;
  label: string;
  checked: boolean;
}

export interface ReadyConfirmations {
  correctRequest: boolean;
  preparationCompleted: boolean;
  preparedAndVerified: boolean;
  priorRecordsReviewed: boolean;
}

export const READY_CONFIRMATION_ITEMS: readonly {
  key: keyof ReadyConfirmations;
  label: string;
}[] = [
  {
    key: "correctRequest",
    label:
      "I confirm the correct request and reference number are being prepared.",
  },
  {
    key: "preparationCompleted",
    label: "I confirm that document preparation is completed.",
  },
  {
    key: "preparedAndVerified",
    label:
      "I confirm that the requested document has been prepared and verified for release.",
  },
  {
    key: "priorRecordsReviewed",
    label:
      "I confirm that the prior verification and processing records have been reviewed.",
  },
] as const;

/**
 * Dynamically builds the Stage 1 (Submitted / Pending) verification checklist
 * based strictly on the requested document type's configured catalog metadata.
 * Does not invent official DNSC requirements.
 */
export function buildInitialVerificationChecklist(
  documentTypeCode: DocumentTypeCode,
  copies: number
): VerificationChecklistItem[] {
  const catalogItem = getDocumentCatalogItem(documentTypeCode);

  const items: VerificationChecklistItem[] = [
    {
      id: "request-info-reviewed",
      label:
        "Request information reviewed (requested document, purpose, and submission details)",
      required: true,
    },
    {
      id: "requester-info-complete",
      label:
        "Requester identity & Student ID information are complete and consistent",
      required: true,
    },
    {
      id: "copies-valid",
      label: `Requested copy quantity (${copies} ${copies === 1 ? "copy" : "copies"}) is appropriate`,
      required: true,
    },
  ];

  if (catalogItem?.requiresAdditionalNotes) {
    items.push({
      id: "specific-doc",
      label:
        "Specific requested document name and additional details are provided",
      required: true,
    });
  }

  if (catalogItem) {
    catalogItem.preparationReminders.forEach((reminder, index) => {
      items.push({
        id: `doc-req-${index}`,
        label: reminder,
        required: true,
      });
    });
  }

  items.push({
    id: "ready-for-processing",
    label: "Request requirements are verified and ready to proceed to processing",
    required: true,
  });

  return items;
}
