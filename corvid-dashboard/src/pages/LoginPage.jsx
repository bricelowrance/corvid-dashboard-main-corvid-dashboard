import React from "react";
import { motion } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

const LoginPage = ({ onLoginSuccess }) => {
    const handleLoginSuccess = (credentialResponse) => {
        if (credentialResponse?.credential) {
            const decoded = jwtDecode(credentialResponse.credential);
            console.log("User Info:", decoded);
            
            const user = {
                email: decoded.email,
                firstName: decoded.given_name,
                lastName: decoded.family_name,
                picture: decoded.picture 
            };
    
            localStorage.setItem("user", JSON.stringify(user)); 
            onLoginSuccess(user);
    
            setTimeout(() => {
                window.location.href = "/";
            }, 500);
        }
    };

    return (
        <div className="flex-1 overflow-auto relative z-10">
            <div className="flex items-center justify-center min-h-screen bg-corvid-blue">
                <motion.div
                    className="bg-white bg-opacity-100 backdrop-blur-md shadow-lg rounded-xl p-8 border border-gray-700 w-[600px]"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="flex justify-center items-center">
                        <img
                            src="/CorvidLogo_Blue.png"
                            alt="Logo"
                            className="h-20 w-auto mb-6"
                        />
                    </div>
                    <h2 className="text-3xl font-medium text-corvid-blue mb-6 text-center">
                        
                    </h2>
                    <div className="flex flex-col items-center space-y-4">
                        <GoogleLogin
                            onSuccess={handleLoginSuccess}
                            onError={() => console.log("Login Failed")}
                        />   
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default LoginPage;




