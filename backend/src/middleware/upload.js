import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sanitizeFilename = (name) => {
  const base = path.basename(name);
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
};

const allowedTypes = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'application/pdf': ['.pdf']
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + sanitizeFilename(file.originalname));
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  const extensions = allowedTypes[file.mimetype] || [];
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (extensions.length > 0 && extensions.includes(ext)) {
    return cb(null, true);
  }

  return cb(new Error('Type de fichier non autorisé'), false);
};

// Configure multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});
