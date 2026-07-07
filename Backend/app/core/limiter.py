# Backend/app/core/limiter.py
from slowapi import Limiter
from slowapi.util import get_remote_address

# Identifies requests by IP address.
# Swap get_remote_address for a user-based key function
# if you want per-user limits instead of per-IP.
limiter = Limiter(key_func=get_remote_address)