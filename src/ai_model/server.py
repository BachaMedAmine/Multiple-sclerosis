import os
from flask import Flask, request, jsonify
import joblib
import numpy as np
import pandas as pd
import logging
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

try:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(BASE_DIR, "relapse_predictor.pkl")
    model = joblib.load(model_path)
    logging.info(f"Model loaded from {model_path}")
except FileNotFoundError:
    logging.error(f"Model file not found at {model_path}")
    raise

feature_names = ["heart_rate", "hrv", "sleep_score", "steps", "temperature", "spo2", "stress"]
labels = ["Stable condition", "Possible early signs", "High chance of relapse"]

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        if not data or "features" not in data:
            return jsonify({"error": "Missing 'features' in request body"}), 400

        features_list = data["features"]

        if len(features_list) != len(feature_names):
            return jsonify({"error": f"Expected {len(feature_names)} features, got {len(features_list)}"}), 400

        if not all(isinstance(x, (int, float)) for x in features_list):
            return jsonify({"error": "All features must be numeric"}), 400

        features = pd.DataFrame([features_list], columns=feature_names)
        logging.info(f"Features for prediction: {features.values}")

        prediction = model.predict(features)[0]
        probabilities = model.predict_proba(features)[0]

        response = {
            "label": labels[int(prediction)],
            "confidence": float(round(probabilities[int(prediction)] * 100, 2))
        }
        logging.info(f"Prediction response: {response}")

        return jsonify(response), 200

    except Exception as e:
        logging.error(f"Error during prediction: {e}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("AI_MODEL_PORT", 6001))  # Use specific env var
    app.run(host="0.0.0.0", port=port)