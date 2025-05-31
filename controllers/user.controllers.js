import { resolve } from "path";
import connection from "../server.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { rejects } from "assert";
import { error } from "console";
import { chownSync } from "fs";
// import nodemailer from 'nodemailer';
// import crypto from 'crypto';

const updateStock = asyncHandler(async (req, res) => {
    const { id } = req.params; // Get the product id from the URL
    const { quantity } = req.body; // Get the ordered quantity from the form (POST body)
    
    console.log("Product ID:", id);
    console.log("Ordered Quantity:", quantity);
    
    // Fetch the product by id from the database
    let sql = 'SELECT * FROM products WHERE id = ?';
    connection.query(sql, [id], (error, result) => {
        if (error) {
            return res.status(400).json(new ApiError(400, "Error while fetching the product"));
        }

        if (result.length === 0) {
            return res.status(404).json(new ApiError(404, "Product not found"));
        }

        const product = result[0];

        // Check if the stock is enough
        if (product.stock_quantity < quantity) {
            return res.status(400).json(new ApiError(400, "Not enough stock available"));
        }

        // Calculate the updated stock
        const updatedStock = product.stock_quantity - quantity;

        // Update the stock quantity in the database
        const updateSql = 'UPDATE products SET stock_quantity = ? WHERE id = ?';
        connection.query(updateSql, [updatedStock, id], (updateError, updateResult) => {
            if (updateError) {
                console.error(updateError);
                return res.status(500).json(new ApiError(500, 'Error while updating the stock quantity'));
            }

            console.log("Stock updated:", updateResult);
            return res.redirect('/index');
        });
    });
});



// otp generator before order
// function generatorOpt(){
//     return crypto.randomInt(100000,999999).toString();

// }
// const transporter=nodemailer.createTransport({
//     service:'gmail',
//     auth:{
//         user:"jhon123@gmail.com",
//         pass:"12345"
//     }
// });

// function sendOTP(email,otp){
//     const mailOptions={
//         from:'jhon123@gmail.com',
//         to:email,
//         subject:"YOUR OTP CODE:",
//         Text:`Your OTP code:${otp}`
//     }


// transporter.sendMail(mailOptions,(error,info)=>{
// if(error){
//     console.log('Error sending OTP:',error);
// }
// else{
//     console.log('OTP sent:'+info.response)
// }
// });

// };
// const otp=generatorOpt();
// const userEmail='';
// sendOTP(userEmail,otp);



const addRating =asyncHandler(async(req,res)=>{
    const {productid,review,rating}=req.body;
    console.log(rating);
    const query='INSERT INTO reviews (productid,review,rating)VALUES(?,?,?)';
    connection.query(query,[productid,review,rating],(error,result)=>{
     if(error){
        console.log("error while inserting the reviews",error)
     }
     return res.status(200).json(new ApiResponse(200, true,"rating added successfully"))
    })
})

const sub_category=(async(req,res)=>{
    const id=req.params.id
    console.log("category id:",id)
    const sql='SELECT * FROM  sub_categories WHERE category_id=?';
    connection.query(sql,[id],(error,result)=>{
        if(error){
            console.log(error.message);
            return;
        }
        res.status(200).json(new ApiResponse(200,result,'category fecthed successfully!!!'))
    })
})

const selectedMainCategory=((req,res)=>{
    const sql='SELECT id,name FROM categories where status=1';
    connection.query(sql,(error,result)=>{
        if(error){
            console.log("error occure while fetching the categories");
            return;
        }
        res.status(200).json(new ApiResponse(200,result,"data fectched successfully!!"));
    })
});



// searc-query 

const search_query=(async(req,res)=>{

    const searchQuery=req.query.query||'';
    const sql = `
    SELECT * FROM products  WHERE name LIKE ? OR main_category LIKE? OR sub_category LIKE ?
`;
const searchTerm = `%${searchQuery}%`;

try {
 const result=await new Promise((resolve,rejects)=>{
    connection.query(sql,[searchTerm,searchTerm,searchTerm],(error,result)=>{
        if(error){
            rejects(error);
        }
    resolve(result);
    })
 })    

 if(result.length===0){
    return res.status(404).json( new ApiError(404,'no product found with this credentials'));
 }
 res.status(200).json(new ApiResponse(202,result,'product fetch successfully'))
} catch (error) {
    console.error('Error executing the query',error.message);
}


})

const wishlist = async (req, res) => {
    const { user_id, product_id } = req.body;
    console.log("Information for adding the product to wishlist:");
    console.log(user_id, product_id);
  
    connection.query('SELECT * FROM products WHERE id = ?', [product_id], (error, result) => {
      if (error) {
        return res.status(500).send('Server error');
      }
      if (result.length === 0) {
        return res.status(404).send("Product not found!");
      }
  
      connection.query(
        `SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?`,
        [user_id, product_id],
        (error, result) => {
          if (error) return res.status(500).send('Server error');
          if (result.length > 0) {
            return res.status(400).send("Product already exists in wishlist");
          }
  
          connection.query(
            `INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)`,
            [user_id, product_id],
            (error, result) => {
              if (error) {
                return res.status(500).send('Server error');
              }
              res.status(200).send("Product added to wishlist successfully");
            }
          );
        }
      );
    });
  };
  
const delete_wishlist=(async(req,res)=>{
    const sql=`DELETE FROM wishlist WHERE user_id=? AND product_id=?`;
    connection.query(sql,[user_id,product_id],(error, result)=>{
        if(error){
            return res.status(500).send("server Error")
        }
        if(result.affectedRows===0){
            return res.status(404).send('product not found in wishlist')
        }
        res.status(200).json(new ApiResponse(200,result,'wishlist delete successfully'))
    })
})


const viewWishlist = async (req, res) => {
    const user_id = req.session.user?.user_id || req.body.user_id; // from session or body (fallback)
  
    if (!user_id) {
      return res.status(400).send('User not authenticated');
    }
  
    const query = `
      SELECT 
        p.id AS product_id,
        p.title,
        p.description,
        p.price,
        p.image,  -- if you have image or other fields
        w.id AS wishlist_id
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ?
    `;
  
    connection.query(query, [user_id], (err, results) => {
      if (err) {
        console.error('Error fetching wishlist:', err);
        return res.status(500).send('Server error');
      }
  
      res.render('user/wishlist', { products: results });
    });
  };
  
  const getOrderDetails = (req, res) => {
    const userId = req.params.userId;
  
    const query = `
      SELECT 
        o.order_id,
        o.user_id,
        o.product_id,
        p.image, 
        o.quantity,
        o.contact,
        o.delivery,
        o.firstname,
        o.lastname,
        o.address,
        o.city,
        o.state,
        o.pincode,
        o.total_price,
        o.order_status,
        o.created_at
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `;
  
    connection.query(query, [userId], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to get orders' }); // ✅ JSON response
      }
  
      res.json(results); // ✅ This MUST be pure JSON
    });
  };
  
  

export {updateStock,addRating,sub_category,selectedMainCategory,search_query,wishlist,delete_wishlist,viewWishlist,getOrderDetails};