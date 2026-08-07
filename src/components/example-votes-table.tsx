import type { ExampleVote } from "@/lib/data";

const voteStyles: Record<string, string> = {
  AFIRMATIVO:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  NEGATIVO: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  ABSTENCION:
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  AUSENTE: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function ExampleVotesTable({ votes }: { votes: ExampleVote[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          <tr>
            <th className="px-3 py-2 font-medium">Legislador/a</th>
            <th className="px-3 py-2 font-medium">Distrito</th>
            <th className="px-3 py-2 font-medium">Lista</th>
            <th className="px-3 py-2 font-medium">Ley</th>
            <th className="px-3 py-2 font-medium">Voto</th>
          </tr>
        </thead>
        <tbody>
          {votes.map((row, index) => (
            <tr
              key={`${row.legislador}-${row.ley}-${index}`}
              className="border-t border-zinc-200 dark:border-zinc-800"
            >
              <td className="px-3 py-2">{row.legislador}</td>
              <td className="px-3 py-2">{row.distrito}</td>
              <td className="px-3 py-2">{row.lista}</td>
              <td className="px-3 py-2">{row.ley}</td>
              <td className="px-3 py-2">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                    voteStyles[row.voto] ?? voteStyles.AUSENTE
                  }`}
                >
                  {row.voto}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
