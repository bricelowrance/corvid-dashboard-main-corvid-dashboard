import { BarChart2, Menu, LogOut, Vote, Landmark, BookUser, UserRoundPen } from "lucide-react";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";

const ALL_SIDEBAR_ITEMS = [
    { name: "Income Statement", icon: BarChart2, color: "#23356b", href: "/", roles: ["ADMIN", "FINANCE", "EXECUTIVE"] },
    { name: "Balance Sheet", icon: BarChart2, color: "#23356b", href: "/bs", roles: ["ADMIN", "FINANCE", "EXECUTIVE"] },
    { name: "Statement of Cash Flow", icon: BarChart2, color: "#23356b", href: "/cf", roles: ["ADMIN", "FINANCE", "EXECUTIVE"] },
    { name: "IC Vote", icon: Vote, color: "#23356b", href: "/vote", roles: ["ADMIN", "EMPLOYEE"] },
    { name: "IC Manage", icon: Vote, color: "#23356b", href: "/manage", roles: ["ADMIN", "EMPLOYEE"] },
    { name: "IC Exec", icon: Landmark, color: "#23356b", href: "/exec", roles: ["ADMIN", "EXECUTIVE"] }, 
    { name: "Employee Directory", icon: BookUser, color: "#23356b", href: "/direct", roles: ["ADMIN", "FINANCE", "EXECUTIVE", "EMPLOYEE"] },
    { name: "Edit Profile", icon: UserRoundPen, color: "#23356b", href: "/profile", roles: ["ADMIN", "FINANCE", "EXECUTIVE", "EMPLOYEE"] },
    { name: "IC Admin", icon: UserRoundPen, color: "#23356b", href: "/icadmin", roles: ["ADMIN"] },
    { name: "Track ADMIN", icon: UserRoundPen, color: "#23356b", href: "/at", roles: ["ADMIN"] },
];

const Sidebar = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [user, setUser] = useState({ name: "", picture: "", email: "" });
    const [userRole, setUserRole] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
            setUser({
                name: `${storedUser.firstName} ${storedUser.lastName}` || "Guest",
                picture: storedUser.picture || "/CorvidLogo_Blue.png",
                email: storedUser.email || "",
            });
        }
    }, []);

    useEffect(() => {
        const fetchUserRole = async () => {
            if (!user.email) return; 

            try {
                const response = await fetch(`http://localhost:5001/user-role?email=${user.email}`);
                const data = await response.json();

                if (data.role) {
                    setUserRole(data.role);
                } else {
                    console.error("User role not found");
                }
            } catch (error) {
                console.error("Error fetching user role:", error);
            }
        };

        fetchUserRole();
    }, [user.email]);

    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/login");
        window.location.reload();
    };

    const sidebarItems = ALL_SIDEBAR_ITEMS.filter(item => !item.roles || item.roles.includes(userRole));

    return (
        <motion.div
            className={`relative z-10 transition-all duration-300 ease-in-out flex-shrink-0
                ${isSidebarOpen ? "w-64" : "w-20"}`}
            animate={{ width: isSidebarOpen ? 256 : 80 }}
        >
            <div className="h-screen bg-white bg-opacity-100 backdrop-blur-md flex flex-col border-r border-gray-700">

                {/* Sidebar Header */}
                <div className="flex justify-between items-center p-4">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-full hover:bg-gray-300 transition-colors"
                    >
                        <Menu size={24} color={"#23356b"} />
                    </motion.button>

                    {isSidebarOpen && (
                        <motion.button
                            onClick={handleLogout}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 rounded-full hover:bg-red-500 transition-colors"
                        >
                            <LogOut size={24} color={"#23356b"} />
                        </motion.button>
                    )}
                </div>

                {/* User Profile Section */}
                <div className="p-4 flex items-center justify-center">
                    <img
                        src="/CorvidLogo_Blue.png"
                        alt="Logo"
                        className={`transition-all duration-300 ${isSidebarOpen ? "w-32" : "w-10"}`}
                    />
                </div>
                <div className="flex flex-col items-center py-6">
                    <img
                        src={user.picture}
                        alt="User Profile"
                        className={`rounded-full border-2 border-gray-600 object-cover transition-all duration-300 ${isSidebarOpen ? "w-20 h-20" : "w-10 h-10"}`}
                    />
                    <AnimatePresence>
                        {isSidebarOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-center mt-3"
                            >
                                <p className="text-corvid-blue text-lg font-semibold">
                                    {user.name}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Sidebar Navigation */}
                <div className="flex-grow overflow-y-auto">
                    <nav className="mt-4">
                        {sidebarItems.map((item) => (
                            <Link to={item.href} key={item.name}>
                                <div className={`flex items-center ${isSidebarOpen ? "justify-between" : "justify-center"} p-4 text-sm text-corvid-blue font-medium rounded-lg hover:bg-gray-300 transition-colors cursor-pointer`}>
                                    <div className="flex items-center">
                                        <item.icon size={20} style={{ color: item.color, minWidth: "20px" }} />
                                        <AnimatePresence>
                                            {isSidebarOpen && (
                                                <motion.span
                                                    className="ml-4 whitespace-nowrap"
                                                    initial={{ opacity: 0, width: 0 }}
                                                    animate={{ opacity: 1, width: "auto" }}
                                                    exit={{ opacity: 0, width: 0 }}
                                                >
                                                    {item.name}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>
        </motion.div>
    );
};

export default Sidebar;




