import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
import joblib

# Load the new 3-class labeled dataset
df = pd.read_csv("synthetic_ms_relapse_dataset.csv")
df = df.dropna(subset=["relapse_level"])
# Drop the old binary column
X = df.drop(columns=["relapse", "relapse_level"])
y = df["relapse_level"]

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate model
y_pred = model.predict(X_test)
print("Accuracy:", accuracy_score(y_test, y_pred))
print(" Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
print(" Classification Report:\n", classification_report(y_test, y_pred))

# Save the model
joblib.dump(model, "relapse_predictor.pkl")