# 🔍 Database Connection Diagnostic Guide

Follow these steps to find and fix the issue:

## Step 1: Check PostgreSQL is Running

**Open Command Prompt** (not PowerShell) and run:

```cmd
sc query | findstr postgresql
```

OR check Windows Services:
1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Look for "PostgreSQL" service
4. Make sure it says "Running"

**If not running:** Start it from Services or run:
```cmd
net start postgresql-x64-14
```
(Replace `14` with your PostgreSQL version)

---

## Step 2: Test PostgreSQL Connection Manually

**Open Command Prompt** and try connecting:

```cmd
psql -U postgres
```

**What happens?**
- ✅ **Asks for password and connects** → You know the password! Use it in `.env`
- ❌ **"password authentication failed"** → Wrong password, need to reset
- ❌ **"psql: command not found"** → PostgreSQL not in PATH, but might still be installed
- ❌ **"could not connect"** → PostgreSQL not running

---

## Step 3: Check Your .env File

**Open `backend/.env`** and verify the DATABASE_URL line:

**Correct format:**
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/local_service_crm
```

**Common mistakes:**
- ❌ Missing password: `postgresql://postgres@localhost:5432/...` (if password is required)
- ❌ Wrong password: `postgresql://postgres:wrongpassword@localhost:5432/...`
- ❌ Wrong database name: `postgres` instead of `local_service_crm`
- ❌ Wrong port: `5433` instead of `5432`
- ❌ Extra spaces or quotes

**Example with password "mypass123":**
```
DATABASE_URL=postgresql://postgres:mypass123@localhost:5432/local_service_crm
```

---

## Step 4: Verify Database Exists

**In Command Prompt**, run:

```cmd
psql -U postgres -l
```

**Look for `local_service_crm` in the list.**

**If it doesn't exist**, create it:
```cmd
createdb -U postgres local_service_crm
```

---

## Step 5: Test Connection with Your Password

**Try connecting with the exact connection string from .env:**

```cmd
psql "postgresql://postgres:YOUR_PASSWORD@localhost:5432/local_service_crm"
```

**Replace `YOUR_PASSWORD` with your actual password.**

**If this works**, your `.env` file should work too!

---

## Step 6: Common Password Solutions

### Try These Passwords (in order):

1. **`postgres`** (most common default)
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/local_service_crm
   ```

2. **Empty password** (if no password was set)
   ```
   DATABASE_URL=postgresql://postgres@localhost:5432/local_service_crm
   ```

3. **`admin`**
   ```
   DATABASE_URL=postgresql://postgres:admin@localhost:5432/local_service_crm
   ```

4. **`root`**
   ```
   DATABASE_URL=postgresql://postgres:root@localhost:5432/local_service_crm
   ```

---

## Step 7: Reset Password (If Needed)

If you can't remember the password:

### Option A: Use pgAdmin (GUI)
1. Open pgAdmin
2. Connect to PostgreSQL server
3. Right-click on "Login/Group Roles" → "postgres"
4. Properties → Change password

### Option B: Command Line (Advanced)

1. **Stop PostgreSQL:**
   ```cmd
   net stop postgresql-x64-14
   ```

2. **Edit `pg_hba.conf`:**
   - Location: `C:\Program Files\PostgreSQL\14\data\pg_hba.conf`
   - Find: `host all all 127.0.0.1/32 md5`
   - Change to: `host all all 127.0.0.1/32 trust`
   - Save

3. **Start PostgreSQL:**
   ```cmd
   net start postgresql-x64-14
   ```

4. **Connect and set password:**
   ```cmd
   psql -U postgres
   ```
   Then:
   ```sql
   ALTER USER postgres PASSWORD 'newpassword123';
   \q
   ```

5. **Change `pg_hba.conf` back to `md5`** and restart

---

## Step 8: Test in Backend

After fixing `.env`, test it:

```cmd
cd backend
npm run test-db
```

**Success:**
```
✅ Database connection successful!
Current time: ...
```

**Failure:**
```
❌ Database connection failed!
Error: ...
```

---

## Quick Checklist

Before trying signup again, verify:

- [ ] PostgreSQL service is running
- [ ] Can connect with `psql -U postgres` (know the password)
- [ ] Database `local_service_crm` exists
- [ ] `.env` file has correct DATABASE_URL format
- [ ] `npm run test-db` works successfully
- [ ] Backend restarted after changing `.env`

---

## Still Not Working?

**Share these details:**

1. What happens when you run `psql -U postgres`?
2. What's in your `.env` DATABASE_URL line? (hide the password)
3. What error do you see when running `npm run test-db`?
4. Is PostgreSQL service running?

This will help identify the exact issue!

