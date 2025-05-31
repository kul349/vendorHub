import { Router } from "express";
const router=Router();
import connection from "../server.js";
import { fetchCustomer, fetchUser,searchUser,fetchProduct,fetchTotalVendor,getTotalOrders} from "../controllers/admin.controllers.js";

// route for admin dashboard

router.get('/admin-dashboard',(req,res)=>{
  const accessToken = req.session.accessToken || null;
  console.log("accessTokensdFD:",accessToken);
    res.render('admin/adminDashboard',{title:"Admin Dashbaord",accessToken})
});

router.route('/total-orders').get(getTotalOrders);
router.route('/fetch-user').get(fetchUser);



// fetching the customer list 

router.get('/customer-listing',(req,res)=>{
    res.render('admin/customers/customerList',{title:"customer-Listing"});
});

// fetching the customer for graph

router.route('/fetch-customer').get(fetchCustomer);

// searching the customer 

router.route('/search-users').get(searchUser);


//redering the vendor application

router.get('/vendor-application',(req,res)=>{
    res.render('admin/application/vendorApplication')
});

// fetching the produc list 
router.route('/fetch-product').get(fetchProduct);


// rendring the product list page 
router.get('/fetch-productlist',(req,res)=>{
  res.render('admin/product/productlist',{title:"productList"})
})


//vendor search in admin panel

router.get('/vendors/search', async (req, res) => {
    const searchQuery = req.query.query || '';
    const query = `
        SELECT * FROM vendors
        WHERE  email LIKE ? 
    `;
    const params = [`%${searchQuery}%` ];

    try {
        // Using a promise-based query execution for async/await
        const results = await new Promise((resolve, reject) => {
            connection.query(query, params, (err, results) => {
                if (err) {
                    reject(err); // Reject if there's an error
                } else {
                    resolve(results); // Resolve with the results if successful
                }
            });
        });

        res.json({ data: results });
    } catch (err) {
        // Handle errors and send a response
        console.error('Error fetching vendors:', err);
        res.status(500).send('Error fetching vendors');
    }
});
  
  // 2. Fetch vendor details for modal
  router.get('/vendors-details/:id', (req, res) => {
    const vendorId = req.params.id;
    const query = 'SELECT * FROM vendors WHERE vendor_id = ?';
    
    connection.query(query, [vendorId], (err, results) => {
      if (err) {
        return res.status(500).send('Error fetching vendor details');
      }
      if (results.length === 0) {
        return res.status(404).send('Vendor not found');
      }
      res.json({ data: results[0] });
    });
  });
  
  // 3. Approve vendor
  router.post('/vendors/approve/:id', (req, res) => {
    const vendorId = req.params.id;

    console.log(req.params.id,)
    const query = 'UPDATE vendors SET status = ? WHERE vendor_id = ?';
    
    connection.query(query, ['approve', vendorId], (err, results) => {
      if (err) {
        return res.status(500).send('Error approving vendor');
      }
      res.json({ message: `Vendor ${vendorId} approved` });
    });
  });
  
  // 4. Reject vendor
  router.post('/vendors/reject/:id', (req, res) => {
    const vendorId = req.params.id;
    const query = 'UPDATE vendors SET status = ? WHERE vendor_id = ?';
    
    connection.query(query, ['reject', vendorId], (err, results) => {
      if (err) {
        return res.status(500).send('Error rejecting vendor');
      }
      res.json({ message: `Vendor ${vendorId} rejected` });
    });
  });


  ///routes for fetching the totalVendor
  router.route('/total-vendor').get(fetchTotalVendor);

 
export default router;