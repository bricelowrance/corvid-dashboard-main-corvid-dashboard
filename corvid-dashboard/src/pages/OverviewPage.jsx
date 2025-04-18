import Header from "../components/common/Header"
import ConsolidatedISTable from "../components/overview/ConsolidatedISTable"
import IncomeStatements from "../components/overview/IncomeStatements"

const OverviewPage = () => {
  return (
    <div className="flex-1 overflow-auto relative z-10">
        <Header title="Dashboard" />

        <main className="mx-4 py-1 px-4 lg:px-1 pb-4">
            <div className="grid grid-cols-1 gap-0 mb-0 mt-4">
              <ConsolidatedISTable />
              <IncomeStatements />
            </div>
            
        </main>

    </div>
  )
}

export default OverviewPage