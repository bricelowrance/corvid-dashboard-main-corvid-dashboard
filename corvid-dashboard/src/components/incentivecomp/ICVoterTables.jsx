import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const ICVoterTables = () => {

    const [charges, setCharges ] = useState([]);
    const [allocationsMap, setAllocationsMap] = useState({});
    const [allocations, setAllocations] = useState([]);
    const [totalAllocation, setTotalAllocation] = useState(0);
    const [selectedCharge, setSelectedCharge] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [subMods, setSubMods] = useState({});
    const [expandedMods, setExpandedMods] = useState({}); 
    const [notes, setNotes] = useState("");
    const [captureLeads, setCaptureLeads] = useState([]);
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.email) {
            console.error("User not logged in or missing email");
            return;
        }
    
        fetch(`http://localhost:5001/user-mods?email=${user.email}`)
            .then((response) => response.json())
            .then((data) => {
                setCharges(data);
    
                data.forEach((mod) => {
                    fetch(`http://localhost:5001/breakouts/${mod.mod_id}`)
                        .then((res) => res.json())
                        .then((breakoutData) => {
                            if (breakoutData.length > 0) {
                                setSubMods((prev) => ({
                                    ...prev,
                                    [mod.mod_id]: breakoutData.map((b) => ({
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
                        .catch((error) => console.error(`Error fetching breakouts for ${mod.mod_id}:`, error));
                });
            })
            .catch((error) => console.error("Error fetching mods data:", error));
    }, []);

    useEffect(() => {
        if (charges.length > 0 && !selectedCharge) {
            handleRowClick(charges[0]);
        }
    }, [charges]);

    const handleAddAllocation = () => {
        if (totalAllocation < 100) {
            setAllocations([...allocations, { name: "", allocation: "" }]);
        }
    };

    const handleAllocationChange = (index, field, value) => {
        if (!isSubmitted) {
            const updatedAllocations = [...allocations];
            updatedAllocations[index][field] = value;
            setAllocations(updatedAllocations);

            const newTotal = updatedAllocations.reduce((sum, item) => sum + (Number(item.allocation) || 0), 0);
            setTotalAllocation(newTotal);
        }
    };

    const handleRemoveAllocation = (index) => {
        if (!isSubmitted) {
            const updatedAllocations = allocations.filter((_, i) => i !== index);
            setAllocations(updatedAllocations);

            const newTotal = updatedAllocations.reduce((sum, item) => sum + (Number(item.allocation) || 0), 0);
            setTotalAllocation(newTotal);
        }
    };

    const handleClear = () => {
        if (!isSubmitted) {
            setAllocations([]);
            setTotalAllocation(0);
        }
    };

    const handleBreakoutMod = (mod) => {
        console.log("Breakout button clicked for mod:", mod);
    
        const modId = mod.mod_id;
    
        fetch(`http://localhost:5001/breakouts/${modId}`)
            .then((res) => res.json())
            .then((breakoutData) => {
                console.log("Fetched breakout data:", breakoutData);
    
                setSubMods((prev) => {
                    const existingBreakouts = prev[modId] || breakoutData;
    
                    const nextSuffix = String.fromCharCode(65 + existingBreakouts.length);
                    const newSubModId = `${modId}${nextSuffix}`;
    
                    const newSubMod = {
                        mod_id: newSubModId,
                        parent_mod_id: modId,
                        charge_code: mod.charge_code,
                        funding_type: "LABOR",
                        funding_amount: "",
                        original_funding_amount: mod.funding_amount,
                        isSubMod: true
                    };
    
                    console.log("Creating new breakout:", newSubMod);
    
                    return {
                        ...prev,
                        [modId]: [...existingBreakouts, newSubMod]
                    };
                });
    
                setExpandedMods((prev) => ({
                    ...prev,
                    [modId]: true
                }));
            })
            .catch((error) => console.error(`Error fetching breakouts for ${modId}:`, error));
    };
    
    const toggleDropdown = (modId) => {
        setExpandedMods(prev => ({
            ...prev,
            [modId]: !prev[modId] 
        }));
    };      

    const handleSubmit = async () => {
        if (!selectedCharge) {
            alert("No charge selected.");
            return;
        }
    
        if (subMods[selectedCharge.mod_id] && subMods[selectedCharge.mod_id].length > 0) {
            alert("Allocations must be submitted at the breakout level.");
            return;
        }
    
        if (totalAllocation !== 100) {
            alert("Total allocation must be exactly 100%.");
            return;
        }
    
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.firstName || !user.lastName) {
            alert("User information is missing. Please log in again.");
            return;
        }
    
        const submittedBy = `${user.lastName}, ${user.firstName}`;
    
        const payload = {
            mod_id: selectedCharge.mod_id,
            submitted_by: submittedBy,
            allocations: allocations.map(alloc => ({
                breakout_id: selectedCharge.isSubMod ? selectedCharge.mod_id : null, 
                full_name: alloc.name?.trim() || "",  
                allocation: alloc.allocation !== "" ? parseFloat(alloc.allocation) : null
            })),
            notes: notes.trim() || ""
        };
    
        console.log("Submitting payload:", payload);
    
        try {
            const response = await fetch("http://localhost:5001/submit-allocation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
    
            const data = await response.json();
            if (response.ok) {
                alert("Allocation submitted successfully!");
                setIsSubmitted(true);
    
                setAllocationsMap(prev => {
                    return {
                        ...prev,
                        [selectedCharge.mod_id]: payload.allocations,
                    };
                });                
    
                setNotes(payload.notes);
    
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error("Error submitting allocation:", error);
            alert("An error occurred while submitting the allocation.");
        }
    };

    const handleSubmitBreakout = async (parentModId, breakoutId) => {
        if (!parentModId) {
            console.error("Error: parentModId is undefined");
            return;
        }
    
        const subModList = subMods[parentModId];
        if (!subModList) {
            console.error("Error: No subMods found for parentModId:", parentModId);
            return;
        }
    
        const subModIndex = subModList.findIndex(sub => sub.mod_id === breakoutId);
        if (subModIndex === -1) {
            console.error("Error: SubMod not found for breakoutId:", breakoutId);
            return;
        }
    
        const subMod = subModList[subModIndex];
        const parentMod = charges.find(mod => mod.mod_id === parentModId);
    
        if (!parentMod) {
            alert("Parent mod not found.");
            return;
        }
    
        const totalAllocated = subMods[parentModId]?.reduce(
            (sum, s) => sum + Number(s.funding_amount || 0), 0
        );
    
        const remainingFunding = parentMod.funding_amount - totalAllocated + Number(subMod.funding_amount || 0);
    
        if (Number(subMod.funding_amount) > remainingFunding) {
            alert(`Total breakout funding cannot exceed the remaining amount. Remaining: ${remainingFunding}`);
            return;
        }
    
        if (!subMod.funding_amount) {
            alert("Please enter a funding amount.");
            return;
        }
    
        try {
            const response = await fetch("http://localhost:5001/submit-breakout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mod_id: parentModId,
                    charge_code: subMod.charge_code,
                    funding_amount: subMod.funding_amount,
                    funding_type: subMod.funding_type
                }),
            });
    
            const data = await response.json();
            console.log("API Response:", data);
    
            if (response.ok) {
                alert("Breakout submitted successfully!");
    
                setSubMods(prev => {
                    const updatedMods = [...prev[parentModId]];
                    updatedMods[subModIndex] = { 
                        ...subMod, 
                        isSubmitted: true, 
                        funding_amount: subMod.funding_amount,
                        funding_type: subMod.funding_type   
                    };
                    return { ...prev, [parentModId]: updatedMods };
                });
    
                setAllocationsMap(prev => ({
                    ...prev,
                    [breakoutId]: [{ full_name: "Breakout Submitted", allocation: subMod.funding_amount }]
                }));
    
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error("Error submitting breakout:", error);
            alert("An error occurred while submitting the breakout.");
        }
    };
    
    const handleRowClick = async (charge) => {
        let updatedCharge = { ...charge };
    
        if (charge.isSubMod) {
            let parentMod = charges.find(mod => mod.mod_id === charge.parent_mod_id);
            if (!parentMod) {
                console.warn(`Parent mod (${charge.parent_mod_id}) not found in state. Fetching from backend...`);
                try {
                    const response = await fetch(`http://localhost:5001/mods/${charge.parent_mod_id}`);
                    const parentModData = await response.json();
                    if (response.ok) {
                        parentMod = parentModData;
                    } else {
                        console.error("Error fetching parent mod details:", parentModData.error);
                    }
                } catch (error) {
                    console.error("Error fetching parent mod:", error);
                }
            }
    
            if (parentMod) {
                updatedCharge = {
                    ...charge,
                    customer: parentMod.customer,
                    mod_type: parentMod.mod_type,
                    contract_type: parentMod.contract_type,
                    description: parentMod.description,
                    funding_amount: charge.funding_amount,
                    funding_type: charge.funding_type
                };
            }
        }
    
        console.log("Updated Selected Charge:", updatedCharge);
        setSelectedCharge(updatedCharge);

        const leadEndpoint = charge.isSubMod
            ? `http://localhost:5001/capture-leads/breakout/${charge.mod_id}`
            : `http://localhost:5001/capture-leads/${charge.mod_id}`;
    
        try {
            const res = await fetch(leadEndpoint);
            const data = await res.json();
            console.log("Capture Leads for", charge.mod_id, ":", data);
            setCaptureLeads(data.map(lead => lead.full_name)); 
        } catch (error) {
            console.error("Error fetching capture leads:", error);
        }
    }; 

    useEffect(() => {
        fetch("http://localhost:5001/employees")
            .then((res) => res.json())
            .then((data) => {
                setEmployees(data); 
            })
            .catch((error) => console.error("Error fetching employees:", error));
    }, []);
    
    const filteredCharges = charges.filter(charge =>
        charge.mod_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        charge.charge_code.toLowerCase().includes(searchQuery.toLowerCase())
    );    

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.firstName || !user.lastName) {
            console.error("User information is missing.");
            return;
        }
    
        const userFullName = `${user.lastName}, ${user.firstName}`;
    
        const fetchAllocations = async () => {
            try {
                const response = await fetch(`http://localhost:5001/allocations/${selectedCharge?.mod_id}?userFullName=${encodeURIComponent(userFullName)}`);
                const data = await response.json();
    
                if (response.ok) {
                    if (data.allocations.length > 0) {
                        setAllocationsMap(prev => ({
                            ...prev,
                            [selectedCharge?.mod_id]: data.allocations
                        }));
                    } else {
                        setAllocationsMap(prev => {
                            const updated = { ...prev };
                            delete updated[selectedCharge?.mod_id];
                            return updated;
                        });
                    }
                    setNotes(data.notes || "");
                } else {
                    console.error("Error fetching allocations:", data.error);
                }
            } catch (error) {
                console.error("Error fetching allocations:", error);
            }
        };
    
        if (selectedCharge?.mod_id) {
            fetchAllocations();
        }
    }, [selectedCharge]);

    const handleSubmitCaptureLead = async () => {
        if (!selectedCharge) {
            alert("No charge selected.");
            return;
        }
    
        if (captureLeads.length === 0) {
            alert("No employees selected.");
            return;
        }
    
        try {
            const payload = {
                mod_id: selectedCharge.isSubMod ? null : selectedCharge.mod_id,
                breakout_id: selectedCharge.isSubMod ? selectedCharge.mod_id : null,
                employee_name: captureLeads[captureLeads.length - 1] 
            };
    
            const response = await fetch("http://localhost:5001/submit-capture-lead", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
    
            const data = await response.json();
    
            if (response.ok) {
                alert("Capture lead submitted successfully!");
                setShowPopup(false);
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error("Error submitting capture lead:", error);
            alert("An error occurred while submitting the capture lead.");
        }
    };

    return (
        <div className="flex flex-col flex-1 h-full w-full">
            <div className="bg-white shadow-lg p-10 border border-gray-700 flex flex-col flex-1 w-full">
                <h2 className="text-xl font-extrabold text-corvid-blue mb-6 text-center">

                </h2>

                {/* LARGER TABLE */}

                <div className="flex flex-1 w-full">
                    <div className="w-2/3 pr-4 flex flex-col h-full">
                        <input
                            type="text"
                            placeholder="Search By Mod ID or Charge Code ..."
                            className="w-full p-2 mb-3 border border-gray-300 rounded text-corvid-blue"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full table-fixed divide-y divide-gray-700 text-sm h-full">
                                <thead>
                                    <tr>
                                        <th className="w-1/6 px-2 py-2 text-left font-bold text-corvid-blue uppercase">Mod ID:</th>
                                        <th className="w-1/6 px-2 py-2 text-left font-bold text-corvid-blue uppercase">Charge Code</th>
                                        <th className="w-1/6 px-2 py-2 text-left font-bold text-corvid-blue uppercase">Funding Amount</th>
                                        <th className="w-2/6 px-2 py-2 text-left font-bold text-corvid-blue uppercase">Funding Type</th>
                                        <th className="w-1/6 px-2 py-2 text-left font-bold text-corvid-blue uppercase"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCharges.map((charge, index) => (
                                        <React.Fragment key={charge.mod_id}>
                                            {/* Main Mod Row */}
                                            <tr
                                                className={`border-b border-gray-200 cursor-pointer ${
                                                    allocationsMap[charge.mod_id] && allocationsMap[charge.mod_id].length > 0
                                                        ? "bg-gray-400 text-corvid-blue opacity-50" 
                                                        : selectedCharge?.mod_id === charge.mod_id
                                                            ? "bg-gray-200 text-corvid-blue"
                                                            : "text-corvid-blue"
                                                }`}
                                                onClick={() => handleRowClick(charge)}
                                            >


                                                <td className="w-1/6 px-4 py-2 font-bold">{charge.mod_id}</td>
                                                <td className="w-1/6 px-4 py-2 font-bold">{charge.charge_code}</td>
                                                <td className="w-1/6 px-4 py-2 font-bold">
                                                    {charge.funding_amount ? 
                                                        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(charge.funding_amount)
                                                        : "N/A"
                                                    }
                                                </td>
                                                <td className="w-2/6 px-4 py-2 font-bold">{charge.funding_type}</td>
                                                <td className="w-1/6 px-4 py-2 text-right">
                                                {subMods[charge.mod_id] && subMods[charge.mod_id].length > 0 && (
                                                        <button 
                                                            className="pr-3 rounded focus:outline-none"
                                                            onClick={() => toggleDropdown(charge.mod_id)}
                                                        >
                                                            <ChevronDown
                                                                className={`transition-transform duration-200 ${
                                                                    expandedMods[charge.mod_id] ? "rotate-180" : ""
                                                                }`}
                                                            />
                                                        </button>
                                                    )}
                                                    <button 
                                                        className="w-2/3 px-2 py-1 bg-gray-400 text-white rounded "
                                                        onClick={(e) => {
                                                            e.stopPropagation(); 
                                                            console.log("Breakout button clicked, triggering handleBreakoutMod");
                                                            handleBreakoutMod(charge);
                                                        }}
                                                    >
                                                        Breakout
                                                    </button>
                                                    
                                                </td>

                                            </tr>

                                            {/* Dropdown for Sub-Mods */}
                                            {expandedMods[charge.mod_id] && subMods[charge.mod_id] && subMods[charge.mod_id].length > 0 && (
                                                <tr className="border-b border-gray-200 bg-gray-100">
                                                    <td colSpan="5">
                                                        <table className="w-full table-fixed text-sm bg-gray-50">
                                                            <thead>
                                                                
                                                            </thead>
                                                            <tbody>
                                                                {subMods[charge.mod_id]?.map((subMod, subIndex) => (
                                                                    <tr 
                                                                        key={subMod.mod_id} 
                                                                        className={`border-b border-gray-300 text-corvid-blue cursor-pointer ${
                                                                            allocationsMap[subMod.mod_id] && allocationsMap[subMod.mod_id].length > 0
                                                                                ? "bg-gray-400 text-corvid-blue opacity-50" // Keep breakouts green
                                                                                : selectedCharge?.mod_id === subMod.mod_id
                                                                                    ? "bg-gray-200"
                                                                                    : ""
                                                                        }`}
                                                                        onClick={() => handleRowClick(subMod)}
                                                                    >

                                                                        <td className="px-4 py-2 w-1/6">{subMod.mod_id}</td>
                                                                        <td className="px-4 py-2 w-1/6">{subMod.charge_code}</td>

                                                                        {/* Show funding amount after submission */}
                                                                        <td className="px-4 py-2 w-1/6">
                                                                            {subMod.isSubmitted ? (
                                                                                new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(subMod.funding_amount)
                                                                            ) : (
                                                                                <input 
                                                                                    type="number" 
                                                                                    className="w-full border text-center"
                                                                                    placeholder="ENTER AMOUNT"
                                                                                    value={subMod.funding_amount}
                                                                                    onChange={(e) => {
                                                                                        const value = Number(e.target.value);

                                                                                        const parentMod = charges.find(mod => mod.mod_id === subMod.parent_mod_id);
                                                                                        if (!parentMod) {
                                                                                            alert("Parent mod not found.");
                                                                                            return;
                                                                                        }

                                                                                        const totalAllocated = subMods[subMod.parent_mod_id]?.reduce(
                                                                                            (sum, s) => sum + (s.mod_id !== subMod.mod_id ? Number(s.funding_amount || 0) : 0), // Exclude current breakout being edited
                                                                                            0
                                                                                        );

                                                                                        const remainingFunding = parentMod.funding_amount - totalAllocated;

                                                                                        if (value > remainingFunding) {
                                                                                            alert(`Breakout funding cannot exceed the remaining funding amount. Remaining: ${remainingFunding}`);
                                                                                            return;
                                                                                        }

                                                                                        setSubMods(prev => ({
                                                                                            ...prev,
                                                                                            [subMod.parent_mod_id]: prev[subMod.parent_mod_id].map((s, i) => 
                                                                                                i === subIndex ? { ...s, funding_amount: value } : s
                                                                                            )
                                                                                        }));
                                                                                    }}
                                                                                />



                                                                            )}
                                                                        </td>

                                                                        {/* Show funding type after submission */}
                                                                        <td className="px-4 py-2 w-1/6">
                                                                            {subMod.isSubmitted ? (
                                                                                subMod.funding_type
                                                                            ) : (
                                                                                <select 
                                                                                    className="w-full border px-2 py-1 text-corvid-blue"
                                                                                    value={subMod.funding_type}
                                                                                    onChange={(e) => {
                                                                                        const value = e.target.value;
                                                                                        setSubMods(prev => ({
                                                                                            ...prev,
                                                                                            [charge.mod_id]: prev[charge.mod_id].map((s, i) => 
                                                                                                i === subIndex ? { ...s, funding_type: value } : s
                                                                                            )
                                                                                        }));
                                                                                    }}
                                                                                >
                                                                                    <option value="LABOR">LABOR</option>
                                                                                    <option value="SUBS">SUBS</option>
                                                                                    <option value="MATERIALS">MATERIALS</option>
                                                                                    <option value="TRAVEL">TRAVEL</option>
                                                                                </select>
                                                                            )}
                                                                        </td>

                                                                        <td className="px-4 py-2 w-.5/6 text-right">
                                                                            {!subMod.isSubmitted && (
                                                                                <button 
                                                                                    className="w-auto px-2 py-1 bg-gray-300 text-corvid-blue font-bold rounded"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setSubMods(prev => {
                                                                                            const existingSubMods = [...prev[charge.mod_id]];
                                                                                            existingSubMods.splice(subIndex, 1);
                                                                                            return { ...prev, [charge.mod_id]: existingSubMods.length ? existingSubMods : undefined };
                                                                                        });
                                                                                    }}
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                            )}
                                                                        </td>

                                                                        <td className="px-4 py-2 w-.5/6 text-right">
                                                                            {!subMod.isSubmitted ? (
                                                                                <button 
                                                                                    className="w-auto px-2 py-1 bg-green-600 text-white rounded"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        console.log("Submitting breakout with parent_mod_id:", subMod.parent_mod_id, "Breakout ID:", subMod.mod_id);
                                                                                        handleSubmitBreakout(subMod.parent_mod_id, subMod.mod_id);  
                                                                                    }}
                                                                                >
                                                                                    Submit
                                                                                </button>
                                                                            ) : (
                                                                                <span className="text-green-600 font-bold"></span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="w-px bg-gray-700"></div>

                    {/* SMALLER TABLE */}

                    <div className="w-1/3 pl-4 h-full" >
                        <div>
                            {selectedCharge && (
                                <div className="mb-4 p-4 bg-gray-200 border-gray-300 rounded">
                                    <h3 className="pb-2 text-center text-md font-bold text-corvid-blue">
                                        Selected {selectedCharge.isSubMod ? "Breakout" : "Mod"}: {selectedCharge.mod_id}
                                    </h3>
                                    <p className="text-sm text-corvid-blue"><strong>Charge Code: </strong> {selectedCharge.charge_code}</p>

                                    <p className="text-sm text-corvid-blue"><strong>Customer: </strong> 
                                        {selectedCharge.customer && selectedCharge.customer !== "N/A"
                                            ? selectedCharge.customer
                                            : charges.find(mod => mod.mod_id === selectedCharge.parent_mod_id)?.customer || "N/A"}
                                    </p>

                                    <p className="text-sm text-corvid-blue"><strong>Funding Amount: </strong> 
                                        {selectedCharge.funding_amount 
                                            ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(selectedCharge.funding_amount)
                                            : "N/A"}
                                    </p>

                                    <p className="text-sm text-corvid-blue"><strong>Mod Type: </strong> 
                                        {selectedCharge.mod_type && selectedCharge.mod_type !== "N/A"
                                            ? selectedCharge.mod_type
                                            : charges.find(mod => mod.mod_id === selectedCharge.parent_mod_id)?.mod_type || "N/A"}
                                    </p>

                                    <p className="text-sm text-corvid-blue"><strong>Contract Type: </strong> 
                                        {selectedCharge.contract_type && selectedCharge.contract_type !== "N/A"
                                            ? selectedCharge.contract_type
                                            : charges.find(mod => mod.mod_id === selectedCharge.parent_mod_id)?.contract_type || "N/A"}
                                    </p>

                                    <p className="text-sm text-corvid-blue"><strong>Description: </strong> 
                                        {selectedCharge.description && selectedCharge.description !== "N/A"
                                            ? selectedCharge.description
                                            : charges.find(mod => mod.mod_id === selectedCharge.parent_mod_id)?.description || "N/A"}
                                    </p>

                                    <p className="text-sm text-corvid-blue">
                                        <strong>Capture Leads: </strong>
                                        {captureLeads.length > 0 ? (
                                            <ul>
                                                {captureLeads.map((lead, index) => (
                                                    <li key={index}>{lead}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            "No capture leads assigned."
                                        )}
                                    </p>
                                    <button 
                                        className="mt-2 px-4 py-2 bg-gray-500 text-white rounded"
                                        onClick={() => setShowPopup(true)}
                                    >
                                        Edit Capture Leads
                                    </button>
                                </div>
                            )}

                        </div>
                            {selectedCharge && (!subMods[selectedCharge.mod_id] || selectedCharge.isSubMod) && (
                                <>
                                    <table className="w-full table-fixed divide-y divide-gray-700 text-xs">
                                        <thead>
                                            <tr>
                                                <th className="px-2 py-2 text-center font-bold text-corvid-blue uppercase">Name</th>
                                                <th className="px-2 py-2 text-center font-bold text-corvid-blue uppercase">Allocation %</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedCharge?.mod_id && allocationsMap[selectedCharge?.mod_id] ? (
                                            allocationsMap[selectedCharge?.mod_id].map((alloc, index) => (
                                                <tr key={index}>
                                                    <td className="px-3 py-2 text-corvid-blue">{alloc.full_name}</td>
                                                    <td className="px-3 py-2 text-right text-corvid-blue">{alloc.allocation}%</td>
                                                </tr>
                                            ))
                                            ) : (
                                                allocations.map((alloc, index) => (
                                                    <tr key={index}>
                                                        <td className="px-3 py-2">
                                                        <select 
                                                            className="w-full border px-2 py-1 text-corvid-blue"
                                                            value={alloc.name}
                                                            onChange={(e) => handleAllocationChange(index, "name", e.target.value)}
                                                        >
                                                            <option value="">Select Name</option>
                                                            {employees.map((employee, i) => (
                                                                <option key={i} value={employee.full_name}>{employee.full_name}</option>
                                                            ))}
                                                        </select>
                                                        </td>
                                                        <td className="flex px-3 py-2 text-right text-corvid-blue">
                                                            <input
                                                                type="number"
                                                                className="w-full border px-2 py-1 text-right"
                                                                value={alloc.allocation}
                                                                onChange={(e) => handleAllocationChange(index, "allocation", e.target.value)}
                                                            />
                                                            <button className="ml-2 px-2 py-1 bg-gray-200 font-bold text-corvid-blue rounded" onClick={() => handleRemoveAllocation(index)}>X</button>
                                                        </td>
                                                    </tr>
                                                    
                                                ))
                                            )}
                                            { !allocationsMap[selectedCharge?.mod_id] && (
                                            <button className="mt-2 px-2 py-1 bg-gray-200 font-bold text-corvid-blue rounded" onClick={handleAddAllocation} disabled={totalAllocation >= 100}>
                                                +
                                            </button>
                                            )}
                                        </tbody>
                                    </table>
                                    <p className="text-right mt-2 font-bold text-corvid-blue">Total: {totalAllocation}%</p>
                                    <div className="mt-4 p-4 bg-gray-200 border border-gray-300 rounded">
                                        <h3 className="text-md font-bold text-corvid-blue">Notes</h3>
                                        <textarea
                                            className="w-full h-24 p-2 mt-2 border rounded text-corvid-blue"
                                            placeholder="Enter your notes here..."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            disabled={!!allocationsMap[selectedCharge?.mod_id]} 
                                        />
                                    </div>

                                    {!allocationsMap[selectedCharge?.mod_id] && (
                                        <div className="mt-6 flex justify-between">
                                            <button className="px-4 py-2 bg-gray-500 text-white rounded" onClick={handleClear}>
                                                Clear
                                            </button>
                                            <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={handleSubmit} disabled={isSubmitted}>
                                                Submit
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                    </div>
                    {showPopup && (
                        <div className="fixed inset-0 flex justify-center items-center z-50">
                            <div className="bg-white p-8 border border-gray-900 w-1/3">
                                <h2 className="text-xl font-bold mb-4 text-center text-corvid-blue">
                                    Edit Capture Leads
                                </h2>
                                <div className="mb-4">
                                    <h3 className="text-md font-semibold text-corvid-blue mb-2">Current Leads:</h3>
                                    {captureLeads.length > 0 ? (
                                        <ul className="border border-gray-300 rounded-lg p-2">
                                            {captureLeads.map((lead, index) => (
                                                <li key={index} className="flex justify-between items-center p-2 border-b last:border-b-0">
                                                    <span className="text-corvid-blue">{lead}</span>
                                                   <button
                                                        className="px-2 py-1 bg-gray-300 text-white rounded"
                                                        onClick={() => setCaptureLeads(captureLeads.filter(l => l !== lead))}
                                                    >
                                                        X
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-gray-500 text-sm italic">No capture leads assigned.</p>
                                    )}
                                </div>
                                <div className="mb-4">
                                    <h3 className="text-md font-semibold text-corvid-blue mb-2">Add a Lead:</h3>
                                    <select
                                        className="w-full border border-gray-300 px-3 py-2 rounded text-corvid-blue"
                                        onChange={(e) => {
                                            const selectedEmployee = employees.find(emp => emp.full_name === e.target.value);
                                            if (selectedEmployee) setCaptureLeads([...captureLeads, selectedEmployee.full_name]);
                                        }}
                                    >
                                        <option value="" disabled>Select an employee...</option>
                                        {employees
                                            .filter(emp => !captureLeads.includes(emp.full_name))
                                            .map((employee, i) => (
                                                <option key={i} value={employee.full_name}>{employee.full_name}</option>
                                            ))}
                                    </select>
                                </div>
                                <div className="flex justify-between mt-6">
                                    <button className="px-5 py-2 bg-gray-500 text-white rounded-lg" onClick={() => setShowPopup(false)}>
                                        Cancel
                                    </button>
                                    <button className="px-5 py-2 bg-green-600 text-white rounded-lg" onClick={handleSubmitCaptureLead}>
                                        Submit
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ICVoterTables;