import bcrypt from 'bcrypt';
import connection from '../server.js'; 
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from "../utils/AsyncHandler.js";
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';




const userRegister = asyncHandler(async (req, res) => {
    const { username, email, password, role } = req.body;

    // Check if all fields are provided
    if (!username || !email || !password || !role) {
        return res.status(400).json(new ApiResponse(400, 'All fields are required.'));
    }

    // Check if user already exists (check by email or username)
    const checkUserQuery = 'SELECT * FROM users WHERE email = ? OR username = ?';
    connection.query(checkUserQuery, [email, username], (error, result) => {
        if (error) {
            return res.status(500).json(new ApiResponse(500, 'Error checking for existing user.'));
        }

        if (result.length > 0) {
            return res.status(400).json(new ApiResponse(400, 'User already exists.'));
        }

        // Hash the password before storing it in the database
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json(new ApiResponse(500, 'Error hashing password.'));
            }

            // Set the role_id based on the selected role (1 = Regular User, 2 = Vendor, 3 = Admin)
            let role_id;
            if (role === 'admin') {
                role_id = 3;
            } else if (role === 'vendor') {
                role_id = 2;
            } else {
                role_id = 1; // Default to regular user if no role is provided
            }

            // Query to insert the new user into the database with the correct role_id
            const insertUserQuery = 'INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)';
            connection.query(insertUserQuery, [username, email, hashedPassword, role_id], (insertError, result) => {
                if (insertError) {
                    return res.status(500).json(new ApiResponse(500, insertError));
                }
                const user_id = result.insertId;// This is the ID of the newly inserted user
                console.log("user_id for vendor",user_id)
                // Return a success response
               if(role_id===2){
                
                
                const insertVendorQuery = 'INSERT INTO vendors (user_id,email) VALUES (?,?)';
                connection.query(insertVendorQuery, [user_id,email], (vendorError, vendorResult) => {
                    if (vendorError) {
                        return res.status(500).json(new ApiResponse(500, vendorError));
                    }
                    req.session.vendor_id = vendorResult.insertId; 
                     // This stores the vendor_id in the session
                    // Redirect to the vendor form
                    res.redirect('/vendor/vendor-form');})
                

               }else{
                res.redirect('/userLogin');
               }
            });
        });
    });
});




// for login purpose 

