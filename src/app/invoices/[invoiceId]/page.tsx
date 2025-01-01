import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/db";
import { Customers, Invoices } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

import Invoice from "./Invoice";

// Define PageProps based on your app's expected shape
interface PageProps {
    params: {
        invoiceId: string;
    };
    searchParams?: Record<string, string | string[] | undefined>;
}

export default async function InvoicePage({ params }: PageProps) {
    const { userId, orgId } = await auth();

    // Redirect to `notFound` page if the user is not authenticated
    if (!userId) return notFound();

    // Validate the `invoiceId` from params
    const invoiceId = Number(params.invoiceId);

    if (isNaN(invoiceId)) {
        throw new Error("Invalid Invoice ID");
    }

    let result;

    if (orgId) {
        // Query based on the organization ID
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
        // Query based on the user ID if organization ID is not present
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

    // Redirect to `notFound` page if no invoice is found
    if (!result) {
        return notFound();
    }

    const invoiceData = {
        ...result.invoices,
        customer: result.customers,
    };

    // Render the invoice component
    return <Invoice invoice={invoiceData} />;
}
