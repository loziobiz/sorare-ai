import { LineupBuilder } from "@/components/lineup/lineup-builder";

export default function LineupPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-4 md:p-6">
      <div className="mx-auto max-w-[1600px]">
        <LineupBuilder />
      </div>
    </main>
  );
}
