import React, { useState, useEffect } from "react";

const EmployeeDirectory = () => {
    const [employees, setEmployees] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    useEffect(() => {
        fetch("http://localhost:5001/directory")
            .then((response) => response.json())
            .then((data) => setEmployees(data))
            .catch((error) => console.error("Error fetching employees:", error));
    }, []);

    const handleRowClick = (employee) => {
        setSelectedEmployee(employee);
    };

    const filteredEmployees = employees.filter(emp =>
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.dept.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="flex flex-1 h-screen w-full">
          <div className="bg-white shadow-lg p-10 border border-gray-700 flex flex-1 h-full">
              {/* Left side*/}
              <div className="w-2/3 pr-4 flex flex-col h-full">
                  <input
                      type="text"
                      placeholder="Search by Name or Department..."
                      className="w-full p-2 mb-3 border border-gray-300 rounded text-corvid-blue"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="flex-1 overflow-y-auto">
                      <table className="w-full table-fixed divide-y divide-gray-700 text-sm">
                          <thead>
                              <tr>
                                  <th className="w-1/3 px-2 py-2 text-left font-bold text-corvid-blue uppercase">Name</th>
                                  <th className="w-1/3 px-2 py-2 text-left font-bold text-corvid-blue uppercase">Department</th>
                                  <th className="w-1/3 px-2 py-2 text-left font-bold text-corvid-blue uppercase">Email</th>
                              </tr>
                          </thead>
                          <tbody>
                              {filteredEmployees.map((employee, index) => (
                                  <tr
                                      key={index}
                                      className={`border-b border-gray-100 cursor-pointer transition-all duration-200 ${
                                          selectedEmployee?.full_name === employee.full_name ? "bg-gray-200 " : "bg-white"
                                      }`}
                                      onClick={() => handleRowClick(employee)}
                                  >
                                      <td className="px-4 py-2 text-corvid-blue font-bold">{employee.full_name}</td>
                                      <td className="px-4 py-2 text-corvid-blue">{employee.dept}</td>
                                      <td className="px-4 py-2 text-corvid-blue">{employee.email}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>

              {/* Divider */}
              <div className="w-px bg-gray-700"></div>

              {/* Right side */}
              <div className="w-1/3 pl-4 flex flex-col">
                  {selectedEmployee && (
                      <div className="p-4 bg-gray-200 border-gray-300 rounded">
                          <h3 className="p-5 text-center text-xl font-bold text-corvid-blue">{selectedEmployee.full_name}</h3>
                          <p className="px-4 py-2 text-lg text-corvid-blue"><strong>Department:</strong> {selectedEmployee.dept}</p>
                          <p className="px-4 py-2 text-lg text-corvid-blue"><strong>Email:</strong> {selectedEmployee.email}</p>
                          <p className="px-4 py-2 text-lg text-corvid-blue"><strong>Phone:</strong> {selectedEmployee.phone}</p>
                          <p className="px-4 py-2 text-lg text-corvid-blue"><strong>Job Title:</strong> {selectedEmployee.title}</p>
                          <p className="px-4 py-2 text-lg text-corvid-blue"><strong>Office:</strong> {selectedEmployee.office}</p>
                          <p className="px-4 py-2 text-lg text-corvid-blue"><strong>Bio:</strong> {selectedEmployee.bio}</p>
                      </div>
                  )}
              </div>
          </div>
      </div>
  );
};

export default EmployeeDirectory;

