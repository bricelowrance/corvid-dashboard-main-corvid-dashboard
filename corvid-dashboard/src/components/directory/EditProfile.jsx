import React, { useState, useEffect } from "react";

const EditProfile = () => {
    const [profile, setProfile] = useState({
        first_name: "",
        last_name: "",
        email: "",
        title: "",
        office: "",
        bio: "",
    });

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser?.email) {
            fetch(`http://localhost:5001/profile?email=${storedUser.email}`)
                .then((response) => response.json())
                .then((data) => {
                    if (data) {
                        setProfile(data);
                    }
                })
                .catch((error) => console.error("Error fetching profile:", error));
        }
    }, []);

    const handleChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        fetch("http://localhost:5001/update-profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(profile),
        })
            .then((response) => response.json())
            .then((data) => alert(data.message))
            .catch((error) => console.error("Error updating profile:", error));
    };

    return (
        <div className="flex flex-col items-center pt-6 h-full">
            <div className="bg-white shadow-lg p-10 border border-gray-700 w-full h-30px">
                <h2 className="text-xl font-extrabold text-corvid-blue mb-6 text-center">

                </h2>
                <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                    <input type="text" name="first_name" value={profile.first_name} disabled className="text-corvid-blue border p-2 rounded bg-gray-100" />
                    <input type="text" name="last_name" value={profile.last_name} disabled className="text-corvid-blue border p-2 rounded bg-gray-100" />
                    <input type="email" name="email" value={profile.email} disabled className="text-corvid-blue border p-2 rounded bg-gray-100" />
                    <input type="text" name="title" value={profile.title} onChange={handleChange} className="text-corvid-blue border p-2 rounded" placeholder="Title" />
                    <input type="text" name="office" value={profile.office} onChange={handleChange} className="text-corvid-blue border p-2 rounded" placeholder="Office" />
                    <textarea name="bio" value={profile.bio} onChange={handleChange} className="text-corvid-blue border p-2 rounded" placeholder="Bio"></textarea>
                    <button type="submit" className="bg-gray-200 text-corvid-blue font-bold p-2 rounded">Save Changes</button>
                </form>
            </div>
        </div>
    );
};

export default EditProfile;


