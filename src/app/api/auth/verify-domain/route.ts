import { NextRequest, NextResponse } from "next/server";

const COLLEGE_NAMES: Record<string, string> = {
  gla:    "GLA University",
  iitbhu: "IIT BHU",
};

function collegeName(domain: string): string {
  for (const [key, name] of Object.entries(COLLEGE_NAMES)) {
    if (domain.includes(key)) return name;
  }
  return domain;
}

export async function POST(req: NextRequest) {
  let email: string;
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Malformed email" }, { status: 400 });
  }

  const domain = email.split("@")[1].toLowerCase();
  const allowed_env = process.env.ALLOWED_DOMAINS ?? "";
  const allowedDomains = allowed_env
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  const allowed = allowedDomains.includes(domain);

  return NextResponse.json({
    allowed,
    collegeName: allowed ? collegeName(domain) : null,
  });
}
