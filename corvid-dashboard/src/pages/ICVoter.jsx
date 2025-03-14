import Header from "../components/common/Header"
import ICVoterTables from "../components/incentivecomp/ICVoterTables";

const ICVoter = () => {
  return (
    <div className="flex-1 overflow-auto relative z-10">
        <Header title="Incentive Compensation" />
        <main className="mx-4 py-1 px-4 lg:px-1">
            <div className="gap-8 mt-6 mb-4">
              <ICVoterTables />
            </div>  
        </main>
    </div>
  )
}
export default ICVoter;