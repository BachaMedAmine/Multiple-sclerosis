import { Injectable } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileUploadService {
  static multerOptions = {
    storage: diskStorage({
      destination: (req, file, callback) => {
        const fileType = file.mimetype.split('/')[0];
        const uploadPath = fileType === 'image' ? './uploads/images' : './uploads/documents';
        callback(null, uploadPath);
      },
      filename: (req, file, callback) => {
        const filename = uuidv4() + extname(file.originalname);
        callback(null, filename);
      }
    }),

    fileFilter: (req, file, callback) => {
      const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'application/pdf', 'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // DOCX
      ];

      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.docx'];

      const mime = file.mimetype;
      const ext = extname(file.originalname).toLowerCase();

      console.log(`🔍 File received - Name: ${file.originalname}, MIME type: ${mime}, Extension: ${ext}`);

      // Allow based on MIME or fallback to extension
      if (allowedMimeTypes.includes(mime) || allowedExtensions.includes(ext)) {
        return callback(null, true);
      }

      return callback(
        new Error('Only images (jpeg, jpg, png, gif) and documents (pdf, txt, docx) are allowed!'),
        false
      );
    }
  };
}