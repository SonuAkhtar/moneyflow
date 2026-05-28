import type {
  AiFinancialSnapshot,
  AiGeneratedInsight,
  AiInsightResponse,
} from "@/types";

const round = (n: number) => Math.round(n);

export const heuristicInsights = (s: AiFinancialSnapshot): AiInsightResponse => {
  const insights: AiGeneratedInsight[] = [];
  const spendRatio = s.monthIncome > 0 ? s.monthExpenses / s.monthIncome : 0;
  const savedRate =
    s.monthIncome > 0 ? ((s.monthIncome - s.monthExpenses) / s.monthIncome) * 100 : 0;

  if (savedRate >= 20) {
    insights.push({
      type: "saving",
      severity: "positive",
      title: "Strong savings month",
      body: `You kept ${round(savedRate)}% of income. Funnel the surplus into a goal to compound it.`,
      metric: round(savedRate),
    });
  } else {
    insights.push({
      type: "saving",
      severity: "warning",
      title: "Savings running thin",
      body: `Only ${round(Math.max(savedRate, 0))}% saved. Trim one recurring cost to lift this above 20%.`,
      metric: round(Math.max(savedRate, 0)),
    });
  }

  if (spendRatio > 0.8) {
    insights.push({
      type: "overspending",
      severity: "critical",
      title: "Spending near the edge",
      body: `Expenses hit ${round(spendRatio * 100)}% of income. Cap discretionary spend for the rest of the month.`,
      metric: round(spendRatio * 100),
    });
  }

  const top = s.topCategories[0];
  if (top) {
    insights.push({
      type: "optimization",
      severity: "neutral",
      title: `${top.category} leads spending`,
      body: `${top.category} is your largest category this month. A 10% trim frees up real cash.`,
      metric: round(top.amount),
    });
  }

  const projected = s.carriedForward + (s.monthIncome - s.monthExpenses);
  insights.push({
    type: "prediction",
    severity: projected > s.carriedForward ? "positive" : "warning",
    title: "Next month outlook",
    body: `At this pace you'll carry forward about ${round(projected)} into next month.`,
    metric: round(projected),
  });

  if (s.activeEmis.length > 0) {
    const emiTotal = s.activeEmis.reduce((a, e) => a + e.monthlyAmount, 0);
    insights.push({
      type: "budgeting",
      severity: emiTotal / Math.max(s.monthIncome, 1) > 0.4 ? "warning" : "neutral",
      title: "EMI load check",
      body: `EMIs take ${round((emiTotal / Math.max(s.monthIncome, 1)) * 100)}% of income across ${s.activeEmis.length} loans.`,
      metric: round(emiTotal),
    });
  }

  const summary =
    savedRate >= 20
      ? `Healthy month — you saved ${round(savedRate)}% and your buffer is growing.`
      : `Watch your spend — savings sit at ${round(Math.max(savedRate, 0))}% with room to improve.`;

  return { insights: insights.slice(0, 4), summary };
};

export const heuristicChatReply = (
  s: AiFinancialSnapshot,
  question: string,
): string => {
  const q = question.toLowerCase();
  const saved = s.monthIncome - s.monthExpenses;
  const rate = s.monthIncome > 0 ? round((saved / s.monthIncome) * 100) : 0;

  if (q.includes("save") || q.includes("saving")) {
    return `You've saved ${round(saved)} this month (${rate}% of income). Automating a transfer right after payday is the fastest way to push that higher.`;
  }
  if (q.includes("spend") || q.includes("expense")) {
    const top = s.topCategories[0];
    return top
      ? `Your biggest spend is ${top.category} at ${round(top.amount)}. Trimming it 10% would free up meaningful cash without much pain.`
      : `Your spending looks balanced across categories this month.`;
  }
  if (q.includes("emi") || q.includes("loan")) {
    const emiTotal = s.activeEmis.reduce((a, e) => a + e.monthlyAmount, 0);
    return `You're paying ${round(emiTotal)} across ${s.activeEmis.length} EMIs. Prioritise the highest-interest one for early payoff.`;
  }
  if (q.includes("goal")) {
    const g = s.goals[0];
    return g
      ? `Your top goal "${g.title}" is ${round(g.progress)}% funded. Adding a small weekly top-up keeps the momentum.`
      : `You don't have an active goal yet — setting one makes saving feel intentional.`;
  }
  return `Right now you hold ${round(s.totalBalance)} across accounts and saved ${round(saved)} this month. Ask me about saving, spending, EMIs or goals for a deeper look.`;
};
