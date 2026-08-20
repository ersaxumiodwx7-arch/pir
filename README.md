# FormFlow

A self-hosted custom form builder and response collector, similar to Typeform or Google Forms. FormFlow allows you to create beautiful forms, collect responses, and manage your data - all hosted on your own infrastructure.

## Features

### Admin Panel
- **Dashboard**: View all form templates with response counts
- **Form Management**: Create, edit, delete, and duplicate forms
- **Response Management**: View submitted responses in table and detail views
- **CSV Export**: Export form responses to CSV files
- **Secure Sharing**: Generate unique, unguessable shareable links for each form
- **Form Control**: Toggle forms active/inactive to stop accepting responses
- **Private by Design**: No public gallery or listing - forms only accessible via direct links

### Drag-and-Drop Form Builder
- **Visual Editor**: Build forms by adding and reordering field blocks via drag-and-drop
- **Field Types**: 
  - Short text
  - Long text/paragraph
  - Multiple choice (radio buttons)
  - Checkboxes
  - Dropdown
  - Date picker
  - Number
  - Email
  - Phone
  - File upload
  - Rating/scale
- **Field Customization**: Label, description, placeholder, required toggle
- **Logo Upload**: Add custom logos to your forms
- **Live Preview**: See how your form looks to customers in real-time
- **Templates**: Save forms as templates and duplicate existing ones

### Form-Filling Experience
- **No Login Required**: Customers access forms via unique links
- **Mobile Responsive**: Beautiful, responsive design for all devices
- **Validation**: Client-side and server-side validation for required fields and field types
- **Confirmation Screen**: Submission confirmation after form completion
- **Secure Access**: Forms only accessible via direct URL (no public listing)

## Tech Stack

### Backend
- **Node.js** + **Express**: REST API server
- **PostgreSQL**: Relational database (SQLite also supported for local dev)
- **JWT**: Authentication for admin access
- **Multer**: File upload handling
- **Bcrypt**: Password hashing

### Frontend
- **React**: UI framework
- **React Router**: Client-side routing
- **@dnd-kit**: Drag-and-drop functionality
- **Axios**: HTTP client
- **React Hot Toast**: Notification system
- **React Hook Form**: Form validation

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (or SQLite for local development)
- npm or yarn

## Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd FormFlow
```

### 2. Install Dependencies

Install both server and client dependencies:

```bash
npm run install:all
```

Or install separately:

```bash
cd server
npm install

cd ../client
npm install
```

### 3. Database Setup

#### PostgreSQL (Recommended for Production)

1. Create a PostgreSQL database:

```sql
CREATE DATABASE formflow;
```

2. Configure the database connection in `server/.env`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/formflow
```

3. Run migrations:

```bash
cd server
npm run migrate
```

4. Seed the database with an example form:

```bash
npm run seed
```

#### SQLite (For Local Development)

1. Install SQLite3:

```bash
npm install sqlite3
```

2. Update `server/.env` to use SQLite:

```env
DATABASE_URL=sqlite:./formflow.db
```

3. The migration script will automatically create the SQLite database file.

### 4. Environment Configuration

Create a `.env` file in the `server` directory (copy from `.env.example`):

```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/formflow
JWT_SECRET=your-secret-key-change-this-in-production
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
UPLOAD_DIR=./uploads
```

**Important**: Change the `JWT_SECRET` to a secure random string in production.

### 5. Create Upload Directory

The uploads directory should be created automatically, but you can create it manually:

```bash
mkdir -p server/uploads
```

## Running the Application

### Development Mode

Run both the backend and frontend in development mode:

```bash
npm run dev
```

Or run them separately:

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
cd client
npm start
```

The backend will run on `http://localhost:5000` and the frontend on `http://localhost:3000`.

### Production Mode

**Build the frontend:**
```bash
cd client
npm run build
```

**Start the backend:**
```bash
cd server
npm start
```

The application will be served from the backend server on the configured port.

## Usage

### 1. Admin Login

1. Navigate to `http://localhost:3000/login`
2. Login with the credentials configured in your `.env` file:
   - Email: `admin@example.com` (or your configured email)
   - Password: `admin123` (or your configured password)

