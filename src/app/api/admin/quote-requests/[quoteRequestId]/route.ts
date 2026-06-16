import { NextResponse } from "next/server";
import { isAdminAuthFailure, verifyAdminRequest } from "@/lib/adminAuthServer";
import { deleteQuoteRequestAdmin } from "@/lib/adminQuoteRequestsServer";
import { siteContent } from "@/lib/siteContent";

type RouteContext = {
  params: Promise<{ quoteRequestId: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const authResult = await verifyAdminRequest(request);
  if (isAdminAuthFailure(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { quoteRequestId } = await context.params;
  if (!quoteRequestId?.trim()) {
    return NextResponse.json({ error: "Missing quote request id." }, { status: 400 });
  }

  try {
    const result = await deleteQuoteRequestAdmin(siteContent.siteId, quoteRequestId.trim());

    if (process.env.NODE_ENV === "development") {
      console.log("[admin/quote-requests] deleted", {
        quoteRequestId: result.quoteRequestId,
        deletedFilesCount: result.deletedFilesCount,
        storageErrors: result.storageErrors,
        adminEmail: authResult.email,
      });
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

    return NextResponse.json({ error: message }, { status: 503 });
  }
}
