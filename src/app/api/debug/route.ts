import { NextResponse } from "next/server";
import * as baniDB from "@sttm/banidb";

export async function GET() {
  return NextResponse.json(baniDB);
}
