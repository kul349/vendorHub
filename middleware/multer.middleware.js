import multer from "multer";
import path from "path";

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');  // Store uploaded images in the 'uploads' folder
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);  // Get the file extension (e.g., .jpg, .png)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'image-' + uniqueSuffix + ext);  // Generate a unique filename
  }
});

// Allow a maximum of 5 images with any file type
export const uploads = multer({ 
  storage: storage,
  limits: { files: 5 },  // Limit to 5 files
}).array('image', 5);  // 'images' is the field name in the form and the max number of files allowed
