import Header from "../components/common/Header"
import ICAdminTools from "../components/incentivecomp/ICAdminTools";

const ICAdmin = () => {
  return (
    <div className="flex-1 overflow-auto relative z-10">
        <Header title="Incentive Compensation" />

        <main className="mx-4 py-1 px-4 lg:px-1 pb-4">

            <div className="w-full">
              <ICAdminTools />
            </div>
            
        </main>

    </div>
  )
}

export default ICAdmin;