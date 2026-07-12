import FinanceActsViewer from "@/components/FinanceActsViewer";
import { getFinanceActById, getFinanceActs } from "@/lib/finance-acts";

export default function FinanceActsPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const acts = getFinanceActs();

  const initialActId = Number(searchParams.id);
  const linkedAct =
    Number.isFinite(initialActId) && initialActId > 0
      ? getFinanceActById(initialActId)
      : undefined;

  return (
    <div className="mx-auto flex h-[calc(100svh-5.5rem)] max-w-[100rem] flex-col px-4 py-4 lg:px-6">
      <FinanceActsViewer acts={acts} initialActId={linkedAct?.id} />
    </div>
  );
}