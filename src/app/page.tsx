
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex items-center justify-center h-screen text-center">
      <div className="flex flex-col gap-6 max-w-5xl">
        <h1 className="text-5xl font-bold">Invoicipedia</h1>
        <p>
        
          <Button asChild>
            <Link href="/dashboard">Sign In</Link>
          </Button>
        </p>
      </div>
    </main>
  );
}
