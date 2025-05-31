import connection from "../server.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";



// inserting the vendor 
const addVendor = asyncHandler(async (req, res) => {
    const { user_id, name, description, status, membership_status } = req.body;
    console.log("Received data: ", user_id, req.body);

    const intUser_id = parseInt(user_id, 10);

    if (isNaN(intUser_id)) {
        return res.status(400).json(new ApiError(400, [], "Invalid user_id"));
    }

    // Check if the user exists and has role_id 2 (vendor)
    const checkUserQuery = 'SELECT * FROM users WHERE user_id = ? AND role_id = 2';
    connection.query(checkUserQuery, [intUser_id], (error, result) => {
        if (error) {
            console.log("Error while checking user:", error);
            return res.status(500).json(new ApiError(500, [], "Error while checking the user_id"));
        }

        if (result.length === 0) {
            return res.status(404).json(new ApiResponse(404, [], "User doesn't exist or is not a vendor"));
        }

        // Insert vendor data into the vendors table
        const insertVendorQuery = 'INSERT INTO vendors (user_id, name, description, status, membership_status) VALUES (?, ?, ?, ?, ?)';
        connection.query(insertVendorQuery, [intUser_id, name, description, status, membership_status], (error, result) => {
            if (error) {
                console.log("Error while inserting vendor:", error);
                return res.status(400).json(new ApiError(400, [], "Error while inserting the vendor data"));
            }
            
            // Respond with success
            return res.status(201).json(new ApiResponse(201, result, "Vendor added successfully"));
        });
    });s
});


/// for add products

const addProduct = asyncHandler(async (req, res) => {
    const { vendor_id, name, main_category, sub_category, description, price, stock_quantity } = req.body;

    // Get the image file path
    // req.files will be used for multiple files, so handle them correctly
    let image = null; // Default value in case no files are uploaded

    if (req.files && req.files.length > 0) {
        // If there are multiple files, join their filenames into a single string
        image = req.files.map(file => file.filename).join(', ');
    }

    // Log the values and the image path for debugging
    console.log({
        vendor_id,
        name,
        description,
        price,
        stock_quantity,
        main_category,
        sub_category,
        image // Log the image paths
    });

    // Validate that all required fields are provided
    if (!vendor_id || !name || !main_category || !sub_category || !description || !price || !stock_quantity) {
        return res.status(400).json(new ApiResponse(400, "All fields are required"));
    }

    // Check if the product already exists in the database
    const checkProduct = 'SELECT * FROM products WHERE name=? AND vendor_id=?';
connection.query(checkProduct, [name, vendor_id], (error, result) => {
        if (error) {
            return res.status(500).json(new ApiError(500, "Error while checking the existing product"));
        }

        // If the product already exists, return an error
        if (result.length > 0) {
            return res.status(400).json(new ApiResponse(400, "Product already exists"));
        }
    function generateSKU(){
        let sku='';
        for(let i=0;i<8;i++){
            sku+=Math.floor(Math.random()*10)
        }
        return sku;
    }
    const sku=generateSKU();
        // Insert the new product into the database
        const query = `INSERT INTO products (vendor_id, name,sku_number, image, main_category, 
        sub_category, description, price, stock_quantity) VALUES (?,? ,?, ?, ?, ?, ?, ?, ?)`;
        connection.query(query, [vendor_id, name, sku,image, main_category,
             sub_category, description, price, stock_quantity], (error, result) => {
            if (error) {
                return res.status(400).json(new ApiError(400, "Error while inserting the product", error));
            }
            // Redirect to the vendor dashboard after successful insertion
            req.session.message = 'Product added successfully';
            req.session.messageType = 'success';
            res.redirect('/vendor/vandordashboard');
        });
    });
});


