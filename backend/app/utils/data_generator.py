import random

def generate_region_data():
    return [
        {"id": 1, "name": "Region A", "usage": random.randint(300, 900)},
        {"id": 2, "name": "Region B", "usage": random.randint(300, 900)},
        {"id": 3, "name": "Region C", "usage": random.randint(300, 900)},
    ]
