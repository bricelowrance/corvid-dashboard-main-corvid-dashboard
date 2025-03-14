import React, { useState, useEffect } from "react";
import axios from "axios";

const ConsolidatedCFTable = () => {
    const [selectedCompany, setSelectedCompany] = useState("Consolidated");
    const [selectedMonth, setSelectedMonth] = useState(0);
    const [balanceSheetData, setBalanceSheetData] = useState({});
    const [loading, setLoading] = useState(true);
    const [netIncome, setNetIncome] = useState("-");
    const [prevNetIncome, setPrevNetIncome] = useState("-");

    const months = [
        "Jan 2024", "Feb 2024", "Mar 2024", "Apr 2024", "May 2024", "Jun 2024",
        "Jul 2024", "Aug 2024", "Sep 2024", "Oct 2024", "Nov 2024", "Dec 2024"
    ];

    const categoryOrder = [
        "NET INCOME", "OPERATING ACTIVITIES", "ACCOUNTS RECEIVABLE", "UNBILLED RECEIVABLE",
        "OTHER CURRENT ASSETS", "ACCOUNTS PAYABLE", "PAYROLL LIABILITIES", "ACCRUED EXPENSES",
        "DEFERRED REVENUE", "OTHER CURRENT LIABILITIES", "DEPOSITS", "INVESTING ACTIVITIES",
        "NET FIXED ASSETS", "FINANCING ACTIVITIES", "LONG TERM LIABILITIES", "DIVIDENDS", "CASH"
    ];

    const categoryDisplayNames = {
        "NET FIXED ASSETS": "PURCHASES OF FIXED ASSETS",
        "LONG TERM LIABILITIES": "PRINCIPAL PAYMENTS ON LOANS",
        "DIVIDENDS": "DISTRIBUTIONS",
        "CASH": "INCREASE IN CASH",
    };

    useEffect(() => {
        const fetchBalanceSheetData = async () => {
            try {
                setLoading(true);
                const response = await axios.get("http://localhost:5000/balance", {
                    params: { entity: selectedCompany === "Consolidated" ? undefined : selectedCompany },
                });

                const transformedData = response.data.reduce((acc, { category, period, amount }) => {
                    if (!acc[category]) acc[category] = Array(12).fill(0);
                    acc[category][period - 1] = amount;
                    return acc;
                }, {});

                setBalanceSheetData(transformedData);
            } catch (error) {
                console.error("Error fetching balance sheet data:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchNetIncome = async () => {
            try {
        
                const response = await axios.get("http://localhost:5000/net_income", {
                    params: {
                        entity: selectedCompany === "Consolidated" ? undefined : selectedCompany,
                        period: selectedMonth + 1,
                    },
                });
        
                console.log("Net Income Response:", response.data);
        
                setNetIncome(response.data.current ? response.data.current.toLocaleString() : "-");
                setPrevNetIncome(response.data.previous ? response.data.previous.toLocaleString() : "-");

            } catch (error) {
                console.error("Error fetching Net Income:", error.response ? error.response.data : error.message);
                setNetIncome("Error");
            }
        };

        fetchBalanceSheetData();
        fetchNetIncome();
    }, [selectedCompany, selectedMonth]);

    const calculateDifference = (category) => {
        if (!balanceSheetData[category]) return "-";
        const currentMonthValue = balanceSheetData[category][selectedMonth] || 0;
        const previousMonthValue = selectedMonth > 0 ? balanceSheetData[category][selectedMonth - 1] || 0 : 0;
        return (currentMonthValue - previousMonthValue).toLocaleString();
    };

    const filteredAndOrderedData = categoryOrder.map((category) => {
        const displayName = categoryDisplayNames[category] || category;
        if (category === "NET INCOME") {
            return {
                name: displayName,
                currentAmount: netIncome,
                previousAmount: prevNetIncome,
                difference: prevNetIncome !== "-" && netIncome !== "-" ? 
                            (parseFloat(netIncome.replace(/,/g, '')) - parseFloat(prevNetIncome.replace(/,/g, ''))).toLocaleString() 
                            : "-",
                isHeader: false
            };
        }
        if (["OPERATING ACTIVITIES", "INVESTING ACTIVITIES", "FINANCING ACTIVITIES"].includes(category)) {
            return { name: displayName, currentAmount: "", previousAmount: "", difference: "", isHeader: true };
        }
        return {
            name: displayName,
            currentAmount: balanceSheetData[category] ? balanceSheetData[category][selectedMonth]?.toLocaleString() || "-" : "-",
            previousAmount: selectedMonth > 0 ? balanceSheetData[category]?.[selectedMonth - 1]?.toLocaleString() || "-" : "-",
            difference: calculateDifference(category),
            isHeader: false
        };
    });

    return (
        <div className="flex flex-col items-center pt-6 min-h-screen">
            <div className="bg-white shadow-lg p-10 border border-gray-700 w-full">
                <h2 className="text-xl font-bold text-corvid-blue mb-6 text-center">
                    {selectedCompany} Statement of Cash Flows
                </h2>

                <div className="mb-6">
                    <label htmlFor="companySelect" className="block text-corvid-blue mb-2 text-sm">
                        Select a Company:
                    </label>
                    <select
                        id="companySelect"
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="bg-gray-200 text-corvid-blue px-4 py-2 rounded w-full text-sm"
                    >
                        <option>Consolidated</option>
                        <option value="CORVID">Corvid</option>
                        <option value="ATEA">Atea</option>
                        <option value="CYBER">Cyber</option>
                        <option value="HPC">HPC</option>
                        <option value="LYN">Lyn</option>
                        <option value="TALON">Talon</option>
                        <option value="TRDP">TRDP</option>
                    </select>
                </div>

                <div className="mb-6">
                    <label htmlFor="monthSelect" className="block text-corvid-blue mb-2 text-sm">
                        Select a Month:
                    </label>
                    <select
                        id="monthSelect"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="bg-gray-200 text-corvid-blue px-4 py-2 rounded w-full text-sm"
                    >
                        {months.map((month, index) => (
                            <option key={index} value={index}>
                                {month}
                            </option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <p className="text-center text-corvid-blue text-sm">Loading...</p>
                ) : (
                    <table className="w-full table-fixed divide-y divide-gray-700 text-xs">
                        <thead>
                            <tr>
                                <th className="px-4 py-2 text-left font-bold text-corvid-blue uppercase">Category</th>
                                <th className="px-4 py-2 text-right font-bold text-corvid-blue uppercase">Previous Period</th>
                                <th className="px-4 py-2 text-right font-bold text-corvid-blue uppercase">Current Period</th>
                                <th className="px-4 py-2 text-right font-bold text-corvid-blue uppercase">Cash Flow</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndOrderedData.map(({ name, currentAmount, previousAmount, difference, isHeader }, index) => (
                                <tr key={index} className={isHeader ? "text-corvid-blue font-extrabold" : "font-semibold text-corvid-blue"}>
                                    <td className="py-2 px-4 text-left text-sm">{name}</td>
                                    <td className="py-2 px-4 text-right font-bold text-sm">{previousAmount}</td>
                                    <td className="py-2 px-4 text-right font-bold text-sm">{currentAmount}</td>
                                    <td className="py-2 px-4 text-right font-bold text-sm">{difference}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ConsolidatedCFTable;


