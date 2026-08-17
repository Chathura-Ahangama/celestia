import { neon } from "@neondatabase/serverless";

export interface BirthSubmissionInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  cityName: string;
  lat: number;
  lon: number;
  utcOffset: number;
  userAgent?: string;
  ipAddress?: string;
}

export interface BirthSubmissionRecord {
  id: number;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  city_name: string;
  latitude: number;
  longitude: number;
  utc_offset: number;
  submitted_at: string;
  user_agent?: string | null;
  ip_address?: string | null;
}

let tableInitialized = false;

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.trim() === "") {
    return null;
  }
  return neon(connectionString);
}

/**
 * Initializes the database schema if it doesn't exist yet.
 */
export async function initDb() {
  const sql = getDb();
  if (!sql) {
    throw new Error("DATABASE_URL environment variable is not configured.");
  }

  if (tableInitialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS birth_submissions (
      id SERIAL PRIMARY KEY,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      city_name VARCHAR(255) NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      utc_offset DOUBLE PRECISION NOT NULL,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      user_agent TEXT,
      ip_address VARCHAR(100)
    );
  `;

  // Create an index on submitted_at for quick chronological queries
  await sql`
    CREATE INDEX IF NOT EXISTS idx_birth_submissions_submitted_at
    ON birth_submissions (submitted_at DESC);
  `;

  tableInitialized = true;
}

/**
 * Records a new birth form submission into Neon Postgres.
 */
export async function insertBirthSubmission(data: BirthSubmissionInput) {
  const sql = getDb();
  if (!sql) {
    console.warn("[Neon DB] Submission not stored: DATABASE_URL is not set.");
    return { success: false, error: "DATABASE_URL not configured" };
  }

  try {
    await initDb();

    const result = await sql`
      INSERT INTO birth_submissions (
        year,
        month,
        day,
        hour,
        minute,
        city_name,
        latitude,
        longitude,
        utc_offset,
        user_agent,
        ip_address
      ) VALUES (
        ${data.year},
        ${data.month},
        ${data.day},
        ${data.hour},
        ${data.minute},
        ${data.cityName},
        ${data.lat},
        ${data.lon},
        ${data.utcOffset},
        ${data.userAgent || null},
        ${data.ipAddress || null}
      )
      RETURNING id, submitted_at;
    `;

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    console.error("[Neon DB] Failed to insert birth submission:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

/**
 * Fetches recent submissions for administrative/diagnostic checks.
 */
export async function getRecentSubmissions(limit = 20): Promise<{
  success: boolean;
  records?: BirthSubmissionRecord[];
  error?: string;
}> {
  const sql = getDb();
  if (!sql) {
    return { success: false, error: "DATABASE_URL not configured" };
  }

  try {
    await initDb();
    const rows = await sql`
      SELECT
        id,
        year,
        month,
        day,
        hour,
        minute,
        city_name,
        latitude,
        longitude,
        utc_offset,
        submitted_at,
        user_agent,
        ip_address
      FROM birth_submissions
      ORDER BY submitted_at DESC
      LIMIT ${limit};
    `;

    return {
      success: true,
      records: rows as unknown as BirthSubmissionRecord[],
    };
  } catch (error) {
    console.error("[Neon DB] Failed to query submissions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}
