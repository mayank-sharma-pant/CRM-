from fastapi import Request, HTTPException, status
from collections import defaultdict, deque
from time import time
from typing import Optional, Dict

class RateLimiter:
    """
    A sliding-window rate limiter.
    Initial implementation uses an in-memory defaultdict(deque).
    """
    def __init__(self):
        self._buckets: Dict[str, deque] = defaultdict(deque)

    def check(self, request: Request, identifier: str, max_attempts: int, window_seconds: int):
        """
        Checks if the rate limit has been exceeded for a given identifier + client IP.
        Raises HTTPException(429) if exceeded.
        """
        now = time()
        ip = request.client.host if request.client else "unknown"
        bucket_key = f"{identifier}:{ip}"
        bucket = self._buckets[bucket_key]
        
        # Remove expired timestamps
        cutoff = now - window_seconds
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
            
        if len(bucket) >= max_attempts:
            # Calculate retry delay based on the oldest timestamp in the window
            retry_after = int(bucket[0] + window_seconds - now)
            if retry_after <= 0:
                retry_after = 1
                
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. Please try again later.",
                headers={"Retry-After": str(retry_after)}
            )
        
        bucket.append(now)

# Global instances for different scopes
auth_limiter = RateLimiter()
