const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const secretKey = process.env.JWT_SECRET;

app.post("/logout", (req, res) => {
    res.json({ message: "Logged out successfully" });
});

app.get("/user-role", async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        const result = await pool.query(
            "SELECT role FROM financial_data.employee WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ role: result.rows[0].role });
    } catch (err) {
        console.error("Error fetching user role:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/data", async (req, res) => {
    try {
        const { year, category, entity } = req.query;

        let query = `
            SELECT * 
            FROM financial_data.income_data
            WHERE 1=1
        `;
        const values = [];
        let index = 1;

        if (year) {
            query += ` AND year = $${index++}`;
            values.push(year);
        }
        if (category) {
            query += ` AND category = $${index++}`;
            values.push(category);
        }
        if (entity) {
            query += ` AND entity = $${index++}`;
            values.push(entity);
        }

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).send("Server Error");
    }
});

app.get("/income", async (req, res) => {
    try {
        const { entity } = req.query;

        let query = `
            SELECT category, period, SUM(amount) AS amount
            FROM financial_data.consolidated_income
        `;
        const values = [];

        if (entity && entity !== "Consolidated") {
            query += ` WHERE entity = $1`;
            values.push(entity);
        }

        query += ` GROUP BY category, period ORDER BY category, period`;

        const result = await pool.query(query, values);

        const incomeData = result.rows.map(({ category, period, amount }) => ({
            category,
            period,
            amount: parseFloat(amount),
        }));

        res.json(incomeData);
    } catch (err) {
        console.error("Error fetching consolidated income data:", err.message);
        res.status(500).send("Server Error");
    }
});

app.get("/balance", async (req, res) => {
    try {
        const { entity } = req.query;

        let query = `
            SELECT category, period, SUM(amount) AS amount
            FROM financial_data.consolidated_balance
        `;
        const values = [];

        if (entity && entity !== "Consolidated") {
            query += ` WHERE entity = $1`;
            values.push(entity);
        }

        query += ` GROUP BY category, period ORDER BY category, period`;

        const result = await pool.query(query, values);

        const incomeData = result.rows.map(({ category, period, amount }) => ({
            category,
            period,
            amount: parseFloat(amount),
        }));

        res.json(incomeData);
    } catch (err) {
        console.error("Error fetching consolidated balance data:", err.message);
        res.status(500).send("Server Error");
    }
});

app.get("/net_income", async (req, res) => {
    try {
        const { entity, period } = req.query;
        if (!period) {
            return res.status(400).json({ error: "Period is required" });
        }

        const parsedPeriod = parseInt(period); 

        const values = [parsedPeriod, parsedPeriod - 1]; 
        let query = `
            SELECT period, SUM(amount) AS amount
            FROM financial_data.consolidated_income
            WHERE UPPER(category) = 'NET INCOME'
              AND period IN ($1, $2)
        `;

        if (entity && entity !== "Consolidated") {
            query += ` AND entity = $3`;
            values.push(entity);
        }

        query += ` GROUP BY period ORDER BY period`;


        const result = await pool.query(query, values);

        let netIncomeData = { current: 0, previous: 0 };

        result.rows.forEach(({ period, amount }) => {
            if (parseInt(period) === parsedPeriod) {
                netIncomeData.current = parseFloat(amount);
            } else if (parseInt(period) === parsedPeriod - 1) {
                netIncomeData.previous = parseFloat(amount);
            }
        });
        res.json(netIncomeData);
    } catch (err) {
        console.error("Error fetching Net Income data:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get("/financial-summary", async (req, res) => {
    try {
        const { year, period, entity } = req.query;

        if (!year || !period || !entity) {
            return res.status(400).json({ error: "Year, period, and entity are required parameters" });
        }

        const query = `
            SELECT category, subcategory, SUM(amount) AS total_amount
            FROM financial_data.balance_sheets
            WHERE year = $1 AND period = $2 AND entity = $3
            GROUP BY category, subcategory
            ORDER BY category, subcategory
        `;
        const values = [year, period, entity];

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching financial summary:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/income-summary", async (req, res) => {
    try {
        const { year, period, entity } = req.query;

        if (!year || !period || !entity) {
            return res.status(400).json({ error: "Year, period, and entity are required parameters" });
        }

        const query = `
            SELECT category, subcategory, SUM(amount) AS total_amount
            FROM financial_data.income_statements
            WHERE year = $1 AND period = $2 AND entity = $3
            GROUP BY category, subcategory
            ORDER BY category, subcategory
        `;
        const values = [year, period, entity];

        const result = await pool.query(query, values);
        
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching income statement:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/income-chart", async (req, res) => {
    try {
        const { year, entity, category } = req.query;

        if (!year || !entity) {
            return res.status(400).json({ error: "Year and entity are required parameters" });
        }

        let query = `
            SELECT period, category, SUM(amount) AS total_amount
            FROM financial_data.income_statements
            WHERE year = $1 AND entity = $2
        `;
        const values = [year, entity];

        if (category) {
            query += " AND category = $3";
            values.push(category);
        }

        query += `
            GROUP BY period, category
            ORDER BY period;
        `;

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching income statement:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/employees", async (req, res) => {
    try {
        const result = await pool.query("SELECT full_name FROM financial_data.employee");
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching employees:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/directory", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM financial_data.employee");
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching employees:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/exec-data", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM financial_data.mods");
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching miml data:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/miml-data", async (req, res) => {
    const userEmail = req.query.email;

    if (!userEmail) {
        return res.status(400).json({ error: "User email is required" });
    }

    try {
        const userResult = await pool.query(
            "SELECT first_name, last_name FROM financial_data.employee WHERE email = $1",
            [userEmail]
        );

        if (userResult.rows.length === 0) {
            return res.status(403).json({ error: "User not found in employee records" });
        }

        const { last_name } = userResult.rows[0];

        const result = await pool.query(
            `SELECT * FROM financial_data.miml 
             WHERE capture_one = $1 
             OR capture_two = $1 
             OR capture_three = $1 
             OR capture_four = $1`,
            [last_name]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching miml data:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/user-mods", async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        const employeeResult = await pool.query(
            "SELECT employee_id FROM financial_data.employee WHERE email = $1",
            [email]
        );

        if (employeeResult.rows.length === 0) {
            return res.status(404).json({ error: "Employee not found" });
        }

        const employeeId = employeeResult.rows[0].employee_id;

        const modResult = await pool.query(
            "SELECT mod_id FROM financial_data.capture_leads WHERE employee_id = $1",
            [employeeId]
        );

        if (modResult.rows.length === 0) {
            return res.json([]); 
        }

        const modIds = modResult.rows.map(row => row.mod_id);

        const modsData = await pool.query(
            `SELECT * FROM financial_data.mods WHERE mod_id = ANY($1)`,
            [modIds]
        );

        res.json(modsData.rows);
    } catch (err) {
        console.error("Error fetching user mods data:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/submit-breakout", async (req, res) => {
    const { mod_id, charge_code, funding_amount, funding_type } = req.body;

    if (!mod_id || !charge_code || !funding_amount || !funding_type) {
        return res.status(400).json({ error: "All fields are required." });
    }

    const client = await pool.connect();

    try {
        const result = await client.query(
            `SELECT COUNT(*) FROM financial_data.breakouts WHERE mod_id = $1`,
            [mod_id]
        );

        const count = parseInt(result.rows[0].count, 10);
        const breakout_id = `${mod_id}${String.fromCharCode(65 + count)}`;

        await client.query(
            `INSERT INTO financial_data.breakouts (breakout_id, mod_id, charge_code, funding_amount, funding_type) 
             VALUES ($1, $2, $3, $4, $5)`,
            [breakout_id, mod_id, charge_code, funding_amount, funding_type]
        );

        const captureLeadsResult = await client.query(
            `SELECT employee_id FROM financial_data.capture_leads WHERE mod_id = $1`,
            [mod_id]
        );

        const captureLeads = captureLeadsResult.rows;

        for (const lead of captureLeads) {
            await client.query(
                `INSERT INTO financial_data.capture_leads (mod_id, employee_id, breakout_id) 
                 VALUES (NULL, $1, $2)`,
                [lead.employee_id, breakout_id]
            );
        }

        client.release();
        res.json({ message: "Breakout submitted successfully!", breakout_id });

    } catch (err) {
        client.release();
        console.error("Error submitting breakout:", err);
        res.status(500).json({ error: "Server error" });
    }
});



app.post("/submit-allocation", async (req, res) => {
    const { mod_id, allocations, submitted_by, notes } = req.body;

    console.log("Received allocation request:", req.body);

    if (!mod_id || !allocations || allocations.length === 0 || !submitted_by) {
        console.error("Missing required fields:", { mod_id, allocations, submitted_by });
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const client = await pool.connect();

        for (const alloc of allocations) {
            if (!alloc.full_name || alloc.allocation === undefined) {
                console.error("Missing allocation details:", alloc);
                return res.status(400).json({ error: "Allocation details are incomplete." });
            }

            const breakout_id = alloc.breakout_id || null;
            const finalNotes = notes && notes.trim() !== "" ? notes.trim() : null; 

            const queryText = `
                INSERT INTO financial_data.allocations (mod_id, breakout_id, full_name, submitted_by, allocation, notes) 
                VALUES ($1, $2, $3, $4, $5, $6)
            `;

            const result = await client.query(queryText, [
                mod_id,
                breakout_id,
                alloc.full_name,
                submitted_by,
                alloc.allocation,
                finalNotes 
            ]);

            console.log("Database response:", result.rows[0]);
        }

        client.release();
        res.json({ message: "Allocation submitted successfully!" });

    } catch (err) {
        console.error("Error submitting allocation:", err);
        res.status(500).json({ error: "Server error" });
    }
});


app.get("/breakouts/:mod_id", async (req, res) => {
    const { mod_id } = req.params;

    try {
        const result = await pool.query(
            `SELECT breakout_id, mod_id, charge_code, funding_amount, funding_type 
             FROM financial_data.breakouts
             WHERE mod_id = $1`,
            [mod_id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching breakouts:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/allocations/:mod_id", async (req, res) => {
    const { mod_id } = req.params;
    const { userFullName } = req.query;

    if (!userFullName) {
        return res.status(400).json({ error: "User full name is required" });
    }

    try {
        const result = await pool.query(
            `SELECT full_name, allocation, COALESCE(notes, '') AS notes
             FROM financial_data.allocations
             WHERE mod_id = $1 AND submitted_by = $2`,
            [mod_id, userFullName]
        );

        if (result.rows.length > 0) {
            res.json({
                allocations: result.rows,
                notes: result.rows[0].notes 
            });
        } else {
            res.json({ allocations: [], notes: "" });
        }
    } catch (err) {
        console.error("Error fetching allocations:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/mods/:mod_id", async (req, res) => {
    const { mod_id } = req.params;

    try {
        const result = await pool.query(
            `SELECT customer, mod_type, contract_type, description 
             FROM financial_data.mods 
             WHERE mod_id = $1`, 
            [mod_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Mod not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching mod details:", err);
        res.status(500).json({ error: "Server error" });
    }
});


app.post("/approve-allocation", async (req, res) => {
    const { mod_id, employee_name, new_allocation, calculated_average } = req.body;

    console.log("Received approval request:", req.body); 

    if (!mod_id || !employee_name || (new_allocation === undefined && calculated_average === undefined)) {
        console.log("Missing required fields!");
        return res.status(400).json({ error: "Missing required fields." });
    }

    try {
        const client = await pool.connect();

        const allocationValue = new_allocation !== undefined ? new_allocation : calculated_average;
        
        console.log(`Saving: Mod ID: ${mod_id}, Employee: ${employee_name}, Allocation: ${allocationValue}`); 

        const queryText = `
            INSERT INTO financial_data.approved_allocations (mod_id, employee_name, allocation)
            VALUES ($1, $2, $3)
            ON CONFLICT (mod_id, employee_name) 
            DO UPDATE SET allocation = EXCLUDED.allocation
        `;

        await client.query(queryText, [mod_id, employee_name, allocationValue]);
        client.release();

        console.log("Successfully saved allocation.");
        res.json({ message: "Allocation approved successfully!" });

    } catch (err) {
        console.error("Error approving allocation:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/capture-leads/:mod_id", async (req, res) => {
    const { mod_id } = req.params;

    try {
        const result = await pool.query(
            `SELECT e.full_name 
             FROM financial_data.capture_leads cl
             JOIN financial_data.employee e ON cl.employee_id = e.employee_id
             WHERE cl.mod_id = $1`,
            [mod_id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching capture leads:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/submit-capture-lead", async (req, res) => {
    const { mod_id, breakout_id, employee_name } = req.body;

    if (!employee_name || (!mod_id && !breakout_id)) {
        return res.status(400).json({ error: "Employee name and either mod_id or breakout_id are required." });
    }

    try {
        const client = await pool.connect();

        const employeeResult = await client.query(
            `SELECT employee_id FROM financial_data.employee WHERE full_name = $1`,
            [employee_name]
        );

        if (employeeResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: "Employee not found" });
        }

        const employee_id = employeeResult.rows[0].employee_id;

        await client.query(
            `INSERT INTO financial_data.capture_leads (mod_id, breakout_id, employee_id) 
             VALUES ($1, $2, $3)`,
            [breakout_id ? null : mod_id, breakout_id ? breakout_id : null, employee_id]
        );

        client.release();
        res.json({ message: "Capture lead submitted successfully!" });

    } catch (err) {
        console.error("Error submitting capture lead:", err);
        res.status(500).json({ error: "Server error" });
    }
});



app.get("/profile", async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        const result = await pool.query(
            "SELECT first_name, last_name, email, title, office, bio FROM financial_data.employee WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Employee not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching employee:", err);
        res.status(500).json({ error: "Server error" });
    }
});


app.post("/update-profile", async (req, res) => {
    const { email, title, office, bio } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required to update profile." });
    }

    try {
        const result = await pool.query(
            "UPDATE financial_data.employee SET title = $1, office = $2, bio = $3 WHERE email = $4 RETURNING *",
            [title, office, bio, email]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Employee not found or unauthorized." });
        }

        res.json({ message: "Profile updated successfully!", profile: result.rows[0] });
    } catch (err) {
        console.error("Error updating profile:", err);
        res.status(500).json({ error: "Server error" });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});