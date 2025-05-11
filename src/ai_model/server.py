from flask import Flask, request, jsonify
import joblib
import numpy as np
import pandas as pd

app = Flask(__name__)
model = joblib.load("relapse_predictor.pkl")

# Define the feature names as they were during training
feature_names = ["heart_rate", "hrv", "sleep_score", "steps", "temperature", "spo2", "stress"]
labels = ["Stable condition", "Possible early signs", "High chance of relapse"]

@app.route("/predict", methods=["POST"])
def predict():
    try:
        # Get the JSON data
        data = request.get_json()
        if not data or "features" not in data:
            return jsonify({"error": "Missing 'features' in request body"}), 400

        features_list = data["features"]
        # Validate the number of features
        if len(features_list) != len(feature_names):
            return jsonify({"error": f"Expected {len(feature_names)} features, got {len(features_list)}"}), 400

        # Validate that all features are numeric
        if not all(isinstance(x, (int, float)) for x in features_list):
            return jsonify({"error": "All features must be numeric"}), 400

        # Convert to DataFrame
        features = pd.DataFrame([features_list], columns=feature_names)
        print("Features for prediction:", features.values)

        # Make prediction
        prediction = model.predict(features)[0]
        probabilities = model.predict_proba(features)[0]

        # Prepare response
        response = {
            "label": labels[int(prediction)],
            "confidence": float(round(probabilities[int(prediction)] * 100, 2))
        }
        print("Sending response:", response)

        return jsonify(response)

    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4000)