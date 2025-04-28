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
            SELECT category, subcategory, sub_subcategory, SUM(amount) AS total_amount
            FROM financial_data.income_statements
            WHERE year = $1 AND period = $2 AND entity = $3
            GROUP BY category, subcategory, sub_subcategory
            ORDER BY category, subcategory, sub_subcategory
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
        const result = await pool.query("SELECT * FROM financial_data.testing_mods");
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching mods data:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/exec-allocation/:mod_id", async (req, res) => {
    const { mod_id } = req.params;

    try {
        const result = await pool.query(
            `SELECT full_name, submitted_by, allocation 
             FROM financial_data.testing_allocations
             WHERE mod_id = $1`,
            [mod_id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching allocation data:", err);
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
            "SELECT mod_id, breakout_id FROM financial_data.testing_capture_leads WHERE employee_id = $1",
            [employeeId]
        );

        const modIds = [];
        const breakoutIds = [];

        modResult.rows.forEach(row => {
            if (row.mod_id && !modIds.includes(row.mod_id)) modIds.push(row.mod_id);
            if (row.breakout_id && !breakoutIds.includes(row.breakout_id)) breakoutIds.push(row.breakout_id);
        });

        const modsData = await pool.query(
            `SELECT * FROM financial_data.testing_mods WHERE mod_id = ANY($1)`,
            [modIds]
        );

        const breakoutsData = await pool.query(
            `SELECT breakout_id, mod_id, charge_code, funding_amount, funding_type 
             FROM financial_data.testing_breakouts 
             WHERE breakout_id = ANY($1)`,
            [breakoutIds]
        );

        res.json({ mods: modsData.rows, breakouts: breakoutsData.rows });
    } catch (err) {
        console.error("Error fetching user mods data:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/update-tip", async (req, res) => {
    const { submitted_by_email, full_name, tip_allocation } = req.body;
  
    if (!submitted_by_email || !full_name || tip_allocation == null) {
      return res.status(400).json({ error: "Missing required fields." });
    }
  
    const client = await pool.connect();
    try {
      const [submitterRes, employeeRes] = await Promise.all([
        client.query("SELECT employee_id FROM financial_data.employee WHERE email = $1", [submitted_by_email]),
        client.query("SELECT employee_id FROM financial_data.employee WHERE full_name = $1", [full_name])
      ]);
  
      if (submitterRes.rows.length === 0 || employeeRes.rows.length === 0) {
        return res.status(404).json({ error: "Employee not found." });
      }
  
      const submitted_by = submitterRes.rows[0].employee_id;
      const employee_id = employeeRes.rows[0].employee_id;
  
      await client.query(
        `UPDATE financial_data.tips 
         SET tip_allocation = $1
         WHERE employee_id = $2 AND submitted_by = $3`,
        [tip_allocation, employee_id, submitted_by]
      );
  
      res.json({ message: "Tip updated successfully." });
    } catch (err) {
      console.error("Error updating tip:", err);
      res.status(500).json({ error: "Server error" });
    } finally {
      client.release();
    }
  });
  
  app.delete("/delete-tip", async (req, res) => {
    const { full_name, submitted_by_email } = req.body;
  
    if (!full_name || !submitted_by_email) {
      return res.status(400).json({ error: "Missing name or submitter." });
    }
  
    const client = await pool.connect();
    try {
      const [submitterRes, employeeRes] = await Promise.all([
        client.query("SELECT employee_id FROM financial_data.employee WHERE email = $1", [submitted_by_email]),
        client.query("SELECT employee_id FROM financial_data.employee WHERE full_name = $1", [full_name])
      ]);
  
      if (submitterRes.rows.length === 0 || employeeRes.rows.length === 0) {
        return res.status(404).json({ error: "Employee or submitter not found." });
      }
  
      const submitted_by = submitterRes.rows[0].employee_id;
      const employee_id = employeeRes.rows[0].employee_id;
  
      await client.query(
        `DELETE FROM financial_data.tips WHERE employee_id = $1 AND submitted_by = $2`,
        [employee_id, submitted_by]
      );
  
      res.json({ message: "Tip deleted successfully." });
    } catch (err) {
      console.error("Error deleting tip:", err);
      res.status(500).json({ error: "Server error" });
    } finally {
      client.release();
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
            `SELECT COUNT(*) FROM financial_data.testing_breakouts WHERE mod_id = $1`,
            [mod_id]
        );

        const count = parseInt(result.rows[0].count, 10);
        const breakout_id = `${mod_id}${String.fromCharCode(65 + count)}`;

        await client.query(
            `INSERT INTO financial_data.testing_breakouts (breakout_id, mod_id, charge_code, funding_amount, funding_type) 
             VALUES ($1, $2, $3, $4, $5)`,
            [breakout_id, mod_id, charge_code, funding_amount, funding_type]
        );

        const captureLeadsResult = await client.query(
            `SELECT employee_id FROM financial_data.testing_capture_leads WHERE mod_id = $1`,
            [mod_id]
        );

        const captureLeads = captureLeadsResult.rows;

        for (const lead of captureLeads) {
            await client.query(
                `INSERT INTO financial_data.testing_capture_leads (mod_id, employee_id, breakout_id) 
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

app.post("/update-breakouts", async (req, res) => {
    const { mod_id, breakouts } = req.body;

    if (!mod_id || !breakouts || breakouts.length === 0) {
        return res.status(400).json({ error: "mod_id and breakouts are required" });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `DELETE FROM financial_data.testing_breakouts WHERE mod_id = $1`,
            [mod_id]
        );

        await client.query(
            `DELETE FROM financial_data.testing_capture_leads WHERE breakout_id IN (
                SELECT breakout_id FROM financial_data.testing_breakouts WHERE mod_id = $1
            )`,
            [mod_id]
        );
        

        for (let i = 0; i < breakouts.length; i++) {
            const { charge_code, funding_amount, funding_type } = breakouts[i];
            const breakout_id = `${mod_id}${String.fromCharCode(65 + i)}`;

            await client.query(
                `INSERT INTO financial_data.testing_breakouts (breakout_id, mod_id, charge_code, funding_amount, funding_type) 
                VALUES ($1, $2, $3, $4, $5)`,
                [breakout_id, mod_id, charge_code, funding_amount, funding_type]
            );

            const leadsRes = await client.query(
                `SELECT employee_id FROM financial_data.testing_capture_leads WHERE mod_id = $1`,
                [mod_id]
            );

            for (const lead of leadsRes.rows) {
                
                await client.query(
                    `INSERT INTO financial_data.testing_capture_leads (mod_id, employee_id, breakout_id)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (mod_id, employee_id, breakout_id) DO NOTHING`,
                    [mod_id, lead.employee_id, breakout_id]
                );
                
                
            }

        }

        await client.query('COMMIT');
        res.json({ message: "Breakouts updated successfully!" });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error updating breakouts:", err);
        res.status(500).json({ error: "Server error" });
    } finally {
        client.release();
    }
});


app.post("/submit-allocation", async (req, res) => {
    const { mod_id, allocations, submitted_by, notes } = req.body;

    console.log("Received allocation request:", req.body);

    if (!mod_id || !allocations || allocations.length === 0 || !submitted_by) {
        console.error("Missing required fields:", { mod_id, allocations, submitted_by });
        return res.status(400).json({ error: "All fields are required." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `DELETE FROM financial_data.testing_allocations
             WHERE mod_id = $1 AND submitted_by = $2`,
            [mod_id, submitted_by]
        );

        await client.query(
            `DELETE FROM financial_data.testing_submitted_allocations
             WHERE mod_id = $1 AND submitted_by = $2`,
            [mod_id, submitted_by]
        );

        for (const alloc of allocations) {
            if (!alloc.full_name || alloc.allocation == null) {
                await client.query('ROLLBACK');
                console.error("Missing allocation details:", alloc);
                return res.status(400).json({ error: "Allocation details are incomplete." });
            }

            const breakout_id = alloc.breakout_id || null;
            const finalNotes = notes && notes.trim() !== "" ? notes.trim() : null;

            await client.query(
                `INSERT INTO financial_data.testing_allocations (
                    mod_id, breakout_id, full_name, submitted_by, allocation, notes
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [mod_id, breakout_id, alloc.full_name.trim(), submitted_by, parseFloat(alloc.allocation), finalNotes]
            );

            await client.query(
                `INSERT INTO financial_data.testing_submitted_allocations (
                    mod_id, breakout_id, full_name, submitted_by, allocation, notes
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [mod_id, breakout_id, alloc.full_name.trim(), submitted_by, parseFloat(alloc.allocation), finalNotes]
            );
        }

        await client.query('COMMIT');
        res.json({ message: "Allocation submitted successfully to both tables!" });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error submitting allocation:", err);
        res.status(500).json({ error: "Server error" });
    } finally {
        client.release();
    }
});



app.get("/breakouts/:mod_id", async (req, res) => {
    const { mod_id } = req.params;

    try {
        const result = await pool.query(
            `SELECT breakout_id, mod_id, charge_code, funding_amount, funding_type, flagged_for_approval
             FROM financial_data.testing_breakouts
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
             FROM financial_data.testing_allocations
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

app.get("/submitted-allocations/:mod_id", async (req, res) => {
    const { mod_id } = req.params;
    const { userFullName } = req.query;

    if (!userFullName) {
        return res.status(400).json({ error: "User full name is required" });
    }

    try {
        const result = await pool.query(
            `SELECT full_name, allocation, COALESCE(notes, '') AS notes
             FROM financial_data.testing_submitted_allocations
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
        console.error("Error fetching submitted allocations:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.delete("/remove-capture-lead", async (req, res) => {
    const { employee_name, mod_id, breakout_id } = req.body;

    if (!employee_name || (!mod_id && !breakout_id)) {
        return res.status(400).json({ error: "Missing employee name or mod/breakout ID." });
    }

    try {
        const client = await pool.connect();

        const empRes = await client.query(
            `SELECT employee_id FROM financial_data.employee WHERE full_name = $1`,
            [employee_name]
        );

        if (empRes.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: "Employee not found" });
        }

        const employee_id = empRes.rows[0].employee_id;

        await client.query(
            `DELETE FROM financial_data.testing_capture_leads 
             WHERE employee_id = $1 AND mod_id ${mod_id ? "= $2" : "IS NULL"} AND breakout_id ${breakout_id ? "= $3" : "IS NULL"}`,
            mod_id && breakout_id
                ? [employee_id, mod_id, breakout_id]
                : mod_id
                ? [employee_id, mod_id]
                : [employee_id, breakout_id]
        );

        client.release();
        res.json({ message: "Capture lead removed successfully!" });
    } catch (err) {
        console.error("Error removing capture lead:", err);
        res.status(500).json({ error: "Server error" });
    }
});


app.get("/mod-notes/:mod_id", async (req, res) => {
    const { mod_id } = req.params;

    try {
        const result = await pool.query(
            `SELECT submitted_by, notes 
             FROM financial_data.testing_allocations 
             WHERE mod_id = $1 AND notes IS NOT NULL`,
            [mod_id]
        );
        
        const seen = new Map();
        result.rows.forEach(row => {
            if (!seen.has(row.submitted_by)) {
                seen.set(row.submitted_by, row.notes);
            }
        });

        const notes = Array.from(seen, ([submitted_by, note]) => ({ submitted_by, note }));

        res.json(notes);
        
    } catch (err) {
        console.error("Error fetching mod notes:", err);
        res.status(500).json({ error: "Server error" });
    }
});


app.get("/mods/:mod_id", async (req, res) => {
    const { mod_id } = req.params;

    try {
        const result = await pool.query(
            `SELECT customer, mod_type, contract_type, description 
             FROM financial_data.testing_mods 
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
            `SELECT DISTINCT e.full_name 
             FROM financial_data.testing_capture_leads cl
             JOIN financial_data.employee e ON cl.employee_id = e.employee_id
             WHERE cl.mod_id = $1 OR cl.breakout_id = $1`,
            [mod_id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching capture leads:", err);
        res.status(500).json({ error: "Server error" });
    }
});


app.post("/submit-capture-leads", async (req, res) => {
    console.log("POST /submit-capture-leads", req.body);

    const { mod_id, breakout_id, employee_names } = req.body;

    if (!employee_names || !Array.isArray(employee_names) || employee_names.length === 0 || (!mod_id && !breakout_id)) {
        console.log("Validation failed", req.body);
        return res.status(400).json({ error: "Missing employee list or mod/breakout ID" });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `DELETE FROM financial_data.testing_capture_leads WHERE ${mod_id ? "mod_id = $1" : "breakout_id = $1"}`,
            [mod_id || breakout_id]
        );

        for (const name of employee_names) {
            const empRes = await client.query(
                `SELECT employee_id FROM financial_data.employee WHERE full_name = $1`,
                [name]
            );
            if (empRes.rows.length > 0) {
                const employee_id = empRes.rows[0].employee_id;
                await client.query(
                    `INSERT INTO financial_data.testing_capture_leads (mod_id, employee_id, breakout_id)
                     VALUES ($1, $2, $3)`,
                    [mod_id || null, employee_id, breakout_id || null]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: "Capture leads updated successfully!" });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error updating capture leads:", err);
        res.status(500).json({ error: "Server error" });
    } finally {
        client.release();
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

app.post("/submit-tips", async (req, res) => {
    const { tips, submitted_by_email } = req.body;


    if (!tips || !Array.isArray(tips) || tips.length === 0 || !submitted_by_email) {
        return res.status(400).json({ error: "Tips and submitter email are required." });
    }


    const client = await pool.connect();
    try {
        const submitterResult = await client.query(
            `SELECT employee_id FROM financial_data.employee WHERE email = $1`,
            [submitted_by_email]
        );


        if (submitterResult.rows.length === 0) {
            return res.status(404).json({ error: "Submitter not found." });
        }


        const submitted_by = submitterResult.rows[0].employee_id;


        for (const tip of tips) {
            const employeeRes = await client.query(
                `SELECT employee_id FROM financial_data.employee WHERE full_name = $1`,
                [tip.full_name]
            );


            if (employeeRes.rows.length === 0) {
                continue; 
            }


            await client.query(
                `INSERT INTO financial_data.tips (employee_id, submitted_by, tip_allocation)
                 VALUES ($1, $2, $3)`,
                [employeeRes.rows[0].employee_id, submitted_by, parseFloat(tip.tip_allocation)]
            );
        }


        res.json({ message: "Tips submitted successfully!" });
    } catch (err) {
        console.error("Error submitting tips:", err);
        res.status(500).json({ error: "Server error" });
    } finally {
        client.release();
    }
});


app.get("/submitted-tips", async (req, res) => {
    const { email } = req.query;


    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }


    try {
        const client = await pool.connect();


        const userRes = await client.query(
            `SELECT employee_id FROM financial_data.employee WHERE email = $1`,
            [email]
        );


        if (userRes.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: "Submitter not found" });
        }


        const submitted_by = userRes.rows[0].employee_id;


        const tipsRes = await client.query(
            `SELECT e.full_name, t.tip_allocation
             FROM financial_data.tips t
             JOIN financial_data.employee e ON t.employee_id = e.employee_id
             WHERE t.submitted_by = $1`,
            [submitted_by]
        );


        client.release();
        res.json({ tips: tipsRes.rows });
    } catch (err) {
        console.error("Error fetching submitted tips:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.delete("/unsubmit-allocation/:mod_id", async (req, res) => {
    const { mod_id } = req.params;
    const { submitted_by } = req.query;

    if (!mod_id || !submitted_by) {
        return res.status(400).json({ error: "Missing mod ID or submitter" });
    }

    try {
        await pool.query(
            `DELETE FROM financial_data.testing_allocations
             WHERE mod_id = $1 AND submitted_by = $2`,
            [mod_id, submitted_by]
        );

        res.json({ message: "Allocation unsubmitted (draft deleted)" });
    } catch (err) {
        console.error("Error un-submitting allocation:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/save-draft-allocation", async (req, res) => {
    const { mod_id, allocations, submitted_by, notes } = req.body;

    if (!mod_id || !allocations || allocations.length === 0 || !submitted_by) {
        return res.status(400).json({ error: "All fields are required." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `DELETE FROM financial_data.testing_draft_allocations
             WHERE mod_id = $1 AND submitted_by = $2`,
            [mod_id, submitted_by]
        );

        for (const alloc of allocations) {
            if (!alloc.full_name || alloc.allocation == null) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: "Allocation details are incomplete." });
            }

            await client.query(
                `INSERT INTO financial_data.testing_draft_allocations (
                    mod_id, full_name, submitted_by, allocation, notes
                ) VALUES ($1, $2, $3, $4, $5)`,
                [mod_id, alloc.full_name.trim(), submitted_by, parseFloat(alloc.allocation), notes?.trim() || null]
            );
        }

        await client.query('COMMIT');
        res.json({ message: "Draft saved successfully!" });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error saving draft:", err);
        res.status(500).json({ error: "Server error" });
    } finally {
        client.release();
    }
});

app.get("/draft-allocations/:mod_id", async (req, res) => {
    const { mod_id } = req.params;
    const { userFullName } = req.query;

    if (!userFullName) {
        return res.status(400).json({ error: "User full name is required" });
    }

    try {
        const result = await pool.query(
            `SELECT full_name, allocation, COALESCE(notes, '') AS notes
             FROM financial_data.testing_draft_allocations
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
        console.error("Error fetching draft allocations:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.delete("/clear-draft", async (req, res) => {
    const { mod_id, submitted_by } = req.body;

    if (!mod_id || !submitted_by) {
        return res.status(400).json({ error: "mod_id and submitted_by are required" });
    }

    try {
        await pool.query(
            `DELETE FROM financial_data.testing_draft_allocations
             WHERE mod_id = $1 AND submitted_by = $2`,
            [mod_id, submitted_by]
        );

        res.json({ message: "Draft cleared successfully" });
    } catch (err) {
        console.error("Error clearing draft:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/approve-payouts", async (req, res) => {
    const { mod_id, breakout_id, payouts, financial_notes  } = req.body;

    if (!mod_id || !Array.isArray(payouts) || payouts.length === 0) {
        return res.status(400).json({ error: "Missing required approval fields." });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        for (const payout of payouts) {
            const { full_name, allocation_amount } = payout;

            const employeeRes = await client.query(
                `SELECT employee_id FROM financial_data.employee WHERE full_name = $1`,
                [full_name]
            );

            if (employeeRes.rows.length === 0) continue;

            const employee_id = employeeRes.rows[0].employee_id;

            await client.query(
                `INSERT INTO financial_data.testing_approved_allocations 
                 (mod_id, breakout_id, employee_id, allocation_amount, financial_notes)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (mod_id, breakout_id, employee_id) 
                 DO UPDATE SET 
                    allocation_amount = EXCLUDED.allocation_amount,
                    financial_notes = EXCLUDED.financial_notes`,
                [mod_id, breakout_id, employee_id, allocation_amount, financial_notes || null]
            );

            await pool.query(
                `UPDATE financial_data.testing_mods
                 SET flagged_for_approval = false
                 WHERE mod_id = $1`,
                [mod_id]
              );
              
              if (breakout_id) {
                await pool.query(
                  `UPDATE financial_data.testing_breakouts
                   SET flagged_for_approval = false
                   WHERE breakout_id = $1`,
                  [breakout_id]
                );
              }
              
            
        }

        await client.query("COMMIT");
        res.json({ message: "Payouts approved successfully!" });

        await pool.query(
            `DELETE FROM financial_data.testing_draft_approval WHERE mod_id = $1 AND breakout_id IS NOT DISTINCT FROM $2`,
            [mod_id, breakout_id]
          );
          
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Error approving payouts:", err);
        res.status(500).json({ error: "Server error" });
    } finally {
        client.release();
    }
});

app.get("/approved-payouts-summary", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                e.full_name, 
                SUM(a.allocation_amount) AS total_payout
            FROM financial_data.testing_approved_allocations a
            JOIN financial_data.employee e ON a.employee_id = e.employee_id
            GROUP BY e.full_name
            ORDER BY e.full_name
        `);

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching payout summary:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/approved-mod-ids", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT mod_id, breakout_id
            FROM financial_data.testing_approved_allocations
        `);

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching approved mod IDs:", err);
        res.status(500).json({ error: "Server error" });
    }
});


app.post("/update-payout-percentage", async (req, res) => {
    const {
        mod_id,
        breakout_id,
        charge_code,
        funding_amount,
        payout_percentage,
        total_payout
    } = req.body;

    if (!mod_id || !charge_code || !funding_amount || payout_percentage == null || total_payout == null) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    try {
        const result = await pool.query(
            `SELECT payout_period FROM financial_data.testing_mods WHERE mod_id = $1`,
            [mod_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Mod not found." });
        }

        const payout_period = result.rows[0].payout_period;

        await pool.query(
            `INSERT INTO financial_data.testing_payout_percentages (
              payout_period, charge_code, mod_id, breakout_id, funding_amount, payout_percentage, total_payout, payout_key
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (payout_key)
            DO UPDATE SET
              payout_percentage = EXCLUDED.payout_percentage,
              total_payout = EXCLUDED.total_payout,
              funding_amount = EXCLUDED.funding_amount,
              charge_code = EXCLUDED.charge_code,
              payout_period = EXCLUDED.payout_period`,
            [
              payout_period,
              charge_code,
              mod_id,
              breakout_id,
              funding_amount,
              payout_percentage,
              total_payout,
              `${mod_id}|${breakout_id || "MOD_ONLY"}`
            ]
          );
          

        res.json({ message: "Payout saved." });
    } catch (err) {
        console.error("Error saving payout:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/payout-percentages", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT mod_id, breakout_id, payout_percentage
            FROM financial_data.testing_payout_percentages
        `);

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching payout percentages:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/update-historical-payout", async (req, res) => {
    const { mod_id, breakout_id, ctd_profit, historical_percentage, funding_type } = req.body;

    if (!mod_id && !breakout_id) {
        return res.status(400).json({ error: "mod_id or breakout_id is required." });
    }

    if (ctd_profit == null || historical_percentage == null || !funding_type) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    try {
        let charge_code = null;

        if (breakout_id) {
            const result = await pool.query(
                `SELECT charge_code FROM financial_data.testing_breakouts WHERE breakout_id = $1`,
                [breakout_id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ error: "Breakout not found." });
            }
            charge_code = result.rows[0].charge_code;
        } else {
            const result = await pool.query(
                `SELECT charge_code FROM financial_data.testing_mods WHERE mod_id = $1`,
                [mod_id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ error: "Mod not found." });
            }
            charge_code = result.rows[0].charge_code;
        }

        await pool.query(
            `INSERT INTO financial_data.testing_historical_payout (
                charge_code, funding_type, ctd_profit, historical_percentage
            ) VALUES ($1, $2, $3, $4)
            ON CONFLICT (charge_code, funding_type)
            DO UPDATE SET
                ctd_profit = EXCLUDED.ctd_profit,
                historical_percentage = EXCLUDED.historical_percentage`,
            [charge_code, funding_type, ctd_profit, historical_percentage]
        );

        res.json({ message: "Historical payout saved." });
    } catch (err) {
        console.error("Error saving historical payout:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/historical-payouts", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT charge_code, funding_type, ctd_profit, historical_percentage, expected_profit
            FROM financial_data.testing_historical_payout
        `);

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching historical payouts:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/approved-financial-note/:mod_id", async (req, res) => {
    const { mod_id } = req.params;

    try {
        const result = await pool.query(
            `SELECT financial_notes 
             FROM financial_data.testing_approved_allocations 
             WHERE mod_id = $1 OR breakout_id = $1
             LIMIT 1`,
            [mod_id]
        );

        if (result.rows.length === 0) {
            return res.json({ financial_notes: "" });
        }

        res.json({ financial_notes: result.rows[0].financial_notes });
    } catch (err) {
        console.error("Error fetching financial notes:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/update-expected-profit", async (req, res) => {
    const { charge_code, funding_type, expected_profit } = req.body;

    if (!charge_code || !funding_type || expected_profit === undefined) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    try {
        await pool.query(
            `INSERT INTO financial_data.testing_historical_payout (
                charge_code, funding_type, expected_profit
             ) VALUES ($1, $2, $3)
             ON CONFLICT (charge_code, funding_type)
             DO UPDATE SET expected_profit = EXCLUDED.expected_profit`,
            [charge_code, funding_type, expected_profit]
        );

        res.json({ message: "Expected profit updated successfully." });
    } catch (err) {
        console.error("Error updating expected profit:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/flag-for-approval", async (req, res) => {
    const { mod_id, breakout_id, flagged } = req.body;

    if (!mod_id && !breakout_id) {
        return res.status(400).json({ error: "mod_id or breakout_id is required." });
    }

    try {
        if (breakout_id) {
            await pool.query(
                `UPDATE financial_data.testing_breakouts
                 SET flagged_for_approval = $1
                 WHERE breakout_id = $2`,
                [flagged, breakout_id]
            );
        } else {
            await pool.query(
                `UPDATE financial_data.testing_mods
                 SET flagged_for_approval = $1
                 WHERE mod_id = $2`,
                [flagged, mod_id]
            );
        }

        res.json({ message: "Flag status updated successfully." });
    } catch (err) {
        console.error("Error updating flag status:", err);
        res.status(500).json({ error: "Failed to update flag status." });
    }
});

app.post("/save-draft-note", async (req, res) => {
    const { mod_id, breakout_id, financial_notes } = req.body;

    if (!mod_id) return res.status(400).json({ error: "mod_id is required" });

    try {
        await pool.query(
            `INSERT INTO financial_data.testing_draft_approval (mod_id, breakout_id, financial_notes)
             VALUES ($1, $2, $3)
             ON CONFLICT (draft_key)
             DO UPDATE SET financial_notes = EXCLUDED.financial_notes`,
            [mod_id, breakout_id || null, financial_notes]
        );

        res.json({ message: "Draft note saved." });
    } catch (err) {
        console.error("Error saving draft note:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/draft-financial-note/:mod_id", async (req, res) => {
    const { mod_id } = req.params;

    try {
        const result = await pool.query(
            `SELECT financial_notes 
             FROM financial_data.testing_draft_approval 
             WHERE mod_id = $1`,
            [mod_id]
        );

        if (result.rows.length > 0) {
            res.json({ financial_notes: result.rows[0].financial_notes });
        } else {
            res.json({ financial_notes: "" });
        }
    } catch (err) {
        console.error("Error fetching draft financial note:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/onboarding_hr', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                ew.employee_id,
                ew.employee_name,
                ew.employee_start_date,
                ew.company,
                ew.employment_type,
                ew.recruitment_source,
                ew.work_location,
                ew.employee_salary,
                ew.hr_status,
                ew.it_status,
                ew.career_start_date,
                ew.termed_date,
                sw.supervisor_name,
                sw.supervisor_id
            FROM
                financial_data.employees_w ew
            LEFT JOIN
                financial_data.supervisors_w sw ON ew.supervisor_id = sw.supervisor_id` // Assuming 'supervisor_id' is the foreign key in employees_w
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching employees_w data with supervisor names:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/onboarding_admin', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT employee_id, employee_name, employee_start_date, company, employment_type, recruitment_source, work_location, employee_salary, hr_status, it_status, career_start_date, termed_date FROM financial_data.employees_w'); // Replace 'financial_data' if needed
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching employees_w data:', err);
        res.status(500).json({ error: 'Server error' });
    }
});



app.put('/onboarding_it/:employee_id', async (req, res) => {
    const { employee_id } = req.params;
    const {
        it_status,
        hr_status,
        employee_email,
        email_date,
        login_id,
        computer_date,
        work_location,
        termed_date
    } = req.body;

    try {
        const updateFields = [];
        const values = [];
        let paramIndex = 1;

        if (it_status !== undefined) {
            updateFields.push(`it_status = $${paramIndex++}`);
            values.push(it_status);
        }
        if (hr_status !== undefined) {
            updateFields.push(`hr_status = $${paramIndex++}`);
            values.push(hr_status);
        }
        if (employee_email !== undefined) {
            updateFields.push(`employee_email = $${paramIndex++}`);
            values.push(employee_email);
        }
        if (email_date !== undefined) {
            updateFields.push(`email_date = $${paramIndex++}`);
            values.push(email_date === '' ? null : email_date); // Convert empty string to null
        }
        if (login_id !== undefined) {
            updateFields.push(`login_id = $${paramIndex++}`);
            values.push(login_id);
        }
        if (computer_date !== undefined) {
            updateFields.push(`computer_date = $${paramIndex++}`);
            values.push(computer_date === '' ? null : computer_date); // Convert empty string to null
        }
        if (work_location !== undefined) {
            updateFields.push(`work_location = $${paramIndex++}`);
            values.push(work_location);
        }
        if (termed_date !== undefined) {
            updateFields.push(`termed_date = $${paramIndex++}`);
            values.push(termed_date);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update provided' });
        }

        const query = `
            UPDATE financial_data.employees_w
            SET ${updateFields.join(', ')}
            WHERE employee_id = $${paramIndex}
        `;
        values.push(employee_id);

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        const updatedRecordResult = await pool.query(
            'SELECT * FROM financial_data.employees_w WHERE employee_id = $1',
            [employee_id]
        );

        res.json(updatedRecordResult.rows[0]);
    } catch (err) {
        console.error('Error updating record:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/onboarding_hr/:employee_id', async (req, res) => {
    console.log('PUT /onboarding_hr/:employee_id called!');
    const { employee_id } = req.params;
    const {
        hr_status,
        it_status,
        employee_email,
        employment_type,
        company,
        employee_start_date,
        work_location,
        employee_salary,
        recruitment_source,
        career_start_date,
        termed_date,
        supervisor_id
    } = req.body;

    try {
        const updateFields = [];
        const values = [];
        let paramIndex = 1;

        if (hr_status !== undefined) {
            updateFields.push(`hr_status = $${paramIndex++}`);
            values.push(hr_status);
        }
        if (it_status !== undefined) {
            updateFields.push(`it_status = $${paramIndex++}`);
            values.push(it_status);
        }
        if (employee_email !== undefined) {
            updateFields.push(`employee_email = $${paramIndex++}`);
            values.push(employee_email);
        }
        if (employment_type !== undefined) {
            updateFields.push(`employment_type = $${paramIndex++}`);
            values.push(employment_type);
        }
        if (company !== undefined) {
            updateFields.push(`company = $${paramIndex++}`);
            values.push(company);
        }
        if (employee_start_date !== undefined) {
            updateFields.push(`employee_start_date = $${paramIndex++}`);
            values.push(employee_start_date === '' ? null : employee_start_date); // Handle empty start_date
        }
        if (work_location !== undefined) {
            updateFields.push(`work_location = $${paramIndex++}`);
            values.push(work_location);
        }
        if (employee_salary !== undefined) {
            updateFields.push(`employee_salary = $${paramIndex++}`);
            values.push(employee_salary);
        }
        if (recruitment_source !== undefined) {
            updateFields.push(`recruitment_source = $${paramIndex++}`);
            values.push(recruitment_source);
        }
        if (career_start_date !== undefined) {
            updateFields.push(`career_start_date = $${paramIndex++}`);
            values.push(career_start_date);
        }
        if (termed_date !== undefined) {
            updateFields.push(`termed_date = $${paramIndex++}`);
            values.push(termed_date);
        }
        if (supervisor_id !== undefined) {
            updateFields.push(`supervisor_id = $${paramIndex++}`);
            values.push(supervisor_id);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update provided' });
        }

        const query = `
            UPDATE financial_data.employees_w
            SET ${updateFields.join(', ')}
            WHERE employee_id = $${paramIndex}
        `;
        values.push(employee_id);

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        const updatedRecordResult = await pool.query(
            'SELECT * FROM financial_data.employees_w WHERE employee_id = $1',
            [employee_id]
        );

        res.json(updatedRecordResult.rows[0]);
    } catch (err) {
        console.error('Error updating record:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get("/approved-allocations", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                COALESCE(a.breakout_id, a.mod_id) AS id,
                e.full_name,
                a.allocation_amount
            FROM financial_data.testing_approved_allocations a
            JOIN financial_data.employee e ON a.employee_id = e.employee_id
        `);

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching approved allocations:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/payout-history", async (req, res) => {
    const { email } = req.query;
  
    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }
  
    try {
      // Step 1: Get employee_id from email
      const empResult = await pool.query(
        `SELECT employee_id FROM financial_data.employee WHERE email = $1`,
        [email]
      );
  
      if (empResult.rows.length === 0) {
        return res.status(404).json({ error: "Employee not found for this email" });
      }
  
      const employeeId = empResult.rows[0].employee_id;
  
      // Step 2: Get payout history from approved data table
      const payoutResult = await pool.query(
        `SELECT mod_id, charge_code, description, mod, payout
         FROM financial_data.testing_approved_employee_data
         WHERE employee_id = $1`,
        [employeeId]
      );
      res.json(payoutResult.rows);
    } catch (err) {
      console.error("Error fetching payout history:", err);
      res.status(500).json({ error: "Server error fetching payout history" });
    }
  });


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});