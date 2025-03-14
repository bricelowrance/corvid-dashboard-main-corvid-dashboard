import Header from "../components/common/Header"
import EditProfile from "../components/directory/EditProfile";

const Profile = () => {
  return (
    <div className="flex-1 overflow-auto relative z-10">
        <Header title="Edit Employee Profile" />

        <main className="mx-4 py-1 px-4 lg:px-1">

            <div className="grid grid-cols-1 gap-8 mb-8">
              <EditProfile />
            </div>
            
        </main>

    </div>
  )
}

export default Profile;