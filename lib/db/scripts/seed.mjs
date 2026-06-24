import crypto from "crypto";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(password + "salt_lead_verify")
    .digest("hex");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const companies = [
  {
    name: "Commerce Pundit",
    slug: "commerce-pundit",
    telephonyAssistantId: process.env.TELEPHONY_ASSISTANT_ID ?? null,
    telephonyPhoneNumberId: process.env.TELEPHONY_PHONE_NUMBER_ID ?? null,
    telephonyApiKey: process.env.TELEPHONY_API_KEY ?? null,
  },
  {
    name: "RetailAI Partners",
    slug: "retailai-partners",
    telephonyAssistantId: null,
    telephonyPhoneNumberId: null,
    telephonyApiKey: null,
  },
];

const users = [
  {
    username: "admin",
    name: "Admin User",
    email: "admin@callready.ai",
    password: "password123",
    role: "admin",
    companySlug: "commerce-pundit",
  },
  {
    username: "agent",
    name: "CP Agent",
    email: "agent@callready.ai",
    password: "password123",
    role: "agent",
    companySlug: "commerce-pundit",
  },
  {
    username: "retailai",
    name: "RetailAI Manager",
    email: "ops@retailai.com",
    password: "password123",
    role: "manager",
    companySlug: "retailai-partners",
  },
];

try {
  const companyIds = {};

  for (const company of companies) {
    const existing = await pool.query(
      "SELECT id FROM companies WHERE slug = $1",
      [company.slug],
    );

    if (existing.rowCount > 0) {
      companyIds[company.slug] = existing.rows[0].id;
      console.log(`Company "${company.name}" already exists`);
    } else {
      const inserted = await pool.query(
        `INSERT INTO companies (name, slug, telephony_assistant_id, telephony_phone_number_id, telephony_api_key)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          company.name,
          company.slug,
          company.telephonyAssistantId,
          company.telephonyPhoneNumberId,
          company.telephonyApiKey,
        ],
      );
      companyIds[company.slug] = inserted.rows[0].id;
      console.log(`Seeded company: ${company.name}`);
    }
  }

  for (const user of users) {
    const existing = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [user.username],
    );

    if (existing.rowCount > 0) {
      console.log(`User "${user.username}" already exists — skipping`);
      continue;
    }

    await pool.query(
      `INSERT INTO users (company_id, username, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        companyIds[user.companySlug],
        user.username,
        user.name,
        user.email,
        hashPassword(user.password),
        user.role,
      ],
    );
    console.log(`Seeded user: ${user.username} / ${user.password} (${user.companySlug})`);
  }

  const cpId = companyIds["commerce-pundit"];
  const campaignCheck = await pool.query(
    "SELECT id FROM campaigns WHERE company_id = $1 LIMIT 1",
    [cpId],
  );

  if (campaignCheck.rowCount === 0) {
    const campaign = await pool.query(
      `INSERT INTO campaigns (company_id, name, status, timezone, start_time, end_time, calls_per_minute, concurrent_call_limit, retry_attempts, retry_delay, service)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [cpId, "CRM & Marketing Outreach", "draft", "America/New_York", "09:00", "17:00", 2, 2, 2, 30, "CRM & Marketing"],
    );

    await pool.query(
      `INSERT INTO leads (company_id, first_name, last_name, company, phone_number, status, campaign_id, service)
       VALUES
       ($1, 'Mihir', 'Ajmera', 'Commerce Pundit', '18787818873', 'pending', $2, 'CRM & Marketing'),
       ($1, 'Sarah', 'Chen', 'TechNova Inc', '15551234567', 'pending', $2, 'CRM & Marketing'),
       ($1, 'James', 'Wilson', 'Wilson Retail', '15559876543', 'pending', $2, 'CRM & Marketing')`,
      [cpId, campaign.rows[0].id],
    );
    console.log("Seeded demo campaign + 3 pending leads for Commerce Pundit");
  }
} finally {
  await pool.end();
}