const userLogin = asyncHandler((req, res) => {
    const { email, password } = req.body;

    
    // Check if email exists in the database
    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    console.log(checkUserQuery)
    connection.query(checkUserQuery, [email], (error, result) => {
        if (error) {
            req.session.message = 'Error checking user email.';
            req.session.messageType='error';
            return res.redirect('/userLogin');
        }

        // If no user found with the provided email
        if (result.length === 0) {
            req.session.message= 'User are not found with this credentials';
            console.log(req.session.message);
            req.session.messageType='error';

            return res.redirect('/userLogin');
        }

        const user = result[0];

        // Compare the provided password with the stored hashed password
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                req.session.message= 'Error comparing password.';
                console.log(req.session.message);

                req.session.messageType='error';

                
                return res.redirect('/userLogin');
            }

            if (!isMatch) {
                req.session.message = 'Invalid credentials.';
                console.log(req.session.message);

                req.session.messageType='error';

                return res.redirect('/userLogin');
            }
            const accessToken = generateAccessToken(user);  // Access token
            const refreshToken = generateRefreshToken(user);  // Refresh token

            req.session.accessToken = accessToken;

            res.cookie('accessToken', accessToken, {
                httpOnly: true,    // Ensures it's not accessible via JavaScript
                secure: false, 
                maxAge: 24 * 60 * 60 * 1000, // Set expiry (1 day)
            });
            // Store the refresh token in the database
            const updateQuery = 'UPDATE users SET refresh_token=? WHERE user_id=?';
            connection.query(updateQuery, [refreshToken, user.user_id], (updateError, updateResult) => {
                if (updateError) {
                    return res.status(500).json(new ApiResponse(500, 'Error saving refresh token.'));
                }
                console.log('Refresh token saved in the database.');
            });
            // Store the user details in the session
            req.session.user = user;
            req.session.accessToken = accessToken;
            if (user.role_id === 3) {
                // Admin
                req.session.accessToken = accessToken;

                const userName = req.session.user.username; // Get vendor's name from session
                const firstLetter = userName ? userName.charAt(0).toUpperCase() : '';
                req.session.firstLetter=firstLetter;
                req.session.loggedIn = true;  // This could be any condition, e.g., successful login
                req.session.message= "Users login successfully";  // Set the message you want to display
                req.session.messageType = 'success';
                return res.redirect('/admin/admin-dashboard');
            }

            else if (user.role_id === 2) {
    // Vendor
    const user_id = user.user_id; 

    connection.query('SELECT * FROM vendors WHERE user_id = ?', [user_id], (vendorError, vendorResults) => {
        if (vendorError) {
            console.error('Error fetching vendor details:', vendorError);
            return res.status(500).send('Server Error');
        }

        // Log the vendorResults to see if the query returns any data
        console.log('Vendor query result:', vendorResults);

        if (vendorResults.length > 0) {
            // If vendor is found, set vendor_id in the session
            const vendor = vendorResults[0];  
            const vendor_id = vendor.vendor_id;  

            // Store vendor_id and firstLetter (from the vendor's username) in session
            req.session.vendor_id = vendor_id;  
            const vendorName = user.username;   
            const firstLetter = vendorName ? vendorName.charAt(0).toUpperCase() : '';  
            req.session.firstLetter = firstLetter;  
            req.session.loggedIn = true;  // This could be any condition, e.g., successful login
            req.session.message= "Users login successfully";  // Set the message you want to display
            req.session.messageType = 'success';
            req.session.accessToken = accessToken;

            if(vendor.status==='pending'){
                res.redirect('/vendor/waiting-room')
            }else{
                return res.redirect('/vendor/vandordashboard');
            }
           
        } else {
            console.log('No vendor found for user_id:', user_id);
            return res.status(404).send('Vendor not found');
        }
    });
}

 else {
                const userName = req.session.user.username; // Get vendor's name from session
                const firstLetter = userName ? userName.charAt(0).toUpperCase() : '';
                req.session.firstLetter=firstLetter;
                req.session.loggedIn = true;  // This could be any condition, e.g., successful login
                req.session.message= "Users login successfully";  // Set the message you want to display
                req.session.messageType = 'success';
                // Regular User
                req.session.accessToken = accessToken;
                req.session.userId = user.user_id;
                console.log("user_id for index")

                  return res.redirect('/index');
                
            }
        });
    });
});

// implementing the jwt token:

const generateAccessToken=(user)=>{
    
    return jwt.sign({
        user_id:user.user_id,
        username:user.username,
        email:user.email
    },
process.env.ACCESS_TOKEN_SECRET,{
   expiresIn: process.env.ACCESS_TOKEN_EXPIRY
}
)
}

// Refresh token generatetoken
const generateRefreshToken=(user)=>{
    return jwt.sign({
        user_id:user.user_id
    },
process.env.REFRESH_TOKEN_SECRET,{
    expiresIn:process.env.REFRESH_TOKEN_EXPIRY
}
)
}


const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.user_id;
  
    if (!oldPassword || !newPassword) {
      return res.status(400).json(new ApiResponse(400, 'Old and new passwords are required.'));
    }
  
    connection.query('SELECT * FROM users WHERE user_id = ?', [userId], async (error, result) => {
      if (error) {
        return res.status(500).json(new ApiResponse(500, 'Error fetching user from database.'));
      }
  
      if (result.length === 0) {
        return res.status(404).json(new ApiError(404, 'User not found!'));
      }
  
      const user = result[0];
      const isMatch = await bcrypt.compare(oldPassword, user.password);
  
      if (!isMatch) {
        return res.status(400).json(new ApiResponse(400, 'Old password is incorrect.'));
      }
  
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  
      connection.query('UPDATE users SET password = ? WHERE user_id = ?', [hashedNewPassword, userId], (updateError, updateResult) => {
        if (updateError) {
          return res.status(500).json(new ApiResponse(500, 'Error updating password.'));
        }
  
        return res.status(200).json(new ApiResponse(200, 'Password changed successfully!'));
      });
    });
  });
  

export { userRegister,userLogin,changePassword };
