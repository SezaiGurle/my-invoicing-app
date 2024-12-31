import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/db";
import { Customers, Invoices } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

import Invoice from "./Invoice";

// Define the expected shape of the params (invoiceId)
interface PageProps {
  params: {
    invoiceId: string;
  };
}

export default async function InvoicePage({ params }: PageProps) {
  const { userId, orgId } = await auth();

  if (!userId) return notFound();

  const invoiceId = Number.parseInt(params.invoiceId);

  if (isNaN(invoiceId)) {
    throw new Error("Invalid Invoice ID");
  }

  let result;

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

  if (!result) {
    notFound();
  }

  const invoices = {
    ...result.invoices,
    customer: result.customers
  };

  return <Invoice invoice={invoices} />;
}