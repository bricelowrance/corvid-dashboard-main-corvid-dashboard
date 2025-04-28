import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const ICVoterTables = () => {
  // --- STATE VARIABLES ---
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
    const [activeTab, setActiveTab] = useState("unsubmitted");
    const [showBreakoutPopup, setShowBreakoutPopup] = useState(false);
    const [breakoutMod, setBreakoutMod] = useState(null);
    const [submittedTips, setSubmittedTips] = useState([]);
    const [newTipAllocations, setNewTipAllocations] = useState([]);
    const [submittedAllocations, setSubmittedAllocations] = useState([]);
    const [submittedNotes, setSubmittedNotes] = useState("");
    const [payoutHistory, setPayoutHistory] = useState([]);


    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.email) {
            console.error("User not logged in or missing email");
            return;
        }
    
        const userFullName = `${user.lastName}, ${user.firstName}`;
    
        fetch(`http://localhost:5001/user-mods?email=${user.email}`)
            .then((response) => response.json())
            .then((data) => {
                setCharges(data.mods);

                const organizedBreakouts = {};
                data.breakouts.forEach(b => {
                    if (!organizedBreakouts[b.mod_id]) {
                        organizedBreakouts[b.mod_id] = [];
                    }
    
                    organizedBreakouts[b.mod_id].push({
                        mod_id: b.breakout_id,
                        parent_mod_id: b.mod_id,
                        charge_code: b.charge_code,
                        funding_amount: b.funding_amount,
                        funding_type: b.funding_type,
                        isSubMod: true,
                    });
                });
    
                setSubMods(organizedBreakouts);

                [...data.mods, ...data.breakouts.map(b => ({
                    mod_id: b.breakout_id
                }))].forEach((mod) => {
                    fetch(`http://localhost:5001/allocations/${mod.mod_id}?userFullName=${encodeURIComponent(userFullName)}`)
                        .then((res) => res.json())
                        .then((allocData) => {
                            if (allocData.allocations && allocData.allocations.length > 0) {
                                setAllocationsMap((prev) => ({
                                    ...prev,
                                    [mod.mod_id]: allocData.allocations
                                }));

                                setSubMods(prev => {
                                    const parentId = mod.parent_mod_id || Object.keys(prev).find(pid =>
                                        prev[pid]?.some(b => b.mod_id === mod.mod_id)
                                    );
                                    if (!parentId) return prev;
    
                                    return {
                                        ...prev,
                                        [parentId]: prev[parentId].map(b =>
                                            b.mod_id === mod.mod_id
                                                ? { ...b}
                                                : b
                                        )
                                    };
                                });
                            }
                        });
                });
            })
            .catch((error) => console.error("Error fetching mods and breakouts data:", error));
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
        
        setBreakoutMod(mod);
        setShowBreakoutPopup(true);
    
        fetch(`http://localhost:5001/breakouts/${mod.mod_id}`)
            .then((res) => res.json())
            .then((breakoutData) => {
                console.log("Fetched breakout data:", breakoutData);
    
                if (breakoutData.length > 0) {
                    setSubMods((prev) => ({
                        ...prev,
                        [mod.mod_id]: breakoutData.map(b => ({
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
    };

    const handleSaveDraft = async () => {
        if (!selectedCharge) {
            alert("No charge selected.");
            return;
        }
    
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.firstName || !user.lastName) {
            alert("User info missing.");
            return;
        }
    
        const submittedBy = `${user.lastName}, ${user.firstName}`;
    
        const payload = {
            mod_id: selectedCharge.mod_id,
            submitted_by: submittedBy,
            allocations: allocations.map(alloc => ({
                full_name: alloc.name?.trim() || "",
                allocation: alloc.allocation !== "" ? parseFloat(alloc.allocation) : null
            })),
            notes: notes.trim() || ""
        };
    
        try {
            const response = await fetch("http://localhost:5001/save-draft-allocation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
    
            const data = await response.json();
            if (response.ok) {
                alert("Draft saved!");
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            console.error("Save draft error:", err);
            alert("Server error saving draft.");
        }
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

                // Clear the saved draft
                try {
                    await fetch("http://localhost:5001/clear-draft", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            mod_id: selectedCharge.mod_id,
                            submitted_by: submittedBy
                        })
                    });
                    console.log("Draft cleared successfully.");
                } catch (err) {
                    console.error("Failed to clear draft:", err);
                }

    
                setAllocationsMap(prev => ({
                    ...prev,
                    [selectedCharge.mod_id]: payload.allocations
                }));
                
                
                
                if (selectedCharge.isSubMod) {
                    setSubMods(prev => {
                      const parentId = selectedCharge.parent_mod_id;
                      const updated = prev[parentId]?.map(b => 
                        b.mod_id === selectedCharge.mod_id 
                          ? { ...b, isSubmitted: true }
                          : b
                      );
                  
                      return {
                        ...prev,
                        [parentId]: updated
                      };
                    });
                  }
                  
    
                setNotes(payload.notes);

                setTimeout(() => {
                    const nextUnsubmitted = unsubmittedCharges.filter(c => c.mod_id !== selectedCharge.mod_id)[0];
                    if (nextUnsubmitted) {
                        handleRowClick(nextUnsubmitted);
                    } else {
                        setSelectedCharge(null); 
                    }
                }, 0);

    
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error("Error submitting allocation:", error);
            alert("An error occurred while submitting the allocation.");
        }
    };

    const updateNewTip = (index, field, value) => {
        const updated = [...newTipAllocations];
        updated[index][field] = value;
        setNewTipAllocations(updated);
    };
    
    const removeNewTip = (index) => {
        const updated = [...newTipAllocations];
        updated.splice(index, 1);
        setNewTipAllocations(updated);
    };
    
    const handleAddBreakout = () => {
        if (!breakoutMod) return;
    
        const totalAllocated = subMods[breakoutMod.mod_id]?.reduce(
            (sum, s) => sum + Number(s.funding_amount || 0), 
            0
        );
    
        const remainingFunding = breakoutMod.funding_amount - totalAllocated;
    
        if (remainingFunding <= 0) {
            alert("No remaining funding available for additional breakouts.");
            return;
        }
    
        setSubMods(prev => {
            const modId = breakoutMod.mod_id;
            const existingBreakouts = prev[modId] || [];
            const nextSuffix = String.fromCharCode(65 + existingBreakouts.length);
            const newSubModId = `${modId}${nextSuffix}`;
    
            const newBreakout = {
                mod_id: newSubModId,
                parent_mod_id: modId,
                charge_code: breakoutMod.charge_code,
                funding_type: "LABOR",
                funding_amount: "",
                isSubMod: true,
                isTemporary: true,
            };
    
            return {
                ...prev,
                [modId]: [...existingBreakouts, newBreakout]
            };
        });
    };

    const handleSubmitBreakouts = async () => {
        if (!breakoutMod) {
            alert("No breakout module selected.");
            return;
        }
    
        const breakoutsToSubmit = subMods[breakoutMod.mod_id] || [];
        if (breakoutsToSubmit.length === 0) {
            alert("No breakouts to submit.");
            return;
        }
    
        for (const breakout of breakoutsToSubmit) {
            if (!breakout.charge_code || !breakout.funding_amount || !breakout.funding_type) {
                alert(`Breakout ${breakout.mod_id} is missing required fields.`);
                return;
            }
        }
    
        const totalBreakoutFunding = breakoutsToSubmit.reduce(
            (sum, b) => sum + Number(b.funding_amount || 0),
            0
        );
        
    
        if (totalBreakoutFunding > breakoutMod.funding_amount) {
            alert(`Total breakout funding (${totalBreakoutFunding}) exceeds available funding (${breakoutMod.funding_amount}).`);
            return;
        }

        const remainingFunding = breakoutMod.funding_amount - totalBreakoutFunding;

        if (remainingFunding !== 0) {
            alert(`Cannot submit. Funding amount remaining must be $0. You still have $${remainingFunding.toFixed(2)} unallocated.`);
            return;
        }
    
        try {
            const response = await fetch("http://localhost:5001/update-breakouts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mod_id: breakoutMod.mod_id,
                    breakouts: breakoutsToSubmit.map(b => ({
                        charge_code: b.charge_code,
                        funding_amount: Number(b.funding_amount),
                        funding_type: b.funding_type
                    }))
                })
            });
            
            const data = await response.json();
            if (!response.ok) {
                console.error("Update Breakouts Error:", data);
                alert(`Error: ${data.error || "Failed to update breakouts"}`);
                return;
            }
            
            alert("Breakouts submitted successfully!");
            setShowBreakoutPopup(false);

            try {
                const response = await fetch(`http://localhost:5001/breakouts/${breakoutMod.mod_id}`);
                const updatedBreakouts = await response.json();
            
                if (Array.isArray(updatedBreakouts)) {
                    setSubMods(prev => ({
                        ...prev,
                        [breakoutMod.mod_id]: updatedBreakouts.map(b => ({
                            mod_id: b.breakout_id,
                            parent_mod_id: b.mod_id,
                            charge_code: b.charge_code,
                            funding_amount: b.funding_amount,
                            funding_type: b.funding_type,
                            isSubmitted: true
                        }))
                    }));
                }
            } catch (fetchErr) {
                console.error("Error fetching updated breakouts:", fetchErr);
            }
            
            setSubMods(prev => ({
                ...prev,
                [breakoutMod.mod_id]: prev[breakoutMod.mod_id].map(b => ({
                    ...b,
                    isSubmitted: true,
                })),
            }));
            
    
        } catch (error) {
            console.error("Error submitting breakouts:", error);
            alert("An error occurred while submitting the breakouts.");
        }
    };

    const [tipAllocations, setTipAllocations] = useState([]);

    useEffect(() => {
        const fetchSubmittedTips = async () => {
            const user = JSON.parse(localStorage.getItem("user"));
            if (!user || !user.email) return;
    
            try {
                const res = await fetch(`http://localhost:5001/submitted-tips?email=${encodeURIComponent(user.email)}`);
                const data = await res.json();
    
                if (res.ok && data.tips.length > 0) {
                    setSubmittedTips(data.tips);
                }
            } catch (err) {
                console.error("Error loading submitted tips:", err);
            }
        };
    
        fetchSubmittedTips();
    }, []);
    
    
    
    const addTip = () => {
        setTipAllocations([...tipAllocations, { full_name: "", tip_allocation: "" }]);
    };
    
    const updateTip = (index, field, value) => {
        const updated = [...tipAllocations];
        updated[index][field] = value;
        setTipAllocations(updated);
    };
    
    const removeTip = (index) => {
        const updated = [...tipAllocations];
        updated.splice(index, 1);
        setTipAllocations(updated);
    };

    const [lastSelected, setLastSelected] = useState({
        unsubmitted: null,
        submitted: null
    });

    const handleUpdateTip = async (index) => {
        const tip = submittedTips[index];
        const user = JSON.parse(localStorage.getItem("user"));
      
        try {
          const res = await fetch("http://localhost:5001/update-tip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              submitted_by_email: user.email,
              full_name: tip.full_name,
              tip_allocation: parseFloat(tip.tip_allocation),
            }),
          });
      
          const data = await res.json();
          if (res.ok) {
            alert("Tip updated!");
          } else {
            alert(`Update failed: ${data.error}`);
          }
        } catch (err) {
          console.error("Update tip error:", err);
          alert("Error updating tip.");
        }
      };
    
    
    
    
    const submitTips = async () => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.email) {
            alert("User not logged in");
            return;
        }
    
        if (newTipAllocations.length === 0) {
            alert("No new tips to submit.");
            return;
        }
    
        try {
            const response = await fetch("http://localhost:5001/submit-tips", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tips: newTipAllocations,
                    submitted_by_email: user.email
                }),
            });
    
            const data = await response.json();
            if (response.ok) {
                alert("Tips submitted!");

                setSubmittedTips((prev) => [...prev, ...newTipAllocations]);

                setNewTipAllocations([]);
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            console.error("Tip submission error:", err);
            alert("Server error");
        }
    };
    
    const handleDeleteTip = async (index) => {
        const tip = submittedTips[index];
        const user = JSON.parse(localStorage.getItem("user"));
      
        if (!window.confirm(`Are you sure you want to delete the tip for ${tip.full_name}?`)) {
          return;
        }
      
        try {
          const res = await fetch("http://localhost:5001/delete-tip", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              submitted_by_email: user.email,
              full_name: tip.full_name,
            }),
          });
      
          const data = await res.json();
          if (res.ok) {
            alert("Tip deleted!");
            setSubmittedTips((prev) => prev.filter((_, i) => i !== index));
          } else {
            alert(`Delete failed: ${data.error}`);
          }
        } catch (err) {
          console.error("Delete tip error:", err);
          alert("Error deleting tip.");
        }
      };
      
    
    const tipsTotal = tipAllocations.reduce(
        (sum, tip) => sum + (parseFloat(tip.tip_allocation) || 0),
        0
    );

    useEffect(() => {
        const fetchPayoutHistory = async () => {
          if (activeTab !== "payout") return;
      
          const user = JSON.parse(localStorage.getItem("user"));
          if (!user || !user.email) return;
      
          try {
            const res = await fetch(`http://localhost:5001/payout-history?email=${user.email}`);
            const data = await res.json();
      
            console.log("Fetched payout history:", data); 
      
            if (res.ok) {
              setPayoutHistory(data);
            } else {
              console.error("Failed to load payout history:", data.error);
            }
          } catch (err) {
            console.error("Error fetching payout history:", err);
          }
        };
      
        fetchPayoutHistory();
      }, [activeTab]);
      

    const handleRowClick = async (charge) => {
        const user = JSON.parse(localStorage.getItem("user"));
        const userFullName = `${user.lastName}, ${user.firstName}`;
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
        setLastSelected(prev => ({
            ...prev,
            [activeTab]: updatedCharge
        }));

        setIsSubmitted(false);

        const currentAllocations = allocationsMap[updatedCharge.mod_id];

        if (currentAllocations) {

            setAllocations([]);
            setTotalAllocation(currentAllocations.reduce((sum, a) => sum + (Number(a.allocation) || 0), 0));
        } else {
            try {
                const draftRes = await fetch(`http://localhost:5001/draft-allocations/${updatedCharge.mod_id}?userFullName=${encodeURIComponent(userFullName)}`);
                const draftData = await draftRes.json();
            
                if (draftRes.ok && draftData.allocations.length > 0) {
                    setAllocations(draftData.allocations.map(a => ({
                        name: a.full_name,
                        allocation: a.allocation
                    })));
                    setTotalAllocation(draftData.allocations.reduce((sum, a) => sum + (Number(a.allocation) || 0), 0));
                    setNotes(draftData.notes || "");
                } else {
                    setAllocations([]);
                    setTotalAllocation(0);
                    setNotes("");
                }
            } catch (err) {
                console.error("Error fetching draft allocation:", err);
                setAllocations([]);
                setTotalAllocation(0);
                setNotes("");
            }
            
        }

        const leadEndpoint = `http://localhost:5001/capture-leads/${charge.mod_id}`;

        if (activeTab === "unsubmitted") {
            const user = JSON.parse(localStorage.getItem("user"));
            const fullName = `${user.lastName}, ${user.firstName}`;
        
            try {
                const res = await fetch(`http://localhost:5001/submitted-allocations/${charge.mod_id}?userFullName=${encodeURIComponent(fullName)}`);
                const data = await res.json();
                console.log("Submitted Allocations Data:", data);
                setSubmittedAllocations(data.allocations);
                setSubmittedNotes(data.notes);
            } catch (err) {
                console.error("Error fetching previous submission:", err);
            }
        } else {
            setSubmittedAllocations([]);
            setSubmittedNotes("");
        }

    
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
    
    const getAllCharges = () => {
        let all = [...charges];
        for (const parentModId in subMods) {
            all = all.concat(subMods[parentModId]);
        }
        return all;
    };
    
    const allCharges = getAllCharges();
    
    const submittedCharges = allCharges.filter(charge =>
        !charge.isTemporary && allocationsMap[charge.mod_id] && allocationsMap[charge.mod_id].length > 0
    );
    
    
    const unsubmittedCharges = charges.filter(mod => {
        const breakouts = subMods[mod.mod_id] || [];
        if (breakouts.length === 0) {
            return !allocationsMap[mod.mod_id] || allocationsMap[mod.mod_id].length === 0;
        }
        const hasUnsubmittedBreakout = breakouts
        .filter(b => !b.isTemporary)
        .some(b =>
            !allocationsMap[b.mod_id] || allocationsMap[b.mod_id].length === 0
        );

        return hasUnsubmittedBreakout;
    });
    
    
    
    const handleUnsubmit = async (modId) => {
        const user = JSON.parse(localStorage.getItem("user"));
        const submittedBy = `${user.lastName}, ${user.firstName}`;
    
        if (!window.confirm(`Are you sure you want to unsubmit allocations for ${modId}?`)) return;
    
        try {
            const response = await fetch(`http://localhost:5001/unsubmit-allocation/${modId}?submitted_by=${encodeURIComponent(submittedBy)}`, {
                method: "DELETE"
            });
    
            const data = await response.json();
            if (response.ok) {
                alert("Unsubmitted successfully!");

                setAllocationsMap(prev => {
                    const updated = { ...prev };
                    delete updated[modId];
                    return updated;
                });
    
                for (const parentId in subMods) {
                    const updatedBreakouts = subMods[parentId].map(b =>
                        b.mod_id === modId ? { ...b, isSubmitted: false } : b
                    );
                    setSubMods(prev => ({ ...prev, [parentId]: updatedBreakouts }));
                }
    
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            console.error("Error un-submitting allocation:", err);
            alert("Server error.");
        }
    };

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
    
        const isBreakout = Object.values(subMods).flat().some(b => b.mod_id === selectedCharge.mod_id);
        const mod_id = isBreakout ? null : selectedCharge.mod_id;
        const breakout_id = isBreakout ? selectedCharge.mod_id : null;

    
        try {
            const res = await fetch("http://localhost:5001/submit-capture-leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mod_id,
                    breakout_id,
                    employee_names: captureLeads
                }),
            });
    
            const contentType = res.headers.get("content-type");
            const isJson = contentType && contentType.includes("application/json");
    
            if (!res.ok) {
                const errorText = isJson ? await res.json() : await res.text();
                console.error("Capture lead submission failed:", errorText);
                alert("Failed to submit capture leads. Check console for details.");
                return;
            }
    
            const data = isJson ? await res.json() : {};
            console.log("Capture lead response:", data);
            alert("Capture leads updated successfully!");
            setShowPopup(false);
    
        } catch (error) {
            console.error("Unexpected error submitting capture leads:", error);
            alert("An error occurred while submitting capture leads.");
        }
    };
    
    useEffect(() => {
        if (activeTab === "unsubmitted") {
            if (!lastSelected.unsubmitted && unsubmittedCharges.length > 0) {
                handleRowClick(unsubmittedCharges[0]);
            } else {
                setSelectedCharge(lastSelected.unsubmitted);
            }
        } else if (activeTab === "submitted") {
            if (!lastSelected.submitted && submittedCharges.length > 0) {
                handleRowClick(submittedCharges[0]);
            } else {
                setSelectedCharge(lastSelected.submitted);
            }
        } else if (activeTab === "tips") {
            setSelectedCharge(null);
        }
    }, [activeTab, submittedCharges, unsubmittedCharges]);
    
    
      
    

    return (
        <div className="flex flex-col flex-1 w-full">
            <div className="bg-white shadow-lg p-10 border border-gray-700 flex flex-col flex-1 w-full">
                <h2 className="text-xl font-extrabold text-red-600 mb-6 text-center">
                   
                </h2>
                <div className="flex justify-left space-x-4 mb-4">
                    <button 
                        className={`px-4 py-2 font-bold text-md rounded ${activeTab === "unsubmitted" ? "bg-gray-500 text-white" : "bg-gray-200 text-corvid-blue"}`}
                        onClick={() => setActiveTab("unsubmitted")}
                    >
                        Unsubmitted
                    </button>
                    <button 
                        className={`px-4 py-2 font-bold text-md rounded ${activeTab === "submitted" ? "bg-gray-500 text-white" : "bg-gray-200 text-corvid-blue"}`}
                        onClick={() => setActiveTab("submitted")}
                    >
                        Submitted
                    </button>
                    <button 
                        className={`px-4 py-2 font-bold text-md rounded ${activeTab === "tips" ? "bg-gray-500 text-white" : "bg-gray-200 text-corvid-blue"}`}
                        onClick={() => setActiveTab("tips")}
                    >
                        Spot Bonuses
                    </button>
                    <button 
                        className={`px-4 py-2 font-bold text-md rounded ${activeTab === "payout" ? "bg-gray-500 text-white" : "bg-gray-200 text-corvid-blue"}`}
                        onClick={() => setActiveTab("payout")}
                    >
                        Payout History
                    </button>

                </div>

                {/* LARGER TABLE */}
                {activeTab !== "tips" && activeTab !== "payout" && (
                <div className="flex flex-1 w-full">
                    <div className="w-2/3 pr-4 flex flex-col h-screen">
                        <input
                            type="text"
                            placeholder="Search By Mod ID or Charge Code ..."
                            className="w-full p-2 mb-3 border border-gray-300 rounded text-corvid-blue"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="flex-1 overflow-y-auto h-[500px]">
                            <table className="w-full table-fixed divide-y divide-gray-700 text-sm">
                                <thead className="sticky top-0 bg-white z-10 shadow">
                                    <tr>
                                        <th className="w-1/5 px-2 py-2 text-left font-bold text-corvid-blue uppercase">Mod ID</th>
                                        <th className="w-1/5 px-2 py-2 text-left font-bold text-corvid-blue uppercase">Charge Code</th>
                                        <th className="w-1/5 px-2 py-2 text-right font-bold text-corvid-blue uppercase">Funding Amount</th>
                                        <th className="w-1/5 px-2 py-2 text-left font-bold text-corvid-blue uppercase">Funding Type</th>
                                        <th className="w-1/5 px-2 py-2 text-left font-bold text-corvid-blue uppercase"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(activeTab === "unsubmitted" ? unsubmittedCharges : submittedCharges).map((charge, index) => (
                                        <React.Fragment key={charge.mod_id}>
                                            <tr
                                                className={`border-b border-gray-200 cursor-pointer ${
                                                    selectedCharge?.mod_id === charge.mod_id ? "bg-gray-200 text-corvid-blue" : "text-corvid-blue"
                                                }`}
                                                onClick={() => handleRowClick(charge)}
                                            >
                                                <td className="w-1/5 px-4 py-2 font-bold">{charge.mod_id}</td>
                                                <td className="w-1/5 px-4 py-2 font-bold">{charge.charge_code}</td>
                                                <td className="w-1/5 px-4 py-2 font-bold">
                                                    {charge.funding_amount ? (
                                                        <div className="flex justify-between">
                                                            <span>$</span>
                                                            <span>{new Intl.NumberFormat("en-US", { style: "decimal", minimumFractionDigits: 2 }).format(charge.funding_amount)}</span>
                                                        </div>
                                                    ) : (
                                                        "N/A"
                                                    )}
                                                </td>
                                                <td className="w-1/5 px-4 py-4 font-bold">{charge.funding_type}</td>
                                                <td className="w-1/5 px-4 py-2 text-right">
                                                    {subMods[charge.mod_id]?.some(b => !allocationsMap[b.mod_id] || allocationsMap[b.mod_id].length === 0) && (
                                                        <button 
                                                            className="text-sm bg-gray-400 text-white rounded p-1"
                                                            onClick={() => toggleDropdown(charge.mod_id)}
                                                        >
                                                            <ChevronDown
                                                                className={`transition-transform duration-200 ${expandedMods[charge.mod_id] ? "rotate-180" : ""}`}
                                                            />
                                                        </button>
                                                    )}

                                                    {activeTab === "submitted" && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUnsubmit(charge.mod_id);
                                                            }}
                                                            className="ml-2 px-2 py-1 bg-red-500 text-white rounded"
                                                        >
                                                            Unsubmit
                                                        </button>
                                                    )}

                                                </td>
                                            </tr>

                                            {/* Dropdown for Sub-Mods */}
                                            {expandedMods[charge.mod_id] && subMods[charge.mod_id]?.some(b => {
                                                const isSubmitted = allocationsMap[b.mod_id] && allocationsMap[b.mod_id].length > 0;
                                                return activeTab === "submitted" ? isSubmitted : !isSubmitted;
                                            }) && (
                                                <tr className="border-b border-gray-200 bg-gray-100">
                                                    <td colSpan="5">
                                                        <table className="w-full table-fixed text-sm bg-gray-50">
                                                            <tbody>
                                                            {subMods[charge.mod_id]
                                                                ?.filter(b => {
                                                                    if (b.isTemporary) return false; 
                                                                    const isSubmitted = allocationsMap[b.mod_id] && allocationsMap[b.mod_id].length > 0;
                                                                    return activeTab === "submitted" ? isSubmitted : !isSubmitted;
                                                                })

                                                                    .map((subMod) => (
                                                                        <tr
                                                                            key={subMod.mod_id}
                                                                            className={`border-b border-gray-300 text-corvid-blue cursor-pointer ${
                                                                                selectedCharge?.mod_id === subMod.mod_id ? "bg-gray-200" : ""
                                                                            }`}
                                                                            onClick={() => handleRowClick(subMod)}
                                                                        >
                                                                            <td className="w-1/5 px-4 py-2">{subMod.mod_id}</td>
                                                                            <td className="w-1/5 px-4 py-2">{subMod.charge_code}</td>
                                                                            <td className="w-1/5 px-4 py-2">
                                                                                {charge.funding_amount ? (
                                                                                    <div className="flex justify-between">
                                                                                        <span>$</span>
                                                                                        <span>{new Intl.NumberFormat("en-US", { style: "decimal", minimumFractionDigits: 2 }).format(subMod.funding_amount)}</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    "N/A"
                                                                                )}
                                                                            </td>
                                                                            <td className="px-4 py-2">{subMod.funding_type}</td>
                                                                            <td className="px-4 py-2"></td>
                                                                            <td className="px-4 py-2"></td>
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

                                    <div className="text-sm text-corvid-blue">
                                        <strong>Capture Leads:</strong>
                                        {captureLeads.length > 0 ? (
                                            <ul className="list-disc pl-5">
                                            {captureLeads.map((lead, index) => (
                                                <li key={index}>{lead}</li>
                                            ))}
                                            </ul>
                                        ) : (
                                            <p className="italic">No capture leads assigned.</p>
                                        )}
                                    </div>

                                    <button 
                                        className="mt-2 px-4 py-2 bg-gray-500 text-white rounded"
                                        onClick={() => setShowPopup(true)}
                                    >
                                        Edit Capture Leads
                                    </button>
                                </div>
                            )}
                        </div>

                        {activeTab === "unsubmitted" && submittedAllocations.length > 0 && (
                            <div className="mb-4 p-4 border border-gray-400 rounded bg-gray-100">
                                <h3 className="text-md font-bold text-corvid-blue mb-2">Previous Submission</h3>
                                <ul className="mb-2">
                                    {submittedAllocations.map((alloc, index) => (
                                        <li key={index} className="text-sm text-corvid-blue">
                                            <strong>{alloc.full_name}:</strong> {alloc.allocation}%
                                        </li>
                                    ))}
                                </ul>
                                {submittedNotes && (
                                    <p className="text-sm text-corvid-blue"><strong>Notes:</strong> {submittedNotes}</p>
                                )}
                            </div>
                        )}
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
                                                            <input
                                                                type="text"
                                                                list={`employee-options-${index}`}
                                                                className="w-full border px-2 py-1 text-corvid-blue"
                                                                value={alloc.name}
                                                                onChange={(e) => handleAllocationChange(index, "name", e.target.value)}
                                                                placeholder="Enter an employee name..."
                                                            />
                                                            <datalist id={`employee-options-${index}`}>
                                                                {employees.map((employee, i) => (
                                                                    <option key={i} value={employee.full_name} />
                                                                ))}
                                                            </datalist>
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
                                            {!allocationsMap[selectedCharge?.mod_id] && (
                                            <tr>
                                                <td colSpan="2" className="text-left">
                                                <button
                                                    className="mt-2 px-2 py-1 bg-gray-200 font-bold text-corvid-blue rounded"
                                                    onClick={handleAddAllocation}
                                                    disabled={totalAllocation >= 100}
                                                >
                                                    +
                                                </button>
                                                </td>
                                            </tr>
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
                                            <button className="px-4 py-2 bg-gray-500 text-white font-bold text-lg rounded" onClick={handleClear}>
                                                Clear
                                            </button>
                                            <button className="px-4 py-2 bg-yellow-500 text-white font-bold text-lg rounded" onClick={handleSaveDraft}>
                                                Save Allocations
                                            </button>
                                            <button className="px-4 py-2 bg-green-600 text-white font-bold text-lg rounded" onClick={handleSubmit} disabled={isSubmitted}>
                                                Submit
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                    </div>

                    

                    {showBreakoutPopup && breakoutMod && (
                        <div className="fixed inset-0 flex justify-center items-center z-50 bg-gray-800 bg-opacity-50">
                            <div className="bg-white p-8 border border-gray-900 w-1/2">
                                <h2 className="text-xl font-bold mb-4 text-center text-corvid-blue">
                                    Breakouts for {breakoutMod?.mod_id}
                                </h2>

                                <p className="text-lg text-gray-700 text-center">
                                    You are creating breakouts for <strong>{breakoutMod?.charge_code}</strong>. 
                                    Click <strong>+</strong> to add a breakout.
                                </p>

                                <div className="mt-4 text-center text-md font-semibold text-corvid-blue">
                                    FUNDING AMOUNT REMAINING:&nbsp;
                                    <span className="text-black">
                                        {new Intl.NumberFormat("en-US", {
                                        style: "currency",
                                        currency: "USD"
                                        }).format(
                                        breakoutMod.funding_amount -
                                        (subMods[breakoutMod.mod_id]?.reduce(
                                            (sum, s) => sum + Number(s.funding_amount || 0),
                                            0
                                        ) || 0)
                                        )}
                                    </span>
                                </div>


                                <div className="mt-4">
                                    {subMods[breakoutMod.mod_id]?.map((subMod, index) => (
                                        <div key={index} className="flex gap-2 mb-2 items-center">
                                            <span className="font-bold text-gray-700">{subMod.mod_id}</span>
                                            <input
                                                type="number"
                                                className="w-1/3 p-2 border rounded text-corvid-blue"
                                                placeholder="Funding Amount"
                                                value={subMod.funding_amount}
                                                onChange={(e) => {
                                                    const value = e.target.value;

                                                    const totalAllocated = subMods[breakoutMod.mod_id]?.reduce(
                                                        (sum, s) => sum + Number(s.funding_amount || 0), 
                                                        0
                                                    );

                                                    const remainingFunding = breakoutMod.funding_amount - totalAllocated + Number(subMod.funding_amount || 0);

                                                    if (value > remainingFunding) {
                                                        alert(`Breakout funding cannot exceed remaining amount: ${remainingFunding}`);
                                                        return;
                                                    }

                                                    setSubMods(prev => ({
                                                        ...prev,
                                                        [breakoutMod.mod_id]: prev[breakoutMod.mod_id].map((s, i) =>
                                                            i === index ? { ...s, funding_amount: value } : s
                                                        )
                                                    }));
                                                }}
                                            />
                                            <select
                                                className="w-1/3 p-2 border rounded text-corvid-blue"
                                                value={subMod.funding_type}
                                                onChange={(e) => setSubMods(prev => ({
                                                    ...prev,
                                                    [breakoutMod.mod_id]: prev[breakoutMod.mod_id].map((s, i) =>
                                                        i === index ? { ...s, funding_type: e.target.value } : s
                                                    )
                                                }))}
                                            >
                                                <option value="LABOR">LABOR</option>
                                                <option value="SUBS">SUBS</option>
                                                <option value="MATERIALS">MATERIALS</option>
                                                <option value="TRAVEL">TRAVEL</option>
                                                <option value="TRAVEL">CPU</option>
                                            </select>

                                            <button
                                                className="ml-2 px-2 py-1 bg-red-500 text-white rounded"
                                                onClick={() => {
                                                    setSubMods(prev => ({
                                                        ...prev,
                                                        [breakoutMod.mod_id]: prev[breakoutMod.mod_id].filter((_, i) => i !== index)
                                                    }));
                                                }}
                                            >
                                                X
                                            </button>
                                        </div>
                                    ))}

                                </div>

                                <button 
                                    className="w-auto px-3 py-2 bg-gray-400 text-white rounded"
                                    onClick={handleAddBreakout}
                                >
                                    +
                                </button>

                                <div className="flex justify-between mt-6">
                                    <button className="px-5 py-2 bg-gray-500 text-white rounded-lg" onClick={() => {
                                        setSubMods(prev => {
                                            const remaining = (prev[breakoutMod.mod_id] || []).filter(b => !b.isTemporary);
                                            const updated = { ...prev };
                                            if (remaining.length > 0) {
                                              updated[breakoutMod.mod_id] = remaining;
                                            } else {
                                              delete updated[breakoutMod.mod_id]; 
                                            }
                                            return updated;
                                          });
                                        setShowBreakoutPopup(false);
                                    }}>
                                        Cancel
                                    </button>
                                    <button className="px-5 py-2 bg-green-600 text-white rounded-lg" onClick={handleSubmitBreakouts}>
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}


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
                                                    
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-gray-500 text-sm italic">No capture leads assigned.</p>
                                    )}
                                </div>
                                <div className="mb-4">
                                    <h3 className="text-md font-semibold text-corvid-blue mb-2">Add a Lead:</h3>
                                    <input
                                        type="text"
                                        list="capture-lead-options"
                                        className="w-full border border-gray-300 px-3 py-2 rounded text-corvid-blue"
                                        placeholder="Enter an employee name..."
                                        onChange={(e) => {
                                            const selectedEmployee = employees.find(emp => emp.full_name === e.target.value);
                                            if (selectedEmployee && !captureLeads.includes(selectedEmployee.full_name)) {
                                            setCaptureLeads([...captureLeads, selectedEmployee.full_name]);
                                            }
                                        }}
                                    />
                                    <datalist id="capture-lead-options">
                                        {employees
                                            .filter(emp => !captureLeads.includes(emp.full_name))
                                            .map((employee, i) => (
                                            <option key={i} value={employee.full_name} />
                                            ))}
                                    </datalist>
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
                )}
                {activeTab === "tips" && (
                    <div className="flex flex-col">
                        <h3 className="text-xl font-bold text-corvid-blue mt-4 mb-4">Spot Bonuses</h3>

                        {/* Tip Submission Form */}
                        <div className="mt-4 mb-6">
                        <h4 className="text-xl font-semibold text-corvid-blue mb-2">New Spot Bonuses</h4>
                        <table className="w-full table-fixed divide-y divide-gray-700 text-md">
                            <thead>
                                <tr>
                                <th className="w-1/5 px-2 py-2 text-left text-corvid-blue font-bold uppercase">Name</th>
                                <th className="w-1/5 px-2 py-2 text-left text-corvid-blue font-bold uppercase">Tip Allocation</th>
                                <th className="px-2 py-2 text-left text-corvid-blue font-bold uppercase"></th>
                                </tr>
                            </thead>
                            <tbody>
                            {newTipAllocations.map((tip, index) => (
                                <tr key={index}>
                                <td className="px-2 py-2">
                                    <input
                                        type="text"
                                        list={`tip-employee-options-${index}`}
                                        className="w-full border px-2 py-1 text-corvid-blue"
                                        placeholder="Enter an employee name..."
                                        value={tip.full_name}
                                        onChange={(e) => updateNewTip(index, "full_name", e.target.value)}
                                    />
                                    <datalist id={`tip-employee-options-${index}`}>
                                        {employees.map((emp, i) => (
                                            <option key={i} value={emp.full_name} />
                                        ))}
                                    </datalist>

                                </td>
                                <td className="px-2 py-2">
                                    <input
                                    type="number"
                                    className="w-full border px-2 py-1 text-corvid-blue text-right"
                                    value={tip.tip_allocation}
                                    onChange={(e) => updateNewTip(index, "tip_allocation", e.target.value)}
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <button
                                    className="px-2 py-1 bg-gray-400 text-white rounded"
                                    onClick={() => removeNewTip(index)}
                                    >
                                    X
                                    </button>
                                </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        <button
                            onClick={() => setNewTipAllocations([...newTipAllocations, { full_name: "", tip_allocation: "" }])}
                            className="mt-2 ml-4 px-4 py-2 bg-gray-400 text-white font-bold rounded mr-2"
                            >
                            +
                        </button>
                        <button
                            className="mt-2 ml-4 px-4 py-2 bg-green-600 text-white font-bold rounded"
                            onClick={submitTips}
                            disabled={newTipAllocations.length === 0}
                        >
                            Submit
                        </button>
                        </div>
                        <hr className="my-6 border-t border-gray-200" />


                        {/* Submitted Tips Table */}
                        {submittedTips.length > 0 && (
                        <div className="mt-4 mb-6">
                            <h4 className="text-xl font-semibold text-corvid-blue mb-2">Submitted Spot Bonuses</h4>
                            <table className="w-full table-fixed divide-y divide-gray-700 text-md">
                            <thead>
                                <tr>
                                <th className="w-1/5 px-2 py-2 text-left text-corvid-blue font-bold uppercase">Name</th>
                                <th className="w-1/5 px-2 py-2 text-left text-corvid-blue font-bold uppercase">Tip Allocation</th>
                                <th className="px-2 py-2 text-left text-corvid-blue font-bold uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submittedTips.map((tip, index) => (
                                <tr key={index}>
                                    <td className="px-2 py-2 text-corvid-blue font-bold">{tip.full_name}</td>
                                    <td className="px-2 py-2">
                                    <input
                                        type="number"
                                        className="w-full border px-2 py-1 text-right text-corvid-blue"
                                        value={tip.tip_allocation}
                                        onChange={(e) => {
                                        const newTips = [...submittedTips];
                                        newTips[index].tip_allocation = e.target.value;
                                        setSubmittedTips(newTips);
                                        }}
                                    />
                                    </td>
                                    <td className="px-2 py-2">
                                    <div className="flex space-x-2">
                                        <button
                                            className="px-3 py-1 bg-green-600 text-white font-bold rounded"
                                            onClick={() => handleUpdateTip(index)}
                                        >
                                            Save
                                        </button>
                                        <button
                                            className="px-3 py-1 bg-gray-400 text-white font-bold rounded"
                                            onClick={() => handleDeleteTip(index)}
                                        >
                                            Delete
                                        </button>
                                        </div>
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td className="text-right font-bold border-t pt-2 pr-3 text-corvid-blue"></td>
                                    <td className="text-right font-bold border-t pt-2 text-corvid-blue">
                                    Total Spot Bonuses Allocated: ${[...submittedTips, ...newTipAllocations]
                                            .reduce((sum, t) => sum + (parseFloat(t.tip_allocation) || 0), 0)
                                            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="text-left font-bold border-t pt-2 pr-3 pl-2 text-corvid-blue"> </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    )}
                    

                </div>
                )}
                {activeTab === "payout" && (
                    <div className="mt-6">
                    <h3 className="text-xl font-bold text-corvid-blue mb-4">Your Payout History</h3>
                    <table className="w-full table-fixed divide-y divide-gray-700 text-sm mb-4">
                    <thead>
                        <tr>
                        <th className="w-[12.5%] px-2 py-2 text-left font-bold text-corvid-blue uppercase">Mod ID</th>
                        <th className="w-[12.5%] px-2 py-2 text-left font-bold text-corvid-blue uppercase">Charge Code</th>
                        <th className="w-1/2 px-2 py-2 text-left font-bold text-corvid-blue uppercase">Description</th>
                        <th className="w-[12.5%] px-2 py-2 text-left font-bold text-corvid-blue uppercase">Mod</th>
                        <th className="w-[12.5%] px-2 py-2 text-right font-bold text-corvid-blue uppercase">Payout</th>
                        </tr>
                    </thead>

                    <tbody>
                        {payoutHistory.map((entry, index) => (
                        <tr key={index} className="text-corvid-blue border-b">
                            <td className="w-[12.5%] px-2 py-2">{entry.mod_id}</td>
                            <td className="w-[12.5%] px-2 py-2">{entry.charge_code}</td>
                            <td className="w-1/2 px-2 py-2">{entry.description}</td>
                            <td className="w-[12.5%] px-2 py-2">{entry.mod}</td>
                            <td className="w-[12.5%] px-2 py-2 font-medium text-corvid-blue">

                            <div className="flex justify-between">
                                <span>$</span>
                                <span className="text-right">
                                {Number(entry.payout).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                                </span>
                            </div>
                            </td>

                        </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td className="w-[12.5%]"></td>
                            <td className="w-[12.5%]"></td>
                            <td className="w-1/2"></td>
                            <td className="w-[12.5%] text-right font-bold text-corvid-blue pt-4">Total Payout:</td>
                            <td className="w-[12.5%] text-right font-bold text-corvid-blue pt-4 pr-2">
                            <div className="flex justify-between pl-2">
                                <span>$</span>
                                <span className="text-right">
                                {payoutHistory
                                    .reduce((sum, item) => sum + parseFloat(item.payout || 0), 0)
                                    .toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                            </td>
                        </tr>
                        </tfoot>


                    </table>
                </div>
                )}
            </div>
        </div>
    );
};

export default ICVoterTables;