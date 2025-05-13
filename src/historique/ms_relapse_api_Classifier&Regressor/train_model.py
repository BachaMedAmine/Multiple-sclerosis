import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib

df = pd.read_csv("sep_relapse_dataset_imbalanced.csv")
df["start_time_relapse"] = pd.to_datetime(df["start_time_relapse"])
df["end_time_relapse"] = pd.to_datetime(df["end_time_relapse"])

df["duration_hours"] = (df["end_time_relapse"] - df["start_time_relapse"]).dt.total_seconds() / 3600
df["hour_of_day"] = df["start_time_relapse"].dt.hour
df["day_of_week"] = df["start_time_relapse"].dt.dayofweek
df = df.drop(columns=["start_time_relapse", "end_time_relapse"])

X = df.drop(columns=["relapse_level"])
y = df["relapse_level"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print("\n Accuracy:", accuracy_score(y_test, y_pred))
print("\n Classification Report:\n", classification_report(y_test, y_pred))

joblib.dump(model, "relapse_classifier.pkl")
print(" Model saved to relapse_classifier.pkl")