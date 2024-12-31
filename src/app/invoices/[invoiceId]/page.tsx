import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/db";
import { Customers, Invoices } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

import Invoice from "./Invoice";

interface InvoicePageParams {
    invoiceId: string;
}

interface InvoicePageProps {
    params: InvoicePageParams;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
    const { userId, orgId } = await auth();

    // Kullanıcı kimliği yoksa 404 döndür
    if (!userId) return notFound();

    // params'ı bekle
    const { invoiceId: rawInvoiceId } = await params; // params'ı async bekliyoruz
    const invoiceId = Number.parseInt(rawInvoiceId);

    // Geçersiz ID'yi kontrol et
    if (isNaN(invoiceId)) {
        throw new Error("Invalid Invoice ID");
    }

    let result;

    // Organizasyon ID'sine göre sorgu yap
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
        // Kullanıcı ID'sine göre sorgu yap
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

    // Sonuç bulunamazsa 404 döndür
    if (!result) {
        return notFound();
    }

    const invoices = {
        ...result.invoices,
        customer: result.customers
    };

    return <Invoice invoice={invoices} />;
}
