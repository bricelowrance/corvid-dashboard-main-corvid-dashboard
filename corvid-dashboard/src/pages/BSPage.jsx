import Header from "../components/common/Header"
import ConsolidatedBSTable from "../components/overview/ConsolidatedBSTable"
import BalanceSheets from "../components/overview/BalanceSheets";
import BalanceSheets2 from "../components/overview/BalanceSheets2";

const BSPage = () => {
  return (
    <div className="flex-1 overflow-auto relative z-10">
        <Header title="Dashboard" />

        <main className="mx-4 py-1 px-4 lg:px-1 pb-4">

            <div className="grid grid-cols-2 gap-0 mb-8">
                <BalanceSheets />
                <BalanceSheets2 />
            </div>
            <ConsolidatedBSTable />
        </main>

    </div>
  )
}

export default BSPage;