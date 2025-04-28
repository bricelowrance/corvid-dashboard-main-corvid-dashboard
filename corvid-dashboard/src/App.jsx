import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import OverviewPage from "./pages/OverviewPage";
import BSPage from "./pages/BSPage";
import CFPage from "./pages/CFPage";
import ICVoter from "./pages/ICVoter";
import Directory from "./pages/Directory";
import Profile from "./pages/Profile";
import LoginPage from "./pages/LoginPage";
import ICManage from "./pages/ICManage";
import { googleLogout } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode"; 
import ICExec from "./pages/ICExec";
import ICAdmin from "./pages/ICAdmin";
import AdminTrack from "./pages/AdminTrack";

function App() {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleLoginSuccess = (credentialResponse) => {
        if (credentialResponse?.credential) {
            const decoded = jwtDecode(credentialResponse.credential);
            console.log("User Info:", decoded);
            setUser(decoded);
            localStorage.setItem("user", JSON.stringify(decoded)); 

            setTimeout(() => {
                navigate("/", { replace: true });
                window.location.reload(); 
            }, 500);
        }
    };

    const handleLogout = () => {
        googleLogout();
        setUser(null);
        localStorage.removeItem("user");
        navigate("/login");
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <div className="fixed inset-0 -z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-[#23356b] via-[#2d447c] to-[#23356b] opacity-50" />
                <div className="absolute inset-0 backdrop-blur-sm" />
            </div>

            <Routes>
                <Route
                    path="/login"
                    element={
                        !user ? (
                            <LoginPage onLoginSuccess={handleLoginSuccess} />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />

                {user ? (
                    <Route
                        path="/*"
                        element={
                            <div className="flex h-screen">
                                <Sidebar />
                                    <Routes>
                                        <Route path="/" element={<OverviewPage />} />
                                        <Route path="/bs" element={<BSPage />} />
                                        <Route path="/cf" element={<CFPage />} />
                                        <Route path="/vote" element={<ICVoter />} />
                                        <Route path="/manage" element={<ICManage />} />
                                        <Route path="/icadmin" element={<ICAdmin />} />
                                        <Route path="/exec" element={<ICExec />} />
                                        <Route path="/direct" element={<Directory />} />
                                        <Route path="/at" element={<AdminTrack />} />
                                        <Route path="/profile" element={<Profile />} />
                                        <Route path="*" element={<Navigate to="/" />} />
                                    </Routes>
                                </div>
                        }
                    />
                ) : (
                    <Route path="*" element={<Navigate to="/login" replace />} />
                )}
            </Routes>
        </div>
    );
}

export default App;



