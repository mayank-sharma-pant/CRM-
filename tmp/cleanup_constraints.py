import sqlite3

def cleanup_constraints():
    conn = sqlite3.connect('backend/crm.db')
    cursor = conn.cursor()
    
    print("Cleaning up TeamMemberships for MD/Purchase roles...")
    cursor.execute("""
        DELETE FROM team_memberships 
        WHERE user_id IN (SELECT id FROM users WHERE role IN ('md', 'purchase'))
    """)
    deleted_tm = cursor.rowcount
    
    print("NULLing primary team_id for MD/Purchase users...")
    cursor.execute("""
        UPDATE users 
        SET team_id = NULL 
        WHERE role IN ('md', 'purchase')
    """)
    updated_users = cursor.rowcount
    
    conn.commit()
    conn.close()
    print(f"Cleanup complete. Deleted {deleted_tm} memberships, updated {updated_users} users.")

if __name__ == "__main__":
    cleanup_constraints()
