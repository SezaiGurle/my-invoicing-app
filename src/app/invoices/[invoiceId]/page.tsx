import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { Customers, Invoices } from "@/db/schema";
import Invoice from "./Invoice";

export default async function InvoicePage({
  params,
}: { params: { invoiceId: string } }) {
  const { userId } = await auth();

  if (!userId) return;

  const invoiceId = Number.parseInt(params.invoiceId);

  if (Number.isNaN(invoiceId)) {
    throw new Error("Invalid Invoice ID");
  }

  // Veritabanı sorgusuyla bir sonuç alıyoruz
  const [result]: Array<{
    invoices: typeof Invoices.$inferSelect;
    customers: typeof Customers.$inferSelect;
  }> = await db
    .select()
    .from(Invoices)
    .innerJoin(Customers, eq(Invoices.customerId, Customers.id))
    .limit(1);

  if (!result) {
    return notFound();
  }

  const invoice = {
    ...result.invoices,
    customer: result.customers,
  };

  return <Invoice invoice={invoice} />;
}
