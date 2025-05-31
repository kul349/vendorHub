import { Router } from "express"
import { uploads } from "../middleware/multer.middleware.js";
import { addProduct,addVendor,productLists,editViewProduct,fetchOrder,main_category,sub_category,totalSales} from "../controllers/vendor.controllers.js";
import { authenticate } from "../middleware/auth.middleware.js";
import connection from "../server.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const router=Router();

router.route('/productAdd',authenticate).post(
    uploads,addProduct);
router.route('/addVendor').post(addVendor);
router.route('/edit-viewProduct/:id').post(uploads,editViewProduct);
router.route('/fetch-order/:id').get(fetchOrder);

// for vendor 
// check vendor login
function checkVendorLogin(req,res,next){
    if(!req.session.vendor_id){
        return res.redirect('/userLogin')
    }
    next();
}
router.get('/vandordashboard',checkVendorLogin,async(req,res)=>{
    const vendor_id = req.session.vendor_id; 
    console.log("Vendor ID from session:", req.session.vendor_id);
    const firstLetter = req.session.firstLetter; 
    let message = null;
    let messageType = null;
    message = req.session.message;
    messageType = req.session.messageType;
    
    // After showing the message, clear the session variables so the alert won't show again
    req.session.message = null;
    req.session.messageType = null;
    try {
      const { products, totalProducts } = await productLists(vendor_id);
      console.log(totalProducts)
      console.log(products)
      console.log(message)
      res.render('dashboard', {

          title: "Vendor Dashboard",
          products: products,      // List of products
          totalProducts: totalProducts, 
          firstLetter: firstLetter,
          message,
          messageType,
          vendor_id
      });
  } catch (error) {
      console.error("Error fetching vendor products:", error);
      res.status(500).send("Server Error");
  }
  });

 

// Route for displaying the vendor's products
router.get('/viewProduct', async (req, res) => {
    const vendor_id = req.session.vendor_id; 
    console.log("Vendor ID from session:", vendor_id); // Debugging the vendor_id

    // If vendor_id is not found, return Unauthorized error
    if (!vendor_id) {
        return res.status(401).send("Unauthorized: Vendor ID not found in session.");
    }

    const firstLetter = req.session.firstLetter; // Get the first letter of the vendor's name from session

    try {
        // Fetch product details for the vendor
        const { products, totalProducts } = await productLists(vendor_id);
        console.log("Total Products:", totalProducts);
        console.log("Products:", products);
        
        // Render the viewProduct page with the fetched products
        res.render('vendor/viewProduct', {
            title: "View Products",
            products: products,      
            totalProducts: totalProducts, 
            firstLetter: firstLetter 
        });
    } catch (error) {
        console.error("Error fetching vendor products:", error);
        res.status(500).send("Server Error");
    }
});
router.get("/vendor-form",(req,res)=>{
    const vendorId = req.session.vendor_id;
    console.log("vendor_id for reg:",vendorId);
    res.render('vendor/vendorForm',{title:"welcomePage",vendorId})
})

router.get('/fetch-categories',(req,res)=>{
const query="SELECT id,name FROM categories";
connection.query(query,(error,result)=>{
    if(error){
        console.error("Error fetching categories:"+error.stack);
        return res.status(500).send("Error fetching categories");

    }
    res.status(200).json(new ApiResponse(200,result,'categories fetched successfullly!!!'))
})
})

