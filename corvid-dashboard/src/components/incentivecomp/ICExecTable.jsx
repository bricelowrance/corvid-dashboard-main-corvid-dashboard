import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

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
    const [searchQuery, setSearchQuery] = useState("");
    const [submittedByHeaders, setSubmittedByHeaders] = useState([]);
    const [notes, setNotes] = useState([]);
    const [captureLeads, setCaptureLeads] = useState([]);
    const [approverNote, setApproverNote] = useState("");
    const [activeTab, setActiveTab] = useState("unapproved");
    const [approvedMods, setApprovedMods] = useState([]);
    const [payoutSummary, setPayoutSummary] = useState([]);
    const [payoutPercentages, setPayoutPercentages] = useState([]);
    const [historicalMap, setHistoricalMap] = useState({});
    const [editedAverages, setEditedAverages] = useState({});
    const [flaggedRows, setFlaggedRows] = useState([]);
    const [approvedAllocationsMap, setApprovedAllocationsMap] = useState({});

    useEffect(() => {
        fetch("http://localhost:5001/directory") 
            .then((response) => response.json())
            .then((data) => setEmployees(data))
            .catch((error) => console.error("Error fetching employees:", error));
    }, []);

    useEffect(() => {
        fetch("http://localhost:5001/exec-data")
            .then((response) => response.json())
            .then((data) => {
                const enriched = data.map(mod => {
                  const match = payoutPercentages.find(p =>
                    p.mod_id === mod.mod_id && !p.breakout_id
                  );
                  return {
                    ...mod,
                    payout_percentage: match ? match.payout_percentage : mod.payout_percentage
                  };
                });
            
                setCharges(enriched);
            
                // Flagged mod and breakout IDs
                const flagged = [];
            
                data.forEach(mod => {
                    if (mod.flagged_for_approval) {
                        flagged.push(mod.mod_id);
                    }
                    if (mod.breakouts) {
                        mod.breakouts.forEach(b => {
                            if (b.flagged_for_approval) {
                                flagged.push(b.breakout_id);
                            }
                        });
                    }
                });
            
                setFlaggedRows(flagged);
            })
            
              
            .catch((error) => console.error("Error fetching mod data:", error));
    }, [payoutPercentages]);
    

    useEffect(() => {
        if (charges.length > 0 && !selectedCharge) {
            handleRowClick(charges[0]);
        }
    }, [charges]);

    useEffect(() => {
        if (activeTab !== "payouts" && filteredChargesByTab.length > 0) {
          handleRowClick(filteredChargesByTab[0]);
        } else {
          setSelectedCharge(null); // clear right panel if payouts tab
        }
      }, [activeTab]);
      

    useEffect(() => {
        fetch("http://localhost:5001/approved-mod-ids")
            .then((res) => res.json())
            .then((data) => {
                const approvedIds = data.map(row => row.breakout_id || row.mod_id);
                setApprovedMods(approvedIds);
            })
            .catch((err) => console.error("Error loading approved mod IDs:", err));
    }, []);
    

    useEffect(() => {
        fetch("http://localhost:5001/payout-percentages")
            .then((res) => res.json())
            .then((data) => setPayoutPercentages(data))
            .catch((err) => console.error("Error loading payout percentages:", err));
    }, []);
    
    useEffect(() => {
        fetch("http://localhost:5001/historical-payouts")
            .then(res => res.json())
            .then(data => {
                const map = {};
                data.forEach(row => {
                    const key = `${row.charge_code}|${row.funding_type}`;
                    map[key] = {
                        ctd_profit: row.ctd_profit,
                        historical_percentage: row.historical_percentage,
                        expected_profit: row.expected_profit
                    };
                });
                setHistoricalMap(map);                
            })
            .catch(err => console.error("Error loading historical payouts:", err));
    }, []);

    useEffect(() => {
        const loadAll = async () => {
            if ((activeTab === "unapproved" || activeTab === "approved") && charges.length > 0) {
                try {
                    const res = await fetch("http://localhost:5001/approved-mod-ids");
                    const data = await res.json();
                    const approvedIds = data.map(row => row.breakout_id || row.mod_id);
                    setApprovedMods(approvedIds);
    
                    // wait for setApprovedMods to settle before fetching breakouts
                    await new Promise(resolve => setTimeout(resolve, 0));
    
                    await fetchBreakoutsForCharges();
                } catch (err) {
                    console.error("Error loading approved mod IDs and breakouts:", err);
                }
            }
        };
    
        loadAll();
    }, [activeTab, charges, payoutPercentages]);
    
    
    
    
    
    
    const handleRowClick = async (charge) => {
        const mod_id = charge.mod_id || charge.breakout_id;
        const isBreakout = charge.breakout_id !== undefined;
        const selectedModId = isBreakout ? charge.breakout_id : charge.mod_id;

        let enrichedCharge = { ...charge, mod_id: selectedModId };

        if (isBreakout) {
            const parentModId = charge.parent_mod_id || selectedModId.split("_")[0];
            const parentMod = charges.find(c => c.mod_id === parentModId);

            if (parentMod) {
                enrichedCharge = {
                    ...enrichedCharge,
                    customer: parentMod.customer,
                    mod_type: parentMod.mod_type,
                    contract_type: parentMod.contract_type,
                    description: parentMod.description,
                    parent_mod_id: parentModId
                };
            }
        }

        setSelectedCharge(enrichedCharge);


        const leadRes = await fetch(`http://localhost:5001/capture-leads/${selectedModId}`);
        const leadData = await leadRes.json();
        setCaptureLeads(leadData.map(l => l.full_name));

    
        try {
            const allocationRes = await fetch(`http://localhost:5001/exec-allocation/${selectedModId}`);
            const allocationData = await allocationRes.json();
    
            if (Array.isArray(allocationData)) {
                const groupedAllocations = {};
                const submittedBySet = new Set();
    
                allocationData.forEach(({ full_name, submitted_by, allocation }) => {
                    if (!groupedAllocations[full_name]) {
                        groupedAllocations[full_name] = {};
                    }
                    groupedAllocations[full_name][submitted_by] = allocation !== null ? allocation : 0;
                    submittedBySet.add(submitted_by);
                });
    
                Object.keys(groupedAllocations).forEach((fullName) => {
                    submittedBySet.forEach((submittedBy) => {
                        if (groupedAllocations[fullName][submittedBy] === undefined) {
                            groupedAllocations[fullName][submittedBy] = 0;
                        }
                    });
                });
    
                setSubmittedByHeaders([...submittedBySet]);
                setAllocations(groupedAllocations);
            }
    
            const breakoutResponse = await fetch(`http://localhost:5001/breakouts/${selectedModId}`);
            const breakoutData = await breakoutResponse.json();
    
            if (breakoutData.length > 0) {
                const updated = breakoutData.map(b => {
                    const match = payoutPercentages.find(p => p.breakout_id === b.breakout_id);
                    return {
                        ...b,
                        payout_percentage: match ? match.payout_percentage : b.payout_percentage,
                        parent_mod_id: charge.mod_id,
                        flagged_for_approval: b.flagged_for_approval 
                    };
                });
                
            
                setSubMods(prev => ({
                    ...prev,
                    [charge.mod_id]: updated
                }));
            }
            
            const notesResponse = await fetch(`http://localhost:5001/mod-notes/${selectedModId}`);
            const notesData = await notesResponse.json();
            setNotes(notesData);

            let noteData = await fetch(`http://localhost:5001/approved-financial-note/${selectedModId}`).then(res => res.json());

            if (!noteData.financial_notes) {
            noteData = await fetch(`http://localhost:5001/draft-financial-note/${selectedModId}`).then(res => res.json());
            }

            setApproverNote(noteData.financial_notes || "");


    
        } catch (error) {
            console.error("Error fetching allocations, breakouts, or notes:", error);
        }
    };
    

    const fetchBreakoutsForCharges = async () => {
        const newSubMods = {};
        const newFlaggedBreakouts = [];
    
        for (const charge of charges) {
            try {
                const res = await fetch(`http://localhost:5001/breakouts/${charge.mod_id}`);
                const data = await res.json();
    
                const updated = data.map(b => {
                    if (b.flagged_for_approval) {
                        newFlaggedBreakouts.push(b.breakout_id);
                    }
    
                    const match = payoutPercentages.find(p => p.breakout_id === b.breakout_id);
                    return {
                        ...b,
                        parent_mod_id: charge.mod_id,
                        payout_percentage: match ? match.payout_percentage : b.payout_percentage,
                        flagged_for_approval: b.flagged_for_approval
                    };
                });
    
                if (updated.length > 0) {
                    newSubMods[charge.mod_id] = updated;
                }
    
            } catch (error) {
                console.error(`Error fetching breakouts for ${charge.mod_id}:`, error);
            }
        }
    
        setSubMods(newSubMods);
        setExpandedMods(Object.keys(newSubMods).reduce((acc, id) => ({ ...acc, [id]: true }), {}));
        setFlaggedRows(prev => [...new Set([...prev, ...newFlaggedBreakouts])]);
    };
    
    
      
    const toggleDropdown = (modId) => {
        setExpandedMods(prev => ({
            ...prev,
            [modId]: !prev[modId] 
        }));
    };
    
    const filteredCharges = charges.filter((charge) =>
        charge.mod_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        charge.charge_code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getAllCharges = () => {
        let all = [...charges];
        for (const parentModId in subMods) {
            all = all.concat(subMods[parentModId]);
        }
        return all;
    };
    

    const filteredChargesByTab = (() => {
        const isApproved = id => approvedMods.includes(id);
    
        let filtered = [];
    
        if (activeTab === "approved") {
            // Include mods that are approved OR have any approved breakouts
            filtered = charges.filter(mod => {
                const isModApproved = isApproved(mod.mod_id);
                const breakouts = subMods[mod.mod_id] || [];
                const hasApprovedBreakout = breakouts.some(b => isApproved(b.breakout_id));
                return isModApproved || hasApprovedBreakout;
            });
        } else if (activeTab === "unapproved") {
            // Mods that are not approved and do not have all breakouts approved
            filtered = charges.filter(mod => {
                const isModApproved = isApproved(mod.mod_id);
                const breakouts = subMods[mod.mod_id] || [];
                const allBreakoutsApproved = breakouts.length > 0 && breakouts.every(b => isApproved(b.breakout_id));
                return !isModApproved && !allBreakoutsApproved;
            });
        } else {
            filtered = charges;
        }
    
        return filtered.sort((a, b) => {
            const idA = a.breakout_id || a.mod_id;
            const idB = b.breakout_id || b.mod_id;
            const splitA = idA.split(/[^0-9]+/).map(Number);
            const splitB = idB.split(/[^0-9]+/).map(Number);
            for (let i = 0; i < Math.max(splitA.length, splitB.length); i++) {
                if ((splitA[i] || 0) !== (splitB[i] || 0)) {
                    return (splitA[i] || 0) - (splitB[i] || 0);
                }
            }
            return 0;
        });
    })();
    
      const handleApprove = async () => {
        if (!selectedCharge || !allocations || Object.keys(allocations).length === 0) {
            console.log("No selected charge or allocations.");
            return;
        }
    
        const totalPayout = selectedCharge.funding_amount * (selectedCharge.payout_percentage / 100);
        const mod_id = selectedCharge.parent_mod_id || selectedCharge.mod_id;
        const breakout_id = selectedCharge.breakout_id || null;
    
        const payouts = Object.entries(allocations).map(([fullName, allocationData]) => {
            const values = Object.values(allocationData)
                .map(val => (val !== undefined && val !== null ? parseFloat(val) : 0));
                const avgKey = `${fullName}|${selectedCharge.mod_id}`;
                const editedValue = editedAverages[avgKey];

                const avg = editedValue !== undefined && editedValue !== null
                  ? editedValue
                  : values.length
                    ? values.reduce((sum, val) => sum + val, 0) / values.length
                    : 0;
    
            const allocation_amount = parseFloat(((avg / 100) * totalPayout).toFixed(2));
    
            return {
                full_name: fullName,
                allocation_amount
            };
        });
    
        try {
            const response = await fetch("http://localhost:5001/approve-payouts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mod_id, breakout_id, payouts, financial_notes: approverNote })
            });
    
            const result = await response.json();
    
            if (!response.ok) {
                throw new Error(result.error || "Failed to approve payouts.");
            }
    
            alert("Allocations approved and saved successfully!");
    
            await fetch("http://localhost:5001/approved-mod-ids")
                .then((res) => res.json())
                .then((data) => {
                    const approvedIds = data.map(row => row.breakout_id || row.mod_id);
                    setApprovedMods(approvedIds);
                    setSubMods(prev => {
                        const updated = { ...prev };
                        Object.keys(updated).forEach(parentId => {
                          updated[parentId] = updated[parentId].map(b => {
                            const id = b.breakout_id || b.mod_id;
                            return {
                              ...b,
                              isApproved: approvedIds.includes(id)
                            };
                          });
                        });
                        return updated;
                      });
                      
                })
                .catch((err) => console.error("Error reloading approved mod IDs:", err));

                setSelectedCharge(null);

                if (filteredChargesByTab.length > 0) {
                    handleRowClick(filteredChargesByTab[0]);
                  }
                  

    
        } catch (err) {
            console.error("Error approving payouts:", err);
            alert("Failed to save approved payouts.");
        }
    };
    
    useEffect(() => {
        if (activeTab === "payouts") {
          fetch("http://localhost:5001/approved-payouts-summary")
            .then(res => res.json())
            .then(data => setPayoutSummary(data))
            .catch(err => console.error("Error loading payout summary:", err));
        }
      }, [activeTab]);

      const calculateTotalPayoutPool = () => {
        return parseFloat(charges.reduce((total, charge) => {
            if (subMods[charge.mod_id] && subMods[charge.mod_id].length > 0) {
                return total + subMods[charge.mod_id].reduce((subTotal, b) => {
                    if (b.funding_amount && b.payout_percentage) {
                        return subTotal + b.funding_amount * (b.payout_percentage / 100);
                    }
                    return subTotal;
                }, 0);
            } else if (charge.funding_amount && charge.payout_percentage) {
                return total + charge.funding_amount * (charge.payout_percentage / 100);
            }
            return total;
        }, 0).toFixed(2));        
    };

    const calculateTotalApprovedPayout = () => {
        return parseFloat(payoutSummary.reduce((sum, row) => sum + parseFloat(row.total_payout || 0), 0).toFixed(2));
      };

      useEffect(() => {
        if (activeTab === "approved") {
            fetch("http://localhost:5001/approved-allocations")
                .then(res => res.json())
                .then(data => {
                    const map = {};
                    data.forEach(row => {
                        if (!map[row.id]) map[row.id] = {};
                        map[row.id][row.full_name] = row.allocation_amount;
                    });
                    setApprovedAllocationsMap(map);
                })
                .catch(err => console.error("Error loading approved allocations:", err));
        }
    }, [activeTab]);
    
    return (
        <div className="flex flex-col items-center pt-6">
            <div className="bg-white shadow-lg p-10 border border-gray-700 w-full">
                <h2 className="text-xl font-extrabold text-corvid-blue mb-6 text-center">
                </h2>
                <div className="flex justify-left space-x-4 mb-4">
                    <button 
                        className={`px-4 py-2 font-bold text-md rounded ${activeTab === "unapproved" ? "bg-gray-500 text-white" : "bg-gray-200 text-corvid-blue"}`}
                        onClick={() => setActiveTab("unapproved")}
                    >
                        Unapproved
                    </button>
                    <button 
                        className={`px-4 py-2 font-bold text-md rounded ${activeTab === "approved" ? "bg-gray-500 text-white" : "bg-gray-200 text-corvid-blue"}`}
                        onClick={() => setActiveTab("approved")}
                    >
                        Approved
                    </button>
                    <button 
                        className={`px-4 py-2 font-bold text-md rounded ${activeTab === "payouts" ? "bg-gray-500 text-white" : "bg-gray-200 text-corvid-blue"}`}
                        onClick={() => setActiveTab("payouts")}
                    >
                        Payout Totals
                    </button>
                    </div>

                    {activeTab !== "payouts" && (
                    <div className="w-4/6 text-corvid-blue font-bold text-lg text-right">
                        Total Payout Pool: $
                        {new Intl.NumberFormat("en-US", {
                            style: "decimal",
                            minimumFractionDigits: 2,
                        }).format(calculateTotalPayoutPool())}
                    </div>
                    )}

                    {activeTab !== "payouts" && (
                        <>
                            <input
                                type="text"
                                placeholder="Search By Mod ID or Charge Code..."
                                className="w-4/6 p-2 mb-4 border border-gray-300 rounded text-corvid-blue"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />

                            {/* LARGER TABLE */}

                            <div className="flex">
                                <div className="w-4/6 pr-4 h-screen overflow-y-auto">
                                    <table className="w-full table-fixed divide-y divide-gray-700 text-sm">
                                        <thead className="sticky top-0 bg-white z-10 shadow">
                                            <tr>
                                                <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Mod ID</th>
                                                <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Code</th>
                                                <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Funding Type</th>
                                                <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Funding Amount</th>
                                                <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Contract-To-Date Profit</th>
                                                <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Expected Profit</th>
                                                <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Historical Payout Percentage</th>
                                                <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Payout Percentage</th>
                                                <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Total Payout</th>
                                                <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                        {filteredChargesByTab
                                        .filter(charge =>
                                            (charge.mod_id || charge.breakout_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (charge.charge_code || "").toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map((charge, index) => (

                                                <React.Fragment key={charge.mod_id}>
                                                    <tr
                                                        key={index}
                                                        className={`border-b border-gray-200 cursor-pointer ${
                                                            flaggedRows.includes(charge.mod_id || charge.breakout_id)
                                                              ? "bg-red-200 text-corvid-blue"
                                                              : (selectedCharge?.mod_id === charge.mod_id || selectedCharge?.mod_id === charge.breakout_id)
                                                                ? "bg-gray-200 text-corvid-blue"
                                                                : "text-corvid-blue"
                                                          }`}
                                                                        
                                                        onClick={() => handleRowClick(charge)}
                                                    >
                                                        <td className="px-2 py-2 font-bold">{charge.breakout_id || charge.mod_id}</td>
                                                        <td className="px-2 py-2 font-bold">{charge.charge_code}</td>
                                                        <td className="px-2 py-2 font-bold">{charge.funding_type}</td>
                                                        <td className="px-2 py-2 font-bold">
                                                            {charge.funding_amount ? (
                                                                    <div className="flex justify-between">
                                                                        <span>$</span>
                                                                        <span>{new Intl.NumberFormat("en-US", { style: "decimal", minimumFractionDigits: 2 }).format(charge.funding_amount)}</span>
                                                                    </div>
                                                                ) : (
                                                                    "N/A"
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-2 font-bold text-right">
                                                        {historicalMap[`${charge.charge_code}|${charge.funding_type}`]?.ctd_profit != null
                                                            ? `${Number(historicalMap[`${charge.charge_code}|${charge.funding_type}`].ctd_profit).toFixed(2)}%`
                                                            : "N/A"}
                                                        </td>

                                                        {(() => {
                                                        const modKey = `${charge.charge_code}|${charge.funding_type}`;
                                                        return (
                                                            <td className="px-2 py-2 font-bold text-right">
                                                            <select
                                                                className="w-full border px-2 py-1"
                                                                value={
                                                                historicalMap[modKey]?.expected_profit !== undefined &&
                                                                historicalMap[modKey]?.expected_profit !== null
                                                                    ? historicalMap[modKey].expected_profit
                                                                    : ""
                                                                }
                                                                onChange={async (e) => {
                                                                const newVal = e.target.value;
                                                                setHistoricalMap((prev) => ({
                                                                    ...prev,
                                                                    [modKey]: {
                                                                    ...prev[modKey],
                                                                    expected_profit: newVal,
                                                                    },
                                                                }));
                                                                await fetch("http://localhost:5001/update-expected-profit", {
                                                                    method: "POST",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify({
                                                                    charge_code: charge.charge_code,
                                                                    funding_type: charge.funding_type,
                                                                    expected_profit: newVal,
                                                                    }),
                                                                });
                                                                }}
                                                            >
                                                                <option value="">Select</option>
                                                                <option value="<0">&lt;0</option>
                                                                <option value="5">5</option>
                                                                <option value="10">10</option>
                                                                <option value="15">15</option>
                                                                <option value=">15">&gt;15</option>
                                                            </select>
                                                            </td>
                                                        );
                                                        })()}

                                                        <td className="px-2 py-2 font-bold text-right">
                                                        {historicalMap[`${charge.charge_code}|${charge.funding_type}`]?.historical_percentage != null
                                                            ? `${Number(historicalMap[`${charge.charge_code}|${charge.funding_type}`].historical_percentage).toFixed(2)}%`
                                                            : "N/A"}
                                                        </td>


                                                        <td className="px-2 py-2">
                                                        {activeTab === "approved" ? (
                                                            <div className="text-right text-corvid-blue font-semibold">
                                                                {(charge.payout_percentage
                                                                ?? payoutPercentages.find(p =>
                                                                    charge.breakout_id
                                                                        ? p.breakout_id === charge.breakout_id
                                                                        : p.mod_id === charge.mod_id && !p.breakout_id
                                                                    )?.payout_percentage
                                                                ?? "N/A")}%
                                                            </div>
                                                            ) : subMods[charge.mod_id] && subMods[charge.mod_id].length > 0 ? (
                                                            <span className="text-gray-400">INPUT IN BREAKOUT▼</span>
                                                            ) : (
                                                                <div className="flex items-center">
                                                                <input
                                                                  type="number"
                                                                  min="1"
                                                                  max="100"
                                                                  className="w-full border px-2 py-1"
                                                                  value={charge.payout_percentage !== null && charge.payout_percentage !== undefined ? charge.payout_percentage : ""}
                                                                  onChange={async (e) => {
                                                                    const newVal = e.target.value === "" ? null : parseFloat(e.target.value);

                                                                    const updatedCharges = charges.map((c) =>
                                                                      c.mod_id === charge.mod_id ? { ...c, payout_percentage: newVal } : c
                                                                    );
                                                                    setCharges(updatedCharges);
                                                              
                                                                    const totalPayout = charge.funding_amount * (newVal / 100);
                                                                    await fetch("http://localhost:5001/update-payout-percentage", {
                                                                      method: "POST",
                                                                      headers: { "Content-Type": "application/json" },
                                                                      body: JSON.stringify({
                                                                        mod_id: charge.mod_id,
                                                                        breakout_id: null,
                                                                        charge_code: charge.four_digit,
                                                                        funding_amount: charge.funding_amount,
                                                                        payout_percentage: newVal,
                                                                        total_payout: totalPayout,
                                                                      }),
                                                                    });
                                                                  }}
                                                                />
                                                                <span className="ml-1 font-bold text-corvid-blue">%</span>
                                                              </div>
                                                              
                                                            )}

                                                        </td>

                                                        <td className="px-2 py-2 font-bold">
                                                            <div className="flex justify-between">
                                                                <span>$</span>
                                                                <span>
                                                                {(() => {
                                                                    const isBreakout = !!charge.breakout_id;
                                                                    const amount = isBreakout
                                                                    ? charge.funding_amount * (charge.payout_percentage / 100)
                                                                    : subMods[charge.mod_id] && subMods[charge.mod_id].length > 0
                                                                        ? subMods[charge.mod_id]
                                                                            .filter(b => b.funding_amount && b.payout_percentage)
                                                                            .reduce((sum, b) => sum + b.funding_amount * (b.payout_percentage / 100), 0)
                                                                        : charge.funding_amount && charge.payout_percentage
                                                                        ? charge.funding_amount * (charge.payout_percentage / 100)
                                                                        : 0;

                                                                    return new Intl.NumberFormat("en-US", {
                                                                    style: "decimal",
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2,
                                                                    }).format(amount);
                                                                })()}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td className="px-2 py-2 text-right">
                                                        {(activeTab === "unapproved" || activeTab === "approved") &&
                                                            expandedMods[charge.mod_id] &&
                                                            subMods[charge.mod_id] &&
                                                            subMods[charge.mod_id].filter(b =>
                                                                activeTab === "approved" ? approvedMods.includes(b.breakout_id) : !approvedMods.includes(b.breakout_id)
                                                            ).length > 0 && (

                                                                <button 
                                                                    className="px-2 py-1 text-sm bg-gray-400 text-white rounded"
                                                                    onClick={(e) => {
                                                                    e.stopPropagation(); 
                                                                    toggleDropdown(charge.mod_id);
                                                                    }}
                                                                >
                                                                    <ChevronDown
                                                                    className={`transition-transform duration-200 ${expandedMods[charge.mod_id] ? "rotate-180" : ""}`}
                                                                    />
                                                                </button>
                                                            )}
                                                        </td>

                                                    </tr>
                                                    {(activeTab === "unapproved" || activeTab === "approved") &&

                                                        expandedMods[charge.mod_id] &&
                                                        subMods[charge.mod_id] &&
                                                        subMods[charge.mod_id].length > 0 && (
                                                        <tr className="text-corvid-blue">
                                                            <td colSpan="10">
                                                                <table className="w-full table-fixed divide-y divide-gray-700 text-sm">
                                                                    <tbody>
                                                                    {subMods[charge.mod_id]
                                                                    .filter(b =>
                                                                        activeTab === "approved"
                                                                          ? approvedMods.includes(b.breakout_id)
                                                                          : !approvedMods.includes(b.breakout_id)
                                                                      )
                                                                    .sort((a, b) => {
                                                                        const idA = a.breakout_id;
                                                                        const idB = b.breakout_id;

                                                                        if (!idA || !idB) return 0;
                                                                      
                                                                        const regex = /(\d+|\D+)/g;
                                                                        const partsA = idA.match(regex);
                                                                        const partsB = idB.match(regex);
                                                                      
                                                                        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                                                                          const partA = partsA[i] || "";
                                                                          const partB = partsB[i] || "";
                                                                      
                                                                          const numA = Number(partA);
                                                                          const numB = Number(partB);
                                                                      
                                                                          if (!isNaN(numA) && !isNaN(numB)) {
                                                                            if (numA !== numB) return numA - numB;
                                                                          } else {
                                                                            if (partA !== partB) return partA.localeCompare(partB);
                                                                          }
                                                                        }
                                                                      
                                                                        return 0;
                                                                      })
                                                                      
                                                                    .map((breakout) => (

                                                                            <tr
                                                                                key={breakout.breakout_id}
                                                                                className={`border-b cursor-pointer ${
                                                                                    flaggedRows.includes(breakout.breakout_id) || breakout.flagged_for_approval

                                                                                      ? "bg-red-200"
                                                                                      : selectedCharge?.mod_id === breakout.breakout_id
                                                                                        ? "bg-gray-200"
                                                                                        : ""
                                                                                  }`}
                                                                                  
                                                                                onClick={() => handleRowClick(breakout)}
                                                                            >
                                                                                <td className="px-2 py-2">{breakout.breakout_id}</td>
                                                                                <td className="px-2 py-2">{breakout.charge_code}</td>
                                                                                <td className="px-2 py-2">{breakout.funding_type}</td>
                                                                                <td className="px-2 py-2">
                                                                                    {breakout.funding_amount ? (
                                                                                            <div className="flex justify-between">
                                                                                                <span>$</span>
                                                                                                <span>{new Intl.NumberFormat("en-US", { style: "decimal", minimumFractionDigits: 2 }).format(breakout.funding_amount)}</span>
                                                                                            </div>
                                                                                        ) : (
                                                                                            "N/A"
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-2 py-2 font-bold text-right">
                                                                                {historicalMap[`${breakout.charge_code}|${breakout.funding_type}`]?.ctd_profit != null
                                                                                    ? `${Number(historicalMap[`${breakout.charge_code}|${breakout.funding_type}`].ctd_profit).toFixed(2)}%`
                                                                                    : "N/A"}
                                                                                </td>

                                                                                {(() => {
                                                                                const breakoutKey = `${breakout.charge_code}|${breakout.funding_type}`;
                                                                                return (
                                                                                    <td className="px-2 py-2 font-bold text-right">
                                                                                    <select
                                                                                        className="w-full border px-2 py-1"
                                                                                        value={
                                                                                        historicalMap[breakoutKey]?.expected_profit !== undefined &&
                                                                                        historicalMap[breakoutKey]?.expected_profit !== null
                                                                                            ? historicalMap[breakoutKey].expected_profit
                                                                                            : ""
                                                                                        }
                                                                                        onChange={async (e) => {
                                                                                        const newVal = e.target.value;
                                                                                        setHistoricalMap((prev) => ({
                                                                                            ...prev,
                                                                                            [breakoutKey]: {
                                                                                            ...prev[breakoutKey],
                                                                                            expected_profit: newVal,
                                                                                            },
                                                                                        }));
                                                                                        await fetch("http://localhost:5001/update-expected-profit", {
                                                                                            method: "POST",
                                                                                            headers: { "Content-Type": "application/json" },
                                                                                            body: JSON.stringify({
                                                                                            charge_code: breakout.charge_code,
                                                                                            funding_type: breakout.funding_type,
                                                                                            expected_profit: newVal,
                                                                                            }),
                                                                                        });
                                                                                        }}
                                                                                    >
                                                                                        <option value="">Select</option>
                                                                                        <option value="<0">&lt;0</option>
                                                                                        <option value="5">5</option>
                                                                                        <option value="10">10</option>
                                                                                        <option value="15">15</option>
                                                                                        <option value=">15">&gt;15</option>
                                                                                    </select>
                                                                                    </td>
                                                                                );
                                                                                })()}


                                                                                <td className="px-2 py-2 font-bold text-right">
                                                                                {historicalMap[`${breakout.charge_code}|${breakout.funding_type}`]?.historical_percentage != null
                                                                                    ? `${Number(historicalMap[`${breakout.charge_code}|${breakout.funding_type}`].historical_percentage).toFixed(2)}%`
                                                                                    : "N/A"}
                                                                                </td>

                                                                                <td className="px-2 py-2 text-right">
                                                                                {activeTab === "approved" ? (
                                                                                    <div className="text-right text-corvid-blue font-semibold">
                                                                                    {(breakout.payout_percentage ?? "N/A") + "%"}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="flex items-center">
                                                                                    <input
                                                                                        type="number"
                                                                                        min="1"
                                                                                        max="100"
                                                                                        className="w-full border px-2 py-1"
                                                                                        value={breakout.payout_percentage !== null && breakout.payout_percentage !== undefined ? breakout.payout_percentage : ""}
                                                                                        onChange={async (e) => {
                                                                                        const newVal = e.target.value === "" ? null : parseFloat(e.target.value);

                                                                                        setSubMods((prev) => ({
                                                                                            ...prev,
                                                                                            [charge.mod_id]: prev[charge.mod_id].map((b) =>
                                                                                            b.breakout_id === breakout.breakout_id
                                                                                                ? { ...b, payout_percentage: newVal }
                                                                                                : b
                                                                                            ),
                                                                                        }));

                                                                                        const totalPayout = breakout.funding_amount * (newVal / 100);
                                                                                        await fetch("http://localhost:5001/update-payout-percentage", {
                                                                                            method: "POST",
                                                                                            headers: { "Content-Type": "application/json" },
                                                                                            body: JSON.stringify({
                                                                                            mod_id: breakout.parent_mod_id,
                                                                                            breakout_id: breakout.breakout_id,
                                                                                            charge_code: breakout.charge_code,
                                                                                            funding_amount: breakout.funding_amount,
                                                                                            payout_percentage: newVal,
                                                                                            total_payout: totalPayout,
                                                                                            }),
                                                                                        });
                                                                                        }}
                                                                                    />
                                                                                    <span className="ml-1 font-bold text-corvid-blue">%</span>
                                                                                    </div>
                                                                                )}
                                                                                </td>

                                                                                <td className="px-2 py-2">
                                                                                    {breakout.funding_amount && breakout.payout_percentage ? (
                                                                                        <div className="flex justify-between">
                                                                                        <span>$</span>
                                                                                        <span>
                                                                                            {new Intl.NumberFormat("en-US", {
                                                                                            style: "decimal",
                                                                                            minimumFractionDigits: 2,
                                                                                            maximumFractionDigits: 2,
                                                                                            }).format(breakout.funding_amount * (breakout.payout_percentage / 100))}
                                                                                        </span>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="flex justify-between">
                                                                                            <span>$</span>
                                                                                            <span>
                                                                                                0.00
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                </td>

                                                                                <td className="px-2 py-2"></td>
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
                                </div>`


                                <div className="w-px bg-gray-700"></div>

                                {/* SMALLER TABLE */}

                                <div className="w-2/6 pl-4">
                                {selectedCharge && (
                                    <div className="flex justify-center mb-2">
                                        {activeTab === "unapproved" &&
                                        <button
                                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                        onClick={async () => {
                                            const id = selectedCharge.breakout_id || selectedCharge.mod_id;
                                            const isFlagged = flaggedRows.includes(id);
                                            const updatedFlagged = !isFlagged;
                                        
                                            await fetch("http://localhost:5001/flag-for-approval", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    mod_id: selectedCharge.mod_id,
                                                    breakout_id: selectedCharge.breakout_id,
                                                    flagged: updatedFlagged
                                                })
                                            });
                                        
                                            setFlaggedRows(prev =>
                                                updatedFlagged ? [...prev, id] : prev.filter(row => row !== id)
                                            );
                                        
                                            setSelectedCharge(prev => ({
                                                ...prev,
                                                flagged_for_approval: updatedFlagged
                                            }));
                                        
                                            if (selectedCharge.breakout_id) {
                                                setSubMods(prev => {
                                                    const updated = prev[selectedCharge.parent_mod_id]
                                                      .map(b =>
                                                        b.breakout_id === selectedCharge.breakout_id
                                                          ? { ...b, flagged_for_approval: updatedFlagged }
                                                          : b
                                                      )
                                                      .sort((a, b) => {
                                                        const idA = a.breakout_id;
                                                        const idB = b.breakout_id;
                                                        const splitA = idA.split(/[^0-9]+/).map(Number);
                                                        const splitB = idB.split(/[^0-9]+/).map(Number);
                                                        for (let i = 0; i < Math.max(splitA.length, splitB.length); i++) {
                                                          if ((splitA[i] || 0) !== (splitB[i] || 0)) {
                                                            return (splitA[i] || 0) - (splitB[i] || 0);
                                                          }
                                                        }
                                                        return 0;
                                                      });
                                                  
                                                    return {
                                                      ...prev,
                                                      [selectedCharge.parent_mod_id]: updated
                                                    };
                                                  });
                                                  
                                            }
                                        }}
                                        
                                        >
                                        {flaggedRows.includes(selectedCharge.breakout_id || selectedCharge.mod_id)
                                            ? "Unflag"
                                            : "Flag for Approval"}
                                        </button>
                                        }   
                                    </div>
                                    )}

                                    <div>
                                        {selectedCharge && (
                                            <div className="mb-4 p-4 bg-gray-200 border-gray-300 rounded">
                                                <h3 className="pb-2 text-center text-md font-bold text-corvid-blue">
                                                Selected {selectedCharge.breakout_id ? "Breakout" : "Mod"}: {selectedCharge.mod_id}
                                                </h3>
                                                <p className="text-sm text-corvid-blue"><strong>Charge Code:</strong> {selectedCharge.charge_code}</p>
                                                <p className="text-sm text-corvid-blue"><strong>Customer:</strong> {selectedCharge.customer || "N/A"}</p>
                                                <p className="text-sm text-corvid-blue"><strong>Funding Amount:</strong> 
                                                {selectedCharge.funding_amount 
                                                    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(selectedCharge.funding_amount)
                                                    : "N/A"}
                                                </p>
                                                <p className="text-sm text-corvid-blue"><strong>Mod Type:</strong> {selectedCharge.mod_type || "N/A"}</p>
                                                <p className="text-sm text-corvid-blue"><strong>Contract Type:</strong> {selectedCharge.contract_type || "N/A"}</p>
                                                <p className="text-sm text-corvid-blue"><strong>Description:</strong> {selectedCharge.description || "N/A"}</p>
                                                <p className="text-sm text-corvid-blue"><strong>Capture Leads:</strong></p>
                                                <ul className="text-sm text-corvid-blue list-disc list-inside">
                                                {captureLeads.map((lead, index) => (
                                                    <li key={index}>{lead}</li>
                                                ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                    {activeTab !== "approved" && (
                                    <table className="w-full table-fixed divide-y divide-gray-700 text-xs">
                                        <thead>
                                            <tr>
                                                <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Name</th>
                                                {submittedByHeaders.map((submittedBy, index) => (
                                                    <th key={index} className="px-2 py-2 text-center font-bold text-corvid-blue uppercase">
                                                        {submittedBy}
                                                    </th>
                                                ))}
                                                <th className="px-2 py-2 text-center font-bold text-corvid-blue uppercase">Avg.</th>
                                                {activeTab === "unapproved" && (
                                                    <th className="px-2 py-2 text-center font-bold text-corvid-blue uppercase">Edit Avg.</th>
                                                )}

                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(allocations).map(([fullName, allocationData], index) => {
                                                const allocationValues = Object.values(allocationData)
                                                    .map(val => (val !== undefined && val !== null ? parseFloat(val) : 0));

                                                const avgAllocation =
                                                    allocationValues.length
                                                        ? (allocationValues.reduce((sum, val) => sum + val, 0) / allocationValues.length).toFixed(2)
                                                        : "0.00";

                                                return (
                                                    <tr key={index}>
                                                        <td className="px-2 py-2 text-left font-bold text-corvid-blue">{fullName}</td>
                                                        {submittedByHeaders.map((submittedBy, subIndex) => (
                                                            <td key={subIndex} className="px-2 py-2 text-center text-corvid-blue">
                                                                {allocationData[submittedBy] !== undefined ? `${allocationData[submittedBy]}%` : "0%"}
                                                            </td>
                                                        ))}
                                                        <td className="px-2 py-2 text-center font-bold text-corvid-blue">{avgAllocation}%</td>
                                                        {activeTab === "unapproved" && (
                                                            <td className="px-2 py-2 text-center">
                                                                <input
                                                                    type="number"
                                                                    className="w-full border px-2 py-1 text-center text-corvid-blue"
                                                                    value={editedAverages[`${fullName}|${selectedCharge.mod_id}`] ?? ""}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setEditedAverages(prev => ({
                                                                            ...prev,
                                                                            [`${fullName}|${selectedCharge.mod_id}`]: val
                                                                        }));
                                                                    }}
                                                                />
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    )}
                                    {selectedCharge && selectedCharge.funding_amount && selectedCharge.payout_percentage && (
                                        <div className="mb-4 p-4 bg-gray-100 border border-gray-300 rounded text-corvid-blue text-sm">
                                        <h4 className="font-bold mb-2 underline">Payout Breakdown:</h4>
                                        <div>
                                            {Object.entries(allocations).map(([fullName, allocationData]) => {
                                                const values = Object.values(allocationData).map(val =>
                                                    val !== undefined && val !== null ? parseFloat(val) : 0
                                                );
                                    
                                                const avgKey = `${fullName}|${selectedCharge.mod_id}`;
                                                const avg = editedAverages[avgKey] !== undefined && editedAverages[avgKey] !== ""
                                                ? parseFloat(editedAverages[avgKey])
                                                : (values.length ? values.reduce((sum, val) => sum + val, 0) / values.length : 0);
                                    
                                                const totalPayout = selectedCharge.funding_amount * (selectedCharge.payout_percentage / 100);
                                                const individualPayout = (avg / 100) * totalPayout;
                                    
                                                return (
                                                    <div key={fullName} className="flex justify-between py-1">
                                                        <span className="font-semibold">{fullName}:</span>
                                                        <span>
                                                        {new Intl.NumberFormat("en-US", {
                                                            style: "currency",
                                                            currency: "USD"
                                                        }).format(individualPayout)}
                                                        {" "}
                                                        (
                                                        {((individualPayout / totalPayout) * 100).toFixed(2)}%
                                                        )
                                                        </span>

                                                    </div>
                                                );
                                            })}
                                            <div className="border-t border-gray-400 mt-2 pt-2 flex justify-between font-bold">
                                                <span>Total Payout:</span>
                                                <span>
                                                    {new Intl.NumberFormat("en-US", {
                                                        style: "currency",
                                                        currency: "USD"
                                                    }).format(
                                                        Object.entries(allocations).reduce((sum, [fullName, allocationData]) => {
                                                            const values = Object.values(allocationData).map(val =>
                                                                val !== undefined && val !== null ? parseFloat(val) : 0
                                                            );
                                                            const avgKey = `${fullName}|${selectedCharge.mod_id}`;
                                                            const avg = editedAverages[avgKey] !== undefined && editedAverages[avgKey] !== ""
                                                                ? parseFloat(editedAverages[avgKey])
                                                                : (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0);
                                                            return sum + ((avg / 100) * selectedCharge.funding_amount * (selectedCharge.payout_percentage / 100));
                                                        }, 0)
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                        )}


                                    {notes.length > 0 && (
                                        <div className="mt-4 bg-gray-100 p-4 border border-gray-300 rounded">
                                            <h3 className="text-md font-bold text-corvid-blue underline">Voter Notes:</h3>
                                            <ul className="list-disc list-inside text-corvid-blue text-sm">
                                                {notes.map((note, index) => (
                                                    <li key={index}>
                                                        <strong>{note.submitted_by}:</strong> {note.note}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <div className="mt-4 bg-gray-100 p-4 border border-gray-300 rounded">
                                        <h3 className="text-md font-bold text-corvid-blue underline">Financial Notes:</h3>
                                        {activeTab === "unapproved" ? (
                                            <textarea
                                            placeholder="Enter financial notes..."
                                            className="w-full mt-4 p-2 border border-gray-300 rounded text-corvid-blue"
                                            value={approverNote}
                                            onChange={async (e) => {
                                              const newNote = e.target.value;
                                              setApproverNote(newNote);
                                          
                                              const mod_id = selectedCharge?.mod_id;
                                              const breakout_id = selectedCharge?.breakout_id;
                                          
                                              await fetch("http://localhost:5001/save-draft-note", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                  mod_id,
                                                  breakout_id,
                                                  financial_notes: newNote,
                                                }),
                                              });
                                            }}
                                          />
                                          
                                            ) : (
                                            <div className="w-full mt-4 p-2 rounded bg-gray-100 text-corvid-blue whitespace-pre-wrap">
                                                {approverNote || "No financial notes available."}
                                            </div>
                                        )}

                                    </div>
                                    <div className="mt-6 flex justify-between">
                                        {activeTab !== "approved" && (
                                            <button className="px-4 py-2 bg-gray-500 text-white rounded" onClick={handleApprove} >
                                                Approve
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    {activeTab === "payouts" && (
                        <div className="w-full mt-8 px-10">
                            <h2 className="text-xl font-bold text-corvid-blue mb-4">Approved Payout Totals by Employee</h2>
                            <table className="w-full table-fixed text-sm divide-y divide-gray-300">
                            <thead>
                                <tr className="text-left text-corvid-blue font-bold uppercase">
                                <th className="px-2 py-2">Name</th>
                                <th className="px-2 py-2 text-right">Total Payout</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payoutSummary.length > 0 ? (
                                payoutSummary.map((row, index) => (
                                    <tr key={index} className="text-corvid-blue">
                                    <td className="px-2 py-2">{row.full_name}</td>
                                    <td className="px-2 py-2 text-right">
                                        {new Intl.NumberFormat("en-US", {
                                        style: "currency",
                                        currency: "USD"
                                        }).format(row.total_payout)}
                                    </td>
                                    </tr>
                                ))
                                ) : (
                                <tr>
                                    <td className="px-2 py-4 text-center text-corvid-blue" colSpan={2}>
                                    No payout data available.
                                    </td>
                                </tr>
                                )}
                            </tbody>
                            </table>
                            <div className="text-right font-bold border-t-4 pt-2 pr-3 text-corvid-blue"></div>
                            <div className="mt-4 text-right text-lg font-bold text-corvid-blue">
                            Total Approved Payout: {
                                new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD"
                                }).format(calculateTotalApprovedPayout())
                            }
                            </div>

                        </div>
                    )}
                </div>
        </div>
    );
};

export default ICExecTable;