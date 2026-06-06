import type { TriageExtraction } from "./schema";

export type SampleIntake = {
  id: string;
  label: string;
  intakeText: string;
  cannedExtraction: TriageExtraction;
};

export const SAMPLES: SampleIntake[] = [
  {
    id: "sarah-m",
    label: "Sarah M. — mostly complete Ch. 7",
    intakeText: `Sarah Martinez, San Diego CA. Household of 2. W-2 income about $3,200/month take-home.
Credit card debt roughly $28,000, no mortgage, rents apartment. No prior bankruptcies.
Completed credit counseling last week. Wants relief from unsecured debt.`,
    cannedExtraction: {
      debtor: {
        name: "Sarah Martinez",
        householdSize: 2,
        monthlyIncome: 3200,
        state: "CA",
      },
      debts: {
        hasSecured: false,
        hasPriority: false,
        estimatedUnsecured: 28000,
      },
      assets: {
        hasRealProperty: false,
        hasVehicle: true,
        estimatedEquity: 2000,
      },
      history: {
        priorFilings: false,
        priorFilingYearsAgo: null,
        receivedCreditCounseling: true,
      },
      suggestedChapter: "7",
      confidence: "high",
      ambiguities: [],
    },
  },
  {
    id: "james-r",
    label: "James R. — prior filing, missing income",
    intakeText: `James Rodriguez called in. Said he filed Chapter 7 about four years ago.
Has medical bills and credit cards piling up again. Did not mention current income.
Has not done counseling yet. Lives in Texas.`,
    cannedExtraction: {
      debtor: {
        name: "James Rodriguez",
        householdSize: null,
        monthlyIncome: null,
        state: "TX",
      },
      debts: {
        hasSecured: false,
        hasPriority: true,
        estimatedUnsecured: null,
      },
      assets: {
        hasRealProperty: false,
        hasVehicle: false,
        estimatedEquity: null,
      },
      history: {
        priorFilings: true,
        priorFilingYearsAgo: 4,
        receivedCreditCounseling: false,
      },
      suggestedChapter: "unclear",
      confidence: "medium",
      ambiguities: ["Income not stated"],
    },
  },
  {
    id: "maria-l",
    label: "Maria L. — assets with conflicting income",
    intakeText: `Maria Lopez owns a home and a car. Income varies — sometimes $4,500, sometimes she says
she is between jobs and might be $0. Credit cards $15k. No prior filings.
Counseling certificate on file. Considering repayment plan.`,
    cannedExtraction: {
      debtor: {
        name: "Maria Lopez",
        householdSize: 3,
        monthlyIncome: 4500,
        state: null,
      },
      debts: {
        hasSecured: true,
        hasPriority: false,
        estimatedUnsecured: 15000,
      },
      assets: {
        hasRealProperty: true,
        hasVehicle: true,
        estimatedEquity: null,
      },
      history: {
        priorFilings: false,
        priorFilingYearsAgo: null,
        receivedCreditCounseling: true,
      },
      suggestedChapter: "13",
      confidence: "low",
      ambiguities: [
        "Income reported as both $4,500 and possibly $0 between jobs",
        "Home and vehicle equity not estimated",
      ],
    },
  },
];

export function getSampleById(sampleId: string): SampleIntake | undefined {
  return SAMPLES.find((sample) => sample.id === sampleId);
}
