import { Router } from "express";
import {userRegister,userLogin,changePassword} from "../controllers/registration.controllers.js"
import connection from "../server.js";
import { updateStock,addRating,sub_category ,selectedMainCategory,search_query,wishlist,delete_wishlist,viewWishlist,getOrderDetails} from "../controllers/user.controllers.js";
import { ApiError } from "../utils/ApiError.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router=Router();

router.route('/userRegister').post(userRegister);
router.route('/userLogin').post(userLogin);
router.route('/addRating').post(addRating)
router.route('/wishlist').get(viewWishlist);
router.route('/ordertotal-user/:userId').get(getOrderDetails);
//some time below  route will catch this route because below route is too genric so that it can catch the data similar like below route ;

router.get('/product/:id',(req,res)=>{
    const productId=req.params.id;
    console.log("productId:",productId);
    const query= 'SELECT* FROM products WHERE id=?';
    connection.query(query,[ productId],(error,result)=>{
        if(error){
            console.log(error);
            return res.status(500).send('Database error');
        }
        if(result.length===0){
            return res.status(404).json(new ApiError(404,"Product not found!!!"))
        }
        res.render('user/productDetails',{product:result[0], })
    })
});


///
router.get('/orderPage/:id', (req, res) => {
    const productId = req.params.id;
    const query = 'SELECT * FROM products WHERE id = ?';

    // Fetch product from the database
    connection.query(query, [productId], (error, result) => {
        if (error) {
            console.error("Database error:", error);
            return res.status(500).send('Database error');
        }

        if (result.length === 0) {
            return res.status(404).json({ error: "Product not found!" });
        }

        // If the product is found, render the order page with product details
        const product = result[0];
        res.render('user/orderDetails', {
            title: "Order Product",
            product: product,
            user_id: req.session.user.user_id
        });
    });
});


router.post('/placeOrder/:productId', (req, res) => {
    const {
        user_id,
        productId,
        quantity,
        firstname,
        lastname,
        address,
        city,
        state,
        pincode,
        contact,
        'payment-method': paymentMethod,
    } = req.body;

    console.log("productId:", productId);

    // Get the product price
    const query = 'SELECT price FROM products WHERE id = ?';
    connection.query(query, [productId], (error, result) => {
        if (error) {
            console.error("Database error:", error);
            return res.status(500).send('Error fetching product price'); // Ensure only one response is sent
        }

        if (result.length === 0) {
            return res.status(404).json({ error: "Product not found!" }); // Ensure only one response is sent
        }

        const productPrice = result[0].price;
        const totalPrice = productPrice * quantity;

        // Insert the order into the database
        const insertOrderQuery = `
            INSERT INTO orders (user_id, product_id, quantity, contact, delivery, firstname, lastname, address, city, state, pincode, total_price, order_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
        `;
        console.log("userId:", user_id);

        connection.query(insertOrderQuery, [
            user_id,
            productId,
            quantity,
            contact,
            'COD',
            firstname,
            lastname,
            address,
            city,
            state,
            pincode,
            totalPrice
        ], (error, result) => {
            if (error) {
                console.error("Error placing order:", error);
                return res.status(400).json(error); // Ensure only one response is sent
            }

            console.log('Order placed successfully');
            // Redirect to the confirmation page after successful order placement
            return res.redirect('/users/orderConfirmation');
        });
    });
});


/// confirmation  order

router.get('/orderConfirmation', (req, res) => {

 const userId = req.session.user.user_id;  

 console.log("userId43454545:",userId);
 const orderQuery = `
 SELECT 
     o.*, 
     p.name AS product_name, 
     p.price AS product_price 
 FROM orders o
 JOIN products p ON o.product_id = p.id
 WHERE o.user_id = ? 
 ORDER BY o.created_at DESC 
 LIMIT 1;`;  // Assuming created_at is used to track the order date


    connection.query(orderQuery, [userId], (error, result) => {
        if (error) {
            console.error('Error fetching order details:', error);
            return res.status(500).send('Server Error');
        }

        if (result.length === 0) {
            return res.redirect('/'); 
        }

        const order = result[0];  // Assuming the query returns a single order

        res.render('user/confirmationOrder', {
            title: "Order Confirmation",
            message: "Please review your order details before confirming.",
            order: order
        });
    });
});

// router.route('/viewRating/:productid').get(viewRating);
/// find the prodct based on the cateory and sub-category:


router.get('/product/viewRating/:id', (req, res) => {
    const productId = req.params.id;
  
    // Fetch ratings data for the product
    const ratingQuery = `SELECT rating, COUNT(*) AS count FROM reviews WHERE productid = ? GROUP BY rating ORDER BY rating DESC limit 5;`;
  
    connection.query(ratingQuery, [productId], (error, ratingResult) => {
      if (error) {
        return res.status(500).json({ error: 'Error while fetching ratings' });
      }
  
      // Initialize ratings array to hold the count for each rating (1-5)
      const ratings = [0, 0, 0, 0, 0];  // Stores the count of reviews for each rating from 1 to 5
      let totalReviews = 0;
      let totalRatingsum = 0;
  
      // Populate the ratings array with the count of reviews per rating
      ratingResult.forEach((row) => {
        ratings[row.rating - 1] = row.count;  // Map count to the corresponding rating (1-5)
        totalReviews += row.count;
        totalRatingsum += row.rating * row.count;
      });
  
      let averageRating = 0;
      if (totalReviews > 0) {
        averageRating = (totalRatingsum / totalReviews).toFixed(2);  // Calculate the average rating
      }
  
      // Fetch reviews for the product
      const reviewsQuery = `
        SELECT reviews.review, reviews.rating, users.username
        FROM reviews 
        JOIN users ON reviews.user_id = users.user_id
        WHERE reviews.productid = ?
        limit 3
      `;
  
      connection.query(reviewsQuery, [productId], (reviewError, reviewsResult) => {
        if (reviewError) {
          console.error('Error in fetching reviews:', reviewError);
          return res.status(500).json({ error: 'Error fetching reviews' });
        }
  
        console.log('Reviews fetched:', reviewsResult); // Log the fetched reviews to inspect
  
        // Map the reviews data into a usable format
        const reviews = reviewsResult.map(review => ({
          username: review.username,
          rating: review.rating,
          text: review.review  // Ensure the key is 'review' and not 're'
        }));
  
        // Send the final response with ratings, average rating, total reviews, and reviews data
        res.json({
          productId,
          ratings,
          totalReviews,
          averageRating,
          reviews
        });
      });
    });
  });
  
/// decreasing the item from stock_quentity :
router.route('/updateStock_quantity/:id').post(updateStock);




router.route('/category-items/:id').get(sub_category)
router.route('/main-category').get(selectedMainCategory);
router.route('/search_query_product').get(search_query)









router.route('/change-password').post(authenticate,changePassword)
router.get('/change-password',(req,res)=>{
     res.render('change_password');
  });
  
router.route('/add-wishlist').post(wishlist);
router.route('/delete-wishlist').post(delete_wishlist);

//router for fetching 
router.get('/:main_category/:sub_category', async (req,res)=>{

    const {main_category,sub_category}=req.params;
    console.log(req.params);
    
    const  sql='SELECT * FROM products WHERE main_category=? AND sub_category=?';
    connection.query(sql,[main_category,sub_category],(error,result)=>{
        if(error){
            res.status(500).json(new ApiError(500,'Error while fecthing the product',error));
        }
        else{
            console.log(result);
            res.render('user/categoryDetails',{title:"ProductList",products:result})    }
    })
    });
export default router;