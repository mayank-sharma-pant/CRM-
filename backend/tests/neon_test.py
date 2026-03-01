#!/usr/bin/env python3
"""Quick Neon connection test — writes results to /tmp/neon_test.txt"""
import sys

out = open('/tmp/neon_test.txt', 'w')

try:
    out.write("Step 1: Testing raw psycopg connection...\n")
    out.flush()
    
    import psycopg
    url = "postgresql://neondb_owner:npg_4WkjaRmDg1rd@ep-raspy-silence-a1fs3arn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    
    conn = psycopg.connect(url, connect_timeout=10)
    cur = conn.cursor()
    cur.execute("SELECT version()")
    row = cur.fetchone()
    out.write(f"SUCCESS: {row[0][:80]}\n")
    conn.close()
    out.write("Connection closed OK\n")
    
except Exception as e:
    out.write(f"ERROR: {e}\n")
    import traceback
    out.write(traceback.format_exc())

out.write("DONE\n")
out.close()
print("Done — check /tmp/neon_test.txt")
