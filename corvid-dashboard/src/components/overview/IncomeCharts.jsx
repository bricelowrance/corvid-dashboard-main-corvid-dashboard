import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import axios from "axios";

const IncomeCharts = () => {
    const [chartData, setChartData] = useState([]);
    const [year, setYear] = useState("2024"); 
    const [category, setCategory] = useState("REVENUE"); 
    const [entity, setEntity] = useState("CORVID"); 

    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get("http://localhost:5000/income-summary", {
                    params: { year, category, entity },
                });

                const transformedData = response.data
                    .map((item) => ({
                        ...item,
                        name: months[item.period - 1], 
                    }))
                    .sort((a, b) => a.period - b.period); 

                setChartData(transformedData);
            } catch (error) {
                console.error("Error fetching chart data:", error);
            }
        };

        fetchData();
    }, [year, category, entity]);

    const formatCurrency = (value) => `$${value.toLocaleString()}`;

    return (
        <motion.div
            className="bg-white bg-opacity-100 backdrop-blur-md shadow-lg p-6 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
        >
            <h2 className="text-xl font-medium mb-4 text-corvid-blue">
                {category} in {year} for {entity}
            </h2>
            <div className="flex gap-4 mb-4">
                <select
                    className="bg-gray-200 text-corvid-blue p-2 rounded"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                >
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                    <option value="2021">2021</option>
                    <option value="2020">2020</option>
                    <option value="2019">2019</option>
                </select>
                <select
                    className="bg-gray-200 text-corvid-blue p-2 rounded"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    <option value="REVENUE">Revenue</option>
                    <option value="DIRECT LABOR">Direct Labor</option>
                    <option value="TRAVEL">Travel</option>
                    <option value="SUBCONTRACTOR COSTS">Subcontractor Costs</option>
                    <option value="MATERIALS">Materials</option>
                    <option value="OTHER DIRECT COSTS">Other Direct Costs</option>
                    <option value="FRINGE">Fringe</option>
                    <option value="OVERHEAD">Overhead</option>
                    <option value="GENERAL & ADMINISTR">General & Admin</option>
                    <option value="INTEREST INCOME">Interest Income</option>
                    <option value="OTHER INCOME">Other Income</option>
                    <option value="UNALLOWABLE EXPENSE">Unallowable Expense</option>
                </select>
                <select
                    className="bg-gray-200 text-corvid-blue p-2 rounded"
                    value={entity}
                    onChange={(e) => setEntity(e.target.value)}
                >
                    <option value="CORVID">Corvid</option>
                    <option value="ATEA">ATEA</option>
                    <option value="CYBER">Cyber</option>
                    <option value="HPC">HPC</option>
                    <option value="LYN">LYN</option>
                    <option value="TALON">Talon</option>
                    <option value="TRDP">TRDP</option>
                    
                </select>
            </div>
            <div className="h-[800px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 20, left: 40, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#23356b" />
                        <XAxis dataKey="name" stroke="#23356b" />
                        <YAxis
                            stroke="#23356b"
                            tickFormatter={(value) => formatCurrency(value)}
                        />
                        <Tooltip
                            formatter={(value) => [`$${value.toLocaleString()}`, "Amount"]} 
                            contentStyle={{
                                backgroundColor: "#23356b",
                                borderColor: "#23356b",
                            }}
                            itemStyle={{ color: "white" }}
                        />
                        <Line
                            type="monotone"
                            dataKey="amount"
                            stroke="#23356b"
                            strokeWidth={3}
                            dot={{ fill: "#23356b", strokeWidth: 2, r: 6 }}
                            activeDot={{ r: 8, strokeWidth: 2 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

export default IncomeCharts;




