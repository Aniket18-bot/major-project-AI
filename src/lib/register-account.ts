import { createServerFn } from "@tanstack/react-start";

export type RegisterAccountInput = {
  email: string;
  password: string;
  fullName: string;
  role: "student" | "recruiter";
  companyName: string;
};

export const registerAccount = createServerFn({ method: "POST" })
  .validator((data: RegisterAccountInput) => data)
  .handler(async ({ data }) => {
    const { registerAccountAdmin } = await import("./register-account.server");
    return registerAccountAdmin(data);
  });
