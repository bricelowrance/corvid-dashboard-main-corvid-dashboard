import Header from "../components/common/Header"
import EmployeeDirectory from "../components/directory/EmployeeDirectory";

const Directory = () => {
  return (
    <div className="flex-1 overflow-auto relative z-10">
        <Header title="Employee Directory" />

        <main className="mx-4 py-1 px-4 lg:px-1">

            <div className="pt-6">
              <EmployeeDirectory />
            </div>
            
        </main>

    </div>
  )
}

export default Directory;