import { Router } from "express";
import { z } from "zod";

import { query, transaction } from "../../db/index.js";
import { validate } from "../../middleware/validate.js";

type Company = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};
type User = { id: string; name: string; email: string };
type Communication = {
  id: string;
  company_id: string;
  user_id: string;
  outcome: string | null;
  interest_level: number | null;
  next_action_at: string | null;
  created_at: string;
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

const companyInput = z.object({
  name: z.string().trim().min(1).max(255),
  email: optionalText(320),
  phone: optionalText(50),
});

const createCommunicationInput = z
  .object({
    companyId: z.string().uuid().optional(),
    company: companyInput.optional(),
    userId: z.string().uuid(),
    contactName: optionalText(150),
    contactRole: optionalText(100),
    outcome: z
      .enum(["no_answer", "callback", "interested", "not_interested"])
      .optional(),
    interestLevel: z.number().int().min(1).max(5).optional(),
    notes: optionalText(10_000),
    nextAction: optionalText(255),
    nextActionAt: z.string().datetime({ offset: true }).optional(),
  })
  .superRefine((value, context) => {
    if (Boolean(value.companyId) === Boolean(value.company)) {
      context.addIssue({
        code: "custom",
        message: "Επιλέξτε υπάρχοντα προμηθευτή ή συμπληρώστε νέο προμηθευτή.",
        path: ["companyId"],
      });
    }
  });

type CreateCommunicationInput = z.infer<typeof createCommunicationInput>;

export const communicationsRouter: Router = Router();

communicationsRouter.get("/companies", async (_req, res) => {
  const companies = await query<Company>(
    `SELECT id, name, email, phone
       FROM companies
      WHERE status <> 'inactive'
      ORDER BY lower(name)`,
  );
  res.json({ companies });
});

communicationsRouter.get("/users", async (_req, res) => {
  const users = await query<User>(
    `SELECT id, name, email
       FROM users
      WHERE active = true
      ORDER BY name`,
  );
  res.json({ users });
});

communicationsRouter.post(
  "/communications",
  validate(createCommunicationInput),
  async (req, res) => {
    const input = req.body as CreateCommunicationInput;

    const result = await transaction(async (client) => {
      let companyId = input.companyId;
      let companyCreated = false;

      if (input.company) {
        const company = await client.query<{ id: string }>(
          `INSERT INTO companies (name, email, phone)
         VALUES ($1, $2, $3)
         RETURNING id`,
          [
            input.company.name,
            input.company.email ?? null,
            input.company.phone ?? null,
          ],
        );
        companyId = company.rows[0]?.id;
        companyCreated = true;
      }

      if (!companyId) throw new Error("Company id was not resolved");

      const communication = await client.query<Communication>(
        `INSERT INTO communications (
         company_id, user_id, contact_name, contact_role, outcome,
         interest_level, notes, next_action, next_action_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, company_id, user_id, outcome, interest_level, next_action_at, created_at`,
        [
          companyId,
          input.userId,
          input.contactName ?? null,
          input.contactRole ?? null,
          input.outcome ?? null,
          input.interestLevel ?? null,
          input.notes ?? null,
          input.nextAction ?? null,
          input.nextActionAt ?? null,
        ],
      );

      return { communication: communication.rows[0], companyCreated };
    });

    res.status(201).json(result);
  },
);
