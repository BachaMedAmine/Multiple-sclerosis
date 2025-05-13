import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

num_rows = 1500
num_patients = 100
np.random.seed(42)

class_distribution = {0: 0.65, 1: 0.25, 2: 0.10}

def generate_datetime():
    base_date = datetime.strptime("2024-01-01", "%Y-%m-%d")
    return base_date + timedelta(days=random.randint(0, 364), minutes=random.randint(0, 1440))

def generate_duration_for_class(label):
    if label == 0:
        return np.random.normal(3, 1)
    elif label == 1:
        return np.random.normal(8, 1.5)
    else:
        return np.random.normal(30, 5)

data = []
labels = np.random.choice([0, 1, 2], size=num_rows, p=list(class_distribution.values()))

for i in range(num_rows):
    patient_id = random.randint(1, num_patients)
    relapse_level = labels[i]
    start_time = generate_datetime()
    duration = max(1, min(generate_duration_for_class(relapse_level), 48))
    duration += np.random.normal(0, 0.5)
    duration = max(0.5, duration)
    end_time = start_time + timedelta(hours=duration)

    data.append({
        "patient_id": patient_id,
        "start_time_relapse": start_time.strftime("%Y-%m-%d %H:%M:%S"),
        "end_time_relapse": end_time.strftime("%Y-%m-%d %H:%M:%S"),
        "relapse_level": relapse_level
    })

df = pd.DataFrame(data)
df.to_csv("sep_relapse_dataset_imbalanced.csv", index=False)
print("Dataset saved to sep_relapse_dataset_imbalanced.csv")