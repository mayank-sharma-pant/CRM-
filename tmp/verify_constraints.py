import sqlite3

def check_constraints():
    conn = sqlite3.connect('backend/crm.db')
    cursor = conn.cursor()
    
    # Try to find if any MD or Purchase users are in teams
    cursor.execute("""
        SELECT u.email, u.role, t.name 
        FROM users u 
        JOIN team_memberships tm ON u.id = tm.user_id 
        JOIN teams t ON tm.team_id = t.id 
        WHERE u.role IN ('md', 'purchase')
    """)
    rows = cursor.fetchall()
    if rows:
        print("Violation found: MD/Purchase users in teams!")
        for row in rows:
            print(f"User: {row[0]}, Role: {row[1]}, Team: {row[2]}")
    else:
        print("No MD/Purchase users found in teams. Constraint verified for existing data.")
    
    conn.close()

if __name__ == "__main__":
    check_constraints()
