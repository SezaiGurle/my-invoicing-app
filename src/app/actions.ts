"use server";

import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { Resend } from 'resend';

import { Customers, Invoices, Status } from '@/db/schema';
import { db } from '@/db';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';

import { InvoiceCreatedEmail } from '@/emails/invoice-created';

const stripe = new Stripe(String(process.env.STRIPE_API_SECRET));
const resend = new Resend(process.env.RESEND_API_KEY);

export async function createAction(formData: FormData) {
    const { userId, orgId } = await auth();

    if (!userId) {
        return;
    }

    const value = Math.floor(parseFloat(String(formData.get('value'))));
    const description = formData.get('description') as string;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;

    const [customer] = await db.insert(Customers)
        .values({
            name,
            email,
            userId,
            organizationId: orgId || null
        })
        .returning({
            id: Customers.id
        });

    const results = await db.insert(Invoices)
        .values({
            value,
            description,
            userId,
            customerId: customer.id,
            status: 'open',
            organizationId: orgId || null
        })
        .returning({
            id: Invoices.id
        });

    const { data, error } = await resend.emails.send({
        from: 'S-G <info@email.sezaigurle.dev>',
        to: [email],
        subject: 'You Have a New Invoice',
        react: InvoiceCreatedEmail({ invoiceId: results[0].id }),
    });

    redirect(`/invoices/${results[0].id}`);
}

export async function updateStatusAction(formData: FormData) {
    const { userId } = await auth();

    if (!userId) {
        return;
    }

    const id = formData.get('id') as string;
    const status = formData.get('status') as string;

    const results = await db.update(Invoices)
        .set({ status })
        .where(
            and(
                eq(Invoices.id, parseInt(id)),
                eq(Invoices.userId, userId)
            )
        );

    // Revalidation is now triggered via the new API route
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Ensure your app's base URL
    await fetch(`${origin}/api/revalidate?path=/invoices/${id}`);
}

export async function deleteInvoiceAction(formData: FormData) {
    const { userId } = await auth();

    if (!userId) {
        return;
    }

    const id = formData.get('id') as string;

    const results = await db.delete(Invoices)
        .where(
            and(
                eq(Invoices.id, parseInt(id)),
                eq(Invoices.userId, userId)
            )
        );

    redirect(`/dashboard`);
}

export async function createPayment(formData: FormData) {
    const headersList = headers();
    const origin = (await headersList).get('origin');
    const id = parseInt(formData.get('id') as string);

    const [result] = await db.select({
        status: Invoices.status,
        value: Invoices.value,
    })
        .from(Invoices)
        .where(eq(Invoices.id, id))
        .limit(1);

    const session = await stripe.checkout.sessions.create({
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product: 'prod_RUlOPWyXmyHs9r',
                    unit_amount: result.value,
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        success_url: `${origin}/invoices/${id}/payment?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/invoices/${id}/payment?status=canceled&session_id={CHECKOUT_SESSION_ID}`,
    });

    if (!session.url) {
        throw new Error('Invalid Session');
    }

    redirect(session.url);
}