// Reusable function to fetch vendor products and the total product count
const productLists = (vendor_id) => {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM products WHERE vendor_id = ?', [vendor_id], function (error, productsResult) {
            if (error) return reject(error);

            connection.query('SELECT COUNT(*) AS totalProducts FROM products WHERE vendor_id = ?', [vendor_id], function (error, countResult) {
                if (error) return reject(error);
                console.log('Fetched Products:', productsResult);  // Log the result to check
                const totalProducts = countResult[0].totalProducts;
                resolve({ products: productsResult, totalProducts });
            });
        });
    });
};
const editViewProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;  // Get the product ID from the request parameters
    const { name, description, price, stock_quantity } = req.body;  // Get the product details from the body

    let image = null;  // Initialize the image variable as null

    try {
        // Fetch the current product data to compare and retain unchanged values
        const currentProductQuery = `SELECT name, description, price, stock_quantity, image FROM products WHERE id = ?`;
        
        const result = await new Promise((resolve, reject) => {
            connection.query(currentProductQuery, [id], (error, result) => {
                if (error) {
                    reject(error);  // Reject the promise if there's an error
                } else {
                    resolve(result);  // Resolve the promise with the result
                }
            });
        });

        if (result.length === 0) {
            return res.status(404).json(new ApiError(404, false, "Product not found"));
        }

        const currentProduct = result[0];  // Get the current product data

        // Set values to the current data if no new data is provided
        const updatedName = name || currentProduct.name;
        const updatedDescription = description || currentProduct.description;
        const updatedPrice = price || currentProduct.price;
        const updatedStockQuantity = stock_quantity || currentProduct.stock_quantity;

        // Handle the image logic
        if (req.files && req.files.length > 0) {
            // If files are uploaded, join their filenames into a single string
            image = req.files.map(file => file.filename).join(', ');
        } else {
            // If no image is uploaded, keep the existing image
            image = currentProduct.image;  // No need for "image ||", as we already have the current product image
        }

        // Call the update function after determining the correct values
        await updateUser(id, updatedName, image, updatedDescription, updatedPrice, updatedStockQuantity);
        
        // Respond with success message
        res.json({ success: true, message: "Product updated successfully" });

    } catch (error) {
        return res.status(500).json(new ApiError(500, false, "Error fetching or updating the product data", error));
    }
});

// The function that handles the update query
async function updateUser(id, name, image, description, price, stock_quantity) {
    const updateQuery = `UPDATE products SET name = ?, image = ?, description = ?, price = ?, stock_quantity = ? WHERE id = ?`;
    
    // Return a Promise that resolves when the query is successful
    return new Promise((resolve, reject) => {
        connection.query(updateQuery, [name, image, description, price, stock_quantity, id], (error, result) => {
            if (error) {
                reject(error);  // Reject the promise if there's an error
            } else {
                resolve(result);  // Resolve the promise with the result
            }
        });
    });
}


const fetchOrder = asyncHandler(async (req, res) => {


const vendorid=req.params.id;
console.log(vendorid)

const query = `SELECT DATE(o.created_at) AS order_date, COUNT(*) AS order_count 
               FROM orders o 
               JOIN products p ON o.product_id = p.id 
               WHERE p.vendor_id = ? 
               GROUP BY order_date 
               UNION ALL 
               SELECT 'Totals' AS order_date, COUNT(*) AS order_count 
               FROM orders;`;
    // Execute the query
    connection.query(query,[vendorid] ,(error, result) => {
      if (error) {
        console.log("Error while fetching the orders:", error);
        return res.status(500).json({
          message: "Error while fetching the orders",
          error: error.message
        });
      }
  
      // If no error, return the data in a success response
      res.status(200).json(new ApiResponse(200,result,"data fetched successfuly"))
    });
  });
  
  const main_category=(async(req,res)=>{
    const id=req.params.id
       const sql='SELECT c.id,c.name FROM vendor_categories v JOIN categories c ON c.id=v.category_id WHERE vendor_id';
       connection.query(sql,[id],(error,result)=>{
        if(error){
            console.log("error occure while fetching the main_categor",error.message);
            return;
        }
        res.status(200).json(new ApiResponse(200,result,"data fetched successfully!!"))
       })
  });

  const sub_category=(async(req,res)=>{
    const id =req.params.id;
    console.log("sub_category id:",id)

    const sql='SELECT name FROM sub_categories WHERE category_id=?';
    connection.query(sql,[id],(error,result)=>{
        if(error){
            console.log("error occure while fetching the sub_cateories in vendor",error.stack);
            return;
        }
        res.status(200).json(new ApiResponse(200,result,"data fetched successfully"))
    })
  })

  const totalSales = asyncHandler(async (req, res) => {
    const id = req.params.id; 
    console.log(id);
    const sql = `
      SELECT o.*,p.name,p.price,p.sub_category
      FROM orders o
      JOIN products p ON p.id = o.product_id
      WHERE p.vendor_id = ?
    `;
    
    
    try {
      const [result] = await connection.promise().query(sql, [id]); 
      console.log(result)
      res.status(200).json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (error) {
      console.error("Error while fetching the API", error.stack);
      res.status(500).json(new ApiResponse(500, null, "Internal server error"));
    }
  });
  
export { addProduct,addVendor,productLists,editViewProduct,fetchOrder,main_category,sub_category,totalSales};
