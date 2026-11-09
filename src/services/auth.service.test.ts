import { beforeEach, describe, expect, it, vi } from "vitest";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabase: () => ({ auth: { signOut } }),
}));

import { authService } from "@/services/auth.service";

beforeEach(() => signOut.mockReset());

describe("authService.signOut", () => {
  it("clears the local session when the server sign-out fails offline", async () => {
    signOut
      .mockResolvedValueOnce({ error: new Error("Failed to fetch") })
      .mockResolvedValueOnce({ error: null });
    await authService.signOut();
    expect(signOut).toHaveBeenNthCalledWith(2, { scope: "local" });
  });

  it("signs out once when the server accepts it", async () => {
    signOut.mockResolvedValue({ error: null });
    await authService.signOut();
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
