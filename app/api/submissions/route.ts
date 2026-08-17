import { NextRequest, NextResponse } from "next/server";
import { insertBirthSubmission, getRecentSubmissions } from "@/app/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { year, month, day, hour, minute, cityName, lat, lon, utcOffset } = body;

    // Validate required fields
    if (
      typeof year !== "number" ||
      typeof month !== "number" ||
      typeof day !== "number" ||
      typeof hour !== "number" ||
      typeof minute !== "number" ||
      typeof cityName !== "string" ||
      typeof lat !== "number" ||
      typeof lon !== "number" ||
      typeof utcOffset !== "number"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing birth parameters" },
        { status: 400 }
      );
    }

    // Extract client metadata
    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    const result = await insertBirthSubmission({
      year,
      month,
      day,
      hour,
      minute,
      cityName,
      lat,
      lon,
      utcOffset,
      userAgent,
      ipAddress,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API /api/submissions] Error processing request:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  const result = await getRecentSubmissions(isNaN(limit) ? 20 : limit);

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        configured: !!process.env.DATABASE_URL,
      },
      { status: result.error === "DATABASE_URL not configured" ? 200 : 500 }
    );
  }

  return NextResponse.json({
    success: true,
    configured: true,
    total: result.records?.length ?? 0,
    submissions: result.records,
  });
}
