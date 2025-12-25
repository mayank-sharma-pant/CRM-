# How to Use Local Service CRM

## 🚀 Initial Setup (First Time)

### Step 1: Install Dependencies

Open terminal in the project root and run:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (open new terminal)
cd ../frontend
npm install
```

### Step 2: Set Up Database

1. **Make sure PostgreSQL is running** on your computer

2. **Create the database:**
   ```bash
   # Option 1: Using createdb command
   createdb local_service_crm
   
   # Option 2: Using psql
   psql -U postgres
   CREATE DATABASE local_service_crm;
   \q
   ```

3. **Configure backend environment:**
   - Go to `backend` folder
   - Copy `.env.example` to `.env` (or create new `.env` file)
   - Edit `.env` and update:
     ```
     DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/local_service_crm
     JWT_SECRET=your-random-secret-key-here
     ```

4. **Run database migrations:**
   ```bash
   cd backend
   npm run migrate
   ```

### Step 3: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
You should see: `🚀 Server running on port 5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
You should see: `Local: http://localhost:3000`

### Step 4: Open in Browser

Open `http://localhost:3000` in your web browser.

---

## 👤 First Time Usage

### 1. Create Your Account

1. On the landing page, click **"Get Started"** or **"Start Free Trial"**
2. Fill in the registration form:
   - **Full Name**: Your name
   - **Email**: Your email address
   - **Password**: At least 6 characters
   - **Business Name**: Your business name
   - **Phone** (optional): Your business phone
   - **Address** (optional): Your business address
3. Click **"Create account"**
4. You'll be automatically logged in and redirected to the Dashboard!

---

## 📋 Daily Usage Guide

### Dashboard Overview

The **Dashboard** is your home screen showing:
- **Key Stats**: Total leads, converted leads, conversion rate, recent leads
- **Today's Follow-ups**: Follow-ups scheduled for today
- **Overdue Follow-ups**: Missed follow-ups that need attention
- **Quick Actions**: Fast links to common tasks

---

## 👥 Managing Leads

### Adding a New Lead

**Method 1: From Dashboard**
1. Click **"Add New Lead"** button
2. Fill in the form:
   - **Name** (required): Customer's name
   - **Email**: Customer's email
   - **Phone**: Customer's phone number
   - **Service Type**: e.g., "Plumbing", "HVAC", "Cleaning"
   - **Source**: Where the lead came from (Website, Referral, Social Media, etc.)
   - **Status**: Start with "New"
3. Click **"Create Lead"**

**Method 2: From Leads Page**
1. Go to **Leads** in the sidebar
2. Click **"Add New Lead"** button at top right
3. Fill in the form and save

### Viewing All Leads

1. Click **"Leads"** in the sidebar
2. You'll see a table with all your leads
3. Use the **Search** box to find leads by name, email, or phone
4. Use the **Status** dropdown to filter by status

### Lead Statuses Explained

- **New**: Just added, not contacted yet
- **Contacted**: Initial contact made
- **Follow-up**: Waiting for follow-up call/meeting
- **Converted**: Successfully converted to customer! ✅
- **Lost**: Not interested or went elsewhere

### Viewing Lead Details

1. Click on any lead name in the leads list
2. You'll see:
   - **Lead Information**: All contact details
   - **Status**: Change status using the dropdown
   - **Notes**: View and add notes about this lead
   - **Follow-ups**: See scheduled follow-ups

### Editing a Lead

1. Go to the lead detail page
2. Click on any field to edit (or use the status dropdown)
3. Changes are saved automatically

### Deleting a Lead

1. On the leads list, click **"Delete"** next to the lead
2. Confirm the deletion
   - OR go to lead detail page and click **"Delete"** button

---

## 📝 Adding Notes

Notes help you remember important details about each lead.

### Adding a Note

1. Go to a lead's detail page
2. Click **"Add Note"** button
3. Type your note (e.g., "Customer interested in premium package, budget is $5000")
4. Click **"Save"**

### Viewing Notes

- All notes appear on the lead detail page
- Notes are timestamped (date and time)
- Most recent notes appear first

### Editing/Deleting Notes

1. On the lead detail page, find the note
2. Click **"Edit"** to modify it
3. Click **"Delete"** to remove it

---

## ⏰ Managing Follow-ups

Follow-ups help you never miss a customer interaction.

### Scheduling a Follow-up

1. Go to a lead's detail page
2. In the **Follow-ups** section, click **"Add"**
3. Fill in:
   - **Date** (required): When to follow up
   - **Time** (optional): Specific time
   - **Notes**: What to discuss
4. Click **"Create"**

### Viewing Follow-ups

