import Link from 'next/link';
import { UserX } from 'lucide-react';
import { Card, Button } from '@/components/ui';

export default function PlayerNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <UserX className="w-6 h-6 text-white/40" />
        </div>
        <h2 className="text-xl font-black">Spieler nicht gefunden</h2>
        <p className="text-sm text-white/50">
          Dieser Spieler existiert nicht oder wurde entfernt.
        </p>
        <Link href="/market">
          <Button variant="gold">Zum Marktplatz</Button>
        </Link>
      </Card>
    </div>
  );
}
