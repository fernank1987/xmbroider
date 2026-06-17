import { NextResponse } from "next/server";
import { isAdminAuthFailure, verifyAdminRequest } from "@/lib/adminAuthServer";
import { deleteQuoteRequestAdmin } from "@/lib/adminQuoteRequestsServer";
import { siteContent } from "@/lib/siteContent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[admin/quote-requests]";

type RouteContext = {
  params: Promise<{ quoteRequestId: string }>;
};

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function DELETE(request: Request, context: RouteContext) {
  console.log(`${LOG_PREFIX} route started`);

  const hasAuthHeader = Boolean(request.headers.get("Authorization")?.startsWith("Bearer "));
  console.log(`${LOG_PREFIX} has auth header`, hasAuthHeader);

  try {
    const authResult = await verifyAdminRequest(request, { logPrefix: LOG_PREFIX });
    if (isAdminAuthFailure(authResult)) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { quoteRequestId } = await context.params;
    if (!quoteRequestId?.trim()) {
      return errorResponse("Missing quote request id.", 400);
    }

    const result = await deleteQuoteRequestAdmin(siteContent.siteId, quoteRequestId.trim());

    console.log(`${LOG_PREFIX} deleted files count`, result.deletedFilesCount);
    console.log(`${LOG_PREFIX} Firestore doc deleted`, result.quoteRequestId);

    if (result.storageErrors.length > 0) {
      console.warn(`${LOG_PREFIX} storage warnings`, result.storageErrors);
    }

    return NextResponse.json({
      ok: true,
      quoteRequestId: result.quoteRequestId,
      deletedFilesCount: result.deletedFilesCount,
      warnings: result.storageErrors.length > 0 ? result.storageErrors : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to delete quote request.";

    console.error(`${LOG_PREFIX} caught error`, message);
    return errorResponse(message, 503);
  }
}
