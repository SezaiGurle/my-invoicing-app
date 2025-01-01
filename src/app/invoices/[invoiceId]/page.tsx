import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/db";
import { Customers, Invoices } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

import Invoice from "./Invoice";

export default async function InvoicePage({ params }: { params: { invoiceId: string } }) {
    // Authenticate user
    const { userId, orgId } = await auth();

    // Handle unauthenticated access
    if (!userId) {
        return notFound();
    }

    // Parse invoiceId from params
    const invoiceId = Number.parseInt(params.invoiceId, 10);

    if (isNaN(invoiceId)) {
        throw new Error("Invalid Invoice ID");
    }

    let result;

    // Fetch invoice based on orgId or userId
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

    // Handle missing invoice
    if (!result) {
        return notFound();
    }

    // Construct invoice object
    const invoice = {
        ...result.invoices,
        customer: result.customers,
    };

    // Render the Invoice component
    return <Invoice invoice={invoice} />;
}
