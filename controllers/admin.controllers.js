import {asyncHandler} from "../utils/AsyncHandler.js"
import connection from '../server.js'
import { ApiResponse } from "../utils/ApiResponse.js"
import { ApiError } from "../utils/ApiError.js"



// fetch the customer to show in the graph


const fetchUser=asyncHandler(async(req,res)=>{
    const query=`SELECT DATE(created_at)AS signup_date,COUNT(*)AS user_count FROM users WHERE role_id=1 GROUP BY signup_date UNION ALL SELECT 'Totals' AS signup_date,COUNT(*)AS user_count FROM users WHERE role_id=1;`

connection.query(query,(error,result)=>{
    if(error){
        console.log("error while fetching the total users",error);
    }
    res.status(200).json(new ApiResponse(200,result,'users fetched successfully'))
})
});



//fetch the customer in  admin panel 


const fetchCustomer=asyncHandler(async(req,res)=>{
    const query=`SELECT * FROM users WHERE role_id=1`;
    connection.query(query,(error, result)=>{
        if(error){
            console.log("Error while fetching the users",Error);
        }
        else{
            res.status(200).json(new ApiResponse(200,result,"Customer fetched successfully"))
        }
    })
});


// searching the user in admin panel according to user need 

const searchUser = asyncHandler(async (req, res) => {
    const searchQuery = req.query.query || '';
    const sql = `
        SELECT * FROM users WHERE role_id = 1 AND (username LIKE ? OR email LIKE ? OR created_at LIKE ?)
    `;
    const searchTerm = `%${searchQuery}%`;

    try {
        // Wrap the query in a Promise to use async/await
        const result = await new Promise((resolve, reject) => {
            connection.query(sql, [searchTerm, searchTerm, searchTerm], (error, results) => {
                if (error) {
                    return reject(error); // Reject promise on error
                }
                resolve(results); // Resolve promise with results
            });
        });

        // Check if any users were found
        if (result.length === 0) {
            return res.status(404).json(new ApiError(404, 'No users found with this credentials'));
        }

        // Return the found users in the response
        res.status(200).json(new ApiResponse(200, result, "Search users fetched successfully"));
    } catch (error) {
        console.error("Error executing query:", error);
        res.status(500).json({ message: "Database error", error: error.message });
    }
});


// fetching the product to show in the admin panel

const fetchProduct=asyncHandler(async(req,res)=>{
    try {
       const searchQuery=req.query.query ||'';
        const sql=`SELECT p.id ,p.image,p.sku_number,p.price,p.stock_quantity,AVG(r.rating)as rating FROM products p LEFT JOIN reviews r ON r.productid=p.id WHERE p.sku_number like ? or rating like ? or price like ? GROUP BY p.id; `
      
      const searchTerm=`%${searchQuery}%`
        connection.query(sql,[searchTerm,searchTerm,searchTerm],(error,result)=>{
        if(error){
            return console.log(error);
        }
        res.status(200).json(new ApiResponse(200,result,"product fetched successfully"))
      })
    } catch (error) {
        console.error("Error executing query:", error);
        res.status(500).json({ message: "Database error", error: error.message });
    }
});



/// fetching the total vendor
const fetchTotalVendor=(async(req,res)=>{

    try {
        const sql=`SELECT DATE(created_at) AS signup_date,count(*) AS vendor_count FROM vendors GROUP BY signup_date UNION ALL SELECT 'Total' AS signup_date,count(*)AS vendor_count FROM vendors `
        const result= await new Promise((resolve,reject)=>{
         connection.query(sql,(error,results)=>{
            if(error){
                reject(error);
            }
            resolve(results)
    
         })
        })
          res.status(200).json(new ApiResponse(200,result,"data fetched successfully"))
    } catch (error) {
        console.error("Error executing query:", error);
        res.status(500).json({ message: "Database error", error: error.message });
    }
    })


    const getTotalOrders = async (req, res) => {
        try {
          const sql = `
            SELECT DATE(created_at) AS order_date, COUNT(*) AS order_count
            FROM orders
            GROUP BY DATE(created_at)
            UNION ALL
            SELECT 'Totals' AS order_date, COUNT(*) AS order_count
            FROM orders
          `;
      
          const result = await new Promise((resolve, reject) => {
            connection.query(sql, (error, results) => {
              if (error) {
                reject(error);
              } else {
                resolve(results);
              }
            });
          });
      
          res.status(200).json(new ApiResponse(200, result, "Orders fetched successfully"));
        } catch (error) {
          console.error("Error fetching orders:", error);
          res.status(500).json({ message: "Database error", error: error.message });
        }
      };
      
      
export {fetchUser,fetchCustomer,searchUser,fetchProduct,fetchTotalVendor,getTotalOrders};