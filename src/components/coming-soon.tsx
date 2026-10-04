import { Card } from "@/components/ui/card";

export function ComingSoon({ title, phase, bullets }: { title: string; phase: string; bullets: string[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">Planned for {phase}. See docs/ARCHITECTURE.md.</p>
      </div>
      <Card className="p-4 shadow-none">
        <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
          {bullets.map((b) => <li key={b}>{b}</li>)}
        </ul>
      </Card>
    </div>
  );
}
