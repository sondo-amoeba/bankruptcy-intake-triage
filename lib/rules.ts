import type { Disposition, MissingItem, TriageExtraction } from "./schema";

export type RulesResult = {
  missing: MissingItem[];
  disposition: Disposition;
};

export function runRules(extraction: TriageExtraction): RulesResult {
  const missing: MissingItem[] = [];

  if (extraction.debtor.monthlyIncome == null) {
    missing.push({
      field: "debtor.monthlyIncome",
      message: "Monthly income is required for means test and plan feasibility.",
      severity: "blocking",
    });
  }

  if (extraction.history.priorFilings === true && extraction.history.priorFilingYearsAgo == null) {
    missing.push({
      field: "history.priorFilingYearsAgo",
      message: "Prior filing date or years ago is required to assess eligibility.",
      severity: "blocking",
    });
  }

  if (extraction.history.receivedCreditCounseling !== true) {
    missing.push({
      field: "history.receivedCreditCounseling",
      message: "Credit counseling completion must be confirmed before filing.",
      severity: "blocking",
    });
  }

  if (
    extraction.suggestedChapter === "13" &&
    extraction.debtor.monthlyIncome == null
  ) {
    missing.push({
      field: "debtor.monthlyIncome",
      message: "Chapter 13 requires verified monthly income for plan calculation.",
      severity: "blocking",
    });
  }

  const hasAssetFlags =
    extraction.assets.hasRealProperty === true || extraction.assets.hasVehicle === true;
  if (hasAssetFlags && extraction.assets.estimatedEquity == null) {
    missing.push({
      field: "assets.estimatedEquity",
      message: "Asset equity estimate needed when real property or vehicles are reported.",
      severity: "follow-up",
    });
  }

  const hasBlocking = missing.some((item) => item.severity === "blocking");
  const needsAttorneyReview =
    extraction.confidence === "low" || extraction.ambiguities.length > 0;

  let disposition: Disposition;
  if (hasBlocking) {
    disposition = "needs_follow_up";
  } else if (needsAttorneyReview) {
    disposition = "needs_attorney_review";
  } else {
    disposition = "ready_for_petition_prep";
  }

  return { missing, disposition };
}

export function buildTriageResponse(extraction: TriageExtraction) {
  const { missing, disposition } = runRules(extraction);
  return {
    extraction,
    missing,
    disposition,
    suggestedChapter: extraction.suggestedChapter,
    confidence: extraction.confidence,
  };
}
