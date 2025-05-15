import os
from flask import Flask, request, jsonify
import joblib
import pandas as pd
import logging
from dotenv import load_dotenv


load_dotenv()
app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

try:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__) )
    model_path = os.path.join(BASE_DIR, "relapse_classifier.pkl")
    model = joblib.load(model_path)
    logging.info(f"Classifier model loaded from {model_path}")
except FileNotFoundError:
    logging.error(f"Classifier model file not found at {model_path}")
    raise

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    try:
        start = pd.to_datetime(data["start_time"])
        end = pd.to_datetime(data["end_time"])
        duration = (end - start).total_seconds() / 3600
        hour_of_day = start.hour
        day_of_week = start.dayofweek

        input_df = pd.DataFrame([{
            "patient_id": data["patient_id"],
            "duration_hours": duration,
            "hour_of_day": hour_of_day,
            "day_of_week": day_of_week
        }])

        prediction = model.predict(input_df)[0]
        label_map = {0: "Stable", 1: "Medium Risk", 2: "Risky"}
        response = {
            "prediction": int(prediction),
            "description": label_map[prediction]
        }
        logging.info(f"Classifier prediction: {response}")
        return jsonify(response)

    except Exception as e:
        logging.error(f"Error during classifier prediction: {e}")
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    port = int(os.environ.get("CLASSIFIER_PORT", 6002))  # Use specific env var
    app.run(host="0.0.0.0", port=port)