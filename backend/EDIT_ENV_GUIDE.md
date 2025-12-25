# How to Edit .env File

## ✅ I've Created Your .env File!

I've created a `.env` file with default settings. **You need to update the password!**

## 🔧 Edit the Password

1. **Open** `backend/.env` file in any text editor (Notepad, VS Code, etc.)

2. **Find this line:**
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/local_service_crm
   ```

3. **Replace `postgres` (the password part) with your actual PostgreSQL password**

   The format is: `postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE`
   
   **Examples:**
   - If your password is `mypass123`:
     ```
     DATABASE_URL=postgresql://postgres:mypass123@localhost:5432/local_service_crm
     ```
   
   - If your password is `admin`:
     ```
     DATABASE_URL=postgresql://postgres:admin@localhost:5432/local_service_crm
     ```
   
   - If you have NO password (uncommon):
     ```
     DATABASE_URL=postgresql://postgres@localhost:5432/local_service_crm
     ```

4. **Save the file**

## 🧪 Test It

After editing, test the connection:

```bash
cd backend
npm run check-env
```

This should show:
```
✅ DATABASE_URL found
✅ .env file format looks correct!
```

Then test the actual connection:

```bash
npm run test-db
```

If you see "✅ Database connection successful!" - you're good to go!

## 🔑 Finding Your PostgreSQL Password

**Common default passwords to try:**
- `postgres` (most common)
- `admin`
- `root`
- `password`
- Empty (no password)

**Or test manually:**
```cmd
psql -U postgres
```
Enter the password when prompted. If it works, use that password in `.env`!

## 📝 Complete .env File Should Look Like:

```
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/local_service_crm
```

**Important:** Replace `YOUR_PASSWORD_HERE` with your actual password!

## ⚠️ Common Mistakes

- ❌ Forgetting to replace the password
- ❌ Adding extra spaces
- ❌ Using quotes around the URL (don't!)
- ❌ Wrong database name (should be `local_service_crm`)
- ❌ Wrong port (should be `5432`)

## ✅ After Editing

1. Save the `.env` file
2. Run `npm run check-env` to verify format
3. Run `npm run test-db` to test connection
4. Restart your backend server
5. Try signing up again!

