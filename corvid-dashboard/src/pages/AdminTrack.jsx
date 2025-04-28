import Header from "../components/common/Header"
import AdminTracking from "../components/hiretracking/AdminTracking";


const AdminTrack = () => {
  return (
    <div className="flex-1 overflow-auto relative z-10">
        <Header title="New Hire Tracking - Admin" />

        <main className="mx-4 py-1 px-4 lg:px-1">

            <div className="pt-6">
              <AdminTracking />
            </div>

        </main>

    </div>
  )
}

export default AdminTrack;