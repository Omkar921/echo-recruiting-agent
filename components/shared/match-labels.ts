import type { MockCandidateProfile } from "@/lib/types";

export const MATCH_LABELS: Record<MockCandidateProfile["matchLabel"], string> = {
  strong: "Strong match",
  partial: "Partial fit",
  stretch: "Stretch",
  unknown: "Limited data",
};

export function matchLabel(label: MockCandidateProfile["matchLabel"]): string {
  return MATCH_LABELS[label];
}