router.post('/register-vendor/:vendor_id', (req, res) => {
    console.log(req.body);
    const vendorId = req.params.vendor_id;  // Get vendor_id from URL parameter
    console.log("vendorId:",vendorId)
    const {
      firstName,
      lastName,
      email,
      phone,
      businessName,
      businessAddress,
      website,
      taxId,
      productType,
      productCategories,
      customCategory,
      businessDesc
    } = req.body;
  
    // 1. Check if the vendor exists before updating
    const checkVendorQuery = 'SELECT user_id FROM vendors WHERE vendor_id = ?';
    connection.query(checkVendorQuery, [vendorId], (err, vendorResults) => {
      if (err) {
        console.error('Error checking vendor:', err.stack);
        return res.status(500).send('Error checking vendor');
      }
  
      // If vendor does not exist, return an error message
      if (vendorResults.length === 0) {
        return res.status(400).send('Vendor not found. Please register the vendor first.');
      }
  
      // 2. Vendor exists, proceed to update the vendor data
      let query = `UPDATE vendors SET first_name = ?, last_name = ?, email = ?, phone = ?, business_name = ?, business_address = ?, website = ?, tax_id = ?, product_type = ?, business_desc = ? WHERE vendor_id = ?;`;
      let queryParams = [
        firstName, lastName, email, phone, businessName, businessAddress, website, taxId, productType, businessDesc, vendorId
      ];
  
      connection.query(query, queryParams, (err, vendorResult) => {
        if (err) {
          console.error('Error updating vendor registration:', err.stack);
          return res.status(500).send('Error updating vendor');
        }
  
        // Only proceed with further processes if the vendor update is successful
        if (vendorResult.affectedRows > 0) {
          // Vendor has been updated, now handle the product categories
          let categoryPromises = [];
  
          if (productCategories && Array.isArray(productCategories)) {
            const categoryValues = productCategories.map(categoryId => [vendorId, categoryId]);
            const categoryQuery = 'INSERT INTO vendor_categories (vendor_id, category_id) VALUES ?';
            categoryPromises.push(
              new Promise((resolve, reject) => {
                connection.query(categoryQuery, [categoryValues], (err) => {
                  if (err) {
                    console.error('Error inserting categories:', err.stack);
                    return reject('Error inserting categories');
                  }
                  resolve();
                });
              })
            );
          }
  
          // 3. Handle custom category if provided
          if (customCategory) {
            const customCategoryQuery = 'SELECT id FROM categories WHERE name = ?';
            categoryPromises.push(
              new Promise((resolve, reject) => {
                connection.query(customCategoryQuery, [customCategory], (err, customCategoryResults) => {
                  if (err) {
                    console.error('Error checking custom category:', err.stack);
                    return reject('Error checking custom category');
                  }
  
                  let customCategoryId;
  
                  if (customCategoryResults.length > 0) {
                    customCategoryId = customCategoryResults[0].id;
                    // Link the existing custom category to the vendor
                    const customCategoryLinkQuery = 'INSERT INTO vendor_categories (vendor_id, category_id) VALUES (?, ?)';
                    connection.query(customCategoryLinkQuery, [vendorId, customCategoryId], (err) => {
                      if (err) {
                        console.error('Error linking custom category:', err.stack);
                        return reject('Error linking custom category');
                      }
                      resolve();
                    });
                  } else {
                    // Insert the custom category and link it
                    const insertCategoryQuery = 'INSERT INTO categories (name) VALUES (?)';
                    connection.query(insertCategoryQuery, [customCategory], (err, insertedCategory) => {
                      if (err) {
                        console.error('Error inserting custom category:', err.stack);
                        return reject('Error inserting custom category');
                      }
  
                      customCategoryId = insertedCategory.insertId;
                      const customCategoryLinkQuery = 'INSERT INTO vendor_categories (vendor_id, category_id) VALUES (?, ?)';
                      connection.query(customCategoryLinkQuery, [vendorId, customCategoryId], (err) => {
                        if (err) {
                          console.error('Error linking custom category:', err.stack);
                          return reject('Error linking custom category');
                        }
                        resolve();
                      });
                    });
                  }
                });
              })
            );
          }
  
          // Wait for all promises to finish before sending the success response
          Promise.all(categoryPromises)
            .then(() => {
              res.
              redirect('/vendor/waiting-room')
            })
            .catch((error) => {
              console.error(error);
              res.status(500).send('Error processing categories or custom category');
            });
        } else {
          res.status(400).send('Vendor update failed.');
        }
      });
    });
  });
  

  router.get('/waiting-room',(req,res)=>{
    res.render('vendor/vendorWaiting')
  });
  router.route('/main-category/:id').get(main_category);

  router.route('/vendor-sub_category/:id').get(sub_category);
  router.route('/fetchTotalSales/:id').get(totalSales)
  
    export default router;