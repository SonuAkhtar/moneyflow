import { describe, expect, it } from "vitest";
import {
  accountToRow,
  borrowingToRow,
  emiToRow,
  rowToAccount,
  transactionToRow,
} from "./mappers";
import type { Account, Borrowing, Emi } from "@/types";
import type { Tables } from "./database.types";

describe("entity to row mappers", () => {
  it("accountToRow maps every column (camelCase to snake_case)", () => {
    const account: Account = {
      id: "a1",
      userId: "u1",
      name: "Vault",
      type: "savings",
      balance: 1234.5,
      institution: "HDFC",
      colorTag: "#fff",
      isPrimary: true,
      createdAt: "2026-05-01T00:00:00.000Z",
    };
    expect(accountToRow(account)).toEqual({
      id: "a1",
      user_id: "u1",
      name: "Vault",
      type: "savings",
      balance: 1234.5,
      institution: "HDFC",
      color_tag: "#fff",
      is_primary: true,
    });
  });

  it("transactionToRow maps every column", () => {
    expect(
      transactionToRow({
        id: "t1",
        userId: "u1",
        accountId: "acc1",
        type: "expense",
        amount: 200,
        category: "food",
        note: "lunch",
        merchant: "Cafe",
        isBigExpense: false,
        occurredAt: "2026-05-10T09:00:00.000Z",
        createdAt: "2026-05-10T09:00:00.000Z",
      }),
    ).toEqual({
      id: "t1",
      user_id: "u1",
      account_id: "acc1",
      type: "expense",
      amount: 200,
      category: "food",
      note: "lunch",
      merchant: "Cafe",
      is_big_expense: false,
      occurred_at: "2026-05-10T09:00:00.000Z",
    });
  });

  it("emiToRow maps every column incl. due_day and principal", () => {
    const emi: Emi = {
      id: "e1",
      userId: "u1",
      accountId: "acc1",
      name: "Car Loan",
      kind: "loan",
      startMonth: "2026-01",
      principal: 720000,
      monthlyAmount: 17000,
      remainingMonths: 28,
      totalMonths: 48,
      paidMonths: 20,
      interestRate: 9.2,
      dueDay: 12,
      status: "active",
      payments: [],
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    expect(emiToRow(emi)).toEqual({
      id: "e1",
      user_id: "u1",
      account_id: "acc1",
      name: "Car Loan",
      kind: "loan",
      start_month: "2026-01",
      principal: 720000,
      monthly_amount: 17000,
      remaining_months: 28,
      total_months: 48,
      paid_months: 20,
      interest_rate: 9.2,
      due_day: 12,
      status: "active",
    });
  });

  it("borrowingToRow maps every column", () => {
    const borrowing: Borrowing = {
      id: "b1",
      userId: "u1",
      lender: "Rahul",
      purpose: "Medical",
      amount: 50000,
      borrowedOn: "2026-05-01",
      dueDate: "2026-08-01",
      note: "via UPI",
      payments: [],
      createdAt: "2026-05-01T00:00:00.000Z",
    };
    expect(borrowingToRow(borrowing)).toEqual({
      id: "b1",
      user_id: "u1",
      lender: "Rahul",
      purpose: "Medical",
      amount: 50000,
      borrowed_on: "2026-05-01",
      due_date: "2026-08-01",
      note: "via UPI",
    });
  });
});

describe("row to entity mappers", () => {
  it("rowToAccount coerces a string numeric balance to a number", () => {
    const row = {
      id: "a1",
      user_id: "u1",
      name: "Vault",
      type: "savings",
      balance: "1234.5",
      institution: "HDFC",
      color_tag: "#fff",
      is_primary: true,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z",
    } as unknown as Tables<"accounts">;
    expect(rowToAccount(row)).toEqual({
      id: "a1",
      userId: "u1",
      name: "Vault",
      type: "savings",
      balance: 1234.5,
      institution: "HDFC",
      colorTag: "#fff",
      isPrimary: true,
      createdAt: "2026-05-01T00:00:00.000Z",
    });
  });
});
