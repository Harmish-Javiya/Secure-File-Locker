# This is what happens behind the scenes in your User model
from argon2 import PasswordHasher

ph = PasswordHasher()
hash_from_db = "$argon2id$v=19$m=65536,t=3,p=2$POyG6hC1OCvi2HJFOwfuIA$thP3pu+csBpav2fFRUNIi6RKgijJ77F1sjzg0N7ZTlA"
user_input = "Harmish@12345678"

try:
    ph.verify(hash_from_db, user_input)
    print("Match found!")
except:
    print("Invalid password.")