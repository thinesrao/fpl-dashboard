import { credentialsSchema } from "@/lib/auth-schema";

test("credentialsSchema accepts valid email+password", () => {
  expect(credentialsSchema.safeParse({ email: "a@b.com", password: "secret12" }).success).toBe(true);
});

test("credentialsSchema rejects bad email and short password", () => {
  expect(credentialsSchema.safeParse({ email: "nope", password: "secret12" }).success).toBe(false);
  expect(credentialsSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(false);
});
