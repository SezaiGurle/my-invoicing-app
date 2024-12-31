// src/app/api/revalidate/route.ts

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');

    if (path) {
        await revalidatePath(path);
        return NextResponse.json({ message: `Revalidation triggered for ${path}` });
    }

    return NextResponse.json({ message: 'Path not provided' }, { status: 400 });
}
