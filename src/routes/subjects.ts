import express from "express"; // Import Express so we can create routes.
import {and, desc, eq, getTableColumns, ilike, or, sql} from "drizzle-orm"; // Import database query helpers from Drizzle ORM.
import {departments, subjects} from "../db/schema/index.js"; // Import the subjects and departments table schema.
import {db} from "../db/index.js";
import {parse} from "dotenv"; // Import the database connection instance.

const router = express.Router(); // Create a router so we can define API routes in this file.

router.get("/", async(req, res)=>{ // Define a GET route for /subjects and handle the request.
    try { // Start the main logic and catch errors if something fails.

        const {search, department, page = 1, limit = 10} = req.query; // Read query params: search text, department filter, page number, and items per page.

        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerpage = Math.min(Math.max(1, parseInt(String(limit), 10) || 10), 100);

        const offset = (currentPage - 1) * limitPerpage; // Calculate how many rows to skip for pagination.

        const filterConditions = [] // Store all search filters here before building the final WHERE clause.

        if(search) { // If the user passed a search keyword, add a search filter.
            const searchPattern = `%${String(search).replace(/[\\%_]/g, '\\$&')}%`;
            filterConditions.push( // Add the search condition to the filter list.
                or( // Search should match any of these fields.
                    ilike(subjects.name, searchPattern), // Match subject name case-insensitively.
                    ilike(subjects.code, searchPattern), // Match subject code case-insensitively.
                )
            )
        }

        if(department) { // If the user passed a department value, add a department-related filter.
            const deptPattern = `%${String(department).replace(/[%_]/g, '\\$&')}%`; // Create a pattern for case-insensitive matching.
            filterConditions.push(ilike(departments.name, deptPattern))
        }

        const whereClause = filterConditions.length > 0 ? and(... filterConditions) : undefined; // Combine all filters with AND, or use no filter if none exist.

        const countResult = await db // Query the database to count how many records match the filters.
            .select({ count : sql<number>`count(*)`}) // Count all matched rows using raw SQL.
            .from(subjects) // Read from the subjects table.
            .leftJoin(departments, eq(subjects.departmentId, departments.id)) // Join departments to subjects by departmentId.
            .where(whereClause); // Apply the filters to the count query.

        const totalCount = countResult[0]?.count ?? 0; // Get the count value, or default to 0 if it is missing.

        const subjectsList = await db // Query the actual list of subjects for the current page.
            .select({ // Select subject columns and department columns.
                ... getTableColumns(subjects), // Get all columns from the subjects table.
                department: { ... getTableColumns(departments)} // Include department data as an object.
            }).from(subjects) // Start from the subjects table.
            .leftJoin(departments, eq(subjects.departmentId, departments.id)) // Join department table using departmentId.
            .where(whereClause) // Apply the same filters to the list query.
            .orderBy(desc(subjects.createdAt)) // Sort by newest createdAt first.
            .limit(limitPerpage) // Limit results to the selected page size.
            .offset(offset); // Skip rows for previous pages.

        res.json({ // Send the response back to the client in JSON format.
            data: subjectsList, // Send the filtered subject list.
            pagination: { // Add pagination metadata.
                page: currentPage, // Current page number.
                limit: limitPerpage, // Number of records per page.
                total: totalCount, // Total matching records.
                totalPages: Math.ceil(totalCount / limitPerpage), // Compute total pages.
            }
        })

    }catch(err){ // If anything fails in the try block, go here.
        console.error(`GET /subjects not found: ${err}`); // Log the error to the console for debugging.
        res.status(500).json({error: 'Failed to get subjects'}); // Return a 500 response to the client.
    }
})

export default router; // Export the router so the app can use it.
