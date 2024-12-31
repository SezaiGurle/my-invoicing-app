import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/db";
import { Customers, Invoices } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

import Invoice from "./Invoice";

export default async function InvoicePage({ params }: { params: { invoiceId: string } }) {
    const { userId, orgId } = await auth();

    // Eğer kullanıcı yoksa `notFound` sayfasına yönlendir
    if (!userId) return notFound();

    // `params`'den gelen invoiceId'yi doğrula
    const invoiceId = Number(params.invoiceId);

    if (isNaN(invoiceId)) {
        throw new Error("Invalid Invoice ID");
    }

    let result;

    if (orgId) {
        // Organizasyon ID'si mevcutsa sorguyu buna göre yap
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
        // Organizasyon ID'si yoksa sorguyu kullanıcı ID'sine göre yap
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

    // Eğer fatura bulunamazsa `notFound` sayfasına yönlendir
    if (!result) {
        return notFound();
    }

    const invoiceData = {
        ...result.invoices,
        customer: result.customers,
    };

    // Fatura bileşenini render et
    return <Invoice invoice={invoiceData} />;
}
