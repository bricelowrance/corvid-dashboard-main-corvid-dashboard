import Header from "../components/common/Header"
import ConsolidatedISTable from "../components/overview/ConsolidatedISTable"
import IncomeStatements from "../components/overview/IncomeStatements"
import IncomeStatements2 from "../components/overview/IncomeStatements2"

const OverviewPage = () => {
  return (
    <div className="flex-1 overflow-auto relative z-10">
        <Header title="Dashboard" />

        <main className="mx-4 py-1 px-4 lg:px-1 pb-4">
            <div className="grid grid-cols-2 gap-0 mb-8">
              <IncomeStatements />
              <IncomeStatements2 />
            </div>
            <div className="grid grid-cols-1 gap-0 mb-8">
              <ConsolidatedISTable />
            </div>
        </main>

    </div>
  )
}

export default OverviewPage