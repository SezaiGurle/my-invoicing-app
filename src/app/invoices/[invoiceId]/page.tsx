import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { Customers, Invoices } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import Invoice from "./Invoice";



// Define the params interface following Next.js 13+ conventions
interface InvoicePageProps {
  params: {
    invoiceId: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function InvoicePage({
  params,
}: InvoicePageProps) {
  // Input validation
  if (!params?.invoiceId) {
    throw new Error("Missing invoiceId parameter");
  }

  const invoiceId = parseInt(params.invoiceId, 10);

  if (isNaN(invoiceId)) {
    throw new Error(`Invalid invoice ID: ${params.invoiceId}`);
  }

  // Auth validation
  const { userId, orgId } = await auth();

  if (!userId) {
    return notFound();
  }

  try {
    const query = db
      .select()
      .from(Invoices)
      .innerJoin(Customers, eq(Invoices.customerId, Customers.id))
      .limit(1);

    // Build the where clause based on authentication context
    const whereClause = orgId
      ? and(eq(Invoices.id, invoiceId), eq(Invoices.organizationId, orgId))
      : and(
          eq(Invoices.id, invoiceId),
          eq(Invoices.userId, userId),
          isNull(Invoices.organizationId)
        );

    const [result] = await query.where(whereClause);

    if (!result) {
      return notFound();
    }

    // Type-safe transformation of the result
    const invoice = {
      ...result.invoices,
      customer: result.customers,
    };

    return <Invoice invoice={invoice} />;
  } catch (error) {
    console.error("Failed to fetch invoice:", error);
    throw new Error("Failed to fetch invoice data");
  }
}