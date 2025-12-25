# Where is Your Database Stored?

## 📍 Default PostgreSQL Data Directory (Windows)

PostgreSQL stores all database files in its **data directory**. The default location is:

```
C:\Program Files\PostgreSQL\14\data
```

(Replace `14` with your PostgreSQL version number - could be 13, 14, 15, 16, etc.)

## 🔍 Finding Your Exact Data Directory

### Method 1: Using psql

Open Command Prompt and run:

```cmd
psql -U postgres -c "SHOW data_directory;"
```

This will show the exact path where your database is stored.

### Method 2: Check PostgreSQL Configuration

1. Open **pgAdmin** (PostgreSQL GUI tool)
2. Connect to your PostgreSQL server
3. Right-click on the server → **Properties**
4. Look for **Data Directory** field

### Method 3: Check Windows Services

1. Press `Win + R`, type `services.msc`
2. Find PostgreSQL service
3. Right-click → **Properties** → **General** tab
4. Check the path in "Path to executable" - the data directory is usually in the parent folder

## 📂 What's Inside the Data Directory

Your database `local_service_crm` is stored as files in:

```
C:\Program Files\PostgreSQL\14\data\base\[database_oid]
```

Where `[database_oid]` is a numeric ID assigned by PostgreSQL.

### Important Subdirectories:

- **`base/`** - Contains all your databases (including `local_service_crm`)
- **`pg_wal/`** - Write-Ahead Log files (transaction logs)
- **`global/`** - System-wide tables
- **`pg_tblspc/`** - Tablespaces (if any custom ones exist)

## 🔐 Accessing the Database

**You don't need to access these files directly!** PostgreSQL manages them automatically.

### Use These Tools Instead:

1. **psql** (Command line):
   ```cmd
   psql -U postgres -d local_service_crm
   ```

2. **pgAdmin** (GUI tool):
   - Download from: https://www.pgadmin.org/
   - Connect to your server
   - Browse databases visually

3. **Your CRM Application**:
   - The app connects via the connection string in `.env`
   - All data is accessible through the web interface

## 💾 Database Backup Location

When you backup your database, you choose where to save it:

### Using pg_dump:

```cmd
pg_dump -U postgres local_service_crm > C:\backups\crm_backup.sql
```

This creates a SQL file wherever you specify.

### Using pgAdmin:

1. Right-click database → **Backup**
2. Choose your backup location
3. Save the backup file

## 📊 Viewing Your Database Data

### Option 1: Through Your CRM App

- All data is visible in the web interface
- Leads, follow-ups, notes, etc. are all stored in the database

### Option 2: Using pgAdmin

1. Install pgAdmin
2. Connect to `localhost:5432`
3. Expand **Databases** → **local_service_crm**
4. Browse tables:
   - `users`
   - `businesses`
   - `leads`
   - `follow_ups`
   - `notes`

### Option 3: Using psql

```cmd
psql -U postgres -d local_service_crm

# List all tables
\dt

# View leads table
SELECT * FROM leads;

# Exit
\q
```

## 🗂️ Database Structure

Your `local_service_crm` database contains these tables:

1. **users** - User accounts
2. **businesses** - Business information
3. **leads** - All your leads
4. **follow_ups** - Scheduled follow-ups
5. **notes** - Notes for each lead

All stored in: `C:\Program Files\PostgreSQL\14\data\base\[database_oid]/`

## ⚠️ Important Notes

1. **Don't modify files directly** - Always use PostgreSQL tools
2. **Backup regularly** - Use `pg_dump` or pgAdmin
3. **Data is persistent** - It stays even if you restart PostgreSQL
4. **Location can be changed** - But requires PostgreSQL reconfiguration

## 🔄 Moving or Backing Up

### To Backup:

```cmd
pg_dump -U postgres local_service_crm > backup.sql
```

### To Restore:

```cmd
psql -U postgres -d local_service_crm < backup.sql
```

## 📍 Quick Summary

- **Physical Location**: `C:\Program Files\PostgreSQL\14\data\base\`
- **Database Name**: `local_service_crm`
- **Access Method**: Use psql, pgAdmin, or your CRM app
- **Don't Edit Files Directly**: Always use PostgreSQL tools

Your data is safe and persistent - it will remain even after restarting your computer or PostgreSQL service!

