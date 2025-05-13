import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from datetime import datetime, timedelta
from sklearn.metrics import mean_absolute_error
import joblib

# Load dataset
df = pd.read_csv("sep_relapse_dataset_imbalanced.csv")
df["start_time_relapse"] = pd.to_datetime(df["start_time_relapse"])
df["end_time_relapse"] = pd.to_datetime(df["end_time_relapse"])

# Sort and compute context
df = df.sort_values(by=["patient_id", "start_time_relapse"])
df["prev_relapse_time"] = df.groupby("patient_id")["start_time_relapse"].shift(1)
df["next_relapse_time"] = df.groupby("patient_id")["start_time_relapse"].shift(-1)

df["days_to_next_relapse"] = (df["next_relapse_time"] - df["start_time_relapse"]).dt.total_seconds() / 86400
df["days_since_prev_relapse"] = (df["start_time_relapse"] - df["prev_relapse_time"]).dt.total_seconds() / 86400
df["relapse_count"] = df.groupby("patient_id").cumcount()

df["duration_hours"] = (df["end_time_relapse"] - df["start_time_relapse"]).dt.total_seconds() / 3600
df["hour_of_day"] = df["start_time_relapse"].dt.hour
df["day_of_week"] = df["start_time_relapse"].dt.dayofweek
df["patient_id"] = df["patient_id"].astype("category").cat.codes
df["relapse_level"] = df["relapse_level"].astype(int)

# Drop missing targets
df = df.dropna(subset=["days_to_next_relapse", "days_since_prev_relapse"])

# Prepare training data
features = [
    "patient_id", "duration_hours", "hour_of_day", "day_of_week",
    "days_since_prev_relapse", "relapse_count", "relapse_level"
]
X = df[features]
y = df["days_to_next_relapse"]

# Train the model
model = XGBRegressor(n_estimators=200, max_depth=5, learning_rate=0.1, random_state=42)
model.fit(X, y)

# Save the model
joblib.dump(model, "relapse_regressor.pkl")
print(" Model saved as relapse_regressor.pkl")

# Predict on full data
y_pred = model.predict(X)

# Show evaluation
comparison = pd.DataFrame({
    "Actual_Days": y,
    "Predicted_Days": y_pred,
})
comparison["Error"] = comparison["Actual_Days"] - comparison["Predicted_Days"]
comparison["Absolute_Error"] = np.abs(comparison["Error"])

print("\n Sample Predictions:")
print(comparison.head(10))
print(f"\n MAE: {mean_absolute_error(y, y_pred):.2f} days")