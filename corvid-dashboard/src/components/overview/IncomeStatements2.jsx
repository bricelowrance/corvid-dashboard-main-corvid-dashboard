import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import axios from "axios";

const IncomeStatements2 = () => {
    const [year, setYear] = useState("2024");
    const [period, setPeriod] = useState("2");
    const [entity, setEntity] = useState("CORVID");
    const [financialData, setFinancialData] = useState([]);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [loading, setLoading] = useState(true);

    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await axios.get("http://localhost:5001/income-summary", {
                    params: { year, period, entity },
                });

                const categoryOrder = {
                    CYBER: ["REVENUE", "COSTS OF GOODS SOLD", "INDIRECT COST", "OTHER INDIRECTS", "TAXES", "DEPRECIATION"],
                    TRDP: ["RECURRING REVENUE", "NON-RECURRING REVENUE", "OPERATING COSTS", "FINANCING COST", "NON CASH EXPENSE"],
                    HPC: ["REVENUE", "DIRECT COST", "INDIRECT COST", "OTHER COST"],
                    LYN: ["REVENUE", "DIRECT COST", "INDIRECT COST", "UNALLOWABLE/OTHER", "OTHER INCOME"],
                    ATEA: ["REVENUE", "DIRECT COST", "INDIRECT COST", "UNALLOWABLE/OTHER"],
                    TALON: ["REVENUE", "DIRECT COST", "INDIRECT COST", "DEPRECIATION", "PHANTOM PLAN EXPENSE", "OPERATING COSTS"],
                    CORVID: ["REVENUE", "DIRECT COST", "INDIRECT COST", "UNALLOWABLE/OTHER", "INTEREST EXPENSE"],
                };

                const aggregatedData = response.data.reduce((acc, { category, subcategory, total_amount }) => {
                    if (!acc[category]) {
                        acc[category] = { category, total_amount: 0, subcategories: [] };
                    }
                    acc[category].total_amount += Number(total_amount) || 0;
                    acc[category].subcategories.push({ subcategory, amount: Number(total_amount) || 0 });
                    return acc;
                }, {});

                const orderedData = Object.values(aggregatedData).sort((a, b) => {
                    const order = categoryOrder[entity] || [];
                    return (order.indexOf(a.category) - order.indexOf(b.category));
                });
    
                setFinancialData(orderedData);
            } catch (error) {
                console.error("Error fetching financial data:", error);
            } finally {
                setLoading(false);
            }
        };
    
        fetchData();
    }, [year, period, entity]);
    

    const toggleCategory = (category) => {
        setExpandedCategories((prev) => ({
            ...prev,
            [category]: !prev[category],
        }));
    };

    const getAmount = (category) => financialData.find((item) => item.category === category)?.total_amount || 0;
    const getSubAmount = (category, subcategory) => {
        const categoryItem = financialData.find((item) => item.category === category);
        if (!categoryItem || !categoryItem.subcategories) return 0;
    
        const subItem = categoryItem.subcategories.find((sub) => sub.subcategory === subcategory);
        return subItem ? subItem.amount : 0;
    };

    let operatingCosts = 0;
    let netIncome = 0;
    let ebitda = 0;

    switch (entity) {
        case "CORVID":
            operatingCosts = getAmount("DIRECT COST") + getAmount("INDIRECT COST");
            netIncome = getAmount("REVENUE") - getAmount("DIRECT COST") - getAmount("INDIRECT COST") - getAmount("UNALLOWABLE/OTHER") - getAmount("INTEREST EXPENSE");
            ebitda = netIncome + getSubAmount("INDIRECT COST", "G&A DEPRECIATION") + getSubAmount("INDIRECT COST", "OH DEPRECIATION") +
                     getAmount("INTEREST EXPENSE") + getSubAmount("INDIRECT COST", "G&A TAXES") + getSubAmount("INDIRECT COST", "OH TAXES");
            break;

        case "ATEA":
            operatingCosts = getAmount("DIRECT COST") + getAmount("INDIRECT COST");
            netIncome = getAmount("REVENUE") - getAmount("DIRECT COST") - getAmount("INDIRECT COST") - getAmount("UNALLOWABLE/OTHER");
            ebitda = netIncome + getSubAmount("INDIRECT COST", "G&A DEPRECIATION") + getSubAmount("INDIRECT COST", "OH DEPRECIATION") +
                     getSubAmount("INDIRECT COST", "TAXES");
            break;

        case "LYN":
            operatingCosts = getAmount("DIRECT COST") + getAmount("INDIRECT COST");
            netIncome = getAmount("REVENUE") - getAmount("DIRECT COST") - getAmount("INDIRECT COST") - getAmount("UNALLOWABLE/OTHER") + getAmount("OTHER INCOME");
            ebitda = netIncome + getSubAmount("INDIRECT COST", "G&A DEPRECIATION") + getAmount("UNALLOWABLE/OTHER") +
                     getSubAmount("INDIRECT COST", "TAXES");
            break;

        case "CYBER":
            operatingCosts = getAmount("DIRECT COST") + getAmount("INDIRECT COST");
            netIncome = getAmount("REVENUE") - getAmount("COSTS OF GOODS SOLD") - getAmount("INDIRECT COST") - getAmount("OTHER INDIRECTS");
            ebitda = netIncome + getAmount("DEPRECIATION") + getAmount("TAXES");
            break;

        case "HPC":
            operatingCosts = getAmount("DIRECT COST") + getAmount("INDIRECT COST");
            netIncome = getAmount("REVENUE") - getAmount("DIRECT COST") - getAmount("INDIRECT COST") - getAmount("OTHER COST");
            ebitda = netIncome + getSubAmount("OTHER COST", "DEPRECIATION EXPENSE") + getSubAmount("OTHER COST", "INTEREST EXPENSE");
            break;

        case "TRDP":
            operatingCosts = getAmount("DIRECT COST") + getAmount("INDIRECT COST");
            netIncome = getAmount("RECURRING REVENUE") + getAmount("NON-RECURRING REVENUE") - getAmount("OPERATING COSTS") - getAmount("FINANCING COST") - getAmount("NON CASH EXPENSE");
            ebitda = netIncome + getSubAmount("NON CASH EXPENSE", "DEPRECIATION") + getSubAmount("FINANCING COST", "INTEREST EXPENSE") +
                     getSubAmount("OPERATING COST", "TAXES");
            break;

        case "TALON":
            operatingCosts = getAmount("DIRECT COST") + getAmount("INDIRECT COST");
            netIncome = getAmount("REVENUE") - getAmount("DIRECT COST") - getAmount("INDIRECT COST") - getAmount("PHANTOM PLAN EXPENSE");
            ebitda = netIncome + getAmount("DEPRECIATION");
            break;

        default:
            break;
    }

    return (
        <div className="flex flex-col items-center pt-6">
            <div className="bg-white shadow-lg p-10 border border-gray-700 w-full max-w-7xl">
                <h2 className="text-xl font-extrabold text-corvid-blue mb-6 text-center">
                    {entity} Income Statement
                </h2>

                <div className="flex justify-between mb-6">
                    <div>
                        <label className="block text-corvid-blue font-semibold mb-2 text-sm">Select Year:</label>
                        <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="bg-gray-200 text-corvid-blue px-4 py-2 rounded text-sm"
                        >
                            <option>2023</option>
                            <option>2024</option>
                            <option>2025</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-corvid-blue font-semibold mb-2 text-sm">Select Month:</label>
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="bg-gray-200 text-corvid-blue px-4 py-2 rounded text-sm"
                        >
                            {months.map((month, index) => (
                                <option key={index + 1} value={index + 1}>
                                    {month}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-corvid-blue font-semibold mb-2 text-sm">Select Company:</label>
                        <select
                            value={entity}
                            onChange={(e) => setEntity(e.target.value)}
                            className="bg-gray-200 text-corvid-blue px-4 py-2 rounded text-sm"
                        >
                            <option value="CORVID">CORVID</option>
                            <option value="ATEA">ATEA</option>
                            <option value="CYBER">CYBER</option>
                            <option value="HPC">HPC</option>
                            <option value="LYN">LYN</option>
                            <option value="TALON">TALON</option>
                            <option value="TRDP">TRDP</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <p className="text-center text-corvid-blue text-sm">Loading...</p>
                ) : (
                    <table className="w-full table-fixed divide-y divide-gray-700 text-xs">
                        <thead>
                            <tr>
                                <th className="px-2 py-2 text-left font-bold text-corvid-blue uppercase">Category</th>
                                <th className="px-2 py-2 text-right font-bold text-corvid-blue uppercase">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {financialData.map(({ category, total_amount, subcategories }) => {
                                const hasDistinctSubcategories = subcategories.some(({ subcategory }) => subcategory !== category);

                                return (
                                    <React.Fragment key={category}>
                                        <tr className="bg-gray-200 text-corvid-blue font-bold">
                                            <td
                                                className={`px-4 py-2 flex items-center ${
                                                    hasDistinctSubcategories ? "cursor-pointer" : ""
                                                }`}
                                                onClick={() => hasDistinctSubcategories && toggleCategory(category)}
                                            >
                                                {category}
                                                {hasDistinctSubcategories && (
                                                    <ChevronDown
                                                        className={`transition-transform ${
                                                            expandedCategories[category] ? "rotate-180" : ""
                                                        }`}
                                                    />
                                                )}
                                                
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                ${total_amount.toLocaleString("en-US")}
                                            </td>
                                        </tr>
                                        {hasDistinctSubcategories &&
                                            expandedCategories[category] &&
                                            subcategories.map(({ subcategory, amount }, index) => (
                                                <tr key={`subcategory-${category}-${index}`} className="text-sm text-corvid-blue text-gray-600">
                                                    <td className="px-6 py-1">{subcategory}</td>
                                                    <td className="px-4 py-1 text-right">${amount.toLocaleString("en-US")}</td>
                                                </tr>
                                            ))}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-600 text-white font-bold">
                                <td className="px-4 py-2">OPERATING COST</td>
                                <td className="px-4 py-2 text-right">${operatingCosts.toLocaleString("en-US")}</td>
                            </tr>
                            <tr className="bg-gray-700 text-white font-bold">
                                <td className="px-4 py-2">NET INCOME</td>
                                <td className="px-4 py-2 text-right">${netIncome.toLocaleString("en-US")}</td>
                            </tr>
                            <tr className="bg-gray-800 text-white font-bold">
                                <td className="px-4 py-2">EBITDA</td>
                                <td className="px-4 py-2 text-right">${ebitda.toLocaleString("en-US")}</td>
                            </tr>
                            <tr>
                                {year === "2024" && period === "12" && entity === "TALON" && (
                                    <p className="mt-4 text-red-600 font-bold">
                                        * NOTE: Phantom Plan Expense INCLUDED in Net Income or EBITDA Calculations. *
                                    </p>
                                )}
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>
        </div>
    );
};

export default IncomeStatements2;