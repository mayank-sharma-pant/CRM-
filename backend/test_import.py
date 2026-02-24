import traceback
import sys
try:
    from app.main import app
    print("OK")
except Exception as e:
    with open("error_log.txt", "w") as f:
        traceback.print_exc(file=f)
    print("FAILED - see error_log.txt")
    sys.exit(1)
