import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/db";
import { Customers, Invoices } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

import Invoice from "./Invoice";

// Define the expected shape of the params
interface PageProps {
  params: Promise<{
    invoiceId: string;
  }>;
}

export default async function InvoicePage({ params }: PageProps) {
  // Await params to resolve the Promise
  const resolvedParams = await params.catch(() => null);

  if (!resolvedParams || !resolvedParams.invoiceId) {
    throw new Error("Failed to resolve params or missing invoiceId.");
  }

  const { invoiceId: invoiceIdString } = resolvedParams;

  const { userId, orgId } = await auth();

  if (!userId) return notFound();

  const invoiceId = parseInt(invoiceIdString, 10);

  if (isNaN(invoiceId)) {
    throw new Error("Invalid Invoice ID");
  }

  let result;

  try {
    if (orgId) {
      [result] = await db
        .select()
        .from(Invoices)
        .innerJoin(Customers, eq(Invoices.customerId, Customers.id))
        .where(
          and(
            eq(Invoices.id, invoiceId),
            eq(Invoices.organizationId, orgId)
          )
        )
        .limit(1);
    } else {
      [result] = await db
        .select()
        .from(Invoices)
        .innerJoin(Customers, eq(Invoices.customerId, Customers.id))
        .where(
          and(
            eq(Invoices.id, invoiceId),
            eq(Invoices.userId, userId),
            isNull(Invoices.organizationId)
          )
        )
        .limit(1);
    }
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to fetch invoice.");
  }

  if (!result) {
    return notFound();
  }

  const invoices = {
    ...result.invoices,
    customer: result.customers,
  };

  return <Invoice invoice={invoices} />;
}