**From Dashboard:**
- See **Today's Follow-ups** widget
- See **Overdue Follow-ups** widget

**From Follow-ups Page:**
1. Click **"Follow-ups"** in the sidebar
2. Use filters:
   - **All**: See all follow-ups
   - **Today**: Only today's follow-ups
   - **Overdue**: Only missed follow-ups
   - **Pending**: Only pending follow-ups

### Completing a Follow-up

**From Dashboard:**
1. Find the follow-up in "Today's Follow-ups" or "Overdue Follow-ups"
2. Click **"Complete"** button

**From Follow-ups Page:**
1. Find the follow-up
2. Click **"Complete"** button
3. Status changes to "Completed"

### Marking as Missed

1. Go to Follow-ups page
2. Find the follow-up
3. Click **"Mark Missed"** button

---

## 📊 Viewing Reports

Reports help you understand your business performance.

### Accessing Reports

1. Click **"Reports"** in the sidebar
2. You'll see:
   - **Key Metrics**: Total leads, converted, lost, conversion rate
   - **Charts**: Visual representation of your data

### Understanding the Charts

1. **Leads Over Time**: Line chart showing leads created and conversions over time
2. **Leads by Status**: Pie chart showing distribution of lead statuses
3. **Leads by Source**: Bar chart showing where your leads come from

### Changing Time Period

- Click **"Week"** to see last 7 days
- Click **"Month"** to see last 30 days

---

## ⚙️ Settings

### Accessing Settings

Click **"Settings"** in the sidebar

### Profile Tab

Update your personal information:
- **Email**: Cannot be changed (shown for reference)
- **Full Name**: Update your name
- Click **"Save Changes"**

### Business Tab

Update your business information:
- **Business Name**: Your company name
- **Phone**: Business phone number
- **Address**: Business address
- Click **"Save Changes"**

### Password Tab

Change your password:
1. Enter **Current Password**
2. Enter **New Password** (at least 6 characters)
3. **Confirm New Password**
4. Click **"Update Password"**

---

## 🔄 Common Workflows

### Workflow 1: New Lead Comes In

1. **Add Lead**: Dashboard → "Add New Lead" → Fill form → Save
2. **Set Status**: Change status to "Contacted" after first call
3. **Add Note**: Note what they're interested in
4. **Schedule Follow-up**: Set a date to call back
5. **Update Status**: Change to "Converted" when they become a customer!

### Workflow 2: Daily Morning Routine

1. **Check Dashboard**: See today's stats
2. **Review Today's Follow-ups**: See who you need to contact today
3. **Check Overdue**: Handle any missed follow-ups
4. **Complete Follow-ups**: Mark as completed after calling

### Workflow 3: Weekly Review

1. **Go to Reports**: Check your conversion rate
2. **Review Leads by Source**: See which sources work best
3. **Check Status Distribution**: See how many leads in each stage
4. **Plan Next Week**: Schedule follow-ups for next week

---

## 💡 Tips & Best Practices

1. **Keep Status Updated**: Always update lead status as you progress
2. **Add Notes Regularly**: Document important conversations
3. **Schedule Follow-ups**: Don't rely on memory - use the system!
4. **Review Reports Weekly**: Understand what's working
5. **Use Search**: Quickly find leads by name or phone
6. **Filter by Status**: Focus on specific lead stages

---

## 🆘 Troubleshooting

### Can't Login?
- Check your email and password
- Make sure backend is running
- Try creating a new account

### Leads Not Showing?
- Check if backend is running on port 5000
- Verify database connection in `.env` file
- Check browser console for errors

### Follow-ups Not Appearing?
- Make sure you scheduled them with a date
- Check the filter settings (Today/Overdue/All)
- Verify the date is correct

### Charts Not Loading?
- Make sure you have some leads in the system
- Check browser console for errors
- Try refreshing the page

---

## 🎯 Quick Reference

| Task | How To |
|------|--------|
| Add Lead | Dashboard → "Add New Lead" OR Leads → "Add New Lead" |
| View Lead | Leads → Click lead name |
| Add Note | Lead Detail → "Add Note" |
| Schedule Follow-up | Lead Detail → Follow-ups → "Add" |
| View Today's Tasks | Dashboard → "Today's Follow-ups" |
| Check Reports | Reports in sidebar |
| Change Password | Settings → Password tab |
| Logout | Top right → Profile icon → Logout |

---

## 🚀 You're Ready!

Start by adding your first lead and scheduling a follow-up. The system is designed to be simple and intuitive - you'll get the hang of it quickly!

For technical setup issues, see `QUICK_START.md`
For deployment, see `DEPLOYMENT.md`

