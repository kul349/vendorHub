import express from "express";
import session from "express-session";
import path from 'path'
import { fileURLToPath } from 'url';
import cors from 'cors'

// Get the directory name from the current module's URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app=express()
app.use(cors());
app.use('/uploads', express.static('uploads'));  // Serves images from the 'uploads' folderapp.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname,'public')))
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.set('view engine','ejs');
app.set('views', 'forntend/views');
app.use(session({
    secret:'my_secret_key',
    resave:false,
    saveUninitialized:true,
    cookie: { secure: false,
    maxAge:1000*60*60*24,

     }
}));
 
app.use((req, res, next) => {
    if (req.session.messages) {
      res.locals.messages = req.session.messages; // Pass messages to views
      delete req.session.messages; // Clear messages after use
    }
    next();
  });



import userRoute from "./routes/user.routes.js"
import vendorRoute from './routes/vendor.routes.js'
import adminRoute from './routes/admin.routes.js'


app.use('/users',userRoute);
app.use('/vendor',vendorRoute);
app.use('/admin',adminRoute);

app.get('/orderstotalforseee', (req, res) => {
  // Render the EJS view for orders page
  res.render('user/userorder_page'); // This assumes you have an 'orders.ejs' file in the views folder
});
app.get('/', (req, res) => {
    res.render('register', { title: "HomePage" });
});

app.get('/userLogin', (req, res) => {
  req.session.accessToken = null;  // Clear session to avoid old data
  const accessToken = req.session.accessToken;
  console.log("loginToken:", accessToken);  // This should show `null` or the accessToken if set properly

  res.render('userLoginpage', {
    title: "User Login Page",
    message: req.session.message,
    messageType: req.session.messageType,
    accessToken,
    
  });

  req.session.message = null;
  req.session.messageType = null;
});



app.get('/index',(req,res)=>{
  const firstLetter=req.session.firstLetter;
  const accessToken = req.session.accessToken || null;
  const userId = req.session.userId; // Get user ID from session
  console.log("accessTokensdFD:",accessToken);
  let message = null;
  let messageType = null;
  
  // Check if the session contains the message and messageType
  if (req.session.message) {
      message = req.session.message;
      messageType = req.session.messageType;
      
      // After showing the message, clear the session variables so the alert won't show again
      req.session.message = null;
      req.session.messageType = null;
  
  }
  res.render("index",{title:"Index Page",firstLetter,message,messageType,accessToken,    userId: userId,})
  
});


app.get('/addProduct',(req,res)=>{
  const vendor_id=req.session.vendor_id;

  if(!vendor_id){
    return res.redirect('/userLoginPage');
  }

  res.render("vendor/addProduct",{title:"addProduct",vendor_id:vendor_id,
    message:req.session.message,
    messageType:req.session.messageType
  })
})


// Logout route for vendor
app.get('/vendor/logout', (req, res) => {
  req.session.destroy((err) => {
      if (err) {
          return res.status(500).send("Error occurred while logging out.");
      }
      res.redirect('/userLogin'); // Redirect to login page after logout
  });
});

// users logout;

app.get('/users/logout', (req, res) => {
  req.session.message = 'User logged out successfully';
  req.session.messageType = 'success';
  console.log(req.session.message);

  // Clear the access token cookie
  res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      sameSite: 'Strict', // Prevents the cookie from being sent with cross-site requests
      maxAge: 1000 * 60 * 60 * 24, // Session expires in 24 hours

    });

  
  // Destroy session
  req.session.destroy((err) => {
      if (err) {
          return res.status(500).send('Error occurred while logging out');
      }

      // Redirect to login page after logout
      res.redirect('/userLogin');
  });
});

/// for Admin logout
app.get('/Admin/logout', (req, res) => {
  req.session.message = 'Admin logged out successfully';
  req.session.messageType = 'success';
  console.log(req.session.message);

  // Clear the access token cookie
  res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      sameSite: 'Strict', // Prevents the cookie from being sent with cross-site requests
  });

  
  // Destroy session
  req.session.destroy((err) => {
      if (err) {
          return res.status(500).send('Error occurred while logging out');
      }

      // Redirect to login page after logout
      res.redirect('/userLogin');
  });
});


// to refresh the refresh token


app.get('/refresh-token', (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
      return res.redirect('/userLogin');  // No refresh token, redirect to login
  }

  try {
      // Verify the refresh token
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      const user = { user_id: decoded.user_id }; // Fetch user from database using user_id (you may need to adjust this)
      
      // Generate new access token
      const accessToken = generateAccessToken(user);
      
      // Update session with new access token
      req.session.accessToken = accessToken;

      // Optionally redirect to the previous page or a specific page
      return res.redirect(req.get('Referrer') || '/index');
  } catch (error) {
      console.log("Error refreshing token:", error);
      return res.redirect('/userLogin');  // If refresh token is invalid or expired, redirect to login
  }
});


app.get('/get-product',(req,res)=>{
  res.render('user/search_product',{
    title:"productList"
  })
})

export {app};