### 2. Create a Form

1. From the dashboard, click "New Form"
2. Enter form title and description
3. Optionally upload a logo
4. Add fields by clicking on field type buttons
5. Configure each field (label, description, placeholder, required)
6. Drag and drop to reorder fields
7. Use the live preview to see how the form looks
8. Click "Save Form"

### 3. Share Your Form

1. From the dashboard, find your form
2. Click "Copy Link" to copy the unique form URL
3. Share this URL with your respondents
4. Only people with the exact URL can access the form

### 4. View Responses

1. From the dashboard, click "Responses" for your form
2. View all submissions in a table
3. Click "View Details" to see individual responses
4. Click "Export CSV" to download all responses

### 5. Manage Forms

- **Edit**: Modify form structure and fields
- **Duplicate**: Create a copy of an existing form
- **Enable/Disable**: Toggle form active status to stop/start accepting responses
- **Delete**: Remove a form and all its responses

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login

### Forms
- `GET /api/forms` - Get all forms (admin only)
- `GET /api/forms/:id` - Get form by ID (admin only)
- `GET /api/forms/slug/:slug` - Get form by slug (public)
- `POST /api/forms` - Create form (admin only)
- `PUT /api/forms/:id` - Update form (admin only)
- `DELETE /api/forms/:id` - Delete form (admin only)
- `POST /api/forms/:id/duplicate` - Duplicate form (admin only)

### Fields
- `GET /api/fields/form/:formId` - Get fields for a form (admin only)
- `POST /api/fields` - Create field (admin only)
- `PUT /api/fields/:id` - Update field (admin only)
- `DELETE /api/fields/:id` - Delete field (admin only)
- `POST /api/fields/reorder` - Reorder fields (admin only)

### Submissions
- `POST /api/submissions/submit` - Submit form response (public)
- `GET /api/submissions/form/:formId` - Get submissions for a form (admin only)
- `GET /api/submissions/:id` - Get submission details (admin only)
- `GET /api/submissions/form/:formId/export` - Export submissions to CSV (admin only)

### Upload
- `POST /api/upload/logo` - Upload form logo (admin only)

## Project Structure

```
FormFlow/
├── client/                 # React frontend
│   ├── public/            # Static files
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service
│   │   ├── context/       # React context
│   │   ├── utils/         # Utility functions
│   │   ├── App.js         # Main app component
│   │   └── index.js       # Entry point
│   └── package.json
├── server/                # Express backend
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   ├── database/      # Database configuration
│   │   ├── utils/         # Utility functions
│   │   └── index.js       # Server entry point
│   ├── uploads/           # Uploaded files
│   └── package.json
└── README.md
```

## Security Considerations

1. **Change Default Credentials**: Always change the default admin email and password
2. **Secure JWT Secret**: Use a strong, random JWT secret in production
3. **Database Security**: Use strong database passwords and restrict access
4. **HTTPS**: Use HTTPS in production to secure data transmission
5. **File Uploads**: The current implementation has file type and size restrictions
6. **Rate Limiting**: Consider adding rate limiting to prevent abuse
7. **Input Validation**: All inputs are validated both client-side and server-side

## Deployment

### Using PM2 (Process Manager)

1. Build the frontend:
```bash
cd client
npm run build
```

2. Install PM2:
```bash
npm install -g pm2
```

3. Start the server:
```bash
cd server
pm2 start src/index.js --name formflow
```

4. Configure PM2 to start on boot:
```bash
pm2 startup
pm2 save
```

### Using Docker (Optional)

Create a `Dockerfile` for the backend:

```dockerfile
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "src/index.js"]
```

Create a `.dockerignore` file:
```
node_modules
uploads
.env
.git
```

Build and run:
```bash
docker build -t formflow-server .
docker run -p 5000:5000 --env-file .env formflow-server
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check your DATABASE_URL in `.env`
- Verify database credentials

### File Upload Issues
- Ensure the `uploads` directory exists and is writable
- Check file size limits in multer configuration

### CORS Issues
- The backend is configured to allow all origins in development
- In production, update the CORS configuration to your specific domain

### Build Errors
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version compatibility

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on the GitHub repository.
