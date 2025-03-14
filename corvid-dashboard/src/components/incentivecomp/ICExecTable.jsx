import React, { useState, useEffect } from "react";

const ICExecTable = () => {

    const [charges, setCharges ] = useState([]);
    const [allocationsMap, setAllocationsMap] = useState({});
    const [allocations, setAllocations] = useState([]);
    const [totalAllocation, setTotalAllocation] = useState(0);
    const [selectedCharge, setSelectedCharge] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [subMods, setSubMods] = useState({}); 
    const [expandedMods, setExpandedMods] = useState({}); 

    useEffect(() => {
        fetch("http://localhost:5001/directory") 
            .then((response) => response.json())
            .then((data) => setEmployees(data))
            .catch((error) => console.error("Error fetching employees:", error));
    }, []);

    useEffect(() => {
        fetch("http://localhost:5001/exec-data")
            .then((response) => response.json())
            .then((data) => setCharges(data))
            .catch((error) => console.error("Error fetching miml data:", error));
    }, []);

    useEffect(() => {
        if (charges.length > 0 && !selectedCharge) {
            handleRowClick(charges[0]);
        }
    }, [charges]);
    
    const handleRowClick = async (charge) => {
        setSelectedCharge(charge);
    
        fetch(`http://localhost:5001/allocations/${charge.mod_id}`)
            .then((response) => response.json())
            .then((data) => setAllocations(Array.isArray(data) ? data : []))
            .catch((error) => console.error("Error fetching allocations:", error));
    
        fetch(`http://localhost:5001/breakouts/${charge.mod_id}`)
            .then((response) => response.json())
            .then((breakoutData) => {
                if (breakoutData.length > 0) {
                    setSubMods((prev) => ({
                        ...prev,
                        [charge.mod_id]: breakoutData.map((b) => ({
                            mod_id: b.breakout_id,
                            parent_mod_id: b.mod_id,
                            charge_code: b.charge_code,
                            funding_amount: b.funding_amount,
                            funding_type: b.funding_type,
                            isSubmitted: true
                        }))
                    }));
                }
            })
            .catch((error) => console.error(`Error fetching breakouts for ${charge.mod_id}:`, error));
    };
    
    
    const handleApprove = () => {
        if (!selectedCharge || allocations.length === 0) {
            console.log("No selected charge or allocations found.");
            return;
        }
    
        const approvals = allocations.map((employeeData, index) => {
            const inputElement = document.getElementById(`allocation-input-${index}`);
            const newAllocation = inputElement.value ? parseFloat(inputElement.value) : undefined;
    
            const avgAllocation = (
                employeeData.allocations.reduce((sum, val) => sum + val, 0) / employeeData.allocations.length
            ).toFixed(2);
    
            const approvalData = {
                mod_id: selectedCharge.mod_id,
                employee_name: employeeData.employee_name,
                new_allocation: newAllocation,
                calculated_average: avgAllocation
            };
    
            console.log("Sending approval:", approvalData);
            return approvalData;
        });
    
        approvals.forEach(async (approval) => {
            try {
                const response = await fetch("http://localhost:5001/approve-allocation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(approval),
                });
    
                const responseData = await response.json();
                console.log("Response from server:", responseData);
    
                if (!response.ok) {
                    throw new Error("Failed to approve allocation.");
                }
            } catch (error) {
                console.error("Error approving allocation:", error);
            }
        });
    
        alert("Allocations approved successfully!");
    };
    
    

    return (
        <div className="flex flex-col items-center pt-6">
            <div className="bg-white shadow-lg p-10 border border-gray-700 w-full">
                <h2 className="text-xl font-extrabold text-corvid-blue mb-6 text-center">
                    Incentive Compensation Allocation
                </h2>

                {/* LARGER TABLE */}

                <div className="flex">
                    <div className="w-3/5 pr-4 h-screen overflow-y-auto">
                        <table className="w-full table-fixed divide-y divide-gray-700 text-sm">
                            <thead className="sticky top-0 bg-white">
                                <tr>
                                    <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Mod ID:</th>
                                    <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Charge Code</th>
                                    <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Funding Type</th>
                                    <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Funding Amount</th>
                                    <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Payout Percentage</th>
                                    <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Total Payout</th>
                                </tr>
                            </thead>
                            <tbody>
                                {charges.map((charge, index) => (
                                    <tr
                                        key={index}
                                        className={`border-b border-gray-200 cursor-pointer ${
                                            selectedCharge?.mod_id === charge.mod_id &&
                                            selectedCharge?.charge_code === charge.charge_code &&
                                            selectedCharge?.funding_type === charge.funding_type &&
                                            selectedCharge?.funding_amount === charge.funding_amount
                                                ? "bg-gray-200 text-corvid-blue"
                                                : "text-corvid-blue"
                                        }`}
                                        onClick={() => handleRowClick(charge)}
                                    >
                                        <td className="px-2 py-2 font-bold">{charge.mod_id}</td>
                                        <td className="px-2 py-2 font-bold">{charge.charge_code}</td>
                                        <td className="px-2 py-2 font-bold">{charge.funding_type}</td>
                                        <td className="px-2 py-2 font-bold">
                                            {charge.funding_amount && charge.funding_amount !== 0
                                                ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(charge.funding_amount)
                                                : "N/A"}
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                className="w-full border px-2 py-1"
                                                value={charge.payout_percentage || ""}
                                                onChange={(e) => {
                                                    let updatedCharges = [...charges];
                                                    updatedCharges[index].payout_percentage = parseFloat(e.target.value) || 0;
                                                    setCharges(updatedCharges);
                                                }}
                                            />
                                        </td>
                                        <td className="px-2 py-2 font-bold">
                                            {charge.funding_amount && charge.payout_percentage
                                                ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
                                                    .format((charge.funding_amount * (charge.payout_percentage / 100)))
                                                : "$0.00"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>`


                    <div className="w-px bg-gray-700"></div>

                    {/* SMALLER TABLE */}

                    <div className="w-2/5 pl-4">
                        <div>
                            {selectedCharge && (
                                <div className="mb-4 p-4 bg-gray-200 border-gray-300 rounded">
                                    <h3 className="pb-2 text-center text-md font-bold text-corvid-blue">Selected Mod: {selectedCharge.mod_id}</h3>
                                    <p className="text-sm text-corvid-blue"><strong>Charge Code:</strong> {selectedCharge.charge_code}</p>
                                    <p className="text-sm text-corvid-blue"><strong>Customer:</strong> {selectedCharge.customer}</p>
                                    <p className="text-sm text-corvid-blue"><strong>Funding Amount:</strong> {selectedCharge.funding_amount && selectedCharge.funding_amount !== 0
                                        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(selectedCharge.funding_amount)
                                        : "N/A"}
                                    </p>
                                    <p className="text-sm text-corvid-blue"><strong>Mod Type:</strong> {selectedCharge.mod_type}</p>
                                    <p className="text-sm text-corvid-blue"><strong>Contract Type:</strong> {selectedCharge.contract_type}</p>
                                    <p className="text-sm text-corvid-blue"><strong>Description:</strong> {selectedCharge.description}</p>
                                    <p className="text-sm text-corvid-blue"><strong>Capture Leads:</strong></p>
                                    <p className="text-sm text-corvid-blue"><strong></strong> {selectedCharge.capture_one}</p>
                                    <p className="text-sm text-corvid-blue"><strong></strong>{selectedCharge.capture_two}</p>
                                    <p className="text-sm text-corvid-blue"><strong></strong>{selectedCharge.capture_three}</p>
                                    <p className="text-sm text-corvid-blue"><strong></strong>{selectedCharge.capture_four}</p>
                                </div>
                            )}
                        </div>
                        <table className="w-full table-fixed divide-y divide-gray-700 text-xs">
                            <thead>
                                <tr>
                                    <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Name</th>
                                    <th className="px-2 py-2 text-center font-bold text-corvid-blue uppercase">Vote 1</th>
                                    <th className="px-2 py-2 text-center font-bold text-corvid-blue uppercase">Vote 2</th>
                                    <th className="px-2 py-2 text-center font-bold text-corvid-blue uppercase">Vote 3</th>
                                    <th className="px-2 py-2 text-center font-bold text-corvid-blue uppercase">Avg.</th>
                                    <th className="px-2 py-2 text-center font-bold text-corvid-blue uppercase">Edit Avg.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-300">
                                {allocations.map((employeeData, index) => {
                                    const allocationsList = employeeData.allocations;
                                    const formattedVotes = [
                                        allocationsList[0] !== undefined ? `${allocationsList[0]}%` : "",
                                        allocationsList[1] !== undefined ? `${allocationsList[1]}%` : "",
                                        allocationsList[2] !== undefined ? `${allocationsList[2]}%` : "",
                                    ];

                                    const avgAllocation = (
                                        allocationsList.reduce((sum, val) => sum + val, 0) / allocationsList.length
                                    ).toFixed(2);

                                    return (
                                        <tr key={index}>
                                            <td className="px-2 py-2 text-left font-bold text-corvid-blue">{employeeData.employee_name}</td>
                                            <td className="px-2 py-2 text-center text-corvid-blue">{formattedVotes[0]}</td>
                                            <td className="px-2 py-2 text-center text-corvid-blue">{formattedVotes[1]}</td>
                                            <td className="px-2 py-2 text-center text-corvid-blue">{formattedVotes[2]}</td>
                                            <td className="px-2 py-2 font-bold text-center text-corvid-blue">{avgAllocation}%</td>
                                            <td className="flex px-3 py-2 text-center text-corvid-blue">
                                                <input
                                                    type="number"
                                                    id={`allocation-input-${index}`}
                                                    className="w-full border px-2 py-1 text-center"
                                                    
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="mt-6 flex justify-between">
                            <button className="px-4 py-2 bg-gray-500 text-white rounded" onClick={handleApprove} >
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ICExecTable;