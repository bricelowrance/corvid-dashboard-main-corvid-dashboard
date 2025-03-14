import Header from "../components/common/Header"
import ConsolidatedCFTable from "../components/overview/ConsolidatedCFTable"

const CFPage = () => {
  return (
    <div className="flex-1 overflow-auto relative z-10">
        <Header title="Dashboard" />

        <main className="mx-4 py-1 px-4 lg:px-1 pb-4">

            <div className="w-full">
                <ConsolidatedCFTable />
            </div>
            
        </main>

    </div>
  )
}

export default CFPage;